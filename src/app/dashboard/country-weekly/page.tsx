'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { Calendar, Save, TrendingUp, Globe, MapPin, Wallet, AlertTriangle, Target, BarChart3, Clock, Users, Briefcase } from 'lucide-react';
import { isoWeekOf, parseIsoWeek } from '@/lib/week';

interface WeeklyCountryReportData {
  reportDate: string;
  weekNumber: number;
  
  // ===== ЕЖЕНЕДЕЛЬНЫЕ ЦИФРЫ =====
  
  // ОБЩИЕ KPI ПО СТРАНЕ
  totalRevenue: number;
  totalOrders: number;
  totalHires: number;
  totalWorkingDays: number;
  activeEmployees: number;
  
  // ФИНАНСОВЫЕ ПОКАЗАТЕЛИ  
  weeklyRevenue: number;
  weeklyProfit: number;
  marketingSpend: number;
  operationalCosts: number;
  avgOrderValue: number;
  costPerHire: number;
  costPerOrder: number;
  
  // КЛИЕНТСКИЕ МЕТРИКИ
  newClients: number;
  clientRetention: number; // %
  customerSatisfaction: number; // 1-10
  avgResponseTime: number; // часы
  complaintRate: number; // %
  
  
  // HR МЕТРИКИ
  employeeSatisfaction: number; // 1-10
  turnoverRate: number; // %
  avgStressLevel: number; // 1-10
  overtimeRate: number; // %
  sickDays: number;
  
  // ОПЕРАЦИОННЫЕ ПОКАЗАТЕЛИ
  orderCompletionRate: number; // %
  avgDeliveryTime: number; // часы
  qualityScore: number; // 1-10
  efficencyRate: number; // %
  
  // РОСТ И ТРЕНДЫ (в % к предыдущей неделе)
  revenueGrowth: number;
  ordersGrowth: number;
  hiresGrowth: number;
  clientsGrowth: number;
  
  // ===== ДАННЫЕ ПО ГОРОДАМ =====
  
  // Варшава
  warsawOrders: number;
  warsawRevenue: number;
  warsawHires: number;
  warsawEmployees: number;
  warsawSatisfaction: number;
  
  // Краков
  krakowOrders: number;
  krakowRevenue: number;
  krakowHires: number;
  krakowEmployees: number;
  krakowSatisfaction: number;
  
  // Гданьск
  gdanskOrders: number;
  gdanskRevenue: number;
  gdanskHires: number;
  gdanskEmployees: number;
  gdanskSatisfaction: number;
  
  // Вроцлав
  wroclawOrders: number;
  wroclawRevenue: number;
  wroclawHires: number;
  wroclawEmployees: number;
  wroclawSatisfaction: number;
  
  // Познань
  poznanOrders: number;
  poznanRevenue: number;
  poznanHires: number;
  poznanEmployees: number;
  poznanSatisfaction: number;
  
  // Лодзь
  lodzOrders: number;
  lodzRevenue: number;
  lodzHires: number;
  lodzEmployees: number;
  lodzSatisfaction: number;
  
  // ===== ТЕКСТОВЫЕ ПОЛЯ =====
  
  // ДОСТИЖЕНИЯ И УСПЕХИ
  weeklyHighlights: string;
  keyAchievements: string;
  bestPerformers: string;
  
  // ПРОБЛЕМЫ И ВЫЗОВЫ
  majorIssues: string;
  challenges: string;
  risksIdentified: string;
  
  // РЕШЕНИЯ И ПЛАНЫ
  solutionsImplemented: string;
  improvementPlans: string;
  nextWeekPriorities: string;
  
  // СТРАТЕГИЧЕСКИЕ ЗАМЕТКИ
  marketTrends: string;
  competitorActivity: string;
  strategicInitiatives: string;
  stakeholderFeedback: string;
  
  // ОПЕРАЦИОННЫЕ ЗАМЕТКИ
  systemIssues: string;
  processChanges: string;
  trainingNeeds: string;
  resourceRequests: string;
}

