import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface PersonalMetrics {
  // Текущие показатели
  current: {
    // HR метрики
    hrInterviews?: number;
    hrJobPostings?: number;
    hrRegistrations?: number;
    hrWorkingDays?: number;
    hrStressLevel?: number;
    hrOvertime?: boolean;
    hrDifficultSituations?: string;
    
    // Операционные метрики
    opsOrdersWeek?: number;
    opsWorkingDays?: number;
    opsStressLevel?: number;
    opsOvertime?: boolean;
    opsCleanerIssues?: string;
    opsClientIssues?: string;
    
    // Автоматические данные
    trengoMessages?: number;
    trengoTicketsResolved?: number;
    crmTicketsResolved?: number;
    
    reportDate: string;
  };
  
  // Исторические данные
  previous: PersonalMetrics['current'][];
  
  // Контекст пользователя
  user: {
    role: 'HR' | 'OPERATIONS' | 'MIXED';
    city: string;
    name?: string;
  };
}

interface PersonalInsight {
  type: 'positive' | 'warning' | 'critical' | 'neutral';
  category: 'performance' | 'wellbeing' | 'efficiency' | 'comparison';
  title: string;
  message: string;
  recommendation?: string;
  trend?: 'up' | 'down' | 'stable';
  changePercent?: number;
}

export class PersonalAIAssistant {
  
