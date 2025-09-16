'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { Calendar, Save, TrendingUp, Users, MessageSquare, Clock, Upload, FileText, Download } from 'lucide-react';
import { createCsvProcessor, generateCsvTemplate, CSV_CONFIGS } from '@/lib/csv-processor';

interface MetricsFormData {
  reportDate: string;
  // HR метрики (ручной ввод)
  hiredPeople?: number;
  interviews?: number;
  applications?: number;
  // Операционные метрики (ручной ввод)
  ordersProcessed?: number;
  customerCalls?: number;
  // Общие метрики
  overtimeHours?: number;
  teamMeetings?: number;
  trainingHours?: number;
  notes?: string;
}

export default function MetricsPage() {
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [autoData, setAutoData] = useState<any>(null);
  const [csvUploadResult, setCsvUploadResult] = useState<any>(null);
  const [showCsvUpload, setShowCsvUpload] = useState(false);
  const router = useRouter();
  
  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<MetricsFormData>({
    defaultValues: {
      reportDate: new Date().toISOString().split('T')[0],
    }
  });

  useEffect(() => {
    // Проверяем токен и загружаем данные пользователя
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      setUser({
        id: payload.userId,
        email: payload.email,
        role: payload.role,
        city: payload.city,
      });
      
      // Загружаем автоматические данные (пока мокаем)
      loadAutoData();
    } catch (error) {
      console.error('Invalid token:', error);
      router.push('/login');
    }
  }, [router]);

  const loadAutoData = async () => {
    // Пока что моковые данные для демонстрации
    setAutoData({
      trengoMessages: 156,
      trengoTicketsCreated: 23,
      trengoTicketsResolved: 18,
      trengoLastSync: new Date('2024-01-15T10:30:00'),
      crmTicketsResolved: 42,
      crmTicketsCreated: 38,
      crmResponseTime: 2.4,
      crmLastSync: new Date('2024-01-15T11:15:00'),
    });
  };

  const onSubmit = async (data: MetricsFormData) => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        router.push('/login');
        return;
      }

      const response = await fetch('/api/metrics', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...data,
          csvDataSource: csvUploadResult?.success ? 'csv_upload' : undefined,
        }),
      });

      const result = await response.json();

      if (response.ok) {
        alert('Метрики успешно сохранены!');
        router.push('/dashboard');
      } else {
        alert(`Ошибка сохранения: ${result.message}`);
      }
    } catch (error) {
      console.error('Error saving metrics:', error);
      alert('Ошибка сохранения метрик');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCsvUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const configType = isHR ? 'HR_METRICS' : 'OPERATIONS_METRICS';
    const processor = createCsvProcessor(configType);

    try {
      const result = await processor.processFile(file);
      setCsvUploadResult(result);

      if (result.success && result.data.length > 0) {
        // Заполняем форму данными из CSV (берем первую строку)
        const firstRow = result.data[0];
        Object.keys(firstRow).forEach(key => {
          if (firstRow[key] !== null && firstRow[key] !== undefined) {
            setValue(key as keyof MetricsFormData, firstRow[key]);
          }
        });
        
        alert(`CSV загружен успешно! Обработано строк: ${result.processedRows}`);
      } else {
        alert(`Ошибки в CSV файле:\n${result.errors.join('\n')}`);
      }
    } catch (error) {
      alert('Ошибка при обработке CSV файла');
      console.error(error);
    }
  };

  const downloadCsvTemplate = () => {
    const configType = isHR ? 'HR_METRICS' : 'OPERATIONS_METRICS';
    const template = generateCsvTemplate(configType);
    const blob = new Blob([template], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${configType.toLowerCase()}_template.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getRoleLabel = (role: string) => {
    const labels: Record<string, string> = {
      HR: 'HR менеджер',
      OPERATIONS_MANAGER: 'Операционный менеджер',
      COUNTRY_MANAGER: 'Менеджер по стране',
      ADMIN: 'Администратор',
    };
    return labels[role] || role;
  };

  const getCityLabel = (city: string) => {
    const labels: Record<string, string> = {
      MOSCOW: 'Москва',
      SPB: 'Санкт-Петербург',
      KAZAN: 'Казань',
      NOVOSIBIRSK: 'Новосибирск',
      EKATERINBURG: 'Екатеринбург',
    };
    return labels[city] || city;
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const isHR = user.role === 'HR';
  const isOpsManager = user.role === 'OPERATIONS_MANAGER';

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <TrendingUp className="h-8 w-8 text-blue-600" />
              <span className="ml-2 text-xl font-bold text-gray-900">
                Ввод метрик
              </span>
            </div>
            <div className="text-sm text-gray-600">
              {getRoleLabel(user.role)} • {getCityLabel(user.city)}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Еженедельные метрики</h1>
            <p className="mt-1 text-sm text-gray-600">
              Введите данные за прошедшую неделю. Автоматические данные обновляются из Trengo и CRM.
            </p>
          </div>

          {/* CSV загрузка */}
          <div className="mb-8 p-4 bg-yellow-50 rounded-lg">
            <h3 className="text-lg font-medium text-yellow-900 mb-4">
              📁 Загрузка данных из CSV
            </h3>
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-4">
                <button
                  type="button"
                  onClick={downloadCsvTemplate}
                  className="flex items-center px-4 py-2 text-sm bg-yellow-600 text-white rounded-md hover:bg-yellow-700"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Скачать шаблон CSV
                </button>
                
                <div className="flex items-center">
                  <input
                    type="file"
                    accept=".csv"
                    onChange={handleCsvUpload}
                    className="hidden"
                    id="csv-upload"
                  />
                  <label
                    htmlFor="csv-upload"
                    className="flex items-center px-4 py-2 text-sm bg-yellow-600 text-white rounded-md hover:bg-yellow-700 cursor-pointer"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Загрузить CSV файл
                  </label>
                </div>
              </div>
              
              {csvUploadResult && (
                <div className="mt-4 p-3 rounded-md bg-white border">
                  <h4 className="font-medium text-gray-900 mb-2">Результат загрузки:</h4>
                  {csvUploadResult.success ? (
                    <div className="text-green-700">
                      ✅ Обработано строк: {csvUploadResult.processedRows}
                      {csvUploadResult.warnings.length > 0 && (
                        <div className="mt-2 text-yellow-700">
                          <strong>Предупреждения:</strong>
                          <ul className="list-disc pl-5">
                            {csvUploadResult.warnings.map((warning: string, i: number) => (
                              <li key={i}>{warning}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-red-700">
                      ❌ Ошибки загрузки:
                      <ul className="list-disc pl-5 mt-1">
                        {csvUploadResult.errors.map((error: string, i: number) => (
                          <li key={i}>{error}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
              
              <p className="text-sm text-gray-600">
                Скачайте шаблон CSV, заполните данными и загрузите обратно для автоматического заполнения формы.
              </p>
            </div>
          </div>

          {/* Автоматические данные */}
          {autoData && (
            <div className="mb-8 p-4 bg-blue-50 rounded-lg">
              <h3 className="text-lg font-medium text-blue-900 mb-4">
                📊 Автоматически собранные данные
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <h4 className="font-medium text-blue-800">Trengo</h4>
                  <div className="text-sm space-y-1">
                    <p>Сообщения: <span className="font-semibold">{autoData.trengoMessages}</span></p>
                    <p>Создано тикетов: <span className="font-semibold">{autoData.trengoTicketsCreated}</span></p>
                    <p>Решено тикетов: <span className="font-semibold">{autoData.trengoTicketsResolved}</span></p>
                    <p className="text-xs text-gray-600">
                      Обновлено: {autoData.trengoLastSync.toLocaleString('ru-RU')}
                    </p>
                  </div>
                </div>
                <div className="space-y-2">
                  <h4 className="font-medium text-blue-800">CRM</h4>
                  <div className="text-sm space-y-1">
                    <p>Решено тикетов: <span className="font-semibold">{autoData.crmTicketsResolved}</span></p>
                    <p>Создано тикетов: <span className="font-semibold">{autoData.crmTicketsCreated}</span></p>
                    <p className="text-xs text-gray-600">
                      Обновлено: {autoData.crmLastSync.toLocaleString('ru-RU')}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Форма ручного ввода */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Дата отчета */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Calendar className="inline h-4 w-4 mr-1" />
                Дата отчета
              </label>
              <input
                type="date"
                {...register('reportDate', { required: 'Дата обязательна' })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
              {errors.reportDate && (
                <p className="mt-1 text-sm text-red-600">{errors.reportDate.message}</p>
              )}
            </div>

            {/* HR метрики */}
            {isHR && (
              <div className="p-4 bg-green-50 rounded-lg">
                <h3 className="text-lg font-medium text-green-900 mb-4">
                  <Users className="inline h-5 w-5 mr-2" />
                  HR метрики
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Нанято человек
                    </label>
                    <input
                      type="number"
                      min="0"
                      {...register('hiredPeople', { min: 0 })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-green-500 focus:border-green-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Проведено интервью
                    </label>
                    <input
                      type="number"
                      min="0"
                      {...register('interviews', { min: 0 })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-green-500 focus:border-green-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Заявки кандидатов
                    </label>
                    <input
                      type="number"
                      min="0"
                      {...register('applications', { min: 0 })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-green-500 focus:border-green-500"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Операционные метрики */}
            {isOpsManager && (
              <div className="p-4 bg-purple-50 rounded-lg">
                <h3 className="text-lg font-medium text-purple-900 mb-4">
                  <MessageSquare className="inline h-5 w-5 mr-2" />
                  Операционные метрики
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Обработано заказов
                    </label>
                    <input
                      type="number"
                      min="0"
                      {...register('ordersProcessed', { min: 0 })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-purple-500 focus:border-purple-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Звонки клиентам
                    </label>
                    <input
                      type="number"
                      min="0"
                      {...register('customerCalls', { min: 0 })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-purple-500 focus:border-purple-500"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Общие метрики */}
            <div className="p-4 bg-gray-50 rounded-lg">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                <Clock className="inline h-5 w-5 mr-2" />
                Общие метрики
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Переработки (часов)
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    {...register('overtimeHours', { min: 0 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-gray-500 focus:border-gray-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Встреч команды
                  </label>
                  <input
                    type="number"
                    min="0"
                    {...register('teamMeetings', { min: 0 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-gray-500 focus:border-gray-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Обучение (часов)
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    {...register('trainingHours', { min: 0 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-gray-500 focus:border-gray-500"
                  />
                </div>
              </div>
            </div>

            {/* Заметки */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Дополнительные заметки
              </label>
              <textarea
                rows={3}
                {...register('notes')}
                placeholder="Особенности недели, важные события, комментарии..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Кнопки */}
            <div className="flex justify-between">
              <button
                type="button"
                onClick={() => router.push('/dashboard')}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Отмена
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="flex items-center px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                <Save className="h-4 w-4 mr-2" />
                {isLoading ? 'Сохранение...' : 'Сохранить метрики'}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
