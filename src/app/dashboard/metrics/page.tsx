'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { isoWeekOf, formatWeekForDisplay, getPreviousWeek, getNextWeek, isCurrentWeek } from '@/lib/week';
import { 
  Calendar,
  ChevronLeft,
  ChevronRight,
  Save, 
  Users, 
  MessageSquare, 
  MapPin, 
  Building2,
  UserCheck,
  FileText,
  AlertCircle
} from 'lucide-react';

interface UserData {
  id: string;
  name: string;
  email: string;
  city: string;
  role: string;
}

interface CityData {
  cityId: number;
  cityCode: string;
  cityName: string;
  orders: number;
}

interface ManagerData {
  userId: string;
  userName: string;
  userCity: string;
  userRole: string;
  trengoMessages: number;
}

interface DataInputForm {
  weekIso: string;
  // Данные по найму (HR менеджеры)
  hrData: Array<{
    userId: string;
    hiredCount: number;
  }>;
  // Данные по городам (заказы)
  cityData: Array<{
    cityId: number;
    orders: number;
  }>;
  // Данные по операционным менеджерам (сообщения в Trengo)
  opsData: Array<{
    userId: string;
    trengoMessages: number;
  }>;
}

export default function DataInputPage() {
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Данные для форм
  const [hrManagers, setHrManagers] = useState<UserData[]>([]);
  const [cities, setCities] = useState<CityData[]>([]);
  const [opsManagers, setOpsManagers] = useState<UserData[]>([]);
  
  // Формы данных
  const [hrData, setHrData] = useState<Record<string, number>>({});
  const [cityData, setCityData] = useState<Record<number, number>>({});
  const [opsData, setOpsData] = useState<Record<string, number>>({});
  
  const [currentWeek, setCurrentWeek] = useState<string>(isoWeekOf());
  
  const router = useRouter();

  useEffect(() => {
    fetchUser();
  }, []);

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user, currentWeek]);

  const fetchUser = async () => {
    try {
    setIsLoading(true);
      const response = await fetch('/api/auth/me', {
        cache: 'no-cache',
        headers: {
          'Cache-Control': 'no-cache'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
        
        // Проверяем доступ к функции ввода данных
        if (!['COUNTRY_MANAGER', 'ADMIN'].includes(data.user.role)) {
          setError(`У вас нет доступа к вводу данных. Ваша роль: ${data.user.role}`);
          return;
        }
      } else {
        console.error('Failed to fetch user, redirecting to login');
        router.push('/login');
      }
    } catch (error) {
      console.error('Error fetching user:', error);
      setError('Ошибка загрузки данных пользователя');
    } finally {
      setIsLoading(false);
    }
  };

  const loadData = async () => {
    try {
      const headers = {
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      };

      // Загружаем HR менеджеров
      const hrResponse = await fetch('/api/users?role=HIRING_MANAGER', {
        method: 'GET',
        headers,
        credentials: 'include'
      });
      if (hrResponse.ok) {
        const hrData = await hrResponse.json();
        console.log('HR managers loaded:', hrData.length, 'users');
        setHrManagers(hrData || []); // API возвращает массив напрямую
      } else {
        console.error('Failed to load HR managers:', hrResponse.status);
        const errorData = await hrResponse.json().catch(() => ({}));
        console.error('HR managers error:', errorData);
      }

      // Загружаем города (пока используем статичный список)
      const staticCities = [
        { cityId: 1, cityCode: 'WARSAW', cityName: 'Варшава' },
        { cityId: 2, cityCode: 'KRAKOW', cityName: 'Краков' },
        { cityId: 3, cityCode: 'GDANSK', cityName: 'Гданьск' },
        { cityId: 4, cityCode: 'WROCLAW', cityName: 'Вроцлав' },
        { cityId: 5, cityCode: 'POZNAN', cityName: 'Познань' },
        { cityId: 6, cityCode: 'LODZ', cityName: 'Лодзь' },
        { cityId: 7, cityCode: 'LUBLIN', cityName: 'Люблин' },
        { cityId: 8, cityCode: 'KATOWICE', cityName: 'Катовице' },
        { cityId: 9, cityCode: 'BYDGOSZCZ', cityName: 'Быдгощ' },
        { cityId: 10, cityCode: 'SZCZECIN', cityName: 'Щецин' }
      ];
      setCities(staticCities);

      // Загружаем OPS менеджеров
      const opsResponse = await fetch('/api/users?role=OPS_MANAGER', {
        method: 'GET',
        headers,
        credentials: 'include'
      });
      if (opsResponse.ok) {
        const opsData = await opsResponse.json();
        console.log('OPS managers loaded:', opsData.length, 'users');
        setOpsManagers(opsData || []); // API возвращает массив напрямую
      } else {
        console.error('Failed to load OPS managers:', opsResponse.status);
        const errorData = await opsResponse.json().catch(() => ({}));
        console.error('OPS managers error:', errorData);
      }

      // Загружаем существующие данные за неделю
      await loadExistingData();
    } catch (error) {
      console.error('Error loading data:', error);
      setError('Ошибка загрузки данных');
    }
  };

  const loadExistingData = async () => {
    try {
      const headers = {
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      };

      // Загружаем данные по городам
      const cityResponse = await fetch(`/api/country-aggregates?weekIso=${currentWeek}`, {
        method: 'GET',
        headers,
        credentials: 'include'
      });
      if (cityResponse.ok) {
        const cityData = await cityResponse.json();
        const cityOrders: Record<number, number> = {};
        cityData.cities?.forEach((city: any) => {
          cityOrders[city.cityId] = city.cityOrders || 0;
        });
        setCityData(cityOrders);
      }

      // Загружаем данные по менеджерам
      const managerResponse = await fetch(`/api/country-user-inputs?weekIso=${currentWeek}`, {
        method: 'GET',
        headers,
        credentials: 'include'
      });
      if (managerResponse.ok) {
        const managerData = await managerResponse.json();
        const hrHired: Record<string, number> = {};
        const opsMessages: Record<string, number> = {};
        
        managerData.users?.forEach((user: any) => {
          if (user.userRole === 'HIRING_MANAGER') {
            hrHired[user.userId] = user.hiredPeople || 0;
          } else if (user.userRole === 'OPS_MANAGER') {
            opsMessages[user.userId] = user.trengoResponses || 0;
          }
        });
        
        setHrData(hrHired);
        setOpsData(opsMessages);
      }
    } catch (error) {
      console.error('Error loading existing data:', error);
    }
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      setError(null);
      setSuccess(null);

      const headers = {
        'Content-Type': 'application/json'
      };

      // Сохраняем данные по городам
      const cityItems = cities.map(city => ({
        cityId: city.cityId,
        cityOrders: cityData[city.cityId] || 0,
        trengoResponses: 0,
        crmComplaintsClosed: 0,
        trengoTickets: 0,
        hiredPeople: 0,
        trengoMessages: 0,
        hiredHR: 0,
        hiredOps: 0,
        hiredMixed: 0,
        notes: ''
      }));

      console.log('Saving city data:', cityItems);

      const cityResponse = await fetch('/api/country-aggregates', {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify({
          weekIso: currentWeek,
          items: cityItems
        })
      });

      // Сохраняем данные по менеджерам
      const managerItems = [
        ...hrManagers.map(hr => ({
          userId: hr.id,
          trengoResponses: 0,
          trengoTickets: 0,
          crmComplaintsClosed: 0,
          ordersHandled: 0,
          notes: `Нанято: ${hrData[hr.id] || 0}`
        })),
        ...opsManagers.map(ops => ({
          userId: ops.id,
          trengoResponses: opsData[ops.id] || 0,
          trengoTickets: 0,
          crmComplaintsClosed: 0,
          ordersHandled: 0,
          notes: `Сообщений в Trengo: ${opsData[ops.id] || 0}`
        }))
      ];

      console.log('Saving manager data:', managerItems);

      const managerResponse = await fetch('/api/country-user-inputs', {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify({
          weekIso: currentWeek,
          items: managerItems
        })
      });

      if (cityResponse.ok && managerResponse.ok) {
        setSuccess('Данные успешно сохранены!');
        setTimeout(() => setSuccess(null), 3000);
      } else {
        const cityError = cityResponse.ok ? null : await cityResponse.text();
        const managerError = managerResponse.ok ? null : await managerResponse.text();
        console.error('Save errors:', { cityError, managerError });
        setError('Ошибка сохранения данных');
      }
    } catch (error) {
      console.error('Error saving data:', error);
      setError('Ошибка сохранения данных');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Загрузка...</p>
        </div>
      </div>
    );
  }

  if (!user || error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Ошибка доступа</h1>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => router.back()}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
          >
            Назад
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-slate-50 to-indigo-50/40">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
      {/* Header */}
          <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Внести данные</h1>
                <p className="text-gray-600 mt-1">
                  {user.name} • Ввод данных по найму, заказам и операциям
                </p>
              </div>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isSaving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                    Сохранение...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    Сохранить
                  </>
                )}
              </button>
            </div>

            {/* Week Navigation */}
            <div className="flex items-center justify-between bg-gray-50 rounded-lg p-3">
              <button
                onClick={() => setCurrentWeek(getPreviousWeek(currentWeek))}
                className="flex items-center gap-2 px-3 py-2 text-gray-700 hover:bg-white rounded-md transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
                Предыдущая
              </button>
              
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-blue-600" />
                <span className="font-medium text-gray-900">
                  {formatWeekForDisplay(currentWeek)}
                </span>
              </div>
              
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentWeek(getNextWeek(currentWeek))}
                  disabled={isCurrentWeek(currentWeek)}
                  className="flex items-center gap-2 px-3 py-2 text-gray-700 hover:bg-white rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Следующая
                  <ChevronRight className="h-4 w-4" />
                </button>
                {!isCurrentWeek(currentWeek) && (
                  <button
                    onClick={() => setCurrentWeek(isoWeekOf())}
                    className="px-3 py-2 text-blue-600 hover:bg-blue-50 rounded-md transition-colors text-sm font-medium"
                  >
                    Текущая неделя
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Success/Error Messages */}
          {success && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
              <div className="flex items-center">
                <div className="text-green-600 mr-3">✓</div>
                <p className="text-green-800">{success}</p>
              </div>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <div className="flex items-center">
                <AlertCircle className="h-5 w-5 text-red-600 mr-3" />
                <p className="text-red-800">{error}</p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* HR Managers - Найм */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex items-center mb-4">
                <UserCheck className="h-6 w-6 text-green-600 mr-3" />
                <h2 className="text-lg font-semibold text-gray-900">Найм (HR менеджеры)</h2>
              </div>
              <p className="text-sm text-gray-600 mb-4">Количество нанятых за неделю</p>
              <div className="space-y-3">
                {hrManagers.map(manager => (
                  <div key={manager.id} className="flex items-center justify-between">
                  <div>
                      <p className="font-medium text-gray-900">{manager.name}</p>
                      <p className="text-sm text-gray-500">{manager.city}</p>
                    </div>
                    <input
                      type="number"
                      min="0"
                      value={hrData[manager.id] || ''}
                      onChange={(e) => setHrData(prev => ({
                        ...prev,
                        [manager.id]: parseInt(e.target.value) || 0
                      }))}
                      className="w-20 px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm"
                      placeholder="0"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Cities - Заказы */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex items-center mb-4">
                <MapPin className="h-6 w-6 text-blue-600 mr-3" />
                <h2 className="text-lg font-semibold text-gray-900">Заказы по городам</h2>
              </div>
              <p className="text-sm text-gray-600 mb-4">Выполненные заказы за неделю</p>
              <div className="space-y-3">
                {cities.map(city => (
                  <div key={city.cityId} className="flex items-center justify-between">
                  <div>
                      <p className="font-medium text-gray-900">{city.cityName}</p>
                      <p className="text-sm text-gray-500">{city.cityCode}</p>
                    </div>
                    <input
                      type="number"
                      min="0"
                      value={cityData[city.cityId] || ''}
                      onChange={(e) => setCityData(prev => ({
                        ...prev,
                        [city.cityId]: parseInt(e.target.value) || 0
                      }))}
                      className="w-20 px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                      placeholder="0"
                    />
                  </div>
                ))}
                  </div>
                </div>

            {/* OPS Managers - Trengo */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex items-center mb-4">
                <MessageSquare className="h-6 w-6 text-purple-600 mr-3" />
                <h2 className="text-lg font-semibold text-gray-900">Сообщения в Trengo</h2>
              </div>
              <p className="text-sm text-gray-600 mb-4">Количество сообщений за неделю</p>
              <div className="space-y-3">
                {opsManagers.map(manager => (
                  <div key={manager.id} className="flex items-center justify-between">
                  <div>
                      <p className="font-medium text-gray-900">{manager.name}</p>
                      <p className="text-sm text-gray-500">{manager.city}</p>
                  </div>
                    <input
                      type="number"
                      min="0"
                      value={opsData[manager.id] || ''}
                      onChange={(e) => setOpsData(prev => ({
                        ...prev,
                        [manager.id]: parseInt(e.target.value) || 0
                      }))}
                      className="w-20 px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-sm"
                      placeholder="0"
                    />
                  </div>
                ))}
              </div>
            </div>
            </div>
        </div>
      </div>
    </div>
  );
}