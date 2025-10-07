'use client';

import { useState, useEffect } from 'react';
import { Save, CheckCircle, AlertCircle, Building2 } from 'lucide-react';

interface CitiesTabProps {
  weekIso: string;
}

interface CityData {
  cityId: number;
  cityCode: string;
  cityName: string;
  weekIso: string;
  trengoResponses: number;
  crmComplaintsClosed: number;
  trengoTickets: number;
  hiredPeople: number;
  cityOrders: number;
  // Новые поля для расширенной функциональности
  trengoMessages: number;          // Общее количество сообщений в Trengo
  hiredHR: number;                 // Нанятые HR
  hiredOps: number;               // Нанятые Ops  
  hiredMixed: number;             // Нанятые Mixed
  notes: string;
  updatedAt: string | null;
}

export default function CountryCitiesTab({ weekIso }: CitiesTabProps) {
  const [cities, setCities] = useState<CityData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadCitiesData();
  }, [weekIso]);

  const loadCitiesData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await fetch(`/api/country-aggregates?weekIso=${weekIso}`);
      
      if (response.ok) {
        const data = await response.json();
        setCities(data.cities || []);
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Ошибка загрузки данных');
      }
    } catch (error) {
      console.error('Error loading cities data:', error);
      setError('Ошибка подключения к серверу');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCityChange = (cityId: number, field: keyof CityData, value: string | number) => {
    setCities(prevCities =>
      prevCities.map(city => 
        city.cityId === cityId 
          ? { ...city, [field]: value }
          : city
      )
    );
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      setSaveStatus('saving');

      // Подготавливаем данные для отправки (только измененные)
      const itemsToSave = cities.map(city => ({
        cityId: city.cityId,
        trengoResponses: city.trengoResponses,
        crmComplaintsClosed: city.crmComplaintsClosed,
        trengoTickets: city.trengoTickets,
        hiredPeople: city.hiredPeople,
        cityOrders: city.cityOrders,
        trengoMessages: city.trengoMessages || 0,
        hiredHR: city.hiredHR || 0,
        hiredOps: city.hiredOps || 0,
        hiredMixed: city.hiredMixed || 0,
        notes: city.notes
      }));

      const response = await fetch('/api/country-aggregates', {
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
        // Обновляем данные для получения актуальных updatedAt
        await loadCitiesData();
        setTimeout(() => setSaveStatus('idle'), 3000);
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Ошибка сохранения');
        setSaveStatus('error');
        setTimeout(() => setSaveStatus('idle'), 3000);
      }
    } catch (error) {
      console.error('Error saving cities data:', error);
      setError('Ошибка подключения к серверу');
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Загрузка данных по городам...</span>
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
          <span className="text-green-800">Данные по городам успешно сохранены!</span>
        </div>
      )}
      
      {saveStatus === 'error' && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-md flex items-center">
          <AlertCircle className="h-5 w-5 text-red-600 mr-2" />
          <span className="text-red-800">Ошибка сохранения данных</span>
        </div>
      )}

      {/* Таблица городов */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <Building2 className="h-4 w-4 inline-block mr-1" />
                Город
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Регистрации
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Заказы
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Заметки
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {cities.map((city) => (
              <tr key={city.cityId} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div>
                    <div className="text-sm font-medium text-gray-900">{city.cityName}</div>
                    <div className="text-sm text-gray-500">{city.cityCode}</div>
                  </div>
                </td>
                {/* Регистрации */}
                <td className="px-6 py-4 whitespace-nowrap">
                  <input
                    type="number"
                    min="0"
                    value={city.hiredPeople}
                    onChange={(e) => handleCityChange(city.cityId, 'hiredPeople', parseInt(e.target.value) || 0)}
                    className="w-24 px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </td>
                {/* Заказы */}
                <td className="px-6 py-4 whitespace-nowrap">
                  <input
                    type="number"
                    min="0"
                    value={city.cityOrders}
                    onChange={(e) => handleCityChange(city.cityId, 'cityOrders', parseInt(e.target.value) || 0)}
                    className="w-24 px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </td>
                {/* Заметки */}
                <td className="px-6 py-4">
                  <input
                    type="text"
                    value={city.notes}
                    onChange={(e) => handleCityChange(city.cityId, 'notes', e.target.value)}
                    placeholder="Заметки..."
                    className="w-48 px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Сводная статистика по стране */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mt-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Сводка по стране (всего)</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{cities.reduce((sum, city) => sum + (city.trengoMessages || 0), 0)}</div>
            <div className="text-sm text-gray-600">Trengo Сообщения</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{cities.reduce((sum, city) => sum + (city.hiredPeople || 0), 0)}</div>
            <div className="text-sm text-gray-600">Всего Нанятых</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">{cities.reduce((sum, city) => sum + ((city.hiredHR || 0) + (city.hiredOps || 0) + (city.hiredMixed || 0)), 0)}</div>
            <div className="text-sm text-gray-600">По направлениям:</div>
          </div>
          <div className="text-center">
            <div className="text-l font-medium text-indigo-600">{cities.reduce((sum, city) => sum + (city.hiredHR || 0), 0)} HR</div>
            <div className="text-l font-medium text-orange-600">{cities.reduce((sum, city) => sum + (city.hiredOps || 0), 0)} Ops</div>
          </div>
          <div className="text-center">
            <div className="text-l font-medium text-red-600">{cities.reduce((sum, city) => sum + (city.hiredMixed || 0), 0)} Mixed</div>
            <div className="text-sm text-gray-600 ml-2">тип найма</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600">{cities.reduce((sum, city) => sum + (city.cityOrders || 0), 0)}</div>
            <div className="text-sm text-gray-600">Заказы страны</div>
          </div>
        </div>
      </div>

      {/* Кнопка сохранения */}
      <div className="flex justify-between items-center pt-4 border-t border-gray-200">
        <div className="text-sm text-gray-600">
          {cities.length} городов • Неделя {weekIso}
        </div>
        
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center"
        >
          <Save className="h-4 w-4 mr-2" />
          {isSaving ? 'Сохранение...' : 'Сохранить все'}
        </button>
      </div>
    </div>
  );
}
