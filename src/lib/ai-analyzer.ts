import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface AnalysisData {
  // Основные метрики
  totalRevenue: number;
  totalOrders: number;
  totalHires: number;
  activeEmployees: number;
  
  // Тренды роста
  revenueGrowth: number;
  ordersGrowth: number;
  hiresGrowth: number;
  clientsGrowth: number;
  
  // Качественные показатели
  customerSatisfaction: number;
  employeeSatisfaction: number;
  avgStressLevel: number;
  overtimeRate: number;
  turnoverRate: number;
  
  // Данные по городам
  cityData: Record<string, {
    orders: number;
    revenue: number;
    hires: number;
    employees: number;
    satisfaction: number;
  }>;
  
  // Операционные показатели
  avgResponseTime: number;
  orderCompletionRate: number;
  qualityScore: number;
  complaintRate: number;
  
  // Финансовые показатели
  weeklyProfit: number;
  marketingSpend: number;
  costPerHire: number;
  costPerOrder: number;
  
  // Текстовые данные
  majorIssues?: string;
  challenges?: string;
  achievements?: string;
  weekNumber: number;
  reportDate: string;
}

export class AIAnalyzer {
  
  /**
   * Анализирует данные и генерирует отчет для владельцев бизнеса
   */
  async generateExecutiveSummary(data: AnalysisData): Promise<string> {
    const prompt = `
Ты - бизнес-аналитик для польской клининговой компании. Проанализируй данные за неделю ${data.weekNumber} и создай краткий отчет для владельцев бизнеса.

ДАННЫЕ ЗА НЕДЕЛЮ:
📊 Общие показатели:
- Выручка: ${data.totalRevenue} PLN (рост: ${data.revenueGrowth}%)
- Заказы: ${data.totalOrders} (рост: ${data.ordersGrowth}%)
- Найм: ${data.totalHires} человек (рост: ${data.hiresGrowth}%)
- Активные сотрудники: ${data.activeEmployees}

💰 Финансы:
- Прибыль за неделю: ${data.weeklyProfit} PLN
- Маркетинговые расходы: ${data.marketingSpend} PLN
- Стоимость найма: ${data.costPerHire} PLN
- Стоимость заказа: ${data.costPerOrder} PLN

👥 Качество:
- Удовлетворенность клиентов: ${data.customerSatisfaction}/10
- Удовлетворенность сотрудников: ${data.employeeSatisfaction}/10
- Уровень стресса: ${data.avgStressLevel}/10
- Переработки: ${data.overtimeRate}%
- Текучесть кадров: ${data.turnoverRate}%

⚡ Операции:
- Время ответа: ${data.avgResponseTime} часов
- Выполнение заказов: ${data.orderCompletionRate}%
- Качество услуг: ${data.qualityScore}/10
- Жалобы: ${data.complaintRate}%

🏙️ По городам:
${Object.entries(data.cityData).map(([city, cityInfo]) => 
  `${city}: ${cityInfo.orders} заказов, ${cityInfo.revenue} PLN, ${cityInfo.hires} найма`
).join('\n')}

${data.majorIssues ? `❗ Проблемы: ${data.majorIssues}` : ''}
${data.achievements ? `🎯 Достижения: ${data.achievements}` : ''}

СОЗДАЙ ОТЧЕТ В СЛЕДУЮЩЕМ ФОРМАТЕ:

## 📈 Еженедельный отчет для владельцев - Неделя ${data.weekNumber}

### 🔥 Ключевые результаты
[3-4 главных достижения недели]

### 💡 Основные выводы
[Анализ трендов и важных изменений]

### ⚠️ Области внимания
[Проблемы, которые требуют решения]

### 🎯 Рекомендации
[Конкретные действия для улучшения]

### 📊 Сравнение с прошлой неделей
[Что изменилось и почему]

Пиши деловым, но понятным языком. Фокусируйся на ROI, росте бизнеса и ключевых метриках.
`;

    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "Ты - опытный бизнес-аналитик, специализирующийся на клининговых услугах в Польше. Твоя задача - создавать четкие, актуальные отчеты для владельцев бизнеса."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        max_tokens: 1500,
        temperature: 0.7,
      });

      return completion.choices[0]?.message?.content || 'Ошибка генерации отчета';
    } catch (error) {
      console.error('Error generating executive summary:', error);
      throw error;
    }
  }

  /**
   * Анализирует данные и предоставляет инсайты для менеджера по стране
   */
  async generateManagerInsights(data: AnalysisData): Promise<{
    insights: string[];
    correlations: string[];
    anomalies: string[];
    recommendations: string[];
  }> {
    const prompt = `
Ты - аналитик данных для менеджера по стране польской клининговой компании. Проанализируй данные и найди:

ДАННЫЕ:
${JSON.stringify(data, null, 2)}

Найди:
1. НЕОБЫЧНЫЕ ПАТТЕРНЫ (аномалии в данных)
2. ВЗАИМОСВЯЗИ (корреляции между метриками)
3. ИНСАЙТЫ (скрытые закономерности)
4. РЕКОМЕНДАЦИИ (что делать)

Отвечай в JSON формате:
{
  "insights": ["инсайт 1", "инсайт 2", ...],
  "correlations": ["связь 1", "связь 2", ...],
  "anomalies": ["аномалия 1", "аномалия 2", ...],
  "recommendations": ["рекомендация 1", "рекомендация 2", ...]
}

Примеры корреляций:
- "Высокий стресс (${data.avgStressLevel}/10) коррелирует с низким наймом (${data.totalHires} чел)"
- "Города с высокой удовлетворенностью показывают лучшие финансовые результаты"

Ищи неочевидные связи!
`;

    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "Ты - эксперт по анализу операционных данных, специализирующийся на выявлении корреляций и аномалий в HR и операционных метриках."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        max_tokens: 1000,
        temperature: 0.3,
        response_format: { type: "json_object" }
      });

      const result = JSON.parse(completion.choices[0]?.message?.content || '{}');
      return {
        insights: result.insights || [],
        correlations: result.correlations || [],
        anomalies: result.anomalies || [],
        recommendations: result.recommendations || [],
      };
    } catch (error) {
      console.error('Error generating manager insights:', error);
      return {
        insights: ['Ошибка анализа данных'],
        correlations: [],
        anomalies: [],
        recommendations: [],
      };
    }
  }

  /**
   * Предсказывает тренды на следующую неделю
   */
  async predictNextWeekTrends(historicalData: AnalysisData[]): Promise<{
    predictions: Record<string, number>;
    confidence: number;
    reasoning: string;
  }> {
    const prompt = `
Основываясь на исторических данных за последние недели, предскажи показатели на следующую неделю:

ИСТОРИЧЕСКИЕ ДАННЫЕ:
${JSON.stringify(historicalData, null, 2)}

Проанализируй тренды и дай прогноз для:
- totalRevenue
- totalOrders  
- totalHires
- customerSatisfaction
- avgStressLevel

Отвечай в JSON:
{
  "predictions": {
    "totalRevenue": число,
    "totalOrders": число,
    "totalHires": число,
    "customerSatisfaction": число,
    "avgStressLevel": число
  },
  "confidence": число от 0 до 100,
  "reasoning": "объяснение прогноза"
}
`;

    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "Ты - аналитик-прогнозист, специализирующийся на предсказании бизнес-метрик на основе исторических данных."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        max_tokens: 800,
        temperature: 0.2,
        response_format: { type: "json_object" }
      });

      const result = JSON.parse(completion.choices[0]?.message?.content || '{}');
      return {
        predictions: result.predictions || {},
        confidence: result.confidence || 0,
        reasoning: result.reasoning || 'Недостаточно данных для прогноза',
      };
    } catch (error) {
      console.error('Error predicting trends:', error);
      return {
        predictions: {},
        confidence: 0,
        reasoning: 'Ошибка генерации прогноза',
      };
    }
  }

  /**
   * Определяет критические проблемы, требующие немедленного внимания
   */
  async identifyCriticalIssues(data: AnalysisData): Promise<{
    critical: string[];
    medium: string[];
    recommendations: string[];
  }> {
    const criticalIssues = [];
    const mediumIssues = [];
    const recommendations = [];

    // Автоматические проверки
    if (data.revenueGrowth < -15) {
      criticalIssues.push(`Критическое падение выручки: ${data.revenueGrowth.toFixed(1)}%`);
      recommendations.push('Немедленно проанализировать причины падения выручки и принять меры');
    }

    if (data.customerSatisfaction < 5) {
      criticalIssues.push(`Критически низкая удовлетворенность клиентов: ${data.customerSatisfaction}/10`);
      recommendations.push('Провести срочный аудит качества услуг');
    }

    if (data.avgStressLevel > 8) {
      criticalIssues.push(`Критически высокий уровень стресса сотрудников: ${data.avgStressLevel}/10`);
      recommendations.push('Принять меры по снижению рабочей нагрузки');
    }

    if (data.turnoverRate > 25) {
      criticalIssues.push(`Высокая текучесть кадров: ${data.turnoverRate}%`);
      recommendations.push('Пересмотреть HR-политику и условия труда');
    }

    if (data.ordersGrowth < -10) {
      mediumIssues.push(`Падение количества заказов: ${data.ordersGrowth.toFixed(1)}%`);
    }

    if (data.avgResponseTime > 4) {
      mediumIssues.push(`Медленное время ответа: ${data.avgResponseTime} часов`);
    }

    if (data.complaintRate > 15) {
      mediumIssues.push(`Высокий уровень жалоб: ${data.complaintRate}%`);
    }

    // AI анализ для более сложных корреляций
    const aiInsights = await this.generateManagerInsights(data);
    
    return {
      critical: criticalIssues,
      medium: mediumIssues.concat(aiInsights.anomalies),
      recommendations: recommendations.concat(aiInsights.recommendations),
    };
  }

  /**
   * Генерирует автоматический email-отчет
   */
  async generateEmailReport(data: AnalysisData, recipientType: 'owner' | 'manager'): Promise<{
    subject: string;
    body: string;
    priority: 'low' | 'medium' | 'high';
  }> {
    let subject: string;
    let body: string;
    let priority: 'low' | 'medium' | 'high' = 'medium';

    if (recipientType === 'owner') {
      const executiveSummary = await this.generateExecutiveSummary(data);
      
      subject = `📊 Недельный отчет (Неделя ${data.weekNumber}) - `;
      if (data.revenueGrowth > 0) {
        subject += `Рост ${data.revenueGrowth.toFixed(1)}%`;
        priority = 'low';
      } else if (data.revenueGrowth < -10) {
        subject += `ВНИМАНИЕ: Падение ${Math.abs(data.revenueGrowth).toFixed(1)}%`;
        priority = 'high';
      } else {
        subject += `Стабильные показатели`;
        priority = 'medium';
      }

      body = `
Добрый день!

${executiveSummary}

---
Этот отчет сгенерирован автоматически системой аналитики.
Дата: ${new Date(data.reportDate).toLocaleDateString('ru-RU')}
      `.trim();

    } else {
      // Для менеджера по стране
      const insights = await this.generateManagerInsights(data);
      const issues = await this.identifyCriticalIssues(data);

      subject = `🔍 Аналитика для менеджера (Неделя ${data.weekNumber})`;
      
      if (issues.critical.length > 0) {
        subject += ` - ТРЕБУЕТ ВНИМАНИЯ`;
        priority = 'high';
      }

      body = `
Аналитический отчет для менеджера по стране:

## 🚨 Критические вопросы:
${issues.critical.length > 0 ? issues.critical.map(issue => `• ${issue}`).join('\n') : '• Критических вопросов не выявлено'}

## 🔍 Ключевые инсайты:
${insights.insights.map(insight => `• ${insight}`).join('\n')}

## 🔗 Обнаруженные взаимосвязи:
${insights.correlations.map(corr => `• ${corr}`).join('\n')}

## 💡 Рекомендации:
${issues.recommendations.map(rec => `• ${rec}`).join('\n')}

---
Система аналитики | ${new Date(data.reportDate).toLocaleDateString('ru-RU')}
      `.trim();
    }

    return { subject, body, priority };
  }
}

export const aiAnalyzer = new AIAnalyzer();
