'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { Calendar, Save, TrendingUp, Globe, MapPin, DollarSign, AlertTriangle, Target } from 'lucide-react';

interface CountryReportFormData {
  reportDate: string;
  
  // ОБЩИЕ ДАННЫЕ ПО СТРАНЕ
  totalWorkingDaysCountry?: number;
  totalEmployeesActive?: number;
  
  // ДАННЫЕ ПО ГОРОДАМ
  warsawWorkingDays?: number;
  krakowWorkingDays?: number;
  gdanskWorkingDays?: number;
  wrocławWorkingDays?: number;
  poznanWorkingDays?: number;
  lodzWorkingDays?: number;
  
  warsawEmployees?: number;
  krakowEmployees?: number;
  gdanskEmployees?: number;
  wrocławEmployees?: number;
  poznanEmployees?: number;
  lodzEmployees?: number;
  
  warsawNotes?: string;
  krakowNotes?: string;
  gdanskNotes?: string;
  wrocławNotes?: string;
  poznanNotes?: string;
  lodzNotes?: string;
  
  // ОБЩИЕ МЕТРИКИ ПО СТРАНЕ
  countryTotalOrders?: number;
  countryTotalHires?: number;
  countryAvgStress?: number;
  countryOvertimeRate?: number;
  
  // СТРАТЕГИЧЕСКИЕ ДАННЫЕ
  marketingCampaigns?: string;
  competitorAnalysis?: string;
  strategicGoals?: string;
  budgetSpent?: number;
  
  // ПРОБЛЕМЫ И РЕШЕНИЯ
  majorIssues?: string;
  solutionsImplemented?: string;
  riskAssessment?: string;
  
  notes?: string;
}

