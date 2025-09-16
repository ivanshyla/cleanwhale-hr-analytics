'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { MessageSquare, Package, Save, RefreshCw, AlertCircle, CheckCircle, Users, MapPin, Star, UserMinus, UserPlus, XCircle, ArrowLeft } from 'lucide-react';

interface ExternalDataForm {
  // Trengo данные по юниту
  trengoMessages: number;
  trengoTicketsResolved: number;
  
  // CRM данные по юниту  
  crmTicketsResolved: number;
  crmOrdersLocal: number;
  
  // Дополнительные локальные метрики
  badRatingsCount?: number;
  subscriptionCancellations?: number;
  averageRating?: number;
  cleanersLeft?: number;
  cleanersNew?: number;
  
  // Общие данные по стране (только для country manager)
  countryTotalOrders?: number;
  countryBadRatings?: number;
  countryCancellations?: number;
  countryAvgRating?: number;
  countryCleanersLeft?: number;
  countryCleanersNew?: number;
  
  // Метаданные
  reportDate: string;
  city?: string;
  notes?: string;
  
  // Еженедельный вопрос
  weeklyQuestionAnswer?: string;
  answerConfidence?: number;
}

interface WeeklyQuestion {
  id: string;
  question: string;
  questionType: string;
  category: string;
  difficulty: number;
  expectedAnswerLength: number;
  expiresAt: string;
  weekStartDate: string;
  createdBy: {
    name: string;
    role: string;
  };
  answers: any[];
}