  /**
   * Анализирует персональные показатели менеджера перед заполнением новой формы
   */
  async analyzePersonalMetrics(metrics: PersonalMetrics): Promise<{
    insights: PersonalInsight[];
    weekSummary: string;
    recommendations: string[];
    motivationalMessage: string;
  }> {
    const prompt = `
Ты - персональный AI помощник для ${this.getRoleLabel(metrics.user.role)} менеджера в городе ${this.getCityLabel(metrics.user.city)}.

Проанализируй показатели менеджера и дай персональные рекомендации перед заполнением новой недельной формы.

РОЛЬ: ${metrics.user.role}
ГОРОД: ${metrics.user.city}
${metrics.user.name ? `ИМЯ: ${metrics.user.name}` : ''}

ТЕКУЩИЕ ПОКАЗАТЕЛИ:
${JSON.stringify(metrics.current, null, 2)}

ИСТОРИЧЕСКИЕ ДАННЫЕ (последние недели):
${JSON.stringify(metrics.previous, null, 2)}

ЗАДАЧИ:
1. Найти ТРЕНДЫ и ИЗМЕНЕНИЯ в показателях
2. Выявить СПАДЫ или ПРОБЛЕМЫ
3. Дать ПЕРСОНАЛЬНЫЕ рекомендации
4. Подготовить мотивационное сообщение

Отвечай в JSON формате:
{
  "insights": [
    {
      "type": "warning|critical|positive|neutral",
      "category": "performance|wellbeing|efficiency|comparison", 
      "title": "Краткий заголовок",
      "message": "Детальное описание",
      "recommendation": "Что делать",
      "trend": "up|down|stable",
      "changePercent": число
    }
  ],
  "weekSummary": "Краткое резюме недели",
  "recommendations": ["рекомендация 1", "рекомендация 2"],
  "motivationalMessage": "Мотивационное сообщение"
}

ПРИМЕРЫ ИНСАЙТОВ:
- "Снижение собеседований на 30% - возможно, нужно больше объявлений"
- "Высокий стресс 3 недели подряд - рекомендуем отдых"
- "Отличный результат по найму - продолжайте в том же духе"
`;

    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "Ты - опытный HR/Operations консультант, который помогает менеджерам улучшать их показатели. Будь персональным, поддерживающим, но честным в оценках."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        max_tokens: 1500,
        temperature: 0.7,
        response_format: { type: "json_object" }
      });

      const result = JSON.parse(completion.choices[0]?.message?.content || '{}');
      
      return {
        insights: result.insights || [],
        weekSummary: result.weekSummary || 'Анализ недоступен',
        recommendations: result.recommendations || [],
        motivationalMessage: result.motivationalMessage || 'Продолжайте хорошую работу!',
      };
    } catch (error) {
      console.error('Error analyzing personal metrics:', error);
      
      // Fallback анализ
      return this.generateFallbackAnalysis(metrics);
    }
  }

  /**
   * Генерирует предупреждения о возможных проблемах
   */
  async generatePreFormWarnings(metrics: PersonalMetrics): Promise<{
    warnings: PersonalInsight[];
    suggestions: string[];
    focusAreas: string[];
  }> {
    const warnings: PersonalInsight[] = [];
    const suggestions: string[] = [];
    const focusAreas: string[] = [];

    // Автоматические проверки трендов
    if (metrics.previous.length > 0) {
      const lastWeek = metrics.previous[0];
      
      // Проверяем HR метрики
      if (metrics.user.role === 'HR' || metrics.user.role === 'MIXED') {
        if (lastWeek.hrInterviews && (lastWeek.hrInterviews > (metrics.current.hrInterviews || 0) * 1.3)) {
          warnings.push({
            type: 'warning',
            category: 'performance',
            title: 'Снижение собеседований',
            message: `Количество собеседований снизилось с ${lastWeek.hrInterviews} до ${metrics.current.hrInterviews || 0}`,
            recommendation: 'Проверьте активность размещения объявлений',
            trend: 'down',
            changePercent: -Math.round(((lastWeek.hrInterviews - (metrics.current.hrInterviews || 0)) / lastWeek.hrInterviews) * 100)
          });
          suggestions.push('Увеличить активность в поиске кандидатов');
          focusAreas.push('Работа с объявлениями');
        }

        if (metrics.current.hrStressLevel && metrics.current.hrStressLevel > 7) {
          warnings.push({
            type: 'critical',
            category: 'wellbeing',
            title: 'Высокий уровень стресса',
            message: `Уровень стресса ${metrics.current.hrStressLevel}/10 - выше нормы`,
            recommendation: 'Рассмотрите возможность снижения нагрузки',
            trend: 'up'
          });
          suggestions.push('Обратиться к руководству по вопросу нагрузки');
          focusAreas.push('Управление стрессом');
        }
      }

      // Проверяем операционные метрики
      if (metrics.user.role === 'OPERATIONS' || metrics.user.role === 'MIXED') {
        if (lastWeek.opsOrdersWeek && (lastWeek.opsOrdersWeek > (metrics.current.opsOrdersWeek || 0) * 1.2)) {
          warnings.push({
            type: 'warning',
            category: 'performance',
            title: 'Снижение заказов',
            message: `Количество заказов снизилось с ${lastWeek.opsOrdersWeek} до ${metrics.current.opsOrdersWeek || 0}`,
            recommendation: 'Проанализируйте причины снижения спроса',
            trend: 'down',
            changePercent: -Math.round(((lastWeek.opsOrdersWeek - (metrics.current.opsOrdersWeek || 0)) / lastWeek.opsOrdersWeek) * 100)
          });
          suggestions.push('Усилить маркетинговые активности');
          focusAreas.push('Привлечение клиентов');
        }
      }
    }

    // Проверяем паттерны за несколько недель
    if (metrics.previous.length >= 3) {
      const stressLevels = metrics.previous.slice(0, 3).map(p => 
        metrics.user.role === 'HR' ? p.hrStressLevel : p.opsStressLevel
      ).filter(Boolean);
      
      if (stressLevels.length >= 3 && stressLevels.every(level => level && level > 6)) {
        warnings.push({
          type: 'critical',
          category: 'wellbeing',
          title: 'Хронический стресс',
          message: 'Высокий стресс наблюдается уже 3 недели подряд',
          recommendation: 'Необходимо принять меры по снижению нагрузки',
          trend: 'up'
        });
        suggestions.push('Запланировать встречу с руководством');
        focusAreas.push('Баланс работа-жизнь');
      }
    }

    return { warnings, suggestions, focusAreas };
  }

  /**
   * Сравнивает показатели с коллегами в той же роли
   */
  async compareWithPeers(userMetrics: PersonalMetrics, peerMetrics: PersonalMetrics[]): Promise<{
    position: 'top' | 'average' | 'below';
    insights: PersonalInsight[];
    strengths: string[];
    improvementAreas: string[];
  }> {
    if (peerMetrics.length === 0) {
      return {
        position: 'average',
        insights: [],
        strengths: [],
        improvementAreas: []
      };
    }

    const insights: PersonalInsight[] = [];
    const strengths: string[] = [];
    const improvementAreas: string[] = [];

    // Сравнение по ключевым метрикам
    const role = userMetrics.user.role;
    let position: 'top' | 'average' | 'below' = 'average';
    let score = 0;
    let totalComparisons = 0;

    if (role === 'HR' || role === 'MIXED') {
      // Сравнение собеседований
      const userInterviews = userMetrics.current.hrInterviews || 0;
      const peerInterviews = peerMetrics.map(p => p.current.hrInterviews || 0);
      const avgPeerInterviews = peerInterviews.reduce((sum, val) => sum + val, 0) / peerInterviews.length;
      
      if (userInterviews > avgPeerInterviews * 1.2) {
        score += 1;
        strengths.push('Отличные результаты по собеседованиям');
        insights.push({
          type: 'positive',
          category: 'comparison',
          title: 'Превосходите коллег',
          message: `Ваши ${userInterviews} собеседований выше среднего по коллегам (${avgPeerInterviews.toFixed(1)})`,
          trend: 'up',
          changePercent: Math.round(((userInterviews - avgPeerInterviews) / avgPeerInterviews) * 100)
        });
      } else if (userInterviews < avgPeerInterviews * 0.8) {
        score -= 1;
        improvementAreas.push('Увеличить количество собеседований');
        insights.push({
          type: 'warning',
          category: 'comparison',
          title: 'Ниже среднего',
          message: `Ваши ${userInterviews} собеседований ниже среднего по коллегам (${avgPeerInterviews.toFixed(1)})`,
          trend: 'down',
          changePercent: -Math.round(((avgPeerInterviews - userInterviews) / avgPeerInterviews) * 100)
        });
      }
      totalComparisons++;
    }

    if (role === 'OPERATIONS' || role === 'MIXED') {
      // Сравнение заказов
      const userOrders = userMetrics.current.opsOrdersWeek || 0;
      const peerOrders = peerMetrics.map(p => p.current.opsOrdersWeek || 0);
      const avgPeerOrders = peerOrders.reduce((sum, val) => sum + val, 0) / peerOrders.length;
      
      if (userOrders > avgPeerOrders * 1.15) {
        score += 1;
        strengths.push('Высокие показатели по заказам');
      } else if (userOrders < avgPeerOrders * 0.85) {
        score -= 1;
        improvementAreas.push('Работа над увеличением заказов');
      }
      totalComparisons++;
    }

    // Определяем общую позицию
    if (totalComparisons > 0) {
      const avgScore = score / totalComparisons;
      if (avgScore > 0.3) position = 'top';
      else if (avgScore < -0.3) position = 'below';
    }

    return { position, insights, strengths, improvementAreas };
  }

  /**
   * Генерирует мотивационное сообщение на основе результатов
   */
  generateMotivationalMessage(
    insights: PersonalInsight[],
    role: string,
    userName?: string
  ): string {
    const name = userName ? userName : 'Коллега';
    const positiveInsights = insights.filter(i => i.type === 'positive');
    const warningInsights = insights.filter(i => i.type === 'warning' || i.type === 'critical');

    if (positiveInsights.length > warningInsights.length) {
      return `💪 ${name}, отличная работа! Ваши результаты впечатляют. Продолжайте в том же духе!`;
    } else if (warningInsights.length > 0) {
      return `🎯 ${name}, мы видим некоторые области для улучшения. Это возможности для роста - вы справитесь!`;
    } else {
      return `📈 ${name}, стабильные результаты! Время для новых целей и достижений.`;
    }
  }

  private generateFallbackAnalysis(metrics: PersonalMetrics): {
    insights: PersonalInsight[];
    weekSummary: string;
    recommendations: string[];
    motivationalMessage: string;
  } {
    const insights: PersonalInsight[] = [];
    const recommendations: string[] = [];

    // Базовый анализ без AI
    if (metrics.current.hrStressLevel && metrics.current.hrStressLevel > 7) {
      insights.push({
        type: 'warning',
        category: 'wellbeing',
        title: 'Высокий уровень стресса',
        message: `Уровень стресса ${metrics.current.hrStressLevel}/10`,
        recommendation: 'Рассмотрите методы снижения стресса'
      });
      recommendations.push('Планирование перерывов в работе');
    }

    if (metrics.current.hrOvertime || metrics.current.opsOvertime) {
      insights.push({
        type: 'warning',
        category: 'wellbeing',
        title: 'Переработки',
        message: 'Зафиксированы переработки на этой неделе',
        recommendation: 'Оптимизируйте рабочее время'
      });
      recommendations.push('Улучшение планирования задач');
    }

    return {
      insights,
      weekSummary: 'Базовый анализ показателей выполнен',
      recommendations: recommendations.length > 0 ? recommendations : ['Продолжайте хорошую работу'],
      motivationalMessage: 'Система анализирует ваши показатели для предоставления персональных рекомендаций.',
    };
  }

  private getRoleLabel(role: string): string {
    const labels = {
      'HR': 'HR/Найм',
      'OPERATIONS': 'Операционный',
      'MIXED': 'Смешанный (HR + Операции)'
    };
    return labels[role as keyof typeof labels] || role;
  }

  private getCityLabel(city: string): string {
    const labels = {
      'WARSAW': 'Варшава',
      'KRAKOW': 'Краков',
      'GDANSK': 'Гданьск',
      'WROCLAW': 'Вроцлав',
      'POZNAN': 'Познань',
      'LODZ': 'Лодзь'
    };
    return labels[city as keyof typeof labels] || city;
  }
}

export const personalAI = new PersonalAIAssistant();
