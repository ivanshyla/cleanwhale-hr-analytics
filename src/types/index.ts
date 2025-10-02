export type Role = 'HIRING_MANAGER' | 'OPS_MANAGER' | 'MIXED_MANAGER' | 'COUNTRY_MANAGER' | 'ADMIN';

export type City = 
  | 'WARSAW'
  | 'KRAKOW'
  | 'GDANSK'
  | 'WROCLAW'
  | 'POZNAN'
  | 'LODZ'
  | 'LUBLIN'
  | 'KATOWICE'
  | 'BYDGOSZCZ'
  | 'SZCZECIN'
  | 'TORUN'
  | 'RADOM'
  | 'RZESZOW'
  | 'OLSZTYN'
  | 'BIALYSTOK';

export interface User {
  id: string;
  login: string;
  password: string;
  email?: string;
  name: string;
  role: Role;
  city: City;
  salary?: number;
  currency: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Еженедельные отчеты
export interface WeeklyReport {
  id: string;
  userId: string;
  weekIso: string;
  weekStartDate: Date;
  weekEndDate: Date;
  workdays: number;
  stressLevel: number;
  overtime: boolean;
  overtimeHours?: number;
  nextWeekSchedule?: any; // JSON
  goodWorkWith?: string;
  badWorkWith?: string;
  teamComment?: string;
  notes?: string;
  isCompleted: boolean;
  submittedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// HR метрики
export interface HrMetrics {
  id: string;
  userId: string;
  reportId: string;
  interviews: number;
  jobPosts: number;
  registrations: number;
  difficultCases?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Операционные метрики
export interface OpsMetrics {
  id: string;
  userId: string;
  reportId: string;
  trengoMessages: number;
  trengoTicketsResolved: number;
  crmTicketsResolved: number;
  crmOrdersCity: number;
  difficultCleanerCases?: string;
  difficultClientCases?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Данные менеджера по стране
export interface CountryAggregates {
  id: string;
  managerId: string;
  weekIso: string;
  weekStartDate: Date;
  weekEndDate: Date;
  trengoByPeople?: any; // JSON
  trengoByCity?: any; // JSON
  crmByPeople?: any; // JSON
  crmByCity?: any; // JSON
  hiresByCity?: any; // JSON
  ordersByCity?: any; // JSON
  adjustments?: string;
  comments?: string;
  createdAt: Date;
  updatedAt: Date;
}

// AI анализ
export interface AiAnalysis {
  id: string;
  type: string; // "summary", "notification", "anomaly", "comparison"
  title: string;
  description: string;
  severity: string; // "info", "warning", "critical"
  targetUserId?: string;
  targetCity?: string;
  weekIso: string;
  insights: any; // JSON
  recommendations?: string;
  isNotified: boolean;
  notifiedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// Отчеты
export interface Report {
  id: string;
  type: string; // "personal", "city", "country", "comparison"
  title: string;
  description?: string;
  dateFrom: Date;
  dateTo: Date;
  cities?: any; // JSON массив
  userIds?: any; // JSON массив
  data: any; // JSON данные
  summary?: string;
  exportFormats?: any; // JSON массив
  generatedBy: string;
  createdAt: Date;
  updatedAt: Date;
}

// Формы для ввода данных
export interface LoginFormData {
  login: string;
  password: string;
}

export interface WeeklyReportFormData {
  weekIso: string;
  workdays: number;
  stressLevel: number;
  overtime: boolean;
  overtimeHours?: number;
  nextWeekSchedule?: Record<string, string>;
  goodWorkWith?: string;
  badWorkWith?: string;
  teamComment?: string;
  notes?: string;
}

export interface HrMetricsFormData {
  interviews: number;
  jobPosts: number;
  registrations: number;
  difficultCases?: string;
}

export interface OpsMetricsFormData {
  crmTicketsResolved: number;
  difficultCleanerCases?: string;
  difficultClientCases?: string;
}

export interface CountryAggregatesFormData {
  weekIso: string;
  trengoByPeople?: Record<string, any>;
  trengoByCity?: Record<string, any>;
  crmByPeople?: Record<string, any>;
  crmByCity?: Record<string, any>;
  hiresByCity?: Record<string, number>;
  ordersByCity?: Record<string, number>;
  adjustments?: string;
  comments?: string;
}

// Константы для переводов
export const CITY_LABELS: Record<City, string> = {
  WARSAW: 'Варшава',
  KRAKOW: 'Краков',
  WROCLAW: 'Вроцлав',
  GDANSK: 'Гданьск',
  LODZ: 'Лодзь',
  POZNAN: 'Познань',
  KATOWICE: 'Катовице',
  BIALYSTOK: 'Белосток',
  LUBLIN: 'Люблин',
};

export const ROLE_LABELS: Record<Role, string> = {
  HIRING_MANAGER: 'Менеджер по найму',
  OPS_MANAGER: 'Операционный менеджер',
  MIXED_MANAGER: 'Смешанная роль (найм + операции)',
  COUNTRY_MANAGER: 'Менеджер по стране',
  ADMIN: 'Администратор',
};

// Утилиты для работы с датами
export function getWeekISO(date: Date): string {
  const year = date.getFullYear();
  const week = getWeekNumber(date);
  return `${year}-W${week.toString().padStart(2, '0')}`;
}

export function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

export function getWeekDates(weekIso: string): { start: Date; end: Date } {
  const [year, week] = weekIso.split('-W').map(Number);
  const january4th = new Date(year, 0, 4);
  const monday = new Date(january4th);
  monday.setDate(january4th.getDate() - january4th.getDay() + 1 + (week - 1) * 7);
  
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  
  return { start: monday, end: sunday };
}