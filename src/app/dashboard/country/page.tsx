'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Calendar, ChevronLeft, ChevronRight, Building2, Users, AlertCircle, BarChart3, PieChart } from 'lucide-react';
import { isoWeekOf, formatWeekForDisplay, getPreviousWeek, getNextWeek, isCurrentWeek } from '@/lib/week';
import CountryCitiesTab from './CountryCitiesTab';
import CountryUsersTab from './CountryUsersTab';
import { useAuth, withAuth } from '@/contexts/AuthContext';

function CountryPage() {
  const { user } = useAuth();
  const [currentWeek, setCurrentWeek] = useState<string>(isoWeekOf());
  const [activeTab, setActiveTab] = useState<'cities' | 'users'>('cities');
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleWeekChange = (direction: 'prev' | 'next') => {
    if (direction === 'prev') {
      setCurrentWeek(getPreviousWeek(currentWeek));
    } else {
      setCurrentWeek(getNextWeek(currentWeek));
    }
  };

  const handleGoToCurrentWeek = () => {
    setCurrentWeek(isoWeekOf());
  };

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Ошибка доступа</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => router.push('/dashboard')}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
          >
            Вернуться на дашборд
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Заголовок страницы */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center">
              <Building2 className="h-8 w-8 mr-3 text-blue-600" />
              Внести данные по стране
            </h1>
            <p className="text-gray-600 mt-1">
              {user?.name || user?.login} • {user?.role === 'ADMIN' ? 'Администратор' : 'Менеджер по стране'} • {user?.city}
            </p>
          </div>
          
          <div className="text-right">
            <div className="text-sm text-gray-500">Текущая неделя</div>
            <div className="text-lg font-semibold text-gray-900">
              {formatWeekForDisplay(isoWeekOf())}
            </div>
          </div>
        </div>
      </div>

      {/* Навигация по неделям */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between">
          <button
            onClick={() => handleWeekChange('prev')}
            className="flex items-center px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
          >
            <ChevronLeft className="h-5 w-5 mr-1" />
            Предыдущая неделя
          </button>
          
          <div className="text-center">
            <div className="flex items-center space-x-2">
              <Calendar className="h-5 w-5 text-blue-600" />
              <span className="text-lg font-semibold text-gray-900">
                {formatWeekForDisplay(currentWeek)}
              </span>
            </div>
            
            {!isCurrentWeek(currentWeek) && (
              <button
                onClick={handleGoToCurrentWeek}
                className="mt-2 text-sm text-blue-600 hover:text-blue-800 underline"
              >
                Перейти к текущей неделе
              </button>
            )}
            
            {isCurrentWeek(currentWeek) && (
              <div className="mt-2 text-sm text-green-600 font-medium">
                Текущая неделя
              </div>
            )}
          </div>
          
          <button
            onClick={() => handleWeekChange('next')}
            className="flex items-center px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
          >
            Следующая неделя
            <ChevronRight className="h-5 w-5 ml-1" />
          </button>
        </div>
      </div>

      {/* Информационная панель */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start">
            <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0" />
            <div className="text-sm text-blue-800">
              <p className="font-medium mb-1">Инструкции по управлению данными:</p>
              <ul className="list-disc list-inside space-y-1">
                <li><strong>По городам:</strong> Введите агрегированные данные Trengo/CRM по каждому городу</li>
                <li><strong>По менеджерам:</strong> Уточните данные конкретных Ops/Mixed менеджеров</li>
                <li><strong>Приоритет:</strong> Данные от country manager имеют приоритет над самоотчетами</li>
                <li>Все изменения сохраняются автоматически и влияют на дашборды и экспорты</li>
              </ul>
            </div>
          </div>
        </div>
        
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-start">
            <BarChart3 className="h-5 w-5 text-green-600 mt-0.5 mr-3 flex-shrink-0" />
            <div className="text-sm text-green-800">
              <p className="font-medium mb-2">Аналитика и отчеты</p>
              <p className="mb-3">После заполнения данных они автоматически появятся в аналитике по стране.</p>
              <button
                onClick={() => router.push('/dashboard/country-analytics')}
                className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors flex items-center text-sm"
              >
                <PieChart className="h-4 w-4 mr-2" />
                Посмотреть аналитику
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Вкладки */}
      <div className="bg-white rounded-lg shadow">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8" aria-label="Tabs">
            <button
              onClick={() => setActiveTab('cities')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'cities'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Building2 className="h-5 w-5 inline-block mr-2" />
              По городам
            </button>
            <button
              onClick={() => setActiveTab('users')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'users'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Users className="h-5 w-5 inline-block mr-2" />
              По менеджерам
            </button>
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'cities' && (
            <CountryCitiesTab weekIso={currentWeek} />
          )}
          {activeTab === 'users' && (
            <CountryUsersTab weekIso={currentWeek} />
          )}
        </div>
      </div>
    </div>
  );
}

// Защита страницы: только для ADMIN и COUNTRY_MANAGER
export default withAuth(CountryPage, ['ADMIN', 'COUNTRY_MANAGER']);
