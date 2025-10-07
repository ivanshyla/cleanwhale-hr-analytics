'use client';

import { useEffect, useState } from 'react';
import { 
  Users, Building2, Briefcase, TrendingUp, 
  Calendar, FileDown, ChevronLeft, ChevronRight,
  Wallet, UserCheck, ClipboardList, MessageSquare,
  Package, Clock, AlertTriangle, BarChart3, Brain
} from 'lucide-react';
import { isoWeekOf, formatWeekForDisplay, getPreviousWeek, getNextWeek, isCurrentWeek } from '@/lib/week';
import { useAuth, withAuth } from '@/contexts/AuthContext';

interface EmployeeData {
  userId: number;
  name: string;
  login: string;
  role: string;
  city: string;
  interviews: number;
  jobPosts: number;
  registered: number;
  hrFullDays: number;
  hrStress: number;
  hrOvertime: boolean;
  messages: number;
  tickets: number;
  orders: number;
  opsFullDays: number;
  opsStress: number;
  opsOvertime: boolean;
  workdays: number;
  stressLevel: number;
  overtime: boolean;
  overtimeHours: number;
}

interface CityData {
  city: string;
  totalEmployees: number;
  hrManagers: number;
  opsManagers: number;
  mixedManagers: number;
  totalInterviews: number;
  totalJobPosts: number;
  totalRegistered: number;
  totalMessages: number;
  totalTickets: number;
  totalOrders: number;
  totalWorkdays: number;
  avgStress: string;
  totalOvertime: number;
}

interface TypeData {
  type: string;
  count: number;
  totalInterviews: number;
  totalRegistered: number;
  totalMessages: number;
  totalTickets: number;
  totalOrders: number;
  totalWorkdays: number;
  avgStress: string;
}

interface PolandData {
  totalEmployees: number;
  totalCities: number;
  totalInterviews: number;
  totalJobPosts: number;
  totalRegistered: number;
  totalMessages: number;
  totalTickets: number;
  totalOrders: number;
  totalWorkdays: number;
  avgStress: string;
  totalOvertime: number;
  hrManagersCount: number;
  opsManagersCount: number;
  mixedManagersCount: number;
}

interface AnalyticsData {
  weekIso: string;
  byEmployee: EmployeeData[];
  byCity: CityData[];
  byType: TypeData[];
  totalPoland: PolandData;
  generatedAt: string;
}

const ROLE_LABELS: Record<string, string> = {
  'HIRING_MANAGER': 'HR',
  'OPS_MANAGER': 'Ops',
  'MIXED_MANAGER': 'HR+Ops',
  'COUNTRY_MANAGER': 'Страна',
  'ADMIN': 'Админ'
};

const CITY_LABELS: Record<string, string> = {
  'WARSAW': 'Варшава',
  'KRAKOW': 'Краков',
  'WROCLAW': 'Вроцлав',
  'GDANSK': 'Гданьск',
  'LODZ': 'Лодзь',
  'POZNAN': 'Познань',
  'KATOWICE': 'Катовице',
  'BIALYSTOK': 'Белосток',
  'LUBLIN': 'Люблин'
};

