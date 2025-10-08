'use client';

import { useState } from 'react';
import { Calendar, ChevronLeft, ChevronRight, FileText, AlertCircle } from 'lucide-react';
import WeeklyReportForm from '@/components/WeeklyReportForm';
import { isoWeekOf, formatWeekForDisplay, getPreviousWeek, getNextWeek, isCurrentWeek } from '@/lib/week';
import { useAuth, withAuth } from '@/contexts/AuthContext';

function WeeklyReportPage() {
  const { user } = useAuth();
  const [currentWeek, setCurrentWeek] = useState<string>(isoWeekOf());
  const [error, setError] = useState<string | null>(null);

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
              {user?.name || user?.login} • {getRoleDisplayName(user?.role || 'HIRING_MANAGER')} • {user?.city}
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
        userId={user?.id || ''}
        weekIso={currentWeek}
        onSave={handleSaveReport}
      />
    </div>
  );
}

export default withAuth(WeeklyReportPage, ['HIRING_MANAGER', 'OPS_MANAGER', 'MIXED_MANAGER']);