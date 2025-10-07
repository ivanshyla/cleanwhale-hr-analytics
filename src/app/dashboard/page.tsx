'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { BarChart3, Users, TrendingUp, MessageSquare, UserCheck, Clock, Settings, LogOut, UserPlus, PieChart, Activity, MessageCircle, Brain, Database, PhoneCall, Building2, Package, AlertTriangle } from 'lucide-react';
import MetricsChart from '@/components/MetricsChart';
import AiAnalyticsChat from '@/components/AiAnalyticsChat';

interface DashboardStats {
  totalUsers: number;
  weeklyHires: number;
}

export default function DashboardPage() {
  const [user, setUser] = useState<any>(null);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [analyticsData, setAnalyticsData] = useState<any>(null);
  const [countryAnalytics, setCountryAnalytics] = useState<any>(null);
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
          
          // Загружаем все данные параллельно
          const promises = [loadDashboardStats()];
          
          // Загружаем аналитику для Country Manager и Admin
          if (data.user.role === 'COUNTRY_MANAGER' || data.user.role === 'ADMIN') {
            promises.push(loadCountryAnalytics());
          }
          
          // Выполняем все запросы параллельно
          await Promise.all(promises);
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

  const loadCountryAnalytics = async () => {
    try {
      const response = await fetch('/api/country-analytics', {
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        setCountryAnalytics(data);
      } else {
        console.error('Failed to load country analytics');
      }
    } catch (error) {
      console.error('Error loading country analytics:', error);
    }
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
            {/* Количество пользователей - только для Country Manager и Admin */}
            {(user?.role === 'COUNTRY_MANAGER' || user?.role === 'ADMIN') && (
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Users className="h-6 w-6 text-blue-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">
                      Всего сотрудников
                    </p>
                    <p className="text-2xl font-bold text-gray-900">{stats.totalUsers}</p>
                  </div>
                </div>
              </div>
            )}

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="p-2 bg-green-100 rounded-lg">
                  <UserCheck className="h-6 w-6 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Найм за неделю</p>
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
                    onClick={() => router.push('/dashboard/country')}
                    className="w-full text-left px-4 py-2 rounded-md border border-blue-200 bg-blue-50 hover:bg-blue-100 transition-colors text-blue-800 flex items-center"
                  >
                    <Building2 className="w-4 h-4 mr-2" />
                    Внести данные
                  </button>
                  
                  <button 
                    onClick={() => router.push('/dashboard/users')}
                    className="w-full text-left px-4 py-2 rounded-md border border-green-200 bg-green-50 hover:bg-green-100 transition-colors text-green-800 flex items-center"
                  >
                    <Users className="w-4 h-4 mr-2" />
                    Пользователи
                  </button>
                  
                  <button 
                    onClick={() => router.push('/dashboard/team-meetings')}
                    className="w-full text-left px-4 py-2 rounded-md border border-orange-200 bg-orange-50 hover:bg-orange-100 transition-colors text-orange-800 flex items-center"
                  >
                    <MessageCircle className="w-4 h-4 mr-2" />
                    Встречи команды
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
              {/* Напоминание для обычных менеджеров */}
              {['HIRING_MANAGER', 'OPS_MANAGER', 'MIXED_MANAGER'].includes(user?.role) && (
                <div className="p-3 bg-yellow-50 rounded-md">
                  <p className="text-sm text-yellow-800">Напоминание: внести еженедельный отчет</p>
                </div>
              )}
              
              {/* Напоминание для Country Manager и Admin */}
              {['ADMIN', 'COUNTRY_MANAGER'].includes(user?.role) && (
                <>
                  <div className="p-3 bg-yellow-50 rounded-md">
                    <p className="text-sm text-yellow-800">Напоминание: внести данные за прошлую неделю</p>
                  </div>
                  <div className="p-3 bg-blue-50 rounded-md">
                    <p className="text-sm text-blue-800">Новый отчет по городу доступен</p>
                  </div>
                </>
              )}
            </div>
          </div>

        </div>

        {/* Аналитика по стране */}
        {(user?.role === 'COUNTRY_MANAGER' || user?.role === 'ADMIN') && (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900 flex items-center">
                <Activity className="h-6 w-6 mr-2 text-blue-600" />
                Аналитика по стране
              </h3>
              <button
                onClick={() => router.push('/dashboard/country-analytics')}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
              >
                Детальная аналитика →
              </button>
            </div>

            {countryAnalytics && countryAnalytics.byEmployee && countryAnalytics.byEmployee.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Сотрудники */}
                <div className="bg-white rounded-xl shadow-lg p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-3 bg-blue-100 rounded-lg">
                      <Users className="h-6 w-6 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Сотрудники</p>
                      <p className="text-2xl font-bold text-gray-900">{countryAnalytics.totalPoland.totalEmployees}</p>
                    </div>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">HR менеджеры:</span>
                      <span className="font-medium">{countryAnalytics.totalPoland.hrManagersCount}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Ops менеджеры:</span>
                      <span className="font-medium">{countryAnalytics.totalPoland.opsManagersCount}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Смешанные:</span>
                      <span className="font-medium">{countryAnalytics.totalPoland.mixedManagersCount}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Городов:</span>
                      <span className="font-medium">{countryAnalytics.totalPoland.totalCities}</span>
                    </div>
                  </div>
                </div>

                {/* HR метрики */}
                <div className="bg-white rounded-xl shadow-lg p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-3 bg-green-100 rounded-lg">
                      <UserCheck className="h-6 w-6 text-green-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">HR метрики</p>
                      <p className="text-2xl font-bold text-gray-900">{countryAnalytics.totalPoland.totalRegistered}</p>
                      <p className="text-xs text-gray-500">регистраций</p>
                    </div>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Собеседований:</span>
                      <span className="font-medium">{countryAnalytics.totalPoland.totalInterviews}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Вакансий:</span>
                      <span className="font-medium">{countryAnalytics.totalPoland.totalJobPosts}</span>
                    </div>
                  </div>
                </div>

                {/* Ops метрики */}
                <div className="bg-white rounded-xl shadow-lg p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-3 bg-purple-100 rounded-lg">
                      <Package className="h-6 w-6 text-purple-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Ops метрики</p>
                      <p className="text-2xl font-bold text-gray-900">{countryAnalytics.totalPoland.totalOrders}</p>
                      <p className="text-xs text-gray-500">заказов</p>
                    </div>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Сообщений:</span>
                      <span className="font-medium">{countryAnalytics.totalPoland.totalMessages}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Тикетов:</span>
                      <span className="font-medium">{countryAnalytics.totalPoland.totalTickets}</span>
                    </div>
                  </div>
                </div>

                {/* Таблица по городам */}
                <div className="md:col-span-3 bg-white rounded-xl shadow-lg overflow-hidden">
                  <div className="px-6 py-4 bg-gray-50 border-b">
                    <h4 className="font-semibold text-gray-900">По городам</h4>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Город</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Сотрудники</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Регистрации</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Заказы</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Стресс</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {countryAnalytics.byCity.map((city: any, idx: number) => (
                          <tr key={idx} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <Building2 className="h-5 w-5 text-gray-400 mr-2" />
                                <span className="font-medium text-gray-900">{getCityLabel(city.city)}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{city.totalEmployees}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">{city.totalRegistered}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">{city.totalOrders}</td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                parseFloat(city.avgStress) >= 7 ? 'bg-red-100 text-red-800' :
                                parseFloat(city.avgStress) >= 5 ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'
                              }`}>
                                {city.avgStress}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-yellow-50 border-l-4 border-yellow-400 p-6 rounded-lg">
                <div className="flex items-start">
                  <AlertTriangle className="h-6 w-6 text-yellow-600 mr-3 mt-0.5" />
                  <div>
                    <h4 className="text-lg font-semibold text-yellow-900 mb-2">
                      Данные отсутствуют за текущую неделю
                    </h4>
                    <p className="text-yellow-800 mb-3">
                      Аналитика формируется на основе еженедельных отчетов менеджеров. 
                      Отчеты ещё не заполнены.
                    </p>
                    <button
                      onClick={() => router.push('/dashboard/country')}
                      className="bg-yellow-600 text-white px-4 py-2 rounded-md hover:bg-yellow-700 transition-colors"
                    >
                      Внести данные
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* AI Analytics Chat */}
        <div className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-lg p-6 mb-8">
          <div className="mb-4">
            <h3 className="text-xl font-bold text-gray-900 flex items-center">
              <Brain className="h-6 w-6 mr-2 text-purple-600" />
              AI Аналитический Ассистент
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              Задайте вопрос о данных вашей команды за неделю или месяц
            </p>
          </div>
          <div className="h-[600px]">
            <AiAnalyticsChat />
          </div>
        </div>
    </div>
  );
}
