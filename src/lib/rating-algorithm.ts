/**
 * Алгоритм расчета рейтинга сотрудников CleanWhale
 * Учитывает множество факторов с разными весами
 */

interface EmployeeMetrics {
  // Основные метрики
  workingDays: number;
  interviews: number;
  hiredPeople: number;
  ordersProcessed: number;
  teamMeetings: number;
  messages: number;
  
  // Негативные факторы
  stressLevel: number; // 1-10
  overtime: boolean;
  complaints: number;
  difficultSituations: string;
  
  // Дополнительные метрики
  trainingHours: number;
  clientIssues: string;
  cleanerIssues: string;
}

interface RatingWeights {
  // Позитивные факторы (чем больше - тем лучше)
  workingDays: number;
  interviews: number;
  hiredPeople: number;
  ordersProcessed: number;
  teamMeetings: number;
  messages: number;
  trainingHours: number;
  
  // Негативные факторы (чем больше - тем хуже)
  stressLevel: number;
  overtime: number;
  complaints: number;
  issuesCount: number; // количество упомянутых проблем
}

// Веса для разных метрик (можно настраивать)
const RATING_WEIGHTS: RatingWeights = {
  // Основная продуктивность
  workingDays: 10,      // Базовый фактор - отработанные дни
  ordersProcessed: 8,   // Высокий вес для выполненных заказов
  hiredPeople: 15,      // Очень важно - новые сотрудники
  
  // Коммуникация и развитие
  interviews: 12,       // Важно для роста команды
  teamMeetings: 6,      // Командная работа
  messages: 3,          // Активность в общении
  trainingHours: 7,     // Саморазвитие
  
  // Негативные факторы (вычитаются из рейтинга)
  stressLevel: -4,      // Стресс влияет на качество работы
  overtime: -8,         // Переработки - плохой знак
  complaints: -12,      // Жалобы серьезно влияют на рейтинг
  issuesCount: -5,      // Количество проблем
};

/**
 * Подсчет количества упомянутых проблем в текстовых полях
 */
function countIssues(text: string): number {
  if (!text || text.trim().length === 0) return 0;
  
  // Простой подсчет проблем по ключевым словам и знакам препинания
  const problemKeywords = ['проблема', 'конфликт', 'сложность', 'ошибка', 'жалоба', 'недовольство'];
  const sentences = text.split(/[.!?;]/);
  
  let issueCount = 0;
  
  problemKeywords.forEach(keyword => {
    const matches = text.toLowerCase().match(new RegExp(keyword, 'g'));
    if (matches) issueCount += matches.length;
  });
  
  // Дополнительно считаем по количеству предложений (каждое предложение = потенциальная проблема)
  issueCount += Math.max(0, sentences.length - 1);
  
  return Math.min(issueCount, 10); // Максимум 10 проблем
}

/**
 * Нормализация значения в диапазоне 0-100
 */
function normalize(value: number, min: number, max: number): number {
  return Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100));
}

/**
 * Основная функция расчета рейтинга
 */