export default function WeeklyCountryReportPage() {
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [currentWeek, setCurrentWeek] = useState(0);
  const [isFriday, setIsFriday] = useState(false);
  const router = useRouter();
  
  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<WeeklyCountryReportData>({
    defaultValues: {
      reportDate: new Date().toISOString().split('T')[0],
      weekNumber: getCurrentWeekNumber(),
    }
  });

  function getCurrentWeekNumber() {
    // Используем стандартную функцию ISO недели
    const { week } = parseIsoWeek(isoWeekOf());
    return week;
  }

  useEffect(() => {
    // Проверяем авторизацию через API
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/auth/me', {
          credentials: 'include', // Отправляем httpOnly cookies
        });

        if (!response.ok) {
          router.push('/login');
          return;
        }

        const userData = await response.json();
        
        // Проверяем права доступа (только Country Manager и Admin)
        if (!['COUNTRY_MANAGER', 'ADMIN'].includes(userData.role)) {
          alert('Доступ запрещен. Только для менеджеров по стране.');
          router.push('/dashboard');
          return;
        }

        setUser(userData);

        // Проверяем, пятница ли сегодня
        const today = new Date();
        setIsFriday(today.getDay() === 5);
        setCurrentWeek(getCurrentWeekNumber());
        setValue('weekNumber', getCurrentWeekNumber());
      } catch (error) {
        console.error('Auth error:', error);
        router.push('/login');
      }
    };

    checkAuth();
  }, [router, setValue]);

  const onSubmit = async (data: WeeklyCountryReportData) => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/country-weekly-report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Отправляем httpOnly cookies
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (response.ok) {
        alert('✅ Еженедельный отчет успешно сохранен!');
        router.push('/dashboard');
      } else {
        alert(`❌ Ошибка сохранения: ${result.message}`);
      }
    } catch (error) {
      console.error('Error saving weekly report:', error);
      alert('❌ Ошибка сохранения отчета');
    } finally {
      setIsLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const cities = [
    { key: 'warsaw', label: 'Варшава', icon: '🏛️' },
    { key: 'krakow', label: 'Краков', icon: '🏰' },
    { key: 'gdansk', label: 'Гданьск', icon: '⚓' },
    { key: 'wroclaw', label: 'Вроцлав', icon: '🌉' },
    { key: 'poznan', label: 'Познань', icon: '🏭' },
    { key: 'lodz', label: 'Лодзь', icon: '🧵' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Calendar className="h-8 w-8 text-blue-600" />
              <span className="ml-2 text-xl font-bold text-gray-900">
                Еженедельный отчет
              </span>
              {isFriday && (
                <span className="ml-2 px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                  🎯 Пятница - время отчета!
                </span>
              )}
            </div>
            <div className="text-sm text-gray-600">
              Неделя {currentWeek} • Менеджер по стране
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900">
              <Clock className="inline h-6 w-6 mr-2" />
              Еженедельный отчет по стране - Неделя {currentWeek}
            </h1>
            <p className="mt-1 text-sm text-gray-600">
              Заполните все показатели за прошедшую неделю. Форма заполняется каждую пятницу.
            </p>
            {!isFriday && (
              <div className="mt-2 p-3 bg-yellow-50 rounded-lg">
                <p className="text-yellow-800 text-sm">
                  ⚠️ Сегодня не пятница. Рекомендуется заполнять отчет каждую пятницу в конце рабочего дня.
                </p>
              </div>
            )}
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
            {/* Дата и неделя */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Calendar className="inline h-4 w-4 mr-1" />
                  Дата отчета
                </label>
                <input
                  type="date"
                  {...register('reportDate', { required: 'Дата обязательна' })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Номер недели
                </label>
                <input
                  type="number"
                  {...register('weekNumber', { required: true, min: 1, max: 53 })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            {/* Общие KPI по стране */}
            <div className="p-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg">
              <h3 className="text-lg font-bold text-blue-900 mb-4">
                <Globe className="inline h-5 w-5 mr-2" />
                Общие KPI по стране
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Общая выручка (PLN)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    {...register('totalRevenue')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Общее количество заказов
                  </label>
                  <input
                    type="number"
                    {...register('totalOrders')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Общее количество найма
                  </label>
                  <input
                    type="number"
                    {...register('totalHires')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Человеко-дни
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    {...register('totalWorkingDays')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Активные сотрудники
                  </label>
                  <input
                    type="number"
                    {...register('activeEmployees')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Финансовые показатели */}
            <div className="p-6 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg">
              <h3 className="text-lg font-bold text-green-900 mb-4">
                <Wallet className="inline h-5 w-5 mr-2" />
                Финансовые показатели
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Недельная выручка (PLN)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    {...register('weeklyRevenue')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-green-500 focus:border-green-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Недельная прибыль (PLN)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    {...register('weeklyProfit')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-green-500 focus:border-green-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Маркетинговые расходы (PLN)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    {...register('marketingSpend')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-green-500 focus:border-green-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Операционные расходы (PLN)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    {...register('operationalCosts')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-green-500 focus:border-green-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Средний чек (PLN)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    {...register('avgOrderValue')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-green-500 focus:border-green-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Стоимость найма (PLN)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    {...register('costPerHire')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-green-500 focus:border-green-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Стоимость заказа (PLN)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    {...register('costPerOrder')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-green-500 focus:border-green-500"
                  />
                </div>
              </div>
            </div>

            {/* Клиентские метрики */}
            <div className="p-6 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg">
              <h3 className="text-lg font-bold text-purple-900 mb-4">
                <Users className="inline h-5 w-5 mr-2" />
                Клиентские метрики
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Новые клиенты
                  </label>
                  <input
                    type="number"
                    {...register('newClients')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-purple-500 focus:border-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Удержание клиентов (%)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    {...register('clientRetention')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-purple-500 focus:border-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Удовлетворенность (1-10)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="1"
                    max="10"
                    {...register('customerSatisfaction')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-purple-500 focus:border-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Время ответа (часы)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    {...register('avgResponseTime')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-purple-500 focus:border-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Жалобы (%)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    {...register('complaintRate')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-purple-500 focus:border-purple-500"
                  />
                </div>
              </div>
            </div>


            {/* Данные по городам */}
            <div className="p-6 bg-gradient-to-r from-orange-50 to-red-50 rounded-lg">
              <h3 className="text-lg font-bold text-orange-900 mb-4">
                <MapPin className="inline h-5 w-5 mr-2" />
                Показатели по городам
              </h3>
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                {cities.map((city) => (
                  <div key={city.key} className="bg-white p-4 rounded-lg border">
                    <h4 className="font-bold text-gray-900 mb-3">
                      {city.icon} {city.label}
                    </h4>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Заказы
                        </label>
                        <input
                          type="number"
                          {...register(`${city.key}Orders` as any)}
                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-orange-500 focus:border-orange-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Выручка (PLN)
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          {...register(`${city.key}Revenue` as any)}
                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-orange-500 focus:border-orange-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Найм
                        </label>
                        <input
                          type="number"
                          {...register(`${city.key}Hires` as any)}
                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-orange-500 focus:border-orange-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Сотрудники
                        </label>
                        <input
                          type="number"
                          {...register(`${city.key}Employees` as any)}
                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-orange-500 focus:border-orange-500"
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Удовлетворенность (1-10)
                        </label>
                        <input
                          type="number"
                          step="0.1"
                          min="1"
                          max="10"
                          {...register(`${city.key}Satisfaction` as any)}
                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-orange-500 focus:border-orange-500"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Рост и тренды */}
            <div className="p-6 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg">
              <h3 className="text-lg font-bold text-yellow-900 mb-4">
                <TrendingUp className="inline h-5 w-5 mr-2" />
                Рост к предыдущей неделе (%)
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Рост выручки (%)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    {...register('revenueGrowth')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-yellow-500 focus:border-yellow-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Рост заказов (%)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    {...register('ordersGrowth')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-yellow-500 focus:border-yellow-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Рост найма (%)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    {...register('hiresGrowth')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-yellow-500 focus:border-yellow-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Рост клиентов (%)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    {...register('clientsGrowth')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-yellow-500 focus:border-yellow-500"
                  />
                </div>
              </div>
            </div>

            {/* Основные достижения */}
            <div className="p-6 bg-gradient-to-r from-green-50 to-blue-50 rounded-lg">
              <h3 className="text-lg font-bold text-green-900 mb-4">
                <Target className="inline h-5 w-5 mr-2" />
                Достижения и успехи недели
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Основные достижения
                  </label>
                  <textarea
                    rows={3}
                    {...register('weeklyHighlights')}
                    placeholder="Ключевые успехи и достижения недели..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-green-500 focus:border-green-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Лучшие результаты
                  </label>
                  <textarea
                    rows={2}
                    {...register('keyAchievements')}
                    placeholder="Конкретные результаты и метрики..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-green-500 focus:border-green-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Лучшие исполнители
                  </label>
                  <textarea
                    rows={2}
                    {...register('bestPerformers')}
                    placeholder="Отличившиеся сотрудники и команды..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-green-500 focus:border-green-500"
                  />
                </div>
              </div>
            </div>

            {/* Проблемы и вызовы */}
            <div className="p-6 bg-gradient-to-r from-red-50 to-pink-50 rounded-lg">
              <h3 className="text-lg font-bold text-red-900 mb-4">
                <AlertTriangle className="inline h-5 w-5 mr-2" />
                Проблемы и вызовы
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Основные проблемы
                  </label>
                  <textarea
                    rows={3}
                    {...register('majorIssues')}
                    placeholder="Ключевые проблемы и сложности..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-red-500 focus:border-red-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Текущие вызовы
                  </label>
                  <textarea
                    rows={2}
                    {...register('challenges')}
                    placeholder="Операционные и стратегические вызовы..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-red-500 focus:border-red-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Выявленные риски
                  </label>
                  <textarea
                    rows={2}
                    {...register('risksIdentified')}
                    placeholder="Потенциальные риски и угрозы..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-red-500 focus:border-red-500"
                  />
                </div>
              </div>
            </div>

            {/* Планы и приоритеты */}
            <div className="p-6 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg">
              <h3 className="text-lg font-bold text-indigo-900 mb-4">
                <Briefcase className="inline h-5 w-5 mr-2" />
                Планы и приоритеты
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Внедренные решения
                  </label>
                  <textarea
                    rows={3}
                    {...register('solutionsImplemented')}
                    placeholder="Какие решения были внедрены на этой неделе..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Планы улучшений
                  </label>
                  <textarea
                    rows={2}
                    {...register('improvementPlans')}
                    placeholder="Планируемые улучшения и оптимизации..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Приоритеты следующей недели
                  </label>
                  <textarea
                    rows={3}
                    {...register('nextWeekPriorities')}
                    placeholder="Ключевые задачи и цели на следующую неделю..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
              </div>
            </div>

            {/* Кнопки */}
            <div className="flex justify-between pt-6">
              <button
                type="button"
                onClick={() => router.push('/dashboard')}
                className="px-6 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Отмена
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="flex items-center px-8 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                <Save className="h-4 w-4 mr-2" />
                {isLoading ? 'Сохранение...' : 'Сохранить отчет'}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
