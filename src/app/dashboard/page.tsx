'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { BarChart3, Users, TrendingUp, MessageSquare, UserCheck, Clock, Settings, LogOut, UserPlus, PieChart, Activity, MessageCircle, Brain, Database, PhoneCall } from 'lucide-react';
import MetricsChart from '@/components/MetricsChart';

interface DashboardStats {
  totalUsers: number;
  weeklyHires: number;
}

export default function DashboardPage() {
  const [user, setUser] = useState<any>(null);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [analyticsData, setAnalyticsData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingCharts, setIsLoadingCharts] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Получаем данные пользователя из API (так же как layout)
    const fetchUser = async () => {
      try {
        const response = await fetch('/api/auth/me', {
          cache: 'no-cache',
          headers: {
            'Cache-Control': 'no-cache'
          }
        });
        if (response.ok) {
          const data = await response.json();
          setUser(data.user);
          
          // Загружаем статистику после получения пользователя
          loadDashboardStats();
          
          // Загружаем данные для графиков
          loadAnalyticsData();
        } else {
          router.push('/login');
        }
      } catch (error) {
        console.error('Error fetching user:', error);
        router.push('/login');
      }
    };

    fetchUser();
  }, [router]);

  const loadDashboardStats = async () => {
    try {
      // Загружаем статистику с учетом прав пользователя (токен в cookie)
      const response = await fetch('/api/dashboard-stats', {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setStats(data);
      } else {
        // Fallback к моковым данным при ошибке
        const mockStats = getMockStatsForRole(user?.role);
        setStats(mockStats);
      }
    } catch (error) {
      console.error('Error loading stats:', error);
      // Fallback к моковым данным
      const mockStats = getMockStatsForRole(user?.role);
      setStats(mockStats);
    } finally {
      setIsLoading(false);
    }
  };

  const getMockStatsForRole = (role: string) => {
    // Директор по стране видит все данные
    if (role === 'COUNTRY_MANAGER' || role === 'ADMIN') {
      return {
        totalUsers: 15,
        weeklyHires: 12,
      };
    }
    
    // Обычные менеджеры видят данные своего города
    return {
      totalUsers: 3, // Примерно 3-4 человека в городе
      weeklyHires: 2,
    };
  };

  const loadAnalyticsData = async () => {
    setIsLoadingCharts(true);
    try {
      const response = await fetch('/api/analytics-data?period=7&type=overview', {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setAnalyticsData(data.data);
      } else {
        console.error('Failed to load analytics data');
        // Fallback к моковым данным
        setAnalyticsData(generateMockAnalyticsData());
      }
    } catch (error) {
      console.error('Error loading analytics data:', error);
      // Fallback к моковым данным
      setAnalyticsData(generateMockAnalyticsData());
    } finally {
      setIsLoadingCharts(false);
    }
  };

  const generateMockAnalyticsData = () => {
    const dates = Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (6 - i));
      return date.toISOString().split('T')[0];
    });

    return dates.map(date => ({
      reportDate: date,
      hiredPeople: Math.floor(Math.random() * 5) + 1,
      interviews: Math.floor(Math.random() * 10) + 5,
      applications: Math.floor(Math.random() * 15) + 10,
      ordersProcessed: Math.floor(Math.random() * 50) + 20,
      overtimeHours: Math.floor(Math.random() * 8),
      teamMeetings: Math.floor(Math.random() * 3) + 1,
      user: {
        id: '1',
        name: 'Тестовый пользователь',
        role: 'HR',
        city: 'WARSAW'
      }
    }));
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/login');
    } catch (error) {
      console.error('Logout error:', error);
      router.push('/login');
    }
  };

  const getRoleLabel = (role: string) => {
    const labels: Record<string, string> = {
      HIRING_MANAGER: 'HR менеджер',
      OPS_MANAGER: 'Операционный менеджер',
      MIXED_MANAGER: 'Смешанная роль',
      COUNTRY_MANAGER: 'Менеджер по стране',
      ADMIN: 'Администратор',
    };
    return labels[role] || role;
  };

  const getCityLabel = (city: string) => {
    const labels: Record<string, string> = {
      WARSAW: 'Варшава',
      KRAKOW: 'Краков',
      GDANSK: 'Гданьск',
      WROCLAW: 'Вроцлав',
      POZNAN: 'Познань',
      LODZ: 'Лодзь',
      LUBLIN: 'Люблин',
      KATOWICE: 'Катовице',
      BYDGOSZCZ: 'Быдгощ',
      SZCZECIN: 'Щецин',
      TORUN: 'Торунь',
      RADOM: 'Радом',
      RZESZOW: 'Жешув',
      OLSZTYN: 'Ольштын',
      BIALYSTOK: 'Белосток',
    };
    return labels[city] || city.charAt(0) + city.slice(1).toLowerCase();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div>
      {/* Main Content - убрали дублирующий header */}
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">
            Добро пожаловать в дашборд аналитики!
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            {user?.role === 'COUNTRY_MANAGER' || user?.role === 'ADMIN' 
              ? 'Здесь вы можете отслеживать все метрики по стране и анализировать общую производительность'
              : `Здесь вы можете отслеживать свои метрики и показатели по городу ${getCityLabel(user?.city || '')}`
            }
          </p>
        </div>

        {/* Stats Grid */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Users className="h-6 w-6 text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">
                    {user?.role === 'COUNTRY_MANAGER' || user?.role === 'ADMIN' 
                      ? 'Всего пользователей' 
                      : `Пользователей в ${getCityLabel(user?.city || '')}`
                    }
                  </p>
                  <p className="text-2xl font-bold text-gray-900">{stats.totalUsers}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="p-2 bg-green-100 rounded-lg">
                  <UserCheck className="h-6 w-6 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Найми за неделю</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.weeklyHires}</p>
                </div>
              </div>
            </div>


          </div>
        )}

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Основные действия</h3>
            <div className="space-y-3">
              {/* Для линейных менеджеров */}
              {['HIRING_MANAGER', 'OPS_MANAGER', 'MIXED_MANAGER'].includes(user?.role) && (
                <>
                  <button 
                    onClick={() => router.push('/dashboard/weekly-report')}
                    className="w-full text-left px-4 py-2 rounded-md border border-purple-200 bg-purple-50 hover:bg-purple-100 transition-colors text-purple-800 flex items-center"
                  >
                    <Clock className="w-4 h-4 mr-2" />
                    Еженедельный отчет
                  </button>
                  
                  <button 
                    onClick={() => router.push('/dashboard/schedule')}
                    className="w-full text-left px-4 py-2 rounded-md border border-blue-200 bg-blue-50 hover:bg-blue-100 transition-colors text-blue-800 flex items-center"
                  >
                    <Clock className="w-4 h-4 mr-2" />
                    Мой график
                  </button>
                </>
              )}

              {/* Для администраторов и менеджеров по стране */}
              {['ADMIN', 'COUNTRY_MANAGER'].includes(user?.role) && (
                <>
                  <button 
                    onClick={() => router.push('/dashboard/analytics')}
                    className="w-full text-left px-4 py-2 rounded-md border border-blue-200 bg-blue-50 hover:bg-blue-100 transition-colors text-blue-800 flex items-center"
                  >
                    <BarChart3 className="w-4 h-4 mr-2" />
                    Аналитика
                  </button>
                  
                  <button 
                    onClick={() => router.push('/dashboard/users')}
                    className="w-full text-left px-4 py-2 rounded-md border border-green-200 bg-green-50 hover:bg-green-100 transition-colors text-green-800 flex items-center"
                  >
                    <Users className="w-4 h-4 mr-2" />
                    Пользователи
                  </button>
                  
                  <button 
                    onClick={() => router.push('/dashboard/metrics')}
                    className="w-full text-left px-4 py-2 rounded-md border border-yellow-200 bg-yellow-50 hover:bg-yellow-100 transition-colors text-yellow-800 flex items-center"
                  >
                    <TrendingUp className="w-4 h-4 mr-2" />
                    Метрики
                  </button>
                </>
              )}

              {/* Только для администраторов */}
              {user?.role === 'ADMIN' && (
                <button 
                  onClick={() => router.push('/dashboard/ai-insights')}
                  className="w-full text-left px-4 py-2 rounded-md border border-pink-200 bg-pink-50 hover:bg-pink-100 transition-colors text-pink-800 flex items-center"
                >
                  <Brain className="w-4 h-4 mr-2" />
                  AI Инсайты
                </button>
              )}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Последние уведомления</h3>
            <div className="space-y-3">
              <div className="p-3 bg-yellow-50 rounded-md">
                <p className="text-sm text-yellow-800">Напоминание: внести данные за прошлую неделю</p>
              </div>
              <div className="p-3 bg-blue-50 rounded-md">
                <p className="text-sm text-blue-800">Новый отчет по городу доступен</p>
              </div>
            </div>
          </div>

        </div>

        {/* Интерактивные графики */}
        <div className="space-y-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-medium text-gray-900 flex items-center">
                <Activity className="h-5 w-5 mr-2 text-blue-600" />
                Аналитика за последние 7 дней
              </h3>
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <Clock className="h-4 w-4" />
                <span>Обновляется в реальном времени</span>
              </div>
            </div>

            {isLoadingCharts ? (
              <div className="h-64 bg-gray-50 rounded-lg flex items-center justify-center">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                  <p className="text-gray-500">Загрузка графиков...</p>
                </div>
              </div>
            ) : analyticsData && analyticsData.length > 0 ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* График найма (для HR и менеджеров) */}
                {(user?.role === 'HR' || user?.role === 'MIXED' || user?.role === 'COUNTRY_MANAGER' || user?.role === 'ADMIN') && (
                  <MetricsChart
                    data={analyticsData}
                    chartType="line"
                    metric="hiredPeople"
                    title="Динамика найма"
                    color="#10B981"
                    height={250}
                  />
                )}

                {/* График заказов (для Operations и менеджеров) */}
                {(user?.role === 'OPERATIONS' || user?.role === 'MIXED' || user?.role === 'COUNTRY_MANAGER' || user?.role === 'ADMIN') && (
                  <MetricsChart
                    data={analyticsData}
                    chartType="bar"
                    metric="ordersProcessed"
                    title="Обработанные заказы"
                    color="#3B82F6"
                    height={250}
                  />
                )}

                {/* График переработок (для всех) */}
                <MetricsChart
                  data={analyticsData}
                  chartType="line"
                  metric="overtimeHours"
                  title="Переработки (часы)"
                  color="#EF4444"
                  height={250}
                />

                {/* График встреч команды (для всех) */}
                <MetricsChart
                  data={analyticsData}
                  chartType="bar"
                  metric="teamMeetings"
                  title="Встречи команды"
                  color="#8B5CF6"
                  height={250}
                />
              </div>
            ) : (
              <div className="h-64 bg-gray-50 rounded-lg flex items-center justify-center">
                <div className="text-center">
                  <PieChart className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">Нет данных для отображения графиков</p>
                  <p className="text-sm text-gray-400 mt-2">
                    Добавьте метрики, чтобы увидеть аналитику
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Дополнительная аналитика для менеджеров */}
          {(user?.role === 'COUNTRY_MANAGER' || user?.role === 'ADMIN') && analyticsData && analyticsData.length > 0 && (
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-6 flex items-center">
                <TrendingUp className="h-5 w-5 mr-2 text-purple-600" />
                Расширенная аналитика (только для директора)
              </h3>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <MetricsChart
                  data={analyticsData}
                  chartType="line"
                  metric="interviews"
                  title="Тренд интервью по стране"
                  color="#06B6D4"
                  height={250}
                />
                <MetricsChart
                  data={analyticsData}
                  chartType="pie"
                  metric="hiredPeople"
                  title="Распределение найма по регионам"
                  color="#F59E0B"
                  height={250}
                />
              </div>
            </div>
          )}
        </div>
    </div>
  );
}
