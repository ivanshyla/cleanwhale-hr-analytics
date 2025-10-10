'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { Calendar, Save, Clock, Sun, Moon, Coffee, Briefcase, Home, Zap, CheckCircle } from 'lucide-react';
import { useAuth, withAuth } from '@/contexts/AuthContext';

type ScheduleType = 'STANDARD' | 'FLEXIBLE' | 'IRREGULAR_7DAY';

interface ScheduleForm {
  weekStartDate: string; // Monday YYYY-MM-DD
  scheduleType: ScheduleType; // Тип расписания
  mondayStart?: string; mondayEnd?: string; mondayNote?: string;
  tuesdayStart?: string; tuesdayEnd?: string; tuesdayNote?: string;
  wednesdayStart?: string; wednesdayEnd?: string; wednesdayNote?: string;
  thursdayStart?: string; thursdayEnd?: string; thursdayNote?: string;
  fridayStart?: string; fridayEnd?: string; fridayNote?: string;
  saturdayStart?: string; saturdayEnd?: string; saturdayNote?: string;
  sundayStart?: string; sundayEnd?: string; sundayNote?: string;
  weeklyNotes?: string;
}

function getCurrentMonday(): string {
  const now = new Date();
  const day = now.getDay();
  const diffToMonday = (day === 0 ? -6 : 1) - day;
  const monday = new Date(now);
  monday.setDate(now.getDate() + diffToMonday);
  return monday.toISOString().slice(0, 10);
}