function CountryAnalyticsPage() {
  const { user } = useAuth();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [currentWeek, setCurrentWeek] = useState<string>(isoWeekOf());
  const [activeTab, setActiveTab] = useState<'poland' | 'cities' | 'types' | 'employees'>('poland');

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [currentWeek, user]);

  const loadData = async () => {
    setIsLoadingData(true);
    try {
      const response = await fetch(`/api/country-analytics?weekIso=${currentWeek}`, {
        credentials: 'include'
      });

      if (!response.ok) throw new Error('Failed to load data');

      const analyticsData = await response.json();
      setData(analyticsData);
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setIsLoadingData(false);
    }
  };

  const [isGeneratingReport, setIsGeneratingReport] = useState(false);

  const exportToExcel = async () => {
    if (!data) return;
    
    setIsGeneratingReport(true);
    
    try {
      const response = await fetch('/api/export/ai-report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          weekIso: currentWeek
        })
      });

      if (!response.ok) {
        throw new Error('Failed to generate report');
      }

      const result = await response.json();
      
      if (result.success && result.report) {
        // Скачиваем как markdown файл
        const blob = new Blob([result.report], { type: 'text/markdown;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `ai-report-${currentWeek}.md`;
        link.click();
      } else {
        alert('Ошибка генерации отчета');
      }
    } catch (error) {
      console.error('Error generating AI report:', error);
      alert('Ошибка при генерации отчета. Попробуйте еще раз.');
    } finally {
      setIsGeneratingReport(false);
    }
  };

  if (isLoadingData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-600">Загружаем аналитику...</p>
        </div>
      </div>
    );
  }

  // Проверяем, есть ли данные
  const hasData = data && data.byEmployee && data.byEmployee.length > 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Предупреждение если нет данных */}
        {!hasData && (
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-6 mb-6 rounded-lg">
            <div className="flex items-start">
              <AlertTriangle className="h-6 w-6 text-yellow-600 mr-3 mt-0.5" />
              <div>
                <h3 className="text-lg font-semibold text-yellow-900 mb-2">
                  Данные отсутствуют за выбранную неделю
                </h3>
                <p className="text-yellow-800 mb-3">
                  Аналитика по стране формируется на основе еженедельных отчетов менеджеров. 
                  Для выбранной недели {formatWeekForDisplay(currentWeek)} отчеты ещё не заполнены.
                </p>
                <div className="text-sm text-yellow-700 bg-yellow-100 rounded p-3 mb-3">
                  <p className="font-medium mb-2">Что делать:</p>
                  <ol className="list-decimal list-inside space-y-1">
                    <li>Попросите менеджеров заполнить еженедельные отчеты</li>
                    <li>Используйте страницу "Внести данные" для ввода агрегированных данных по городам</li>
                    <li>После заполнения отчетов данные появятся здесь автоматически</li>
                  </ol>
                </div>
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

        {/* Заголовок */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Аналитика по стране</h1>
              <p className="text-gray-600 mt-1">Агрегированные данные из отчетов менеджеров</p>
            </div>
            <button
              onClick={exportToExcel}
              disabled={isGeneratingReport}
              className="px-6 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isGeneratingReport ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                  Генерация отчета...
                </>
              ) : (
                <>
                  <Brain className="h-4 w-4" />
                  AI Отчет для правления
                </>
              )}
            </button>
          </div>

          {/* Навигация по неделям */}
          <div className="flex items-center justify-between bg-gray-50 rounded-lg p-3">
            <button
              onClick={() => setCurrentWeek(getPreviousWeek(currentWeek))}
              className="flex items-center gap-2 px-3 py-2 text-gray-700 hover:bg-white rounded-md transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
              Предыдущая
            </button>

            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-blue-600" />
              <span className="font-medium text-gray-900">
                {formatWeekForDisplay(currentWeek)}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentWeek(getNextWeek(currentWeek))}
                disabled={isCurrentWeek(currentWeek)}
                className="flex items-center gap-2 px-3 py-2 text-gray-700 hover:bg-white rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Следующая
                <ChevronRight className="h-4 w-4" />
              </button>
              {!isCurrentWeek(currentWeek) && (
                <button
                  onClick={() => setCurrentWeek(isoWeekOf())}
                  className="px-3 py-2 text-blue-600 hover:bg-blue-50 rounded-md transition-colors text-sm font-medium"
                >
                  Текущая неделя
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Табы */}
        {hasData && (
          <div className="bg-white rounded-xl shadow-lg mb-6">
            <div className="flex border-b">
              <button
                onClick={() => setActiveTab('poland')}
                className={`flex-1 px-6 py-4 font-medium transition-colors ${
                  activeTab === 'poland'
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <div className="flex items-center justify-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Общая по Польше
                </div>
              </button>
              <button
                onClick={() => setActiveTab('cities')}
                className={`flex-1 px-6 py-4 font-medium transition-colors ${
                  activeTab === 'cities'
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <div className="flex items-center justify-center gap-2">
                  <Building2 className="h-5 w-5" />
                  По городам ({data?.byCity?.length || 0})
                </div>
              </button>
              <button
                onClick={() => setActiveTab('types')}
                className={`flex-1 px-6 py-4 font-medium transition-colors ${
                  activeTab === 'types'
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <div className="flex items-center justify-center gap-2">
                  <Briefcase className="h-5 w-5" />
                  По типам ({data?.byType?.length || 0})
                </div>
              </button>
              <button
                onClick={() => setActiveTab('employees')}
                className={`flex-1 px-6 py-4 font-medium transition-colors ${
                  activeTab === 'employees'
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <div className="flex items-center justify-center gap-2">
                  <Users className="h-5 w-5" />
                  По сотрудникам ({data?.byEmployee?.length || 0})
                </div>
              </button>
            </div>
          </div>
        )}

        {/* Контент табов */}
        {!hasData ? (
          <div className="bg-white rounded-xl shadow-lg p-12 text-center">
            <BarChart3 className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-700 mb-2">Нет данных для отображения</h3>
            <p className="text-gray-500">Выберите другую неделю или заполните отчеты</p>
          </div>
        ) : activeTab === 'poland' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Сотрудники */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-blue-100 rounded-lg">
                  <Users className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Сотрудники</p>
                  <p className="text-2xl font-bold text-gray-900">{data.totalPoland.totalEmployees}</p>
                </div>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">HR менеджеры:</span>
                  <span className="font-medium">{data.totalPoland.hrManagersCount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Ops менеджеры:</span>
                  <span className="font-medium">{data.totalPoland.opsManagersCount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Смешанные:</span>
                  <span className="font-medium">{data.totalPoland.mixedManagersCount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Городов:</span>
                  <span className="font-medium">{data.totalPoland.totalCities}</span>
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
                  <p className="text-2xl font-bold text-gray-900">{data.totalPoland.totalRegistered}</p>
                  <p className="text-xs text-gray-500">регистраций</p>
                </div>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Собеседований:</span>
                  <span className="font-medium">{data.totalPoland.totalInterviews}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Вакансий:</span>
                  <span className="font-medium">{data.totalPoland.totalJobPosts}</span>
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
                  <p className="text-2xl font-bold text-gray-900">{data.totalPoland.totalOrders}</p>
                  <p className="text-xs text-gray-500">заказов</p>
                </div>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Сообщений:</span>
                  <span className="font-medium">{data.totalPoland.totalMessages}</span>
                </div>
              </div>
            </div>

            {/* Рабочие показатели */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-orange-100 rounded-lg">
                  <Clock className="h-6 w-6 text-orange-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Рабочие дни</p>
                  <p className="text-2xl font-bold text-gray-900">{data.totalPoland.totalWorkdays}</p>
                </div>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Переработка:</span>
                  <span className="font-medium">{data.totalPoland.totalOvertime} ч</span>
                </div>
              </div>
            </div>

            {/* Средний стресс */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className={`p-3 rounded-lg ${
                  parseFloat(data.totalPoland.avgStress) >= 7 ? 'bg-red-100' :
                  parseFloat(data.totalPoland.avgStress) >= 5 ? 'bg-yellow-100' : 'bg-green-100'
                }`}>
                  <AlertTriangle className={`h-6 w-6 ${
                    parseFloat(data.totalPoland.avgStress) >= 7 ? 'text-red-600' :
                    parseFloat(data.totalPoland.avgStress) >= 5 ? 'text-yellow-600' : 'text-green-600'
                  }`} />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Средний стресс</p>
                  <p className="text-2xl font-bold text-gray-900">{data.totalPoland.avgStress}</p>
                  <p className="text-xs text-gray-500">из 10</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {hasData && activeTab === 'cities' && (
          <div className="bg-white rounded-xl shadow-lg overflow-hidden">
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
                  {data.byCity.map((city, idx) => (
                    <tr key={idx} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <Building2 className="h-5 w-5 text-gray-400 mr-2" />
                          <span className="font-medium text-gray-900">{CITY_LABELS[city.city] || city.city}</span>
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
        )}

        {hasData && activeTab === 'types' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {data.byType.map((type, idx) => (
              <div key={idx} className="bg-white rounded-xl shadow-lg p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-3 bg-blue-100 rounded-lg">
                    <Briefcase className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">{ROLE_LABELS[type.type] || type.type}</p>
                    <p className="text-2xl font-bold text-gray-900">{type.count}</p>
                    <p className="text-xs text-gray-500">сотрудников</p>
                  </div>
                </div>
                <div className="space-y-2 text-sm">
                  {type.totalRegistered > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Регистрации:</span>
                      <span className="font-medium">{type.totalRegistered}</span>
                    </div>
                  )}
                  {type.totalOrders > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Заказы:</span>
                      <span className="font-medium">{type.totalOrders}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-gray-600">Стресс:</span>
                    <span className={`font-medium ${
                      parseFloat(type.avgStress) >= 7 ? 'text-red-600' :
                      parseFloat(type.avgStress) >= 5 ? 'text-yellow-600' : 'text-green-600'
                    }`}>
                      {type.avgStress}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {hasData && activeTab === 'employees' && (
          <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Сотрудник</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Роль</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Город</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Регистр.</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Заказы</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Раб.дни</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Стресс</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Переработка</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {data.byEmployee.map((emp, idx) => (
                    <tr key={idx} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{emp.name}</div>
                          <div className="text-sm text-gray-500">{emp.login}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                          {ROLE_LABELS[emp.role] || emp.role}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {CITY_LABELS[emp.city] || emp.city}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{emp.registered}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{emp.orders}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{emp.workdays}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          emp.stressLevel >= 7 ? 'bg-red-100 text-red-800' :
                          emp.stressLevel >= 5 ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'
                        }`}>
                          {emp.stressLevel}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {emp.overtime ? (
                          <span className="text-orange-600 font-medium">{emp.overtimeHours} ч</span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Защита страницы: только для ADMIN и COUNTRY_MANAGER
export default withAuth(CountryAnalyticsPage, ['ADMIN', 'COUNTRY_MANAGER']);

