// Обработка CSV файлов для импорта данных

export interface CsvColumn {
  key: string;
  label: string;
  type: 'number' | 'string' | 'date';
  required?: boolean;
  validation?: (value: any) => boolean;
}

export interface CsvProcessorConfig {
  columns: CsvColumn[];
  delimiter?: string;
  skipFirstRow?: boolean;
  dateFormat?: string;
}

export interface CsvProcessingResult {
  success: boolean;
  data: Record<string, any>[];
  errors: string[];
  warnings: string[];
  processedRows: number;
  skippedRows: number;
}

export class CsvProcessor {
  private config: CsvProcessorConfig;

  constructor(config: CsvProcessorConfig) {
    this.config = {
      delimiter: ',',
      skipFirstRow: true,
      dateFormat: 'YYYY-MM-DD',
      ...config
    };
  }

  async processFile(file: File): Promise<CsvProcessingResult> {
    const result: CsvProcessingResult = {
      success: true,
      data: [],
      errors: [],
      warnings: [],
      processedRows: 0,
      skippedRows: 0
    };

    try {
      const text = await this.readFileAsText(file);
      return this.processText(text);
    } catch (error) {
      result.success = false;
      result.errors.push(`Ошибка чтения файла: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`);
      return result;
    }
  }

  private readFileAsText(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.onerror = (e) => reject(new Error('Ошибка чтения файла'));
      reader.readAsText(file, 'utf-8');
    });
  }

  processText(csvText: string): CsvProcessingResult {
    const result: CsvProcessingResult = {
      success: true,
      data: [],
      errors: [],
      warnings: [],
      processedRows: 0,
      skippedRows: 0
    };

    try {
      const lines = csvText.split('\n').filter(line => line.trim() !== '');
      
      if (lines.length === 0) {
        result.errors.push('CSV файл пустой');
        result.success = false;
        return result;
      }

      let startIndex = 0;
      let headers: string[] = [];

      if (this.config.skipFirstRow) {
        headers = this.parseCsvLine(lines[0]);
        startIndex = 1;
      }

      // Обрабатываем каждую строку
      for (let i = startIndex; i < lines.length; i++) {
        const lineNumber = i + 1;
        const values = this.parseCsvLine(lines[i]);

        if (values.length === 0) {
          result.skippedRows++;
          continue;
        }

        const rowData = this.processRow(values, headers, lineNumber);
        
        if (rowData.success) {
          result.data.push(rowData.data);
          result.processedRows++;
        } else {
          result.errors.push(...rowData.errors);
          result.skippedRows++;
        }

        if (rowData.warnings.length > 0) {
          result.warnings.push(...rowData.warnings);
        }
      }

      if (result.errors.length > 0) {
        result.success = false;
      }

      return result;
    } catch (error) {
      result.success = false;
      result.errors.push(`Ошибка обработки CSV: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`);
      return result;
    }
  }

  private parseCsvLine(line: string): string[] {
    const delimiter = this.config.delimiter!;
    const values: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      const nextChar = line[i + 1];

      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          // Экранированная кавычка
          current += '"';
          i++; // Пропускаем следующую кавычку
        } else {
          // Начало или конец строки в кавычках
          inQuotes = !inQuotes;
        }
      } else if (char === delimiter && !inQuotes) {
        // Разделитель вне кавычек
        values.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }

    // Добавляем последнее значение
    values.push(current.trim());
    
    return values.map(value => {
      // Убираем лишние кавычки
      if (value.startsWith('"') && value.endsWith('"')) {
        return value.slice(1, -1);
      }
      return value;
    });
  }

  private processRow(values: string[], headers: string[], lineNumber: number): {
    success: boolean;
    data: Record<string, any>;
    errors: string[];
    warnings: string[];
  } {
    const result = {
      success: true,
      data: {} as Record<string, any>,
      errors: [] as string[],
      warnings: [] as string[]
    };

    for (let i = 0; i < this.config.columns.length; i++) {
      const column = this.config.columns[i];
      let value: any;

      // Получаем значение по индексу или по имени колонки
      if (headers.length > 0) {
        const headerIndex = headers.findIndex(h => 
          h.toLowerCase().trim() === column.label.toLowerCase().trim()
        );
        value = headerIndex !== -1 ? values[headerIndex] : '';
      } else {
        value = values[i] || '';
      }

      // Проверяем обязательные поля
      if (column.required && (!value || value.trim() === '')) {
        result.errors.push(`Строка ${lineNumber}: обязательное поле "${column.label}" пустое`);
        result.success = false;
        continue;
      }

      // Конвертируем тип данных
      const convertedValue = this.convertValue(value, column, lineNumber);
      
      if (convertedValue.success) {
        result.data[column.key] = convertedValue.value;
      } else {
        result.errors.push(...convertedValue.errors);
        result.success = false;
      }

      if (convertedValue.warnings.length > 0) {
        result.warnings.push(...convertedValue.warnings);
      }
    }

    return result;
  }

  private convertValue(value: string, column: CsvColumn, lineNumber: number): {
    success: boolean;
    value: any;
    errors: string[];
    warnings: string[];
  } {
    const result = {
      success: true,
      value: null as any,
      errors: [] as string[],
      warnings: [] as string[]
    };

    if (!value || value.trim() === '') {
      result.value = null;
      return result;
    }

    const trimmedValue = value.trim();

    switch (column.type) {
      case 'number':
        const numValue = parseFloat(trimmedValue.replace(',', '.'));
        if (isNaN(numValue)) {
          result.errors.push(`Строка ${lineNumber}: "${column.label}" должно быть числом, получено "${trimmedValue}"`);
          result.success = false;
        } else {
          result.value = numValue;
        }
        break;

      case 'date':
        const dateValue = this.parseDate(trimmedValue);
        if (!dateValue) {
          result.errors.push(`Строка ${lineNumber}: "${column.label}" должно быть датой в формате YYYY-MM-DD, получено "${trimmedValue}"`);
          result.success = false;
        } else {
          result.value = dateValue;
        }
        break;

      case 'string':
      default:
        result.value = trimmedValue;
        break;
    }

    // Применяем дополнительную валидацию
    if (result.success && column.validation && !column.validation(result.value)) {
      result.errors.push(`Строка ${lineNumber}: значение "${trimmedValue}" не прошло валидацию для поля "${column.label}"`);
      result.success = false;
    }

    return result;
  }

  private parseDate(dateString: string): Date | null {
    // Поддерживаем различные форматы дат
    const formats = [
      /^\d{4}-\d{2}-\d{2}$/, // YYYY-MM-DD
      /^\d{2}\/\d{2}\/\d{4}$/, // MM/DD/YYYY
      /^\d{2}\.\d{2}\.\d{4}$/, // DD.MM.YYYY
    ];

    for (const format of formats) {
      if (format.test(dateString)) {
        const date = new Date(dateString);
        if (!isNaN(date.getTime())) {
          return date;
        }
      }
    }

    return null;
  }
}