function SchedulePage() {
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [isLoadingSchedule, setIsLoadingSchedule] = useState(true);

  const { register, handleSubmit, watch, setValue } = useForm<ScheduleForm>({
    defaultValues: { 
      weekStartDate: getCurrentMonday(),
      scheduleType: 'STANDARD',
      mondayStart: '09:00', mondayEnd: '18:00',
      tuesdayStart: '09:00', tuesdayEnd: '18:00',
      wednesdayStart: '09:00', wednesdayEnd: '18:00',
      thursdayStart: '09:00', thursdayEnd: '18:00',
      fridayStart: '09:00', fridayEnd: '18:00',
      saturdayStart: '09:00', saturdayEnd: '18:00',
      sundayStart: '09:00', sundayEnd: '18:00',
    }
  });

  const watchedValues = watch();

  useEffect(() => {
    // Загружаем график когда пользователь авторизован
    if (!user) return;
    
    const loadSchedule = async () => {
      try {
        // Загружаем сохраненный график для текущей недели
        const monday = getCurrentMonday();
        const scheduleRes = await fetch(`/api/work-schedules?since=${monday}&until=${monday}`, {
          credentials: 'include'
        });

        if (scheduleRes.ok) {
          const data = await scheduleRes.json();
          // API возвращает массив schedules, берем первый (для текущей недели)
          if (data.schedules && data.schedules.length > 0) {
            const schedule = data.schedules[0];
            setValue('weekStartDate', monday);
            
            // Устанавливаем тип расписания
            if (schedule.scheduleType) {
              setValue('scheduleType', schedule.scheduleType as ScheduleType);
            }
            
            // Заполняем все дни
            const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
            days.forEach(day => {
              if (schedule[`${day}Start`]) setValue(`${day}Start` as any, schedule[`${day}Start`]);
              if (schedule[`${day}End`]) setValue(`${day}End` as any, schedule[`${day}End`]);
              if (schedule[`${day}Note`]) setValue(`${day}Note` as any, schedule[`${day}Note`]);
            });
            
            if (schedule.weeklyNotes) setValue('weeklyNotes', schedule.weeklyNotes);
          }
        }
      } catch (error) {
        console.error('Error loading schedule:', error);
      } finally {
        setIsLoadingSchedule(false);
      }
    };

    loadSchedule();
  }, [user, router, setValue]);

  const onSubmit = async (data: ScheduleForm) => {
    setLoading(true);
    try {
      // Токен в cookies, не нужно передавать в заголовке
      const resp = await fetch('/api/work-schedules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include', // Важно! Отправляет cookies
        body: JSON.stringify(data),
      });
      const result = await resp.json();
      if (resp.ok) {
        alert('🎉 График сохранен успешно!');
        router.push('/dashboard');
      } else {
        const errorMsg = result.error ? `${result.message}: ${result.error}` : result.message;
        alert(`Ошибка сохранения: ${errorMsg || 'Неизвестная ошибка'}`);
        console.error('Schedule save error:', result);
      }
    } finally { setLoading(false); }
  };

  const setStandardWorkDay = (dayKey: string) => {
    setValue(`${dayKey}Start` as any, '09:00');
    setValue(`${dayKey}End` as any, '18:00');
  };

  const clearDay = (dayKey: string) => {
    setValue(`${dayKey}Start` as any, '');
    setValue(`${dayKey}End` as any, '');
    setValue(`${dayKey}Note` as any, '');
  };

  const setWorkWeek = () => {
    const workDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
    workDays.forEach(day => setStandardWorkDay(day));
  };

  const calculateDuration = (start?: string, end?: string): string => {
    if (!start || !end) return '';
    const [startH, startM] = start.split(':').map(Number);
    const [endH, endM] = end.split(':').map(Number);
    const minutes = (endH * 60 + endM) - (startH * 60 + startM);
    if (minutes <= 0) return '';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}ч ${mins}м`;
  };

  const getDayIcon = (key: string) => {
    const icons: Record<string, any> = {
      monday: <Briefcase className="h-5 w-5" />,
      tuesday: <Zap className="h-5 w-5" />,
      wednesday: <Coffee className="h-5 w-5" />,
      thursday: <Clock className="h-5 w-5" />,
      friday: <CheckCircle className="h-5 w-5" />,
      saturday: <Sun className="h-5 w-5" />,
      sunday: <Home className="h-5 w-5" />,
    };
    return icons[key] || <Calendar className="h-5 w-5" />;
  };

  const getDayColor = (key: string) => {
    // Единый нейтральный цвет для всех дней
    return 'from-gray-50 to-gray-100 border-gray-300';
  };

  const getTextColor = (key: string) => {
    // Единый цвет текста для всех дней
    return 'text-gray-800';
  };

  const days = [
    { key: 'monday', label: 'Понедельник', emoji: '💼' },
    { key: 'tuesday', label: 'Вторник', emoji: '⚡' },
    { key: 'wednesday', label: 'Среда', emoji: '☕' },
    { key: 'thursday', label: 'Четверг', emoji: '🎯' },
    { key: 'friday', label: 'Пятница', emoji: '🎉' },
    { key: 'saturday', label: 'Суббота', emoji: '☀️' },
    { key: 'sunday', label: 'Воскресенье', emoji: '🏡' },
  ] as const;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <header className="bg-white/80 backdrop-blur-sm shadow-sm border-b border-white/20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center">
            <button 
              onClick={() => router.push('/dashboard')}
              className="flex items-center hover:opacity-80 transition-opacity cursor-pointer mr-6"
            >
              <img 
                src="/cleanwhale-logo.png" 
                alt="CleanWhale" 
                className="h-10 w-10 rounded-lg mr-3"
              />
              <div className="text-left">
                <span className="text-lg font-bold cw-text-primary">CleanWhale</span>
                <p className="text-xs text-gray-600">Analytics</p>
              </div>
            </button>
            <div className="flex items-center">
              <div className="p-2 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg mr-3">
                <Calendar className="h-6 w-6 text-white" />
              </div>
              <div>
                <span className="text-xl font-bold text-gray-900">Мой график недели</span>
                <p className="text-sm text-gray-600">Планируйте свое время красиво и удобно</p>
              </div>
            </div>
          </div>
          <button 
            onClick={() => router.push('/dashboard')} 
            className="px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-white/50 rounded-lg transition-all"
          >
            ← Назад
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
          {/* Заголовок недели */}
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 mb-2">
                  📅 Настройка графика работы
                </h1>
                <p className="text-gray-600">Нажмите на карточку дня для быстрой установки базового времени 9:00-18:00</p>
              </div>
              <div className="text-right">
                <label className="block text-sm font-medium text-gray-700 mb-2">Неделя от:</label>
                <input 
                  type="date" 
                  {...register('weekStartDate', { required: true })} 
                  className="px-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm"
                />
              </div>
            </div>
            
            {/* Тип расписания */}
            <div className="mt-6">
              <label className="block text-sm font-medium text-gray-700 mb-3">📋 Тип расписания:</label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <label className={`flex items-center p-4 border-2 rounded-xl cursor-pointer transition-all ${
                  watchedValues.scheduleType === 'STANDARD' 
                    ? 'bg-blue-50 border-blue-500 ring-2 ring-blue-200' 
                    : 'bg-white border-gray-300 hover:border-blue-300'
                }`}>
                  <input 
                    type="radio" 
                    value="STANDARD" 
                    {...register('scheduleType')} 
                    className="mr-3"
                  />
                  <div>
                    <div className="font-semibold text-gray-900">📅 Стандартная неделя</div>
                    <div className="text-xs text-gray-600 mt-1">Обычная рабочая неделя (5 дней)</div>
                  </div>
                </label>
                
                <label className={`flex items-center p-4 border-2 rounded-xl cursor-pointer transition-all ${
                  watchedValues.scheduleType === 'FLEXIBLE' 
                    ? 'bg-purple-50 border-purple-500 ring-2 ring-purple-200' 
                    : 'bg-white border-gray-300 hover:border-purple-300'
                }`}>
                  <input 
                    type="radio" 
                    value="FLEXIBLE" 
                    {...register('scheduleType')} 
                    className="mr-3"
                  />
                  <div>
                    <div className="font-semibold text-gray-900">🔄 Гибкий график</div>
                    <div className="text-xs text-gray-600 mt-1">Свободный режим работы</div>
                  </div>
                </label>
                
                <label className={`flex items-center p-4 border-2 rounded-xl cursor-pointer transition-all ${
                  watchedValues.scheduleType === 'IRREGULAR_7DAY' 
                    ? 'bg-orange-50 border-orange-500 ring-2 ring-orange-200' 
                    : 'bg-white border-gray-300 hover:border-orange-300'
                }`}>
                  <input 
                    type="radio" 
                    value="IRREGULAR_7DAY" 
                    {...register('scheduleType')} 
                    className="mr-3"
                  />
                  <div>
                    <div className="font-semibold text-gray-900">⏰ Ненормированная, 7 дней</div>
                    <div className="text-xs text-gray-600 mt-1">Работа без четкого графика</div>
                  </div>
                </label>
              </div>
            </div>

            {/* Быстрые действия */}
            <div className="mt-4 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={setWorkWeek}
                className="inline-flex items-center px-4 py-2 bg-green-100 text-green-800 rounded-lg hover:bg-green-200 transition-colors text-sm font-medium"
              >
                ⚡ Заполнить как стандартная неделя
              </button>
              <button
                type="button"
                onClick={() => {
                  const allDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
                  allDays.forEach(day => clearDay(day));
                }}
                className="inline-flex items-center px-4 py-2 bg-gray-100 text-gray-800 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
              >
                🗑️ Очистить всё
              </button>
            </div>
          </div>

          {/* Сетка дней недели */}
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {days.map(day => {
              const startValue = watchedValues[`${day.key}Start` as keyof ScheduleForm] as string;
              const endValue = watchedValues[`${day.key}End` as keyof ScheduleForm] as string;
              const duration = calculateDuration(startValue, endValue);
              const hasTime = startValue && endValue;
              
              return (
                <div 
                  key={day.key} 
                  className={`bg-gradient-to-br ${getDayColor(day.key)} rounded-2xl shadow-lg border-2 p-6 transition-all hover:shadow-xl hover:scale-105 cursor-pointer ${hasTime ? 'ring-2 ring-green-200' : ''}`}
                  onClick={() => !hasTime && setStandardWorkDay(day.key)}
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center">
                      <span className="text-2xl mr-3">{day.emoji}</span>
                      <div>
                        <h3 className={`font-bold ${getTextColor(day.key)}`}>{day.label}</h3>
                        {duration && (
                          <p className="text-sm text-gray-600 flex items-center mt-1">
                            <Clock className="h-3 w-3 mr-1" />
                            {duration}
                          </p>
                        )}
                        {!hasTime && (
                          <p className="text-xs text-gray-500 mt-1">
                            👆 Нажмите для базового времени 9:00-18:00
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {hasTime && (
                        <>
                          <div className="p-1 bg-green-100 rounded-full">
                            <CheckCircle className="h-5 w-5 text-green-600" />
                          </div>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              clearDay(day.key);
                            }}
                            className="p-1 bg-red-100 rounded-full hover:bg-red-200 transition-colors"
                            title="Очистить день"
                          >
                            <span className="text-red-600 text-xs">✕</span>
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="space-y-3" onClick={(e) => e.stopPropagation()}>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1 flex items-center">
                          <Sun className="h-3 w-3 mr-1" />
                          Начало
                        </label>
                        <input 
                          type="time" 
                          {...register(`${day.key}Start` as any)} 
                          className="w-full px-3 py-2 border border-white/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white/70 backdrop-blur-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1 flex items-center">
                          <Moon className="h-3 w-3 mr-1" />
                          Конец
                        </label>
                        <input 
                          type="time" 
                          {...register(`${day.key}End` as any)} 
                          className="w-full px-3 py-2 border border-white/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white/70 backdrop-blur-sm"
                        />
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">✏️ Заметка</label>
                      <input 
                        type="text" 
                        {...register(`${day.key}Note` as any)} 
                        placeholder="Особенности дня..."
                        className="w-full px-3 py-2 border border-white/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white/70 backdrop-blur-sm text-sm"
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Дополнительные настройки */}
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
              ⚙️ Дополнительные настройки
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">📝 Общие заметки к неделе</label>
                <textarea 
                  rows={3} 
                  {...register('weeklyNotes')} 
                  placeholder="Планы, цели, особенности недели..."
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white/70 backdrop-blur-sm"
                />
              </div>
              
            </div>
          </div>

          {/* Кнопки */}
          <div className="flex justify-center space-x-4">
            <button
              type="button"
              onClick={() => router.push('/dashboard')}
              className="px-8 py-3 text-gray-600 border-2 border-gray-300 rounded-xl hover:bg-gray-50 transition-all font-medium"
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center px-8 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 transition-all shadow-lg font-medium"
            >
              <Save className="h-5 w-5 mr-2" />
              {loading ? '🔄 Сохранение...' : '💾 Сохранить график'}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}

// Защита страницы: для всех типов менеджеров
export default withAuth(SchedulePage, ['HIRING_MANAGER', 'OPS_MANAGER', 'MIXED_MANAGER', 'COUNTRY_MANAGER', 'ADMIN']);
