// API контракты для еженедельных отчетов

export interface HRMetrics {
  interviews: number;
  jobPosts: number;
  registered: number;    // registrations в нашей БД
  fullDays: number;
  difficult: string;     // difficultCases в нашей БД
  stress: number;        // 0-10
  overtime: boolean;
}

export interface OPSMetrics {
  messages: number;
  tickets: number;
  orders: number;
  fullDays: number;
  diffCleaners: string;
  diffClients: string;
  stress: number;        // 0-10
  overtime: boolean;
  sourceMsg?: string;    // 'api'|'manual'
  sourceTkt?: string;    // 'api'|'manual'
  sourceOrd?: string;    // 'api'|'manual'
}

// POST /api/weekly-reports
export interface WeeklyReportRequest {
  role: 'hr' | 'ops' | 'mixed';
  weekIso: string;
  hr?: Partial<Pick<HRMetrics, 'interviews' | 'jobPosts' | 'registered' | 'fullDays' | 'difficult' | 'stress' | 'overtime'>>;
  ops?: Partial<Pick<OPSMetrics, 'messages' | 'tickets' | 'orders' | 'fullDays' | 'diffCleaners' | 'diffClients' | 'stress' | 'overtime'>>;
}

export interface WeeklyReportResponse {
  success: boolean;
  weekIso: string;
  role: string;
  data: {
    hr?: HRMetrics;
    ops?: OPSMetrics;
  };
}

// GET /api/weekly-reports/:weekIso?role=hr|ops
export interface WeeklyReportGetResponse {
  weekIso: string;
  hr?: HRMetrics | null;
  ops?: OPSMetrics | null;
}

// GET /api/analytics-data?weekIso=...
export interface CityAggregate {
  city: string;
  fullDays: number;
  interviews?: number;
  jobPosts?: number;
  registered?: number;
  messages?: number;
  tickets?: number;
  orders?: number;
  usersCount: number;
}

export interface WeekComparison {
  thisWeek: number;
  lastWeek: number | null;
  delta: number | null;  // (thisWeek - lastWeek) / lastWeek
  deltaPercent: string;  // "±X.X%"
}

export interface AnalyticsResponse {
  weekIso: string;
  summary: {
    totalFullDays: WeekComparison;
    totalInterviews: WeekComparison;
    totalMessages: WeekComparison;
    totalTickets: WeekComparison;
    totalOrders: WeekComparison;
    activeUsers: number;
  };
  byCity: CityAggregate[];
  trends: {
    weekIso: string;
    totalFullDays: number;
    totalUsers: number;
  }[];
}

// Утилиты для расчетов
export interface WeeklyCalculations {
  // Человеко-дни по городу/неделе
  getFullDaysByCity: (weekIso: string) => Promise<Record<string, number>>;
  
  // Δ неделя к неделе
  getWeekDelta: (thisWeek: number, lastWeek: number | null) => {
    delta: number | null;
    deltaPercent: string;
  };
}
