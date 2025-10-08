'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, Controller } from 'react-hook-form';
import { Users, Calendar, Plus, Edit2, Trash2, X, Check } from 'lucide-react';
import { useAuth, withAuth } from '@/contexts/AuthContext';

interface Manager {
  id: string;
  name: string;
  city: string;
  role: string;
}

interface Meeting {
  id: string;
  meetingName: string;
  meetingDate: string;
  category: string;
  attendees: string[];
  attendeeNames: string[];
  summary: string;
  createdBy: {
    id: string;
    name: string;
  };
  createdAt: string;
}

interface MeetingForm {
  meetingName: string;
  meetingDate: string;
  category: string;
  attendees: string[];
  summary: string;
}

const CATEGORIES = [
  { value: 'TEAM_STANDUP', label: '🏃 Командная планерка', color: 'bg-blue-100 text-blue-800' },
  { value: 'ONE_ON_ONE', label: '👥 1-на-1', color: 'bg-purple-100 text-purple-800' },
  { value: 'WEEKLY_REVIEW', label: '📊 Еженедельный обзор', color: 'bg-green-100 text-green-800' },
  { value: 'PLANNING', label: '📅 Планирование', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'TRAINING', label: '🎓 Тренинг', color: 'bg-indigo-100 text-indigo-800' },
  { value: 'CRISIS', label: '🚨 Кризисное совещание', color: 'bg-red-100 text-red-800' },
  { value: 'CLIENT', label: '🤝 Встреча с клиентом', color: 'bg-pink-100 text-pink-800' },
  { value: 'OTHER', label: '📝 Другое', color: 'bg-gray-100 text-gray-800' },
];

function TeamMeetingsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [managers, setManagers] = useState<Manager[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingMeeting, setEditingMeeting] = useState<Meeting | null>(null);
  const [saving, setSaving] = useState(false);

  const { register, handleSubmit, control, reset, formState: { errors } } = useForm<MeetingForm>({
    defaultValues: {
      meetingName: '',
      meetingDate: new Date().toISOString().split('T')[0],
      category: 'TEAM_STANDUP',
      attendees: [],
      summary: '',
    }
  });

  useEffect(() => {
    if (!user) return;
    
    const loadData = async () => {
      try {
        await Promise.all([loadMeetings(), loadManagers()]);
        setLoading(false);
      } catch (error) {
        console.error('Error loading data:', error);
        setLoading(false);
      }
    };
    
    loadData();
  }, [user]);

  const loadMeetings = async () => {
    try {
      const resp = await fetch('/api/team-meetings', { credentials: 'include' });
      const data = await resp.json();
      if (resp.ok) {
        setMeetings(data.meetings || []);
      }
    } catch (err) {
      console.error('Error loading meetings:', err);
    }
  };

  const loadManagers = async () => {
    try {
      const resp = await fetch('/api/users/manager-list', { credentials: 'include' });
      const data = await resp.json();
      if (resp.ok) {
        setManagers(data.managers || []);
      }
    } catch (err) {
      console.error('Error loading managers:', err);
    }
  };

  const onSubmit = async (data: MeetingForm) => {
    setSaving(true);
    try {
      const attendeeNames = managers
        .filter(m => data.attendees.includes(m.id))
        .map(m => m.name);

      const payload = {
        ...data,
        attendeeNames,
      };

      const url = editingMeeting ? `/api/team-meetings/${editingMeeting.id}` : '/api/team-meetings';
      const method = editingMeeting ? 'PUT' : 'POST';

      const resp = await fetch(url, {
        method,
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (resp.ok) {
        await loadMeetings();
        setShowForm(false);
        setEditingMeeting(null);
        reset({
          meetingName: '',
          meetingDate: new Date().toISOString().split('T')[0],
          category: 'TEAM_STANDUP',
          attendees: [],
          summary: '',
        });
      } else {
        const result = await resp.json();
        alert(result.message || 'Ошибка сохранения');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (meeting: Meeting) => {
    setEditingMeeting(meeting);
    reset({
      meetingName: meeting.meetingName,
      meetingDate: meeting.meetingDate.split('T')[0],
      category: meeting.category,
      attendees: meeting.attendees,
      summary: meeting.summary,
    });
    setShowForm(true);
  };

  const handleDelete = async (meetingId: string) => {
    if (!confirm('Удалить эту встречу?')) return;

    try {
      const resp = await fetch(`/api/team-meetings/${meetingId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (resp.ok) {
        await loadMeetings();
      } else {
        alert('Ошибка удаления');
      }
    } catch (err) {
      console.error('Error deleting meeting:', err);
      alert('Ошибка удаления');
    }
  };

  const getCategoryInfo = (category: string) => {
    return CATEGORIES.find(c => c.value === category) || CATEGORIES[CATEGORIES.length - 1];
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Calendar className="h-7 w-7 text-orange-600" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Встречи команды</h1>
                <p className="text-sm text-gray-600">Записи всех встреч с менеджерами</p>
              </div>
            </div>
            <button
              onClick={() => {
                setEditingMeeting(null);
                reset({
                  meetingName: '',
                  meetingDate: new Date().toISOString().split('T')[0],
                  category: 'TEAM_STANDUP',
                  attendees: [],
                  summary: '',
                });
                setShowForm(true);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
            >
              <Plus className="h-4 w-4" />
              Новая встреча
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Форма создания/редактирования */}
        {showForm && (
          <div className="bg-white rounded-xl shadow-lg p-6 mb-6 border border-gray-200">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">
                {editingMeeting ? 'Редактировать встречу' : 'Новая встреча'}
              </h2>
              <button
                onClick={() => {
                  setShowForm(false);
                  setEditingMeeting(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Название встречи *
                  </label>
                  <input
                    type="text"
                    {...register('meetingName', { required: 'Обязательное поле' })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Еженедельная планерка"
                  />
                  {errors.meetingName && (
                    <p className="text-sm text-red-600 mt-1">{errors.meetingName.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Дата *
                  </label>
                  <input
                    type="date"
                    {...register('meetingDate', { required: 'Обязательное поле' })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                  {errors.meetingDate && (
                    <p className="text-sm text-red-600 mt-1">{errors.meetingDate.message}</p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Категория *
                </label>
                <select
                  {...register('category', { required: 'Обязательное поле' })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                >
                  {CATEGORIES.map(cat => (
                    <option key={cat.value} value={cat.value}>
                      {cat.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Участники * (выберите менеджеров)
                </label>
                <Controller
                  name="attendees"
                  control={control}
                  rules={{ required: 'Выберите хотя бы одного участника' }}
                  render={({ field }) => (
                    <div className="border border-gray-300 rounded-md p-3 max-h-48 overflow-y-auto">
                      {managers.length === 0 ? (
                        <p className="text-sm text-gray-500">Загрузка менеджеров...</p>
                      ) : (
                        <div className="space-y-2">
                          {managers.map(manager => (
                            <label key={manager.id} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded">
                              <input
                                type="checkbox"
                                checked={field.value.includes(manager.id)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    field.onChange([...field.value, manager.id]);
                                  } else {
                                    field.onChange(field.value.filter(id => id !== manager.id));
                                  }
                                }}
                                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                              />
                              <div className="flex-1">
                                <span className="text-sm font-medium text-gray-900">{manager.name}</span>
                                <span className="text-xs text-gray-500 ml-2">
                                  {manager.city} • {manager.role}
                                </span>
                              </div>
                            </label>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                />
                {errors.attendees && (
                  <p className="text-sm text-red-600 mt-1">{errors.attendees.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Краткое содержание *
                </label>
                <textarea
                  {...register('summary', { required: 'Обязательное поле' })}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Обсудили результаты недели, проблемы с регистрациями в Кракове, планы на следующую неделю..."
                />
                {errors.summary && (
                  <p className="text-sm text-red-600 mt-1">{errors.summary.message}</p>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setEditingMeeting(null);
                  }}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {saving ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                      Сохранение...
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4" />
                      {editingMeeting ? 'Обновить' : 'Создать'}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Таблица встреч в стиле Notion */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-200">
          {meetings.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">Пока нет записей о встречах</p>
              <button
                onClick={() => setShowForm(true)}
                className="mt-4 text-blue-600 hover:text-blue-700 font-medium"
              >
                Добавить первую встречу
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Встреча
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Дата
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Категория
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Участники
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Содержание
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Действия
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {meetings.map((meeting) => {
                    const categoryInfo = getCategoryInfo(meeting.category);
                    return (
                      <tr key={meeting.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {meeting.meetingName}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {new Date(meeting.meetingDate).toLocaleDateString('ru-RU', {
                              day: 'numeric',
                              month: 'long',
                              year: 'numeric'
                            })}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${categoryInfo.color}`}>
                            {categoryInfo.label}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-wrap gap-1">
                            {meeting.attendeeNames.map((name, idx) => (
                              <span
                                key={idx}
                                className="inline-flex items-center px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded"
                              >
                                {name}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-600 max-w-md truncate">
                            {meeting.summary}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button
                            onClick={() => handleEdit(meeting)}
                            className="text-blue-600 hover:text-blue-900 mr-3"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(meeting.id)}
                            className="text-red-600 hover:text-red-900"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Статистика */}
        {meetings.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-blue-100 rounded-lg">
                  <Users className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Всего встреч</p>
                  <p className="text-2xl font-bold text-gray-900">{meetings.length}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-green-100 rounded-lg">
                  <Calendar className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">За этот месяц</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {meetings.filter(m => {
                      const meetingDate = new Date(m.meetingDate);
                      const now = new Date();
                      return meetingDate.getMonth() === now.getMonth() &&
                             meetingDate.getFullYear() === now.getFullYear();
                    }).length}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-purple-100 rounded-lg">
                  <Users className="h-6 w-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Уникальных участников</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {new Set(meetings.flatMap(m => m.attendees)).size}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

// Защита страницы: только для ADMIN и COUNTRY_MANAGER
export default withAuth(TeamMeetingsPage, ['ADMIN', 'COUNTRY_MANAGER']);