interface ExternalDataRecord {
  id: string;
  userId: string;
  userName: string;
  userCity: string;
  userRole: string;
  trengoMessages: number;
  trengoTicketsResolved: number;
  crmTicketsResolved: number;
  crmOrdersLocal: number;
  countryTotalOrders?: number;
  reportDate: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export default function ExternalDataPage() {
  const [user, setUser] = useState<any>(null);
  const [existingRecords, setExistingRecords] = useState<ExternalDataRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const router = useRouter();

  const { register, handleSubmit, reset, watch, formState: { errors } } = useForm<ExternalDataForm>({
    defaultValues: {
      reportDate: new Date().toISOString().split('T')[0], // Сегодняшняя дата
      trengoMessages: 0,
      trengoTicketsResolved: 0,
      crmTicketsResolved: 0,
      crmOrdersLocal: 0,
      badRatingsCount: 0,
      subscriptionCancellations: 0,
      averageRating: 4.5,
      cleanersLeft: 0,
      cleanersNew: 0,
    }
  });

  useEffect(() => {
    // Проверяем токен
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
        name: payload.name || payload.email,
      });

      loadExistingData();
    } catch (error) {
      console.error('Invalid token:', error);
      router.push('/login');
    }
  }, [router]);

  const loadExistingData = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await fetch('/api/external-data?limit=10', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const result = await response.json();
        const mappedData: ExternalDataRecord[] = result.data.map((item: any) => ({
          id: item.id,
          userId: item.userId,
          userName: item.user.name,
          userCity: item.user.city,
          userRole: item.user.role,
          trengoMessages: item.trengoMessages,
          trengoTicketsResolved: item.trengoTicketsResolved,
          crmTicketsResolved: item.crmTicketsResolved,
          crmOrdersLocal: item.crmOrdersLocal,
          countryTotalOrders: item.countryTotalOrders,
          reportDate: item.reportDate.split('T')[0],
          notes: item.notes,
          createdAt: item.createdAt,
          updatedAt: item.updatedAt,
        }));
        setExistingRecords(mappedData);
      } else {
        console.error('Failed to load external data');
      }
    } catch (error) {
      console.error('Error loading existing data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const onSubmit = async (data: ExternalDataForm) => {
    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await fetch('/api/external-data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        setShowSuccess(true);
        reset();
        loadExistingData();
        
        setTimeout(() => setShowSuccess(false), 3000);
      } else {
        const error = await response.json();
        alert(`Ошибка: ${error.message}`);
      }
    } catch (error) {
      console.error('Error saving external data:', error);
      alert('Ошибка сохранения данных');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getCityLabel = (city: string) => {
    const labels: Record<string, string> = {
      WARSAW: 'Варшава', KRAKOW: 'Краков', GDANSK: 'Гданьск',
      WROCLAW: 'Вроцлав', POZNAN: 'Познань', LODZ: 'Лодзь'
    };
    return labels[city] || city;
  };

  const getRoleLabel = (role: string) => {
    const labels: Record<string, string> = {
      HR: 'Менеджер по найму',
      OPERATIONS: 'Операционный менеджер',
      MIXED: 'Смешанная роль',
      COUNTRY_MANAGER: 'Менеджер по стране',
      ADMIN: 'Администратор',
    };
    return labels[role] || role;
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <button 
              onClick={() => router.push('/dashboard')}
              className="flex items-center hover:opacity-80 transition-opacity cursor-pointer"
            >
              <img 
                src="/cleanwhale-logo.png" 
                alt="CleanWhale" 
                className="h-10 w-10 rounded-lg mr-3"
              />
              <div className="text-left">
                <span className="text-xl font-bold cw-text-primary">
                  CleanWhale Analytics
                </span>
                <p className="text-xs text-gray-600">Внешние данные</p>
              </div>
            </button>
            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-600">
                {user.name} • {getCityLabel(user.city)}
              </div>
              <button
                onClick={() => router.push('/dashboard')}
                className="flex items-center text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
              >
                <ArrowLeft className="h-4 w-4 mr-1" />
                Назад
              </button>
              <button
                onClick={() => loadExistingData()}
                className="flex items-center text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
              >
                <RefreshCw className="h-4 w-4 mr-1" />
                Обновить
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Заголовок */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Внешние данные Trengo и CRM</h1>
          <p className="text-gray-600">
            Введите данные из Trengo и CRM за прошедшую неделю. Эти данные автоматически интегрируются в еженедельные отчеты.
          </p>
        </div>

        {/* Уведомление об успехе */}
        {showSuccess && (
          <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4 flex items-center">
            <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
            <span className="text-green-800">Данные успешно сохранены!</span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Форма ввода данных */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">Ввод данных за неделю</h2>
                <p className="text-sm text-gray-600 mt-1">
                  Заполните данные по вашему юниту ({getCityLabel(user.city)})
                </p>
              </div>

              <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6">
                {/* Дата отчета */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Дата отчета
                  </label>
                  <input
                    type="date"
                    {...register('reportDate', { required: 'Дата обязательна' })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                  {errors.reportDate && (
                    <p className="mt-1 text-sm text-red-600">{errors.reportDate.message}</p>
                  )}
                </div>

                {/* Trengo данные */}
                <div className="bg-blue-50 rounded-lg p-4">
                  <div className="flex items-center mb-4">
                    <MessageSquare className="h-5 w-5 text-blue-600 mr-2" />
                    <h3 className="text-lg font-semibold text-blue-900">Данные Trengo</h3>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Сообщения обработано
                      </label>
                      <input
                        type="number"
                        min="0"
                        {...register('trengoMessages', { 
                          required: 'Поле обязательно',
                          min: { value: 0, message: 'Не может быть отрицательным' }
                        })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                        placeholder="156"
                      />
                      {errors.trengoMessages && (
                        <p className="mt-1 text-sm text-red-600">{errors.trengoMessages.message}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Тикеты решено
                      </label>
                      <input
                        type="number"
                        min="0"
                        {...register('trengoTicketsResolved', { 
                          required: 'Поле обязательно',
                          min: { value: 0, message: 'Не может быть отрицательным' }
                        })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                        placeholder="18"
                      />
                      {errors.trengoTicketsResolved && (
                        <p className="mt-1 text-sm text-red-600">{errors.trengoTicketsResolved.message}</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* CRM данные */}
                <div className="bg-green-50 rounded-lg p-4">
                  <div className="flex items-center mb-4">
                    <Package className="h-5 w-5 text-green-600 mr-2" />
                    <h3 className="text-lg font-semibold text-green-900">Данные CRM</h3>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Тикеты решено
                      </label>
                      <input
                        type="number"
                        min="0"
                        {...register('crmTicketsResolved', { 
                          required: 'Поле обязательно',
                          min: { value: 0, message: 'Не может быть отрицательным' }
                        })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                        placeholder="42"
                      />
                      {errors.crmTicketsResolved && (
                        <p className="mt-1 text-sm text-red-600">{errors.crmTicketsResolved.message}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Заказы в {getCityLabel(user.city)}
                      </label>
                      <input
                        type="number"
                        min="0"
                        {...register('crmOrdersLocal', { 
                          required: 'Поле обязательно',
                          min: { value: 0, message: 'Не может быть отрицательным' }
                        })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                        placeholder="125"
                      />
                      {errors.crmOrdersLocal && (
                        <p className="mt-1 text-sm text-red-600">{errors.crmOrdersLocal.message}</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Дополнительные метрики клиентского сервиса */}
                <div className="bg-orange-50 rounded-lg p-4">
                  <div className="flex items-center mb-4">
                    <Star className="h-5 w-5 text-orange-600 mr-2" />
                    <h3 className="text-lg font-semibold text-orange-900">Клиентский сервис и персонал</h3>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Плохие оценки
                      </label>
                      <input
                        type="number"
                        min="0"
                        {...register('badRatingsCount', { 
                          min: { value: 0, message: 'Не может быть отрицательным' }
                        })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                        placeholder="5"
                      />
                      {errors.badRatingsCount && (
                        <p className="mt-1 text-sm text-red-600">{errors.badRatingsCount.message}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Отмены подписки
                      </label>
                      <input
                        type="number"
                        min="0"
                        {...register('subscriptionCancellations', { 
                          min: { value: 0, message: 'Не может быть отрицательным' }
                        })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                        placeholder="3"
                      />
                      {errors.subscriptionCancellations && (
                        <p className="mt-1 text-sm text-red-600">{errors.subscriptionCancellations.message}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Средняя оценка (1-5)
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="5"
                        step="0.1"
                        {...register('averageRating', { 
                          min: { value: 1, message: 'Минимум 1' },
                          max: { value: 5, message: 'Максимум 5' }
                        })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                        placeholder="4.5"
                      />
                      {errors.averageRating && (
                        <p className="mt-1 text-sm text-red-600">{errors.averageRating.message}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                        <UserMinus className="h-4 w-4 mr-1 text-red-500" />
                        Ушли клинеры
                      </label>
                      <input
                        type="number"
                        min="0"
                        {...register('cleanersLeft', { 
                          min: { value: 0, message: 'Не может быть отрицательным' }
                        })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                        placeholder="2"
                      />
                      {errors.cleanersLeft && (
                        <p className="mt-1 text-sm text-red-600">{errors.cleanersLeft.message}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                        <UserPlus className="h-4 w-4 mr-1 text-green-500" />
                        Новые клинеры
                      </label>
                      <input
                        type="number"
                        min="0"
                        {...register('cleanersNew', { 
                          min: { value: 0, message: 'Не может быть отрицательным' }
                        })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                        placeholder="4"
                      />
                      {errors.cleanersNew && (
                        <p className="mt-1 text-sm text-red-600">{errors.cleanersNew.message}</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Общие данные по стране (только для country manager) */}
                {user.role === 'COUNTRY_MANAGER' && (
                  <div className="bg-purple-50 rounded-lg p-4">
                    <div className="flex items-center mb-4">
                      <MapPin className="h-5 w-5 text-purple-600 mr-2" />
                      <h3 className="text-lg font-semibold text-purple-900">Данные по стране</h3>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Общее количество заказов
                        </label>
                        <input
                          type="number"
                          min="0"
                          {...register('countryTotalOrders', { 
                            min: { value: 0, message: 'Не может быть отрицательным' }
                          })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                          placeholder="1250"
                        />
                        {errors.countryTotalOrders && (
                          <p className="mt-1 text-sm text-red-600">{errors.countryTotalOrders.message}</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Плохие оценки по стране
                        </label>
                        <input
                          type="number"
                          min="0"
                          {...register('countryBadRatings', { 
                            min: { value: 0, message: 'Не может быть отрицательным' }
                          })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                          placeholder="45"
                        />
                        {errors.countryBadRatings && (
                          <p className="mt-1 text-sm text-red-600">{errors.countryBadRatings.message}</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Отмены подписки по стране
                        </label>
                        <input
                          type="number"
                          min="0"
                          {...register('countryCancellations', { 
                            min: { value: 0, message: 'Не может быть отрицательным' }
                          })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                          placeholder="23"
                        />
                        {errors.countryCancellations && (
                          <p className="mt-1 text-sm text-red-600">{errors.countryCancellations.message}</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Средняя оценка по стране
                        </label>
                        <input
                          type="number"
                          min="1"
                          max="5"
                          step="0.1"
                          {...register('countryAvgRating', { 
                            min: { value: 1, message: 'Минимум 1' },
                            max: { value: 5, message: 'Максимум 5' }
                          })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                          placeholder="4.3"
                        />
                        {errors.countryAvgRating && (
                          <p className="mt-1 text-sm text-red-600">{errors.countryAvgRating.message}</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                          <UserMinus className="h-4 w-4 mr-1 text-red-500" />
                          Ушли клинеры (страна)
                        </label>
                        <input
                          type="number"
                          min="0"
                          {...register('countryCleanersLeft', { 
                            min: { value: 0, message: 'Не может быть отрицательным' }
                          })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                          placeholder="18"
                        />
                        {errors.countryCleanersLeft && (
                          <p className="mt-1 text-sm text-red-600">{errors.countryCleanersLeft.message}</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                          <UserPlus className="h-4 w-4 mr-1 text-green-500" />
                          Новые клинеры (страна)
                        </label>
                        <input
                          type="number"
                          min="0"
                          {...register('countryCleanersNew', { 
                            min: { value: 0, message: 'Не может быть отрицательным' }
                          })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                          placeholder="32"
                        />
                        {errors.countryCleanersNew && (
                          <p className="mt-1 text-sm text-red-600">{errors.countryCleanersNew.message}</p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Заметки */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Дополнительные заметки (опционально)
                  </label>
                  <textarea
                    {...register('notes')}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Особенности недели, важные события..."
                  />
                </div>

                {/* Кнопка сохранения */}
                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex items-center px-6 py-3 cw-button"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Сохранение...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        Сохранить данные
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Правая панель - существующие записи */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Последние записи</h3>
              </div>
              
              <div className="p-6">
                {isLoading ? (
                  <div className="flex justify-center py-4">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                  </div>
                ) : existingRecords.length === 0 ? (
                  <p className="text-gray-500 text-sm">Нет записей</p>
                ) : (
                  <div className="space-y-4">
                    {existingRecords.slice(0, 5).map((record) => (
                      <div key={record.id} className="border rounded-lg p-3">
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <p className="font-medium text-sm">{record.userName}</p>
                            <p className="text-xs text-gray-500">
                              {getCityLabel(record.userCity)} • {getRoleLabel(record.userRole)}
                            </p>
                          </div>
                          <span className="text-xs text-gray-500">
                            {new Date(record.reportDate).toLocaleDateString('ru-RU')}
                          </span>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div className="bg-blue-50 p-2 rounded">
                            <p className="text-blue-700 font-medium">Trengo</p>
                            <p>{record.trengoMessages} сообщ.</p>
                            <p>{record.trengoTicketsResolved} тикетов</p>
                          </div>
                          <div className="bg-green-50 p-2 rounded">
                            <p className="text-green-700 font-medium">CRM</p>
                            <p>{record.crmTicketsResolved} тикетов</p>
                            <p>{record.crmOrdersLocal} заказов</p>
                          </div>
                        </div>

                        {record.notes && (
                          <p className="text-xs text-gray-600 mt-2 italic">
                            {record.notes.length > 50 
                              ? `${record.notes.substring(0, 50)}...` 
                              : record.notes
                            }
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Информационная панель */}
            <div className="mt-6 bg-blue-50 rounded-lg p-4">
              <div className="flex items-start">
                <AlertCircle className="h-5 w-5 text-blue-600 mt-1 mr-2 flex-shrink-0" />
                <div>
                  <h4 className="text-sm font-medium text-blue-900 mb-1">Важно!</h4>
                  <p className="text-xs text-blue-800">
                    Данные Trengo и CRM должны вноситься каждую неделю для корректной аналитики. 
                    Эти данные автоматически появятся в разделе "Еженедельные метрики".
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