// Предопределенные конфигурации для различных типов данных
export const CSV_CONFIGS = {
  HR_METRICS: {
    columns: [
      { key: 'reportDate', label: 'Дата отчета', type: 'date' as const, required: true },
      { key: 'hiredPeople', label: 'Нанято человек', type: 'number' as const },
      { key: 'interviews', label: 'Интервью', type: 'number' as const },
      { key: 'applications', label: 'Заявки', type: 'number' as const },
      { key: 'overtimeHours', label: 'Переработки (часы)', type: 'number' as const },
      { key: 'teamMeetings', label: 'Встречи команды', type: 'number' as const },
      { key: 'trainingHours', label: 'Обучение (часы)', type: 'number' as const },
      { key: 'notes', label: 'Заметки', type: 'string' as const },
    ]
  },

  OPERATIONS_METRICS: {
    columns: [
      { key: 'reportDate', label: 'Дата отчета', type: 'date' as const, required: true },
      { key: 'ordersProcessed', label: 'Обработано заказов', type: 'number' as const },
      { key: 'customerCalls', label: 'Звонки клиентам', type: 'number' as const },
      { key: 'overtimeHours', label: 'Переработки (часы)', type: 'number' as const },
      { key: 'teamMeetings', label: 'Встречи команды', type: 'number' as const },
      { key: 'trainingHours', label: 'Обучение (часы)', type: 'number' as const },
      { key: 'notes', label: 'Заметки', type: 'string' as const },
    ]
  },

  TRENGO_MESSAGES: {
    columns: [
      { key: 'reportDate', label: 'Дата', type: 'date' as const, required: true },
      { key: 'trengoMessages', label: 'Всего сообщений', type: 'number' as const },
      { key: 'trengoTicketsCreated', label: 'Создано тикетов', type: 'number' as const },
      { key: 'trengoTicketsResolved', label: 'Решено тикетов', type: 'number' as const },
    ]
  },

  CRM_DATA: {
    columns: [
      { key: 'reportDate', label: 'Дата', type: 'date' as const, required: true },
      { key: 'crmTicketsResolved', label: 'Решено тикетов', type: 'number' as const },
      { key: 'crmTicketsCreated', label: 'Создано тикетов', type: 'number' as const },
    ]
  }
};

// Фабрика для создания процессора
export function createCsvProcessor(configType: keyof typeof CSV_CONFIGS): CsvProcessor {
  return new CsvProcessor(CSV_CONFIGS[configType]);
}

// Генерация шаблона CSV
export function generateCsvTemplate(configType: keyof typeof CSV_CONFIGS): string {
  const config = CSV_CONFIGS[configType];
  const headers = config.columns.map(col => col.label).join(',');
  
  // Добавляем пример строки
  const exampleRow = config.columns.map(col => {
    switch (col.type) {
      case 'date':
        return '2024-01-15';
      case 'number':
        return '10';
      case 'string':
        return 'Пример текста';
      default:
        return '';
    }
  }).join(',');

  return `${headers}\n${exampleRow}`;
}
