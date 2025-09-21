'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Calendar, ChevronLeft, ChevronRight, FileText, AlertCircle } from 'lucide-react';
import WeeklyReportForm from '@/components/WeeklyReportForm';
import { isoWeekOf, formatWeekForDisplay, getPreviousWeek, getNextWeek, isCurrentWeek } from '@/lib/week';

interface User {
  id: string;
  login: string;
  name: string;
  role: 'HIRING_MANAGER' | 'OPS_MANAGER' | 'MIXED_MANAGER' | 'COUNTRY_MANAGER' | 'ADMIN';
  city: string;
}

export default function WeeklyReportPage() {
  const [user, setUser] = useState<User | null>(null);
  const [currentWeek, setCurrentWeek] = useState<string>(isoWeekOf());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    fetchUser();
  }, []);

  const fetchUser = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/auth/me');
      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
        
        // Проверяем доступ к еженедельным отчетам
        const allowedRoles = ['HIRING_MANAGER', 'OPS_MANAGER', 'MIXED_MANAGER'];
        if (!allowedRoles.includes(data.user.role)) {
          setError('У вас нет доступа к еженедельным отчетам');
        }
      } else {
        router.push('/login');
      }
    } catch (error) {
      console.error('Error fetching user:', error);
      setError('Ошибка загрузки данных пользователя');
    } finally {
      setIsLoading(false);
    }
  };

  const getRoleForForm = (): 'hr' | 'ops' | 'mixed' => {
    if (!user) return 'hr';
    
    switch (user.role) {
      case 'HIRING_MANAGER':
        return 'hr';
      case 'OPS_MANAGER':
        return 'ops';
      case 'MIXED_MANAGER':
        return 'mixed';
      default:
        return 'hr';
    }
  };

  const getRoleDisplayName = (role: string): string => {
    switch (role) {
      case 'HIRING_MANAGER':
        return 'HR менеджер';
      case 'OPS_MANAGER':
        return 'Операционный менеджер';
      case 'MIXED_MANAGER':
        return 'Смешанная роль (HR + Operations)';
      default:
        return role;
    }
  };

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

  const handleSaveReport = (data: any) => {
    console.log('Report saved:', data);
    // Здесь можно добавить дополнительную логику после сохранения
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
          <p className="text-gray-600">Загрузка...</p>
        </div>
      </div>
    );
  }

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

  if (!user) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Заголовок страницы */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center">
              <FileText className="h-8 w-8 mr-3 text-blue-600" />
              Еженедельный отчет
            </h1>
            <p className="text-gray-600 mt-1">
              {user.name} • {getRoleDisplayName(user.role)} • {user.city}
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
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start">
          <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0" />
          <div className="text-sm text-blue-800">
            <p className="font-medium mb-1">Инструкции по заполнению:</p>
            <ul className="list-disc list-inside space-y-1">
              {getRoleForForm() === 'hr' && (
                <>
                  <li>Заполните количество проведенных собеседований за неделю</li>
                  <li>Укажите количество размещенных объявлений о работе</li>
                  <li>Добавьте количество новых регистраций кандидатов</li>
                </>
              )}
              {getRoleForForm() === 'ops' && (
                <>
                  <li>Укажите количество обработанных сообщений в Trengo</li>
                  <li>Добавьте количество решенных тикетов в CRM и Trengo</li>
                  <li>Укажите количество заказов по вашему городу</li>
                </>
              )}
              {getRoleForForm() === 'mixed' && (
                <>
                  <li>Заполните как HR, так и Operations метрики</li>
                  <li>Можете сохранять отчеты по ролям отдельно</li>
                  <li>Все базовые поля применяются к обеим ролям</li>
                </>
              )}
              <li>Не забудьте указать уровень стресса и общую информацию о работе с командой</li>
              <li>При повторном заполнении данные будут обновлены</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Форма отчета */}
      <WeeklyReportForm
        role={getRoleForForm()}
        userId={user.id}
        weekIso={currentWeek}
        onSave={handleSaveReport}
      />
    </div>
  );
}