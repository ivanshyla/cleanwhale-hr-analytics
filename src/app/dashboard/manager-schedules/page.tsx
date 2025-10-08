'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Calendar, 
  Users, 
  Clock, 
  MapPin, 
  Filter, 
  Eye,
  ChevronDown,
  ChevronRight,
  AlertCircle
} from 'lucide-react';
import { useAuth, withAuth } from '@/contexts/AuthContext';

interface ManagerSchedule {
  id: string;
  weekStartDate: string;
  weekEndDate: string;
  user: {
    id: string;
    name: string;
    email: string;
    city: string;
    role: string;
  };
  mondayStart: string | null;
  mondayEnd: string | null;
  mondayNote: string | null;
  tuesdayStart: string | null;
  tuesdayEnd: string | null;
  tuesdayNote: string | null;
  wednesdayStart: string | null;
  wednesdayEnd: string | null;
  wednesdayNote: string | null;
  thursdayStart: string | null;
  thursdayEnd: string | null;
  thursdayNote: string | null;
  fridayStart: string | null;
  fridayEnd: string | null;
  fridayNote: string | null;
  saturdayStart: string | null;
  saturdayEnd: string | null;
  saturdayNote: string | null;
  sundayStart: string | null;
  sundayEnd: string | null;
  sundayNote: string | null;
  weeklyNotes: string | null;
  isFlexible: boolean;
}

interface ManagerSchedulesResponse {
  schedules: ManagerSchedule[];
  total: number;
}

