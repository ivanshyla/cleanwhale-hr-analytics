'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { Calendar, ClipboardList, Save, User2, ListFilter, BarChart3 } from 'lucide-react';

interface ManagerOption {
  id: string;
  name: string;
  email: string;
  city: string;
  role: string;
}

interface ManagerWeeklyForm {
  targetManagerId: string;
  reportDate: string; // YYYY-MM-DD
  orders?: number;
  messages?: number;
  ticketsResolved?: number;
  complaints?: number;
  complaintsResolved?: number;
  notes?: string;
}

export default function ManagerStatsPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [managers, setManagers] = useState<ManagerOption[]>([]);
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<ManagerWeeklyForm>({
    defaultValues: {
      reportDate: new Date().toISOString().split('T')[0],
    }
  });

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch('/api/auth/me', { credentials: 'include' });
        if (!res.ok) {
          router.push('/login');
          return;
        }
        const userData = await res.json();
        if (!['COUNTRY_MANAGER', 'ADMIN'].includes(userData.role)) {
          alert('Доступ запрещен. Только для менеджера по стране.');
          router.push('/dashboard');
          return;
        }
        setUser(userData);

        // load managers
        const mgrs = await fetch('/api/users/manager-list', { credentials: 'include' });
        const data = await mgrs.json();
        if (data.managers) setManagers(data.managers);
      } catch (e) {
        router.push('/login');
      }
    };
    checkAuth();
  }, [router]);

  const onSubmit = async (data: ManagerWeeklyForm) => {
    setLoading(true);
    try {
      const resp = await fetch('/api/manager-stats', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(data),
      });

      const result = await resp.json();
      if (resp.ok) {
        alert('Данные сохранены');
      } else {
        alert(result.message || 'Ошибка сохранения');
      }
    } catch (e) {
      alert('Ошибка сети');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
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
              <ClipboardList className="h-6 w-6 text-blue-600" />
              <span className="ml-2 text-lg font-bold text-gray-900">Еженедельные цифры по менеджерам</span>
            </div>
          </div>
          <button onClick={() => router.push('/dashboard')} className="text-sm text-gray-600 hover:text-gray-900">Назад к дашборду</button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow p-6">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Дата отчета</label>
                <input type="date" {...register('reportDate', { required: true })} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Менеджер</label>
                <select {...register('targetManagerId', { required: true })} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500">
                  <option value="">Выберите менеджера…</option>
                  {managers.map(m => (
                    <option key={m.id} value={m.id}>{m.name} · {m.city} · {m.role}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Заказы</label>
                <input type="number" {...register('orders', { valueAsNumber: true })} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Сообщения</label>
                <input type="number" {...register('messages', { valueAsNumber: true })} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Решенные тикеты</label>
                <input type="number" {...register('ticketsResolved', { valueAsNumber: true })} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Жалобы</label>
                <input type="number" {...register('complaints', { valueAsNumber: true })} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Решенные жалобы</label>
                <input type="number" {...register('complaintsResolved', { valueAsNumber: true })} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Заметки</label>
              <textarea rows={3} {...register('notes')} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500" />
            </div>

            <div className="flex justify-end">
              <button type="submit" disabled={loading} className="inline-flex items-center px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50">
                <Save className="h-4 w-4 mr-2" />
                {loading ? 'Сохранение…' : 'Сохранить'}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
