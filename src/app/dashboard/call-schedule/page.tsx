'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { 
  Phone, Calendar, Clock, Users, MapPin, Plus, Edit, Trash2, CheckCircle, 
  XCircle, AlertCircle, PhoneCall, FileText, Target, Star, Save
} from 'lucide-react';

interface CallForm {
  callDate: string;
  callTime: string;
  duration?: number;
  city: string;
  participantIds: string[];
  topic?: string;
  agenda?: string;
  callType?: string;
  priority?: string;
}

interface CallSchedule {
  id: string;
  callDate: string;
  callTime: string;
  duration?: number;
  city: string;
  participantIds: string[];
  participantNames: string[];
  topic?: string;
  agenda?: string;
  callType: string;
  priority: string;
  status: string;
  actualDuration?: number;
  notes?: string;
  outcome?: string;
  nextActions?: string;
  scheduledBy: {
    id: string;
    name: string;
    role: string;
  };
  createdAt: string;
  updatedAt: string;
}

interface Manager {
  id: string;
  name: string;
  city: string;
  role: string;
}

export default function CallSchedulePage() {
  const [user, setUser] = useState<any>(null);
  const [calls, setCalls] = useState<CallSchedule[]>([]);
  const [managers, setManagers] = useState<Manager[]>([]);
  const [selectedCall, setSelectedCall] = useState<CallSchedule | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [selectedWeek, setSelectedWeek] = useState<Date>(new Date());
  const [showSuccess, setShowSuccess] = useState(false);
  const router = useRouter();

  const { register, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm<CallForm>({
    defaultValues: {
      callDate: new Date().toISOString().split('T')[0],
      callTime: '14:00',
      duration: 30,
      callType: 'REGULAR',
      priority: 'MEDIUM',
      participantIds: [],
    }
  });

  const selectedCity = watch('city');

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

      // Только country manager и admin могут видеть эту страницу
      if (!['COUNTRY_MANAGER', 'ADMIN'].includes(payload.role)) {
        router.push('/dashboard');
        return;
      }

      loadCalls();
      loadManagers();
    } catch (error) {
      console.error('Invalid token:', error);
      router.push('/login');
    }
  }, [router]);

  const loadCalls = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('token');
      const startDate = getWeekStart(selectedWeek).toISOString().split('T')[0];
      const endDate = getWeekEnd(selectedWeek).toISOString().split('T')[0];
      
      const response = await fetch(`/api/call-schedule?startDate=${startDate}&endDate=${endDate}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setCalls(data.calls.map((call: any) => ({
          ...call,
          participantIds: JSON.parse(call.participantIds),
          participantNames: JSON.parse(call.participantNames || '[]'),
        })));
      } else {
        console.error('Failed to load calls');
      }
    } catch (error) {
      console.error('Error loading calls:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadManagers = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/users/manager-list', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setManagers(data.managers);
      } else {
        console.error('Failed to load managers');
      }
    } catch (error) {
      console.error('Error loading managers:', error);
    }
  };

  const onSubmit = async (data: CallForm) => {
    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      const url = selectedCall ? `/api/call-schedule/${selectedCall.id}` : '/api/call-schedule';
      const method = selectedCall ? 'PUT' : 'POST';

      // Получаем имена участников
      const selectedManagers = managers.filter(m => data.participantIds.includes(m.id));
      const participantNames = selectedManagers.map(m => m.name);

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...data,
          participantNames,
        }),
      });

      if (response.ok) {
        setShowSuccess(true);
        setShowForm(false);
        setSelectedCall(null);
        reset();
        loadCalls();
        
        setTimeout(() => setShowSuccess(false), 3000);
      } else {
        const error = await response.json();
        alert(`Ошибка: ${error.message}`);
      }
    } catch (error) {
      console.error('Error saving call:', error);
      alert('Ошибка сохранения звонка');
    } finally {
      setIsSubmitting(false);
    }
  };

  const deleteCall = async (callId: string) => {
    if (!confirm('Удалить этот звонок?')) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/call-schedule/${callId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        loadCalls();
      } else {
        const error = await response.json();
        alert(`Ошибка: ${error.message}`);
      }
    } catch (error) {
      console.error('Error deleting call:', error);
      alert('Ошибка удаления звонка');
    }
  };

  const updateCallStatus = async (callId: string, status: string, notes?: string, actualDuration?: number) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/call-schedule/${callId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          status,
          notes,
          actualDuration,
        }),
      });

      if (response.ok) {
        loadCalls();
      } else {
        const error = await response.json();
        alert(`Ошибка: ${error.message}`);
      }
    } catch (error) {
      console.error('Error updating call status:', error);
      alert('Ошибка обновления статуса');
    }
  };

  const editCall = (call: CallSchedule) => {
    setSelectedCall(call);
    setValue('callDate', call.callDate.split('T')[0]);
    setValue('callTime', call.callTime);
    setValue('duration', call.duration);
    setValue('city', call.city);
    setValue('participantIds', call.participantIds);
    setValue('topic', call.topic);
    setValue('agenda', call.agenda);
    setValue('callType', call.callType);
    setValue('priority', call.priority);
    setShowForm(true);
  };

  const getWeekStart = (date: Date) => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.setDate(diff));
  };

  const getWeekEnd = (date: Date) => {
    const start = getWeekStart(date);
    return new Date(start.getTime() + 6 * 24 * 60 * 60 * 1000);
  };

  const getCallsForDay = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    return calls.filter(call => call.callDate.split('T')[0] === dateStr);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'COMPLETED': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'CANCELLED': return <XCircle className="h-4 w-4 text-red-500" />;
      case 'IN_PROGRESS': return <Phone className="h-4 w-4 text-blue-500" />;
      case 'MISSED': return <AlertCircle className="h-4 w-4 text-orange-500" />;
      default: return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      SCHEDULED: 'Запланирован',
      IN_PROGRESS: 'В процессе',
      COMPLETED: 'Завершен',
      CANCELLED: 'Отменен',
      POSTPONED: 'Отложен',
      MISSED: 'Пропущен',
    };
    return labels[status] || status;
  };

  const getCityLabel = (city: string) => {
    const labels: Record<string, string> = {
      WARSAW: 'Варшава', KRAKOW: 'Краков', GDANSK: 'Гданьск',
      WROCLAW: 'Вроцлав', POZNAN: 'Познань', LODZ: 'Лодзь'
    };
    return labels[city] || city;
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'CRITICAL': return 'bg-red-100 text-red-800 border-red-200';
      case 'HIGH': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'MEDIUM': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'LOW': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const weekDays = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
  const weekStart = getWeekStart(selectedWeek);

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
                <p className="text-xs text-gray-600">График звонков</p>
              </div>
            </button>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => {
                  setSelectedCall(null);
                  reset();
                  setShowForm(true);
                }}
                className="flex items-center cw-text-primary border cw-border-primary bg-blue-50 hover:bg-blue-100 px-4 py-2 rounded-md text-sm font-medium transition-colors"
              >
                <Plus className="h-4 w-4 mr-2" />
                Запланировать звонок
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Уведомление об успехе */}
      {showSuccess && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center">
            <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
            <span className="text-green-800">Звонок успешно сохранен!</span>
          </div>
        </div>
      )}

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Навигация по неделям */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setSelectedWeek(new Date(selectedWeek.getTime() - 7 * 24 * 60 * 60 * 1000))}
              className="px-3 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md"
            >
              ← Предыдущая неделя
            </button>
            <h2 className="text-lg font-semibold text-gray-900">
              {weekStart.toLocaleDateString('ru-RU')} - {getWeekEnd(selectedWeek).toLocaleDateString('ru-RU')}
            </h2>
            <button
              onClick={() => setSelectedWeek(new Date(selectedWeek.getTime() + 7 * 24 * 60 * 60 * 1000))}
              className="px-3 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md"
            >
              Следующая неделя →
            </button>
          </div>
          
          <button
            onClick={() => setSelectedWeek(new Date())}
            className="px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-md"
          >
            Текущая неделя
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Календарь недели */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="grid grid-cols-7 gap-0">
                {/* Заголовки дней */}
                {weekDays.map((day, index) => (
                  <div key={day} className="bg-gray-50 px-4 py-3 text-center font-medium text-gray-700 border-b">
                    {day}
                    <div className="text-xs text-gray-500 mt-1">
                      {new Date(weekStart.getTime() + index * 24 * 60 * 60 * 1000).getDate()}
                    </div>
                  </div>
                ))}
                
                {/* Дни недели с звонками */}
                {weekDays.map((_, index) => {
                  const currentDay = new Date(weekStart.getTime() + index * 24 * 60 * 60 * 1000);
                  const dayCalls = getCallsForDay(currentDay);
                  const isToday = currentDay.toDateString() === new Date().toDateString();
                  
                  return (
                    <div 
                      key={index} 
                      className={`min-h-[200px] p-2 border-r border-b ${isToday ? 'bg-blue-50' : 'bg-white'}`}
                    >
                      {dayCalls.map((call) => (
                        <div 
                          key={call.id}
                          className={`mb-2 p-2 rounded text-xs border cursor-pointer hover:shadow-md transition-shadow ${getPriorityColor(call.priority)}`}
                          onClick={() => editCall(call)}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-medium">{call.callTime}</span>
                            {getStatusIcon(call.status)}
                          </div>
                          <div className="text-xs">
                            <div className="font-medium">{getCityLabel(call.city)}</div>
                            <div className="text-gray-600">{call.participantNames.join(', ')}</div>
                            {call.topic && <div className="mt-1 text-gray-700">{call.topic}</div>}
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Боковая панель */}
          <div className="lg:col-span-1">
            {/* Форма планирования */}
            {showForm && (
              <div className="bg-white rounded-lg shadow p-6 mb-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {selectedCall ? 'Редактировать звонок' : 'Запланировать звонок'}
                  </h3>
                  <button
                    onClick={() => {
                      setShowForm(false);
                      setSelectedCall(null);
                      reset();
                    }}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <XCircle className="h-5 w-5" />
                  </button>
                </div>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Дата
                    </label>
                    <input
                      type="date"
                      {...register('callDate', { required: 'Дата обязательна' })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    />
                    {errors.callDate && (
                      <p className="mt-1 text-sm text-red-600">{errors.callDate.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Время
                    </label>
                    <input
                      type="time"
                      {...register('callTime', { required: 'Время обязательно' })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    />
                    {errors.callTime && (
                      <p className="mt-1 text-sm text-red-600">{errors.callTime.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Длительность (минуты)
                    </label>
                    <input
                      type="number"
                      min="15"
                      max="180"
                      {...register('duration')}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      placeholder="30"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Город
                    </label>
                    <select
                      {...register('city', { required: 'Город обязателен' })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Выберите город</option>
                      <option value="WARSAW">Варшава</option>
                      <option value="KRAKOW">Краков</option>
                      <option value="GDANSK">Гданьск</option>
                      <option value="WROCLAW">Вроцлав</option>
                      <option value="POZNAN">Познань</option>
                      <option value="LODZ">Лодзь</option>
                    </select>
                    {errors.city && (
                      <p className="mt-1 text-sm text-red-600">{errors.city.message}</p>
                    )}
                  </div>

                  {selectedCity && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Участники
                      </label>
                      <div className="max-h-32 overflow-y-auto border border-gray-300 rounded-md p-2">
                        {managers
                          .filter(m => m.city === selectedCity)
                          .map(manager => (
                            <label key={manager.id} className="flex items-center space-x-2 py-1">
                              <input
                                type="checkbox"
                                value={manager.id}
                                {...register('participantIds', { required: 'Выберите участников' })}
                                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                              />
                              <span className="text-sm">{manager.name}</span>
                            </label>
                          ))}
                      </div>
                      {errors.participantIds && (
                        <p className="mt-1 text-sm text-red-600">{errors.participantIds.message}</p>
                      )}
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Тема (опционально)
                    </label>
                    <input
                      type="text"
                      {...register('topic')}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Еженедельный созвон"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Повестка (опционально)
                    </label>
                    <textarea
                      {...register('agenda')}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      placeholder="1. Обсуждение результатов&#10;2. Планы на неделю&#10;3. Проблемы и решения"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Тип
                      </label>
                      <select
                        {...register('callType')}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="REGULAR">Обычный</option>
                        <option value="URGENT">Срочный</option>
                        <option value="FOLLOW_UP">Последующий</option>
                        <option value="CHECK_IN">Проверка</option>
                        <option value="PLANNING">Планирование</option>
                        <option value="CRISIS">Кризис</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Приоритет
                      </label>
                      <select
                        {...register('priority')}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="LOW">Низкий</option>
                        <option value="MEDIUM">Средний</option>
                        <option value="HIGH">Высокий</option>
                        <option value="CRITICAL">Критический</option>
                      </select>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full flex items-center justify-center px-4 py-2 cw-button"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Сохранение...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        {selectedCall ? 'Обновить' : 'Запланировать'}
                      </>
                    )}
                  </button>
                </form>
              </div>
            )}

            {/* Статистика */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Статистика недели</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Всего звонков:</span>
                  <span className="font-medium">{calls.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Завершено:</span>
                  <span className="font-medium text-green-600">
                    {calls.filter(c => c.status === 'COMPLETED').length}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Запланировано:</span>
                  <span className="font-medium text-blue-600">
                    {calls.filter(c => c.status === 'SCHEDULED').length}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Отменено:</span>
                  <span className="font-medium text-red-600">
                    {calls.filter(c => c.status === 'CANCELLED').length}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
