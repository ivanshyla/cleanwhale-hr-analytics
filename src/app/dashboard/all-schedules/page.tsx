'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Calendar, Clock, Users, Eye, Filter } from 'lucide-react';

interface WorkSchedule {
  id: string;
  weekStartDate: string;
  mondayStart?: string;
  mondayEnd?: string;
  mondayNote?: string;
  tuesdayStart?: string;
  tuesdayEnd?: string;
  tuesdayNote?: string;
  wednesdayStart?: string;
  wednesdayEnd?: string;
  wednesdayNote?: string;
  thursdayStart?: string;
  thursdayEnd?: string;
  thursdayNote?: string;
  fridayStart?: string;
  fridayEnd?: string;
  fridayNote?: string;
  saturdayStart?: string;
  saturdayEnd?: string;
  saturdayNote?: string;
  sundayStart?: string;
  sundayEnd?: string;
  sundayNote?: string;
  weeklyNotes?: string;
  isFlexible?: boolean;
  user: {
    id: string;
    name: string;
    email: string;
    city: string;
    role: string;
  };
}

export default function AllSchedulesPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [schedules, setSchedules] = useState<WorkSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [cityFilter, setCityFilter] = useState<string>('');
  const [roleFilter, setRoleFilter] = useState<string>('');

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      if (!['ADMIN', 'COUNTRY_MANAGER'].includes(payload.role)) {
        alert('Доступ запрещен. Только для администраторов и менеджеров по стране.');
        router.push('/dashboard');
        return;
      }
      setUser(payload);
      loadSchedules(token);
    } catch (e) {
      router.push('/login');
    }
  }, [router]);

  const loadSchedules = async (token: string) => {
    setLoading(true);
    try {
      const response = await fetch('/api/work-schedules?include_all=true', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setSchedules(data.schedules);
      } else {
        console.error('Failed to load schedules');
      }
    } catch (error) {
      console.error('Error loading schedules:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (time?: string) => {
    if (!time) return '—';
    return time;
  };

  const getTimeRange = (start?: string, end?: string) => {
    if (!start && !end) return '—';
    if (!start) return `до ${end}`;
    if (!end) return `с ${start}`;
    return `${start}—${end}`;
  };

  const getDayColor = (start?: string, end?: string) => {
    if (!start || !end) return 'bg-gray-100 text-gray-500';
    
    // Проверяем стандартное рабочее время 9:00-18:00
    if (start === '09:00' && end === '18:00') {
      return 'bg-green-100 text-green-800';
    }
    
    return 'bg-blue-100 text-blue-800';
  };

  const days = [
    { key: 'monday', label: 'Пн', emoji: '💼' },
    { key: 'tuesday', label: 'Вт', emoji: '⚡' },
    { key: 'wednesday', label: 'Ср', emoji: '☕' },
    { key: 'thursday', label: 'Чт', emoji: '🎯' },
    { key: 'friday', label: 'Пт', emoji: '🎉' },
    { key: 'saturday', label: 'Сб', emoji: '☀️' },
    { key: 'sunday', label: 'Вс', emoji: '🏡' },
  ];

  const filteredSchedules = schedules.filter(schedule => {
    const matchesCity = !cityFilter || schedule.user.city.toLowerCase().includes(cityFilter.toLowerCase());
    const matchesRole = !roleFilter || schedule.user.role.toLowerCase().includes(roleFilter.toLowerCase());
    return matchesCity && matchesRole;
  });

  const uniqueCities = [...new Set(schedules.map(s => s.user.city))];
  const uniqueRoles = [...new Set(schedules.map(s => s.user.role))];

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
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
                <span className="text-lg font-bold text-blue-600">CleanWhale</span>
                <p className="text-xs text-gray-600">Analytics</p>
              </div>
            </button>
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg mr-3">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <span className="text-xl font-bold text-gray-900">Графики всех менеджеров</span>
                <p className="text-sm text-gray-600">Базовое время: 9:00-18:00</p>
              </div>
            </div>
          </div>
          <button 
            onClick={() => router.push('/dashboard')} 
            className="px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-all"
          >
            ← Назад
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Фильтры */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Filter className="h-5 w-5 text-gray-500" />
              <span className="text-sm font-medium text-gray-700">Фильтры:</span>
            </div>
            <div>
              <select
                value={cityFilter}
                onChange={(e) => setCityFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Все города</option>
                {uniqueCities.map(city => (
                  <option key={city} value={city}>{city}</option>
                ))}
              </select>
            </div>
            <div>
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Все роли</option>
                {uniqueRoles.map(role => (
                  <option key={role} value={role}>{role}</option>
                ))}
              </select>
            </div>
            <div className="text-sm text-gray-600">
              Показано: {filteredSchedules.length} из {schedules.length}
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : filteredSchedules.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Нет графиков работы</h3>
            <p className="text-gray-600">Графики работы менеджеров будут отображены здесь</p>
          </div>
        ) : (
          <div className="space-y-6">
            {filteredSchedules.map(schedule => (
              <div key={schedule.id} className="bg-white rounded-lg shadow overflow-hidden">
                <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-medium text-gray-900">{schedule.user.name}</h3>
                      <p className="text-sm text-gray-600">
                        {schedule.user.role} • {schedule.user.city} • {schedule.user.email}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        Неделя от {new Date(schedule.weekStartDate).toLocaleDateString('ru-RU')}
                        {schedule.isFlexible && ' • Гибкий график'}
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Clock className="h-5 w-5 text-gray-400" />
                    </div>
                  </div>
                </div>

                <div className="p-6">
                  <div className="grid grid-cols-7 gap-4">
                    {days.map(day => {
                      const startKey = `${day.key}Start` as keyof WorkSchedule;
                      const endKey = `${day.key}End` as keyof WorkSchedule;
                      const noteKey = `${day.key}Note` as keyof WorkSchedule;
                      
                      const start = schedule[startKey] as string;
                      const end = schedule[endKey] as string;
                      const note = schedule[noteKey] as string;
                      
                      return (
                        <div key={day.key} className="text-center">
                          <div className="text-lg mb-1">{day.emoji}</div>
                          <div className="text-xs font-medium text-gray-700 mb-2">{day.label}</div>
                          <div className={`px-2 py-1 rounded text-xs font-medium ${getDayColor(start, end)}`}>
                            {getTimeRange(start, end)}
                          </div>
                          {note && (
                            <div className="text-xs text-gray-500 mt-1 truncate" title={note}>
                              {note}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {schedule.weeklyNotes && (
                    <div className="mt-4 p-3 bg-yellow-50 rounded-lg">
                      <p className="text-sm text-gray-700">
                        <span className="font-medium">Заметки к неделе:</span> {schedule.weeklyNotes}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
