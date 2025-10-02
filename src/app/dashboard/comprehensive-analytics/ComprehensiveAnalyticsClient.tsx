'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import dynamic from 'next/dynamic';
import { 
  TrendingUp, Users, Phone, MessageSquare, AlertTriangle, Star, 
  Calendar, ArrowLeft, RefreshCw, Save, BarChart3, Activity, Target
} from 'lucide-react';

const AnalyticsCharts = dynamic(() => import('../../../components/AnalyticsCharts'), {
  ssr: false,
  loading: () => (
    <div className="flex justify-center py-12">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
    </div>
  )
});

// Компонент-обертка для условного рендеринга
function ChartsWrapper({ data }: { data: any[] }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return <AnalyticsCharts data={data} />;
}

interface UnifiedAnalyticsForm {
  reportDate: string;
  weekStartDate: string;
  city: string;
  
  // HR данные
  hrInterviews: number;
  hrJobPostings: number;
  hrRegistrations: number;
  hrCommunications: number;
  hrMeetings: number;
  hrNewHires: number;
  
  // Операционные данные
  totalOrders: number;
  completedOrders: number;
  cancelledOrders: number;
  
  // Жалобы и качество
  totalComplaints: number;
  resolvedComplaints: number;
  complaintTypes?: string;
  
  // Оценки
  avgCustomerRating?: number;
  positiveRatings: number;
  negativeRatings: number;
  
  // Персонал
  activeEmployees: number;
  workingDays: number;
  overtimeHours: number;
  employeeSatisfaction?: number;
}

interface AnalyticsData {
  analytics: any[];
  cityGroups: Record<string, any[]>;
  correlations: Record<string, number>;
  total: number;
}

