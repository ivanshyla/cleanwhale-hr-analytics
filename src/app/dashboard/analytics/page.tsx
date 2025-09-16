'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { BarChart3, TrendingUp, Users, Calendar, Filter } from 'lucide-react';
import MetricsChart from '@/components/MetricsChart';
import { CITY_LABELS } from '@/types';

interface MetricsData {
  reportDate: string;
  hiredPeople?: number;
  interviews?: number;
  applications?: number;
  ordersProcessed?: number;
  customerCalls?: number;
  trengoMessages?: number;
  trengoTicketsResolved?: number;
  crmTicketsResolved?: number;
  overtimeHours?: number;
  teamMeetings?: number;
  trainingHours?: number;
  user?: {
    id: string;
    name: string;
    role: string;
    city: string;
  };
}

export default function AnalyticsPage() {
  const [user, setUser] = useState<any>(null);
  const [metricsData, setMetricsData] = useState<MetricsData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState({
    since: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 дней назад
    until: new Date().toISOString().split('T')[0], // сегодня
  });
  const [includeAllUsers, setIncludeAllUsers] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // Проверяем токен и загружаем данные пользователя
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      setUser({
        id: payload.userId,
        email: payload.email,
        role: payload.role,
        city: payload.city,
      });
      
      loadMetricsData(payload.role);
    } catch (error) {
      console.error('Invalid token:', error);
      router.push('/login');
    }
  }, [router]);

  const loadMetricsData = async (userRole?: string) => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const params = new URLSearchParams({
        since: dateFilter.since,
        until: dateFilter.until,
      });

      // Админы и менеджеры могут видеть данные всех пользователей
      if (includeAllUsers && (userRole === 'ADMIN' || userRole === 'COUNTRY_MANAGER')) {
        params.append('include_all', 'true');
      }

      const response = await fetch(`/api/metrics?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const result = await response.json();
        setMetricsData(result.metrics);
      } else {
        console.error('Failed to load metrics data');
      }
    } catch (error) {
      console.error('Error loading metrics:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDateFilterChange = () => {
    loadMetricsData(user?.role);
  };

  const getRoleLabel = (role: string) => {
    const labels: Record<string, string> = {
      HR: 'HR менеджер',
      OPERATIONS_MANAGER: 'Операционный менеджер',
      COUNTRY_MANAGER: 'Менеджер по стране',
      ADMIN: 'Администратор',
    };
    return labels[role] || role;
  };

  const getCityLabel = (city: string) => {
    return CITY_LABELS[city as keyof typeof CITY_LABELS] || city;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const isManagerOrAdmin = user?.role === 'ADMIN' || user?.role === 'COUNTRY_MANAGER';
  const isHR = user?.role === 'HR';
  const isOps = user?.role === 'OPERATIONS_MANAGER';

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <BarChart3 className="h-8 w-8 text-blue-600" />
              <span className="ml-2 text-xl font-bold text-gray-900">
                Аналитика данных
              </span>
            </div>
            <div className="text-sm text-gray-600">
              {user && (
                <span>
                  {getRoleLabel(user.role)} • {getCityLabel(user.city)}
                </span>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Фильтры */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-lg font-medium text-gray-900 mb-4">
            <Filter className="inline h-5 w-5 mr-2" />
            Фильтры данных
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Calendar className="inline h-4 w-4 mr-1" />
                С даты
              </label>
              <input
                type="date"
                value={dateFilter.since}
                onChange={(e) => setDateFilter({ ...dateFilter, since: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                До даты
              </label>
              <input
                type="date"
                value={dateFilter.until}
                onChange={(e) => setDateFilter({ ...dateFilter, until: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            {isManagerOrAdmin && (
              <div className="flex items-end">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={includeAllUsers}
                    onChange={(e) => setIncludeAllUsers(e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                  />
                  <span className="ml-2 text-sm text-gray-700">
                    <Users className="inline h-4 w-4 mr-1" />
                    Все пользователи
                  </span>
                </label>
              </div>
            )}
            <div className="flex items-end">
              <button
                onClick={handleDateFilterChange}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                Применить фильтры
              </button>
            </div>
          </div>
        </div>

        {/* Статистика */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <BarChart3 className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Всего записей</p>
                <p className="text-2xl font-bold text-gray-900">{metricsData.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <Users className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Пользователей</p>
                <p className="text-2xl font-bold text-gray-900">
                  {new Set(metricsData.map(m => m.user?.id)).size}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <TrendingUp className="h-6 w-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Городов</p>
                <p className="text-2xl font-bold text-gray-900">
                  {new Set(metricsData.map(m => m.user?.city)).size}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-orange-100 rounded-lg">
                <Calendar className="h-6 w-6 text-orange-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Период (дней)</p>
                <p className="text-2xl font-bold text-gray-900">
                  {Math.ceil((new Date(dateFilter.until).getTime() - new Date(dateFilter.since).getTime()) / (1000 * 60 * 60 * 24))}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Графики */}
        <div className="space-y-8">
          {/* HR метрики */}
          {(isHR || isManagerOrAdmin) && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <MetricsChart
                data={metricsData}
                chartType="line"
                metric="hiredPeople"
                title="Динамика найма сотрудников"
                color="#10B981"
              />
              <MetricsChart
                data={metricsData}
                chartType="bar"
                metric="interviews"
                title="Количество интервью"
                color="#3B82F6"
              />
              <MetricsChart
                data={metricsData}
                chartType="line"
                metric="applications"
                title="Заявки кандидатов"
                color="#8B5CF6"
              />
              <MetricsChart
                data={metricsData}
                chartType="pie"
                metric="hiredPeople"
                title="Найм по городам"
                color="#F59E0B"
              />
            </div>
          )}

          {/* Операционные метрики */}
          {(isOps || isManagerOrAdmin) && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <MetricsChart
                data={metricsData}
                chartType="line"
                metric="ordersProcessed"
                title="Обработанные заказы"
                color="#EF4444"
              />
              <MetricsChart
                data={metricsData}
                chartType="bar"
                metric="customerCalls"
                title="Звонки клиентам"
                color="#F97316"
              />
              <MetricsChart
                data={metricsData}
                chartType="line"
                metric="trengoTicketsResolved"
                title="Решенные тикеты Trengo"
                color="#06B6D4"
              />
              <MetricsChart
                data={metricsData}
                chartType="pie"
                metric="ordersProcessed"
                title="Заказы по городам"
                color="#84CC16"
              />
            </div>
          )}

          {/* Общие метрики */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <MetricsChart
              data={metricsData}
              chartType="line"
              metric="overtimeHours"
              title="Переработки (часы)"
              color="#DC2626"
            />
            <MetricsChart
              data={metricsData}
              chartType="bar"
              metric="teamMeetings"
              title="Встречи команды"
              color="#7C3AED"
            />
            <MetricsChart
              data={metricsData}
              chartType="line"
              metric="trainingHours"
              title="Часы обучения"
              color="#059669"
            />
            <MetricsChart
              data={metricsData}
              chartType="pie"
              metric="overtimeHours"
              title="Переработки по городам"
              color="#B91C1C"
            />
          </div>
        </div>

        {metricsData.length === 0 && (
          <div className="text-center py-12">
            <BarChart3 className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">Нет данных</h3>
            <p className="mt-1 text-sm text-gray-500">
              За выбранный период данные отсутствуют. Попробуйте изменить фильтры или добавить новые метрики.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