function ManagerSchedulesPage() {
  const { user } = useAuth();
  const [schedules, setSchedules] = useState<ManagerSchedule[]>([]);
  const [filteredSchedules, setFilteredSchedules] = useState<ManagerSchedule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [cityFilter, setCityFilter] = useState<string>('all');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [expandedManager, setExpandedManager] = useState<string | null>(null);
  const [currentWeek, setCurrentWeek] = useState<string>(() => {
    const now = new Date();
    const monday = new Date(now);
    monday.setDate(now.getDate() - now.getDay() + 1);
    return monday.toISOString().split('T')[0];
  });
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();


  useEffect(() => {
    if (user) {
      loadManagerSchedules();
    }
  }, [user, currentWeek]);

  useEffect(() => {
    applyFilters();
  }, [schedules, cityFilter, roleFilter]);


  const loadManagerSchedules = async () => {
    try {
      const weekStart = new Date(currentWeek);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);

      console.log('Loading schedules for week:', currentWeek);
      
      const response = await fetch(
        `/api/work-schedules?include_all=true&since=${weekStart.toISOString()}&until=${weekEnd.toISOString()}`,
        {
          method: 'GET',
          cache: 'no-cache',
          headers: {
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
          },
          credentials: 'include'
        }
      );
      
      console.log('Schedules response status:', response.status);
      
      if (response.ok) {
        const data: ManagerSchedulesResponse = await response.json();
        console.log('Loaded schedules:', data.schedules?.length || 0);
        setSchedules(data.schedules || []);
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error('Schedules error:', errorData);
        setError(errorData.message || 'Ошибка загрузки графиков');
      }
    } catch (error) {
      console.error('Error loading manager schedules:', error);
      setError('Ошибка подключения к серверу');
    }
  };

  const applyFilters = () => {
    let filtered = schedules;

    // Фильтр по городу
    if (cityFilter !== 'all') {
      filtered = filtered.filter(schedule => schedule.user.city === cityFilter);
    }

    // Фильтр по роли
    if (roleFilter !== 'all') {
      filtered = filtered.filter(schedule => schedule.user.role === roleFilter);
    }

    setFilteredSchedules(filtered);
  };

  const getDaySchedule = (schedule: ManagerSchedule, day: string) => {
    const startField = `${day.toLowerCase()}Start`;
    const endField = `${day.toLowerCase()}End`;
    const noteField = `${day.toLowerCase()}Note`;
    
    return {
      start: schedule[startField as keyof ManagerSchedule] as string | null,
      end: schedule[endField as keyof ManagerSchedule] as string | null,
      note: schedule[noteField as keyof ManagerSchedule] as string | null,
    };
  };

  const formatDaySchedule = (daySchedule: { start: string | null; end: string | null; note: string | null }) => {
    if (!daySchedule.start || !daySchedule.end) {
      return { text: 'Выходной', color: 'text-gray-400 bg-gray-50' };
    }
    
    const isStandardTime = daySchedule.start === '09:00' && daySchedule.end === '18:00';
    return {
      text: `${daySchedule.start} - ${daySchedule.end}`,
      color: isStandardTime 
        ? 'text-green-600 bg-green-50' 
        : 'text-blue-600 bg-blue-50'
    };
  };

  const getAvailableCities = () => {
    const cities = Array.from(new Set(schedules.map(s => s.user.city))).sort();
    return cities;
  };

  const getAvailableRoles = () => {
    const roles = Array.from(new Set(schedules.map(s => s.user.role))).sort();
    return roles;
  };

  // Получить статистику работающих менеджеров по дням недели
  const getWorkingManagersStats = () => {
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    const dayNames = ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота', 'Воскресенье'];
    
    return days.map((day, index) => {
      const workingCount = filteredSchedules.filter(schedule => {
        const startField = `${day}Start`;
        const endField = `${day}End`;
        const start = (schedule as any)[startField] as string | null;
        const end = (schedule as any)[endField] as string | null;
        return start && end; // Работает если есть время начала и конца
      }).length;
      
      return {
        day: dayNames[index],
        count: workingCount,
        total: filteredSchedules.length
      };
    });
  };

  // Получить статистику работающих менеджеров сегодня
  const getTodayWorkingStats = () => {
    const today = new Date();
    const dayIndex = today.getDay(); // 0 = воскресенье, 1 = понедельник, ...
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const dayName = days[dayIndex];
    
    const workingToday = filteredSchedules.filter(schedule => {
      const startField = `${dayName}Start`;
      const endField = `${dayName}End`;
      const start = (schedule as any)[startField] as string | null;
      const end = (schedule as any)[endField] as string | null;
      return start && end;
    });

    // Группировка по ролям
    const roleStats = workingToday.reduce((acc, schedule) => {
      const role = schedule.user.role;
      const roleLabel = role === 'HIRING_MANAGER' ? 'HR' :
                       role === 'OPS_MANAGER' ? 'Ops' :
                       role === 'MIXED_MANAGER' ? 'Mixed' :
                       role === 'COUNTRY_MANAGER' ? 'Country' : role;
      
      acc[roleLabel] = (acc[roleLabel] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      total: workingToday.length,
      roles: roleStats,
      dayName: ['Воскресенье', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'][dayIndex]
    };
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
          <p className="text-gray-600">Загрузка графиков менеджеров...</p>
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

  return (
    <div className="space-y-6">
      {/* Заголовок страницы */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center">
              <Calendar className="h-8 w-8 mr-3 text-blue-600" />
              Графики всех менеджеров
            </h1>
            <p className="text-gray-600 mt-1">
              {user?.name} • {user?.role === 'ADMIN' ? 'Администратор' : 'Менеджер по стране'}
            </p>
          </div>
          
          <div className="text-right">
            <div className="text-sm text-gray-500">Неделя от</div>
            <div className="text-lg font-semibold text-gray-900">
              {currentWeek}
            </div>
          </div>
        </div>
      </div>

      {/* Фильтры */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center space-x-6">
          <div className="flex items-center space-x-2">
            <Filter className="h-5 w-5 text-gray-500" />
            <span className="text-sm font-medium text-gray-700">Фильтры:</span>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700">Город</label>
            <select
              value={cityFilter}
              onChange={(e) => setCityFilter(e.target.value)}
              className="mt-1 block w-32 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Все города</option>
              {getAvailableCities().map(city => (
                <option key={city} value={city}>{city}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Роль</label>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="mt-1 block w-32 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Все роли</option>
              {getAvailableRoles().map(role => (
                <option key={role} value={role}>
                  {role === 'HIRING_MANAGER' ? 'HR Manager' :
                   role === 'OPS_MANAGER' ? 'Ops Manager' :
                   role === 'MIXED_MANAGER' ? 'Mixed Manager' :
                   role === 'COUNTRY_MANAGER' ? 'Country Manager' :
                   role === 'ADMIN' ? 'Админ' : role}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Неделя</label>
            <input
              type="date"
              value={currentWeek}
              onChange={(e) => setCurrentWeek(e.target.value)}
              className="mt-1 block px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Статистика работающих сегодня */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Работают сегодня ({getTodayWorkingStats().dayName})
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
          <div className="text-center">
            <div className="text-3xl font-bold text-green-600">{getTodayWorkingStats().total}</div>
            <div className="text-sm text-gray-600">Всего работают</div>
          </div>
          {Object.entries(getTodayWorkingStats().roles).map(([role, count]) => (
            <div key={role} className="text-center">
              <div className="text-2xl font-bold text-blue-600">{count}</div>
              <div className="text-sm text-gray-600">{role} менеджеров</div>
            </div>
          ))}
        </div>
      </div>

      {/* Статистика по дням недели */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Работающие менеджеры по дням недели</h3>
        <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
          {getWorkingManagersStats().map((dayStat) => (
            <div key={dayStat.day} className="text-center">
              <div className="text-lg font-bold text-blue-600">{dayStat.count}</div>
              <div className="text-xs text-gray-500">из {dayStat.total}</div>
              <div className="text-sm text-gray-700 mt-1">{dayStat.day}</div>
              <div className="mt-2 bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full" 
                  style={{ width: `${(dayStat.count / dayStat.total) * 100}%` }}
                ></div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Сводная статистика по рабочим часам */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Сводка по команде</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{filteredSchedules.length}</div>
            <div className="text-sm text-gray-600">Активных менеджеров</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {filteredSchedules.filter(s => s.isFlexible).length}
            </div>
            <div className="text-sm text-gray-600">Гибкий график</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">
              {filteredSchedules.filter(s => !s.isFlexible).length}
            </div>
            <div className="text-sm text-gray-600">Фиксированный график</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600">
              {filteredSchedules.filter(s => {
                const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
                return days.some(day => {
                  const startField = `${day}Start`;
                  const endField = `${day}End`;
                  const start = (s as any)[startField] as string | null;
                  const end = (s as any)[endField] as string | null;
                  return start === '09:00' && end === '18:00';
                });
              }).length}
            </div>
            <div className="text-sm text-gray-600">Стандартные часы</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-indigo-600">
              {Array.from(new Set(filteredSchedules.map(s => s.user.city))).length}
            </div>
            <div className="text-sm text-gray-600">Городов покрыто</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">
              {Array.from(new Set(filteredSchedules.map(s => s.user.role))).length}
            </div>
            <div className="text-sm text-gray-600">Ролей представлено</div>
          </div>
        </div>
      </div>

      {/* Список графиков */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">
              Графики менеджеров ({filteredSchedules.length})
            </h2>
          </div>
        </div>

        <div className="divide-y divide-gray-200">
          {filteredSchedules.map((schedule) => (
            <div key={schedule.id} className="p-6">
              <div className="flex items-center justify-between cursor-pointer"
                   onClick={() => setExpandedManager(expandedManager === schedule.id ? null : schedule.id)}>
                <div className="flex items-center space-x-4">
                  <Users className="h-5 w-5 text-gray-500" />
                  <div>
                    <div className="text-lg font-medium text-gray-900">
                      {schedule.user.name}
                    </div>
                    <div className="text-sm text-gray-500">
                      {schedule.user.email} • {schedule.user.city} • {schedule.user.role}
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Clock className="h-4 w-4 text-gray-400" />
                  <span className="text-sm text-gray-500">
                    {schedule.isFlexible ? 'Гибкий график' : 'Фиксированный'}
                  </span>
                  {expandedManager === schedule.id ? (
                    <ChevronDown className="h-5 w-5 text-gray-400" />
                  ) : (
                    <ChevronRight className="h-5 w-5 text-gray-400" />
                  )}
                </div>
              </div>

              {expandedManager === schedule.id && (
                <div className="mt-6 border-t pt-6">
                  {/* График по дням недели */}
                  <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
                    {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map((day, index) => {
                      const daySchedule = getDaySchedule(schedule, day);
                      const formatted = formatDaySchedule(daySchedule);
                      
                      return (
                        <div key={day} className="text-center">
                          <div className="text-xs font-medium text-gray-500 mb-2">
                            {['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'][index]}
                          </div>
                          <div className={`px-3 py-2 rounded-md text-xs font-medium ${formatted.color}`}>
                            {formatted.text}
                          </div>
                          {daySchedule.note && (
                            <div className="mt-1 text-xs text-gray-400">
                              {daySchedule.note}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Общие заметки */}
                  {schedule.weeklyNotes && (
                    <div className="mt-4 p-3 bg-gray-50 rounded-md">
                      <div className="text-sm font-medium text-gray-700 mb-1">Заметки к неделе:</div>
                      <div className="text-sm text-gray-600">{schedule.weeklyNotes}</div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        {filteredSchedules.length === 0 && (
          <div className="text-center py-12">
            <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">Нет графиков для отображения</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default withAuth(ManagerSchedulesPage, ['ADMIN', 'COUNTRY_MANAGER']);
