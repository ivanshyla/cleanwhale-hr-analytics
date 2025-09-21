/**
 * Утилиты для работы с ISO неделями
 */

/**
 * Получает ISO неделю для даты в формате YYYY-WXX
 * @param d - дата (по умолчанию текущая)
 * @returns строка в формате "2025-W03"
 */
export const isoWeekOf = (d = new Date()): string => {
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = t.getUTCDay() || 7; 
  if (day !== 1) t.setUTCDate(t.getUTCDate() + (1 - day));
  const yearStart = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  const week = Math.ceil((((t.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${t.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
};

/**
 * Парсит ISO неделю и возвращает объект с годом и номером недели
 * @param weekIso - строка в формате "2025-W03"
 * @returns объект { year: number, week: number }
 */
export const parseIsoWeek = (weekIso: string): { year: number; week: number } => {
  const match = weekIso.match(/^(\d{4})-W(\d{2})$/);
  if (!match) {
    throw new Error(`Invalid ISO week format: ${weekIso}`);
  }
  return {
    year: parseInt(match[1], 10),
    week: parseInt(match[2], 10)
  };
};

/**
 * Получает даты начала и конца недели по ISO неделе
 * @param weekIso - строка в формате "2025-W03"
 * @returns объект { start: Date, end: Date }
 */
export const getWeekDates = (weekIso: string): { start: Date; end: Date } => {
  const { year, week } = parseIsoWeek(weekIso);
  
  // Находим первый понедельник года
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const firstMonday = new Date(jan4);
  const dayOfWeek = jan4.getUTCDay() || 7;
  firstMonday.setUTCDate(jan4.getUTCDate() - dayOfWeek + 1);
  
  // Добавляем нужное количество недель
  const weekStart = new Date(firstMonday);
  weekStart.setUTCDate(firstMonday.getUTCDate() + (week - 1) * 7);
  
  const weekEnd = new Date(weekStart);
  weekEnd.setUTCDate(weekStart.getUTCDate() + 6);
  
  return {
    start: weekStart,
    end: weekEnd
  };
};

/**
 * Форматирует ISO неделю для отображения пользователю
 * @param weekIso - строка в формате "2025-W03"
 * @returns строка вида "Неделя 3, 2025 (13-19 янв)"
 */
export const formatWeekForDisplay = (weekIso: string): string => {
  const { year, week } = parseIsoWeek(weekIso);
  const { start, end } = getWeekDates(weekIso);
  
  const months = [
    'янв', 'фев', 'мар', 'апр', 'май', 'июн',
    'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'
  ];
  
  const startDay = start.getUTCDate();
  const endDay = end.getUTCDate();
  const startMonth = months[start.getUTCMonth()];
  const endMonth = months[end.getUTCMonth()];
  
  let dateRange;
  if (start.getUTCMonth() === end.getUTCMonth()) {
    dateRange = `${startDay}-${endDay} ${startMonth}`;
  } else {
    dateRange = `${startDay} ${startMonth} - ${endDay} ${endMonth}`;
  }
  
  return `Неделя ${week}, ${year} (${dateRange})`;
};

/**
 * Получает предыдущую ISO неделю
 * @param weekIso - строка в формате "2025-W03"
 * @returns строка предыдущей недели
 */
export const getPreviousWeek = (weekIso: string): string => {
  const { start } = getWeekDates(weekIso);
  const prevWeek = new Date(start);
  prevWeek.setUTCDate(start.getUTCDate() - 7);
  return isoWeekOf(prevWeek);
};

/**
 * Получает следующую ISO неделю
 * @param weekIso - строка в формате "2025-W03"
 * @returns строка следующей недели
 */
export const getNextWeek = (weekIso: string): string => {
  const { start } = getWeekDates(weekIso);
  const nextWeek = new Date(start);
  nextWeek.setUTCDate(start.getUTCDate() + 7);
  return isoWeekOf(nextWeek);
};

/**
 * Проверяет, является ли неделя текущей
 * @param weekIso - строка в формате "2025-W03"
 * @returns true если это текущая неделя
 */
export const isCurrentWeek = (weekIso: string): boolean => {
  return weekIso === isoWeekOf();
};