export default function CountryReportPage() {
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  
  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<CountryReportFormData>({
    defaultValues: {
      reportDate: new Date().toISOString().split('T')[0],
    }
  });

  useEffect(() => {
    // Проверяем токен и права доступа
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      if (payload.role !== 'COUNTRY_MANAGER') {
        alert('Доступ запрещен. Только для менеджеров по стране.');
        router.push('/dashboard');
        return;
      }
      
      setUser({
        id: payload.userId,
        email: payload.email,
        role: payload.role,
        city: payload.city,
      });
    } catch (error) {
      console.error('Invalid token:', error);
      router.push('/login');
    }
  }, [router]);

  const onSubmit = async (data: CountryReportFormData) => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        router.push('/login');
        return;
      }

      // Преобразуем данные для отправки на сервер
      const payload = {
        ...data,
        cityWorkingDays: {
          WARSAW: data.warsawWorkingDays || 0,
          KRAKOW: data.krakowWorkingDays || 0,
          GDANSK: data.gdanskWorkingDays || 0,
          WROCLAW: data.wrocławWorkingDays || 0,
          POZNAN: data.poznanWorkingDays || 0,
          LODZ: data.lodzWorkingDays || 0,
        },
        cityEmployeeCounts: {
          WARSAW: data.warsawEmployees || 0,
          KRAKOW: data.krakowEmployees || 0,
          GDANSK: data.gdanskEmployees || 0,
          WROCLAW: data.wrocławEmployees || 0,
          POZNAN: data.poznanEmployees || 0,
          LODZ: data.lodzEmployees || 0,
        },
        citySpecialNotes: {
          WARSAW: data.warsawNotes || '',
          KRAKOW: data.krakowNotes || '',
          GDANSK: data.gdanskNotes || '',
          WROCLAW: data.wrocławNotes || '',
          POZNAN: data.poznanNotes || '',
          LODZ: data.lodzNotes || '',
        },
      };

      const response = await fetch('/api/country-manager-data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (response.ok) {
        alert('Отчет менеджера по стране успешно сохранен!');
        router.push('/dashboard');
      } else {
        alert(`Ошибка сохранения: ${result.message}`);
      }
    } catch (error) {
      console.error('Error saving country report:', error);
      alert('Ошибка сохранения отчета');
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
    { key: 'wrocław', label: 'Вроцлав', icon: '🌉' },
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
              <Globe className="h-8 w-8 text-blue-600" />
              <span className="ml-2 text-xl font-bold text-gray-900">
                Отчет менеджера по стране
              </span>
            </div>
            <div className="text-sm text-gray-600">
              Менеджер по стране • Польша
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Еженедельный отчет по стране</h1>
            <p className="mt-1 text-sm text-gray-600">
              Заполните агрегированные данные по всем городам и стратегическую информацию.
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
            {/* Дата отчета */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Calendar className="inline h-4 w-4 mr-1" />
                Дата отчета
              </label>
              <input
                type="date"
                {...register('reportDate', { required: 'Дата обязательна' })}
                className="w-full max-w-xs px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
              {errors.reportDate && (
                <p className="mt-1 text-sm text-red-600">{errors.reportDate.message}</p>
              )}
            </div>

            {/* Общие данные по стране */}
            <div className="p-4 bg-blue-50 rounded-lg">
              <h3 className="text-lg font-medium text-blue-900 mb-4">
                <Globe className="inline h-5 w-5 mr-2" />
                Общие данные по Польше
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Общее количество человеко-дней по стране
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    {...register('totalWorkingDaysCountry', { min: 0 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Общее количество активных сотрудников
                  </label>
                  <input
                    type="number"
                    min="0"
                    {...register('totalEmployeesActive', { min: 0 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Данные по городам */}
            <div className="p-4 bg-green-50 rounded-lg">
              <h3 className="text-lg font-medium text-green-900 mb-4">
                <MapPin className="inline h-5 w-5 mr-2" />
                Данные по городам
              </h3>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {cities.map((city) => (
                  <div key={city.key} className="bg-white p-4 rounded-lg border">
                    <h4 className="font-medium text-gray-900 mb-3">
                      {city.icon} {city.label}
                    </h4>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Человеко-дни
                        </label>
                        <input
                          type="number"
                          step="0.5"
                          min="0"
                          {...register(`${city.key}WorkingDays` as any, { min: 0 })}
                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-green-500 focus:border-green-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Количество сотрудников
                        </label>
                        <input
                          type="number"
                          min="0"
                          {...register(`${city.key}Employees` as any, { min: 0 })}
                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-green-500 focus:border-green-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Особые заметки
                        </label>
                        <textarea
                          rows={2}
                          {...register(`${city.key}Notes` as any)}
                          placeholder="Особенности города..."
                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-green-500 focus:border-green-500"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Общие метрики */}
            <div className="p-4 bg-purple-50 rounded-lg">
              <h3 className="text-lg font-medium text-purple-900 mb-4">
                <TrendingUp className="inline h-5 w-5 mr-2" />
                Общие метрики по стране
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Общее количество заказов по стране
                  </label>
                  <input
                    type="number"
                    min="0"
                    {...register('countryTotalOrders', { min: 0 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-purple-500 focus:border-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Общее количество найма по стране
                  </label>
                  <input
                    type="number"
                    min="0"
                    {...register('countryTotalHires', { min: 0 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-purple-500 focus:border-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Средний уровень стресса (1-10)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="1"
                    max="10"
                    {...register('countryAvgStress', { min: 1, max: 10 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-purple-500 focus:border-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    % сотрудников с переработками
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    {...register('countryOvertimeRate', { min: 0, max: 100 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-purple-500 focus:border-purple-500"
                  />
                </div>
              </div>
            </div>

            {/* Стратегические данные */}
            <div className="p-4 bg-indigo-50 rounded-lg">
              <h3 className="text-lg font-medium text-indigo-900 mb-4">
                <Target className="inline h-5 w-5 mr-2" />
                Стратегические данные
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Маркетинговые кампании за неделю
                  </label>
                  <textarea
                    rows={3}
                    {...register('marketingCampaigns')}
                    placeholder="Опишите проведенные маркетинговые активности..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Анализ конкурентов
                  </label>
                  <textarea
                    rows={3}
                    {...register('competitorAnalysis')}
                    placeholder="Ключевые наблюдения по конкурентам..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Стратегические цели на следующую неделю
                    </label>
                    <textarea
                      rows={4}
                      {...register('strategicGoals')}
                      placeholder="Основные цели и задачи..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      <DollarSign className="inline h-4 w-4 mr-1" />
                      Потраченный бюджет за неделю (PLN)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      {...register('budgetSpent', { min: 0 })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Проблемы и решения */}
            <div className="p-4 bg-red-50 rounded-lg">
              <h3 className="text-lg font-medium text-red-900 mb-4">
                <AlertTriangle className="inline h-5 w-5 mr-2" />
                Проблемы и решения
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Основные проблемы недели
                  </label>
                  <textarea
                    rows={3}
                    {...register('majorIssues')}
                    placeholder="Ключевые проблемы, с которыми столкнулись..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-red-500 focus:border-red-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Внедренные решения
                  </label>
                  <textarea
                    rows={3}
                    {...register('solutionsImplemented')}
                    placeholder="Какие решения были внедрены..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-red-500 focus:border-red-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Оценка рисков
                  </label>
                  <textarea
                    rows={3}
                    {...register('riskAssessment')}
                    placeholder="Потенциальные риски и план их митигации..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-red-500 focus:border-red-500"
                  />
                </div>
              </div>
            </div>

            {/* Дополнительные заметки */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Дополнительные заметки
              </label>
              <textarea
                rows={4}
                {...register('notes')}
                placeholder="Любая дополнительная информация..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Кнопки */}
            <div className="flex justify-between">
              <button
                type="button"
                onClick={() => router.push('/dashboard')}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Отмена
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="flex items-center px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
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
