import OpenAI from 'openai';

// Инициализация OpenAI клиента
export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Проверка доступности OpenAI
export async function isOpenAIAvailable(): Promise<boolean> {
  if (!process.env.OPENAI_API_KEY) {
    return false;
  }
  
  try {
    await openai.models.list();
    return true;
  } catch (error) {
    console.error('OpenAI not available:', error);
    return false;
  }
}

// Генерация AI резюме для отчетов
export async function generateReportSummary(data: any): Promise<string> {
  if (!await isOpenAIAvailable()) {
    return 'AI анализ недоступен - не настроен OpenAI API ключ';
  }

  try {
    const prompt = `
Проанализируй еженедельные данные HR команды CleanWhale и создай краткое резюме на русском языке:

Данные:
${JSON.stringify(data, null, 2)}

Создай краткое резюме (2-3 предложения) с ключевыми инсайтами:
- Основные тренды
- Проблемные области (если есть)
- Рекомендации

Ответ должен быть профессиональным и конкретным.
`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'Ты - эксперт по HR аналитике. Анализируй данные и давай краткие, практичные выводы на русском языке.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: 300,
      temperature: 0.7,
    });

    return response.choices[0]?.message?.content || 'Не удалось сгенерировать резюме';
  } catch (error) {
    console.error('Error generating AI summary:', error);
    return 'Ошибка при генерации AI резюме';
  }
}

// Анализ аномалий в данных
export async function detectAnomalies(currentData: any, historicalData: any[]): Promise<{
  hasAnomalies: boolean;
  anomalies: string[];
  severity: 'low' | 'medium' | 'high';
}> {
  if (!await isOpenAIAvailable()) {
    return {
      hasAnomalies: false,
      anomalies: ['AI анализ недоступен'],
      severity: 'low'
    };
  }

  try {
    const prompt = `
Проанализируй текущие данные на предмет аномалий по сравнению с историческими:

Текущие данные:
${JSON.stringify(currentData, null, 2)}

Исторические данные (последние недели):
${JSON.stringify(historicalData, null, 2)}

Найди аномалии в:
- Уровне стресса (норма 1-5, тревога 6-7, критично 8-10)
- Переработках (норма до 5 часов в неделю)
- Производительности (резкие падения/рост)
- Количестве найма/заказов

Ответь JSON:
{
  "hasAnomalies": boolean,
  "anomalies": ["описание аномалии 1", "описание аномалии 2"],
  "severity": "low" | "medium" | "high"
}
`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'Ты - эксперт по анализу HR данных. Отвечай только валидным JSON.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: 500,
      temperature: 0.3,
    });

    const result = JSON.parse(response.choices[0]?.message?.content || '{"hasAnomalies": false, "anomalies": [], "severity": "low"}');
    return result;
  } catch (error) {
    console.error('Error detecting anomalies:', error);
    return {
      hasAnomalies: false,
      anomalies: ['Ошибка анализа аномалий'],
      severity: 'low'
    };
  }
}

// Генерация рекомендаций для команды
export async function generateTeamRecommendations(teamData: any): Promise<string[]> {
  if (!await isOpenAIAvailable()) {
    return ['AI рекомендации недоступны - настройте OpenAI API ключ'];
  }

  try {
    const prompt = `
На основе данных команды CleanWhale, дай 3-5 конкретных рекомендаций:

Данные команды:
${JSON.stringify(teamData, null, 2)}

Рекомендации должны быть:
- Конкретными и выполнимыми
- Направленными на улучшение производительности
- Учитывающими уровень стресса и переработки

Ответь списком рекомендаций в формате JSON массива строк.
`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'Ты - HR консультант. Давай практичные рекомендации для улучшения работы команды.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: 400,
      temperature: 0.7,
    });

    const result = JSON.parse(response.choices[0]?.message?.content || '["Нет рекомендаций"]');
    return Array.isArray(result) ? result : ['Ошибка парсинга рекомендаций'];
  } catch (error) {
    console.error('Error generating recommendations:', error);
    return ['Ошибка генерации рекомендаций'];
  }
}
