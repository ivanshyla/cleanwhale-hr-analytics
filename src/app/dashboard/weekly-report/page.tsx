'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import WeeklyReportForm from '@/components/WeeklyReportForm';
import { getWeekISO } from '@/types';
import { Calendar, CheckCircle, AlertCircle } from 'lucide-react';

interface User {
  id: string;
  name: string;
  login: string;
  role: string;
  city: string;
}

export default function WeeklyReportPage() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [recentReports, setRecentReports] = useState<any[]>([]);
  const [notification, setNotification] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);
  const router = useRouter();

  useEffect(() => {
    loadUserData();
    loadRecentReports();
  }, []);

  const loadUserData = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        router.push('/login');
        return;
      }

      const response = await fetch('/api/users/me', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
      } else {
        router.push('/login');
      }
    } catch (error) {
      console.error('Error loading user data:', error);
      router.push('/login');
    }
  };

  const loadRecentReports = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await fetch('/api/weekly-reports', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const reports = await response.json();
        setRecentReports(reports.slice(0, 5)); // Последние 5 отчетов
      }
    } catch (error) {
      console.error('Error loading recent reports:', error);
    }
  };

  const handleSubmit = async (data: any) => {
    if (!user) return;

    setIsLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/weekly-reports', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        setNotification({
          type: 'success',
          message: 'Отчет успешно сохранен!',
        });
        await loadRecentReports();
        
        // Автоматически скрыть уведомление через 5 секунд
        setTimeout(() => setNotification(null), 5000);
      } else {
        const errorData = await response.json();
        setNotification({
          type: 'error',
          message: errorData.message || 'Ошибка при сохранении отчета',
        });
      }
    } catch (error) {
      console.error('Error submitting report:', error);
      setNotification({
        type: 'error',
        message: 'Произошла ошибка при отправке отчета',
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const currentWeek = getWeekISO(new Date());

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Заголовок */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Еженедельный отчет
          </h1>
          <p className="mt-2 text-gray-600">
            Заполните отчет за текущую неделю ({currentWeek})
          </p>
        </div>

        {/* Уведомления */}
        {notification && (
          <div className={`mb-6 p-4 rounded-md ${
            notification.type === 'success' 
              ? 'bg-green-50 border border-green-200' 
              : 'bg-red-50 border border-red-200'
          }`}>
            <div className="flex items-center">
              {notification.type === 'success' ? (
                <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
              ) : (
                <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
              )}
              <p className={`text-sm ${
                notification.type === 'success' ? 'text-green-700' : 'text-red-700'
              }`}>
                {notification.message}
              </p>
              <button
                onClick={() => setNotification(null)}
                className="ml-auto text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Основная форма */}
          <div className="lg:col-span-3">
            <WeeklyReportForm
              userRole={user.role}
              onSubmit={handleSubmit}
              isLoading={isLoading}
            />
          </div>

          {/* Боковая панель */}
          <div className="lg:col-span-1 space-y-6">
            {/* Информация о пользователе */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Информация
              </h3>
              <div className="space-y-3">
                <div>
                  <span className="text-sm text-gray-500">Имя:</span>
                  <p className="font-medium">{user.name}</p>
                </div>
                <div>
                  <span className="text-sm text-gray-500">Роль:</span>
                  <p className="font-medium">{user.role}</p>
                </div>
                <div>
                  <span className="text-sm text-gray-500">Город:</span>
                  <p className="font-medium">{user.city}</p>
                </div>
                {user.salary && (
                  <div>
                    <span className="text-sm text-gray-500">Зарплата:</span>
                    <p className="font-medium">
                      {new Intl.NumberFormat('pl-PL', {
                        style: 'currency',
                        currency: user.currency || 'PLN',
                        minimumFractionDigits: 0,
                      }).format(user.salary)}
                    </p>
                  </div>
                )}
                <div>
                  <span className="text-sm text-gray-500">Текущая неделя:</span>
                  <p className="font-medium">{currentWeek}</p>
                </div>
              </div>
            </div>

            {/* Последние отчеты */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Calendar className="w-5 h-5 mr-2" />
                Последние отчеты
              </h3>
              <div className="space-y-3">
                {recentReports.length > 0 ? (
                  recentReports.map((report) => (
                    <div
                      key={report.id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-md"
                    >
                      <div>
                        <p className="text-sm font-medium">{report.weekIso}</p>
                        <p className="text-xs text-gray-500">
                          {report.isCompleted ? 'Завершен' : 'Черновик'}
                        </p>
                      </div>
                      <div className="flex items-center space-x-2">
                        {report.isCompleted ? (
                          <CheckCircle className="w-4 h-4 text-green-500" />
                        ) : (
                          <AlertCircle className="w-4 h-4 text-yellow-500" />
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-gray-500">
                    Пока нет отчетов
                  </p>
                )}
              </div>
            </div>

            {/* Быстрые действия */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Быстрые действия
              </h3>
              <div className="space-y-3">
                <button
                  onClick={() => router.push('/dashboard')}
                  className="w-full text-left px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-md"
                >
                  ← Вернуться на дашборд
                </button>
                <button
                  onClick={() => router.push('/dashboard/analytics')}
                  className="w-full text-left px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-md"
                >
                  Посмотреть аналитику
                </button>
                <button
                  onClick={() => router.push('/dashboard/comparison')}
                  className="w-full text-left px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-md"
                >
                  Сравнить данные
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