export function calculateEmployeeRating(metrics: Partial<EmployeeMetrics>): {
  totalRating: number;
  components: {
    productivity: number;
    communication: number;
    quality: number;
    wellbeing: number;
  };
  breakdown: Array<{
    metric: string;
    value: number;
    weight: number;
    contribution: number;
    isNegative: boolean;
  }>;
} {
  const breakdown: Array<{
    metric: string;
    value: number;
    weight: number;
    contribution: number;
    isNegative: boolean;
  }> = [];

  let totalScore = 50; // Базовый рейтинг

  // Позитивные факторы
  const positiveMetrics = [
    { key: 'workingDays', label: 'Рабочие дни', max: 7 },
    { key: 'interviews', label: 'Собеседования', max: 20 },
    { key: 'hiredPeople', label: 'Нанято людей', max: 10 },
    { key: 'ordersProcessed', label: 'Обработано заказов', max: 100 },
    { key: 'teamMeetings', label: 'Встречи команды', max: 15 },
    { key: 'messages', label: 'Сообщения', max: 200 },
    { key: 'trainingHours', label: 'Часы обучения', max: 40 },
  ];

  positiveMetrics.forEach(({ key, label, max }) => {
    const value = metrics[key as keyof EmployeeMetrics] as number || 0;
    const weight = RATING_WEIGHTS[key as keyof RatingWeights];
    const normalizedValue = normalize(value, 0, max);
    const contribution = (normalizedValue / 100) * weight;
    
    totalScore += contribution;
    breakdown.push({
      metric: label,
      value,
      weight,
      contribution,
      isNegative: false,
    });
  });

  // Негативные факторы
  const stressLevel = metrics.stressLevel || 1;
  const stressContribution = ((stressLevel - 1) / 9) * Math.abs(RATING_WEIGHTS.stressLevel);
  totalScore += RATING_WEIGHTS.stressLevel * (stressLevel / 10);
  breakdown.push({
    metric: 'Уровень стресса',
    value: stressLevel,
    weight: RATING_WEIGHTS.stressLevel,
    contribution: -stressContribution,
    isNegative: true,
  });

  if (metrics.overtime) {
    totalScore += RATING_WEIGHTS.overtime;
    breakdown.push({
      metric: 'Переработки',
      value: 1,
      weight: RATING_WEIGHTS.overtime,
      contribution: RATING_WEIGHTS.overtime,
      isNegative: true,
    });
  }

  const complaints = metrics.complaints || 0;
  if (complaints > 0) {
    const complaintContribution = complaints * RATING_WEIGHTS.complaints;
    totalScore += complaintContribution;
    breakdown.push({
      metric: 'Жалобы',
      value: complaints,
      weight: RATING_WEIGHTS.complaints,
      contribution: complaintContribution,
      isNegative: true,
    });
  }

  // Подсчет проблем из текстовых полей
  const issuesText = [
    metrics.difficultSituations || '',
    metrics.clientIssues || '',
    metrics.cleanerIssues || ''
  ].join(' ');
  
  const issuesCount = countIssues(issuesText);
  if (issuesCount > 0) {
    const issuesContribution = issuesCount * RATING_WEIGHTS.issuesCount;
    totalScore += issuesContribution;
    breakdown.push({
      metric: 'Упомянутые проблемы',
      value: issuesCount,
      weight: RATING_WEIGHTS.issuesCount,
      contribution: issuesContribution,
      isNegative: true,
    });
  }

  // Нормализуем итоговый рейтинг в диапазон 0-100
  const finalRating = Math.max(0, Math.min(100, totalScore));

  // Рассчитываем компоненты рейтинга
  const productivity = Math.max(0, Math.min(100, 
    ((metrics.workingDays || 0) * 10 + (metrics.ordersProcessed || 0) * 0.5 + (metrics.hiredPeople || 0) * 8) / 2
  ));

  const communication = Math.max(0, Math.min(100,
    ((metrics.teamMeetings || 0) * 5 + (metrics.messages || 0) * 0.3 + (metrics.interviews || 0) * 3) / 2
  ));

  const quality = Math.max(0, Math.min(100,
    100 - (complaints * 15) - (issuesCount * 8) - (stressLevel * 3)
  ));

  const wellbeing = Math.max(0, Math.min(100,
    100 - (stressLevel * 8) - (metrics.overtime ? 20 : 0) - (issuesCount * 5)
  ));

  return {
    totalRating: Math.round(finalRating),
    components: {
      productivity: Math.round(productivity),
      communication: Math.round(communication),
      quality: Math.round(quality),
      wellbeing: Math.round(wellbeing),
    },
    breakdown,
  };
}

/**
 * Получение цвета рейтинга
 */
export function getRatingColor(rating: number): {
  color: string;
  bgColor: string;
  textColor: string;
  label: string;
} {
  if (rating >= 80) {
    return {
      color: '#10B981',
      bgColor: '#D1FAE5',
      textColor: '#065F46',
      label: 'Отличный'
    };
  } else if (rating >= 65) {
    return {
      color: '#3B82F6',
      bgColor: '#DBEAFE',
      textColor: '#1E40AF',
      label: 'Хороший'
    };
  } else if (rating >= 45) {
    return {
      color: '#F59E0B',
      bgColor: '#FEF3C7',
      textColor: '#92400E',
      label: 'Средний'
    };
  } else {
    return {
      color: '#EF4444',
      bgColor: '#FEE2E2',
      textColor: '#991B1B',
      label: 'Требует внимания'
    };
  }
}

/**
 * Генерация рекомендаций на основе рейтинга
 */
export function generateRecommendations(metrics: Partial<EmployeeMetrics>, rating: number): string[] {
  const recommendations: string[] = [];

  if (rating < 50) {
    recommendations.push('🚨 Сотрудник требует срочного внимания менеджмента');
  }

  if ((metrics.stressLevel || 0) > 7) {
    recommendations.push('😰 Высокий уровень стресса - рассмотреть снижение нагрузки');
  }

  if (metrics.overtime) {
    recommendations.push('⏰ Частые переработки - пересмотреть планирование задач');
  }

  if ((metrics.complaints || 0) > 2) {
    recommendations.push('⚠️ Много жалоб - провести индивидуальную беседу');
  }

  if ((metrics.workingDays || 0) < 4) {
    recommendations.push('📅 Низкая посещаемость - уточнить причины');
  }

  if ((metrics.teamMeetings || 0) === 0) {
    recommendations.push('🤝 Отсутствие участия во встречах - улучшить вовлеченность');
  }

  if ((metrics.hiredPeople || 0) === 0 && (metrics.interviews || 0) > 5) {
    recommendations.push('🎯 Много собеседований, но нет найма - пересмотреть критерии отбора');
  }

  if (rating > 80) {
    recommendations.push('⭐ Отличный результат - рассмотреть повышение или бонус');
  }

  return recommendations;
}