export default function ComprehensiveAnalyticsClient() {
  const [user, setUser] = useState<any>(null);
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [selectedDateRange, setSelectedDateRange] = useState({
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 дней назад
    end: new Date().toISOString().split('T')[0]
  });
  const router = useRouter();

  const { register, handleSubmit, reset, formState: { errors } } = useForm<UnifiedAnalyticsForm>({
    defaultValues: {
      reportDate: new Date().toISOString().split('T')[0],
      weekStartDate: getWeekStart(new Date()).toISOString().split('T')[0],
      city: 'WARSAW',
    }
  });

  useEffect(() => {
    checkAuth();
  }, [router, selectedDateRange]);

  const checkAuth = async () => {
    try {
      const response = await fetch('/api/auth/me', { credentials: 'include' });
      if (!response.ok) {
        router.push('/login');
        return;
      }
      const data = await response.json();
      setUser(data.user);

      // Только country manager может видеть комплексную аналитику
      if (!['COUNTRY_MANAGER', 'ADMIN'].includes(data.user.role)) {
        router.push('/dashboard');
        return;
      }

      loadAnalyticsData();
    } catch (error) {
      console.error('Auth error:', error);
      router.push('/login');
    }
  };

  const loadAnalyticsData = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        startDate: selectedDateRange.start,
        endDate: selectedDateRange.end,
      });

      const response = await fetch(`/api/unified-analytics?${params}`, {
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        setAnalyticsData(data);
      } else {
        console.error('Failed to load analytics data');
      }
    } catch (error) {
      console.error('Error loading analytics data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const onSubmit = async (data: UnifiedAnalyticsForm) => {
    setIsSubmitting(true);
    try {
      const response = await fetch('/api/unified-analytics', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        setShowForm(false);
        reset();
        loadAnalyticsData();
        alert('Данные успешно сохранены!');
      } else {
        const error = await response.json();
        alert(`Ошибка: ${error.message}`);
      }
    } catch (error) {
      console.error('Error saving data:', error);
      alert('Ошибка сохранения данных');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getWeekStart = (date: Date) => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.setDate(diff));
  };

  const getCityLabel = (city: string) => {
    const labels: Record<string, string> = {
      WARSAW: 'Варшава', KRAKOW: 'Краков', GDANSK: 'Гданьск',
      WROCLAW: 'Вроцлав', POZNAN: 'Познань', LODZ: 'Лодзь',
      KATOWICE: 'Катовице', LUBLIN: 'Люблин', BIALYSTOK: 'Белосток'
    };
    return labels[city] || city;
  };

  const formatCorrelation = (correlation: number) => {
    if (Math.abs(correlation) > 0.7) return { label: 'Сильная', color: 'text-green-600' };
    if (Math.abs(correlation) > 0.4) return { label: 'Умеренная', color: 'text-yellow-600' };
    return { label: 'Слабая', color: 'text-red-600' };
  };

  const prepareChartData = () => {
    if (!analyticsData?.analytics) return [];
    
    return analyticsData.analytics.map(item => ({
      date: new Date(item.reportDate).toLocaleDateString('ru-RU'),
      city: getCityLabel(item.city),
      найм: item.hrNewHires,
      заказы: item.totalOrders,
      жалобы: item.totalComplaints,
      коммуникации: item.hrCommunications,
      рейтинг: item.avgCustomerRating,
      удовлетворенность: item.employeeSatisfaction,
    }));
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <button 
              onClick={() => router.push('/dashboard')}
              className="flex items-center hover:opacity-80 transition-opacity cursor-pointer"
            >
              <img 
                src="/cleanwhale-logo.png" 
                alt="CleanWhale" 
                className="h-10 w-10 rounded-lg mr-3"
              />
              <div className="text-left">
                <span className="text-xl font-bold cw-text-primary">
                  CleanWhale Analytics
                </span>
                <p className="text-xs text-gray-600">Комплексная аналитика</p>
              </div>
            </button>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.push('/dashboard')}
                className="flex items-center text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
              >
                <ArrowLeft className="h-4 w-4 mr-1" />
                Назад
              </button>
              <button
                onClick={() => setShowForm(!showForm)}
                className="flex items-center cw-text-primary border cw-border-primary bg-blue-50 hover:bg-blue-100 px-4 py-2 rounded-md text-sm font-medium transition-colors"
              >
                <BarChart3 className="h-4 w-4 mr-2" />
                Добавить данные
              </button>
              <button
                onClick={() => loadAnalyticsData()}
                className="flex items-center text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
              >
                <RefreshCw className="h-4 w-4 mr-1" />
                Обновить
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Заголовок и фильтры */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Комплексная аналитика HR + Операции</h1>
          <div className="flex items-center space-x-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">От:</label>
              <input
                type="date"
                value={selectedDateRange.start}
                onChange={(e) => setSelectedDateRange(prev => ({ ...prev, start: e.target.value }))}
                className="px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">До:</label>
              <input
                type="date"
                value={selectedDateRange.end}
                onChange={(e) => setSelectedDateRange(prev => ({ ...prev, end: e.target.value }))}
                className="px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Форма добавления данных */}
        {showForm && (
          <div className="bg-white rounded-lg shadow p-6 mb-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Добавить данные аналитики</h2>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Дата отчета</label>
                  <input
                    type="date"
                    {...register('reportDate', { required: 'Дата обязательна' })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Начало недели</label>
                  <input
                    type="date"
                    {...register('weekStartDate', { required: 'Начало недели обязательно' })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Город</label>
                  <select
                    {...register('city', { required: 'Город обязателен' })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="WARSAW">Варшава</option>
                    <option value="KRAKOW">Краков</option>
                    <option value="GDANSK">Гданьск</option>
                    <option value="WROCLAW">Вроцлав</option>
                    <option value="POZNAN">Познань</option>
                    <option value="LODZ">Лодзь</option>
                    <option value="KATOWICE">Катовице</option>
                    <option value="LUBLIN">Люблин</option>
                    <option value="BIALYSTOK">Белосток</option>
                  </select>
                </div>
              </div>

              {/* HR данные */}
              <div className="bg-green-50 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-green-900 mb-3">HR данные (найм и коммуникации)</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Собеседования</label>
                    <input type="number" min="0" {...register('hrInterviews')} className="w-full px-3 py-2 border border-gray-300 rounded-md" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Объявления</label>
                    <input type="number" min="0" {...register('hrJobPostings')} className="w-full px-3 py-2 border border-gray-300 rounded-md" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Регистрации</label>
                    <input type="number" min="0" {...register('hrRegistrations')} className="w-full px-3 py-2 border border-gray-300 rounded-md" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Коммуникации</label>
                    <input type="number" min="0" {...register('hrCommunications')} className="w-full px-3 py-2 border border-gray-300 rounded-md" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Встречи</label>
                    <input type="number" min="0" {...register('hrMeetings')} className="w-full px-3 py-2 border border-gray-300 rounded-md" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Новые наймы</label>
                    <input type="number" min="0" {...register('hrNewHires')} className="w-full px-3 py-2 border border-gray-300 rounded-md" />
                  </div>
                </div>
              </div>

              {/* Операционные данные */}
              <div className="bg-blue-50 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-blue-900 mb-3">Операционные данные</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Всего заказов</label>
                    <input type="number" min="0" {...register('totalOrders')} className="w-full px-3 py-2 border border-gray-300 rounded-md" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Выполнено заказов</label>
                    <input type="number" min="0" {...register('completedOrders')} className="w-full px-3 py-2 border border-gray-300 rounded-md" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Отменено заказов</label>
                    <input type="number" min="0" {...register('cancelledOrders')} className="w-full px-3 py-2 border border-gray-300 rounded-md" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Всего жалоб</label>
                    <input type="number" min="0" {...register('totalComplaints')} className="w-full px-3 py-2 border border-gray-300 rounded-md" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Решено жалоб</label>
                    <input type="number" min="0" {...register('resolvedComplaints')} className="w-full px-3 py-2 border border-gray-300 rounded-md" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Средняя оценка (1-5)</label>
                    <input type="number" min="1" max="5" step="0.1" {...register('avgCustomerRating')} className="w-full px-3 py-2 border border-gray-300 rounded-md" />
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-4">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex items-center px-4 py-2 cw-button"
                >
                  {isSubmitting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Сохранение...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Сохранить
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Корреляции */}
        {analyticsData?.correlations && Object.keys(analyticsData.correlations).length > 0 && (
          <div className="bg-white rounded-lg shadow p-6 mb-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              <Activity className="inline h-5 w-5 mr-2" />
              Корреляции между показателями
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {analyticsData.correlations.hiresOrders !== undefined && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-medium text-gray-900 mb-2">Найм ↔ Заказы</h3>
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-bold">{(analyticsData.correlations.hiresOrders * 100).toFixed(0)}%</span>
                    <span className={`text-sm font-medium ${formatCorrelation(analyticsData.correlations.hiresOrders).color}`}>
                      {formatCorrelation(analyticsData.correlations.hiresOrders).label}
                    </span>
                  </div>
                </div>
              )}
              {analyticsData.correlations.communicationsComplaints !== undefined && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-medium text-gray-900 mb-2">Коммуникации ↔ Жалобы</h3>
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-bold">{(analyticsData.correlations.communicationsComplaints * 100).toFixed(0)}%</span>
                    <span className={`text-sm font-medium ${formatCorrelation(analyticsData.correlations.communicationsComplaints).color}`}>
                      {formatCorrelation(analyticsData.correlations.communicationsComplaints).label}
                    </span>
                  </div>
                </div>
              )}
              {analyticsData.correlations.employeeCustomerSatisfaction !== undefined && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-medium text-gray-900 mb-2">Удовлетворенность сотрудников ↔ клиентов</h3>
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-bold">{(analyticsData.correlations.employeeCustomerSatisfaction * 100).toFixed(0)}%</span>
                    <span className={`text-sm font-medium ${formatCorrelation(analyticsData.correlations.employeeCustomerSatisfaction).color}`}>
                      {formatCorrelation(analyticsData.correlations.employeeCustomerSatisfaction).label}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Графики */}
        {!isLoading && analyticsData?.analytics && analyticsData.analytics.length > 0 && (
          <ChartsWrapper data={prepareChartData()} />
        )}

        {isLoading && (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        )}

        {!isLoading && (!analyticsData?.analytics || analyticsData.analytics.length === 0) && (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Нет данных для анализа</h3>
            <p className="text-gray-600 mb-4">
              Добавьте данные для начала комплексного анализа HR и операционных показателей.
            </p>
            <button
              onClick={() => setShowForm(true)}
              className="cw-button"
            >
              Добавить первые данные
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
