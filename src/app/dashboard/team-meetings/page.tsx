'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { Users, PhoneCall, Save } from 'lucide-react';

interface MeetingForm {
  meetingDate: string; // YYYY-MM-DD
  startTime: string; // HH:MM
  endTime: string; // HH:MM
  meetingType: 'TEAM_STANDUP' | 'ONE_ON_ONE' | 'CLIENT_MEETING' | 'TRAINING' | 'INTERVIEW' | 'PLANNING' | 'REVIEW' | 'OTHER';
  topic: string;
  participants?: string; // comma-separated
  location?: string;
  outcome?: string;
  nextSteps?: string;
  rating?: number;
}

export default function TeamMeetingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [meetings, setMeetings] = useState<any[]>([]);

  const { register, handleSubmit, reset } = useForm<MeetingForm>({
    defaultValues: { meetingDate: new Date().toISOString().slice(0, 10), meetingType: 'TEAM_STANDUP' }
  });

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) { router.push('/login'); return; }
    loadMeetings();
  }, [router]);

  const loadMeetings = async () => {
    try {
      const token = localStorage.getItem('token');
      const resp = await fetch('/api/team-meetings', { headers: { 'Authorization': `Bearer ${token}` } });
      const data = await resp.json();
      if (resp.ok) setMeetings(data.meetings || []);
    } catch {}
  };

  const onSubmit = async (data: MeetingForm) => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const payload = { ...data, participants: data.participants ? data.participants.split(',').map(s => s.trim()) : [] };
      const resp = await fetch('/api/team-meetings', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify(payload) });
      const result = await resp.json();
      if (resp.ok) {
        reset({ meetingDate: new Date().toISOString().slice(0, 10), meetingType: 'TEAM_STANDUP', startTime: '', endTime: '', topic: '', participants: '' });
        await loadMeetings();
      } else {
        alert(result.message || 'Ошибка сохранения');
      }
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
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
              <PhoneCall className="h-6 w-6 text-violet-600" />
              <span className="ml-2 text-lg font-bold text-gray-900">Встречи и звонки</span>
            </div>
          </div>
          <button onClick={() => router.push('/dashboard')} className="text-sm text-gray-600 hover:text-gray-900">Назад</button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        <form onSubmit={handleSubmit(onSubmit)} className="bg-white rounded-lg shadow p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Дата</label>
              <input type="date" {...register('meetingDate', { required: true })} className="w-full px-3 py-2 border border-gray-300 rounded-md" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Начало</label>
              <input type="time" {...register('startTime', { required: true })} className="w-full px-3 py-2 border border-gray-300 rounded-md" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Конец</label>
              <input type="time" {...register('endTime', { required: true })} className="w-full px-3 py-2 border border-gray-300 rounded-md" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Тип</label>
              <select {...register('meetingType', { required: true })} className="w-full px-3 py-2 border border-gray-300 rounded-md">
                <option value="TEAM_STANDUP">Командная планерка</option>
                <option value="ONE_ON_ONE">1-на-1</option>
                <option value="CLIENT_MEETING">Клиент</option>
                <option value="TRAINING">Тренинг</option>
                <option value="INTERVIEW">Собеседование</option>
                <option value="PLANNING">Планирование</option>
                <option value="REVIEW">Ретро/обзор</option>
                <option value="OTHER">Другое</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Тема</label>
              <input type="text" {...register('topic', { required: true })} className="w-full px-3 py-2 border border-gray-300 rounded-md" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Участники (через запятую)</label>
              <input type="text" {...register('participants')} className="w-full px-3 py-2 border border-gray-300 rounded-md" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Локация</label>
              <input type="text" {...register('location')} className="w-full px-3 py-2 border border-gray-300 rounded-md" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Результат</label>
              <input type="text" {...register('outcome')} className="w-full px-3 py-2 border border-gray-300 rounded-md" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Следующие шаги</label>
              <input type="text" {...register('nextSteps')} className="w-full px-3 py-2 border border-gray-300 rounded-md" />
            </div>
          </div>

          <div className="flex justify-end">
            <button type="submit" disabled={loading} className="inline-flex items-center px-6 py-2 bg-violet-600 text-white rounded-md hover:bg-violet-700 disabled:opacity-50">
              <Save className="h-4 w-4 mr-2" /> {loading ? 'Сохранение…' : 'Сохранить'}
            </button>
          </div>
        </form>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Последние встречи</h3>
          <div className="divide-y">
            {meetings.map((m, idx) => (
              <div key={idx} className="py-3 flex items-center justify-between">
                <div>
                  <div className="text-sm text-gray-900">{new Date(m.meetingDate).toLocaleDateString()} • {m.meetingType} • {m.topic}</div>
                  <div className="text-xs text-gray-600">{m.startTime} - {m.endTime} • {m.location || '—'}</div>
                </div>
                <div className="text-xs text-gray-500">{m.user?.name || ''}</div>
              </div>
            ))}
            {meetings.length === 0 && <div className="text-sm text-gray-500">Нет данных</div>}
          </div>
        </div>
      </main>
    </div>
  );
}
