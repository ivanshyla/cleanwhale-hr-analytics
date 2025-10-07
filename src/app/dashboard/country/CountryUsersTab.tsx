'use client';

import { useState, useEffect } from 'react';
import { Save, CheckCircle, AlertCircle, Users, Filter, Badge } from 'lucide-react';

interface UsersTabProps {
  weekIso: string;
}

interface UserData {
  userId: string;
  userName: string;
  userEmail: string;
  userCity: string;
  userRole: string;
  weekIso: string;
  trengoResponses: number;
  trengoTickets: number;
  crmComplaintsClosed: number;
  ordersHandled: number;
  notes: string;
  hasCountryData: boolean; // флаг наличия данных от country manager
}

export default function CountryUsersTab({ weekIso }: UsersTabProps) {
  const [users, setUsers] = useState<UserData[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<UserData[]>([]);
  const [cityFilter, setCityFilter] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);

  // Список городов для фильтра
  const availableCities = Array.from(new Set(users.map(u => u.userCity))).sort();

  useEffect(() => {
    loadUsersData();
  }, [weekIso]);

  useEffect(() => {
    // Фильтрация пользователей по городу
    if (cityFilter) {
      setFilteredUsers(users.filter(user => user.userCity === cityFilter));
    } else {
      setFilteredUsers(users);
    }
  }, [users, cityFilter]);

  const loadUsersData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await fetch(`/api/country-user-inputs?weekIso=${weekIso}`);
      
      if (response.ok) {
        const data = await response.json();
        setUsers(data.users || []);
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Ошибка загрузки данных');
      }
    } catch (error) {
      console.error('Error loading users data:', error);
      setError('Ошибка подключения к серверу');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUserChange = (userId: string, field: keyof UserData, value: string | number) => {
    setUsers(prevUsers =>
      prevUsers.map(user =>
        user.userId === userId
          ? { ...user, [field]: value }
          : user
      )
    );
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      setSaveStatus('saving');

      // Подготавливаем данные для отправки (только пользователей с изменениями)
      const itemsToSave = filteredUsers.map(user => ({
        userId: user.userId,
        trengoResponses: user.trengoResponses,
        trengoTickets: user.trengoTickets,
        crmComplaintsClosed: user.crmComplaintsClosed,
        ordersHandled: user.ordersHandled,
        notes: user.notes
      }));

      const response = await fetch('/api/country-user-inputs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          weekIso,
          items: itemsToSave
        })
      });

      if (response.ok) {
        setSaveStatus('success');
        // Обновляем данные для получения актуальных флагов
        await loadUsersData();
        setTimeout(() => setSaveStatus('idle'), 3000);
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Ошибка сохранения');
        setSaveStatus('error');
        setTimeout(() => setSaveStatus('idle'), 3000);
      }
    } catch (error) {
      console.error('Error saving users data:', error);
      setError('Ошибка подключения к серверу');
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  const getRoleBadge = (role: string) => {
    const colors = {
      'OPS_MANAGER': 'bg-green-100 text-green-800',
      'MIXED_MANAGER': 'bg-purple-100 text-purple-800'
    };
    const labels = {
      'OPS_MANAGER': 'Ops',
      'MIXED_MANAGER': 'Mixed'
    };
    
    return (
      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${colors[role as keyof typeof colors] || 'bg-gray-100 text-gray-800'}`}>
        {labels[role as keyof typeof labels] || role}
      </span>
    );
  };

  const getSourceBadge = (hasCountryData: boolean) => {
    if (hasCountryData) {
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
          COUNTRY
        </span>
      );
    } else {
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
          SELF
        </span>
      );
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Загрузка данных по менеджерам...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-md">
        <div className="flex items-center">
          <AlertCircle className="h-5 w-5 text-red-600 mr-2" />
          <span className="text-red-800">{error}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Status панель */}
      {saveStatus === 'success' && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-md flex items-center">
          <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
          <span className="text-green-800">Данные по менеджерам успешно сохранены!</span>
        </div>
      )}
      
      {saveStatus === 'error' && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-md flex items-center">
          <AlertCircle className="h-5 w-5 text-red-600 mr-2" />
          <span className="text-red-800">Ошибка сохранения данных</span>
        </div>
      )}

      {/* Фильтры */}
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-2">
          <Filter className="h-4 w-4 text-gray-500" />
          <select
            value={cityFilter}
            onChange={(e) => setCityFilter(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Все города</option>
            {availableCities.map(city => (
              <option key={city} value={city}>{city}</option>
            ))}
          </select>
        </div>
        
        <div className="text-sm text-gray-600">
          Показано: {filteredUsers.length} из {users.length} менеджеров
        </div>
      </div>

      {/* Таблица пользователей */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <Users className="h-4 w-4 inline-block mr-1" />
                Пользователь
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Trengo Ответы
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Заметки
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Источник
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredUsers.map((user) => (
              <tr key={user.userId} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div>
                    <div className="text-sm font-medium text-gray-900">{user.userName}</div>
                    <div className="text-sm text-gray-500">{user.userEmail} • {user.userCity}</div>
                    <div className="mt-1">{getRoleBadge(user.userRole)}</div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <input
                    type="number"
                    min="0"
                    value={user.trengoResponses}
                    onChange={(e) => handleUserChange(user.userId, 'trengoResponses', parseInt(e.target.value) || 0)}
                    className="w-20 px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </td>
                <td className="px-6 py-4">
                  <input
                    type="text"
                    value={user.notes}
                    onChange={(e) => handleUserChange(user.userId, 'notes', e.target.value)}
                    placeholder="Заметки..."
                    className="w-40 px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {getSourceBadge(user.hasCountryData)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filteredUsers.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          {cityFilter ? `Нет менеджеров в городе ${cityFilter}` : 'Нет данных по менеджерам'}
        </div>
      )}

      {/* Кнопка сохранения */}
      <div className="flex justify-between items-center pt-4 border-t border-gray-200">
        <div className="text-sm text-gray-600">
          {filteredUsers.length} менеджеров • Неделя {weekIso}
          {cityFilter && ` • Город: ${cityFilter}`}
        </div>
        
        <button
          onClick={handleSave}
          disabled={isSaving || filteredUsers.length === 0}
          className="bg-green-600 text-white px-6 py-2 rounded-md hover:bg-green-700 disabled:opacity-50 flex items-center"
        >
          <Save className="h-4 w-4 mr-2" />
          {isSaving ? 'Сохранение...' : 'Сохранить изменения'}
        </button>
      </div>
    </div>
  );
}
