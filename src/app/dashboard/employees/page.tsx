'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { isManager } from '@/lib/permissions';

interface EmployeeProfile {
  userId: string;
  name: string;
  email: string;
  role: string;
  city: string;
  currency: string;
  yearsWorked: number | null;
  salaryGross: number | null;
  salaryNet: number | null;
  hasProfile: boolean;
}

interface UpdateEmployeeData {
  userId: string;
  yearsWorked?: number | null;
  salaryGross?: number | null;
  salaryNet?: number | null;
}

export default function EmployeesPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [employees, setEmployees] = useState<EmployeeProfile[]>([]);
  const [modifiedProfiles, setModifiedProfiles] = useState<Record<string, UpdateEmployeeData>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchUser();
  }, []);

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
        
        // Проверяем доступ к функции управления сотрудниками
        if (!isManager(data.user)) {
          setError(`У вас нет доступа к управлению данными сотрудников. Ваша роль: ${data.user.role}`);
          return;
        }
        
        // Загружаем данные сотрудников
        await fetchEmployees();
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

  const fetchEmployees = async () => {
    try {
      const response = await fetch('/api/employees');
      if (response.ok) {
        const data = await response.json();
        setEmployees(data.users);
      } else {
        setError('Ошибка загрузки данных сотрудников');
      }
    } catch (error) {
      console.error('Error fetching employees:', error);
      setError('Ошибка загрузки данных сотрудников');
    }
  };

  const handleEmployeeChange = (userId: string, field: keyof UpdateEmployeeData, value: string) => {
    if (!modifiedProfiles[userId]) {
      modifiedProfiles[userId] = { userId };
    }

    let parsedValue: number | null;
    if (value === '' || value === 'null') {
      parsedValue = null;
    } else {
      parsedValue = parseInt(value) || 0;
    }

    modifiedProfiles[userId][field] = parsedValue;
    setModifiedProfiles({ ...modifiedProfiles });
  };

  const saveChanges = async () => {
    const itemsToSave = Object.values(modifiedProfiles).filter(item => 
      item.yearsWorked !== undefined || 
      item.salaryGross !== undefined || 
      item.salaryNet !== undefined
    );

    if (itemsToSave.length === 0) {
      return;
    }

    try {
      setIsSaving(true);
      const response = await fetch('/api/employees', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ items: itemsToSave })
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Employee profiles updated:', data);
        
        // Обновляем локальное состояние
        await fetchEmployees();
        setModifiedProfiles({});
        
        // Показать уведомление об успехе
        alert('Данные сотрудников успешно сохранены!');
      } else {
        const errorData = await response.json();
        console.error('Error saving employees:', errorData);
        setError(errorData.message || 'Ошибка сохранения данных сотрудников');
      }
    } catch (error) {
      console.error('Error saving employees:', error);
      setError('Ошибка сохранения данных сотрудников');
    } finally {
      setIsSaving(false);
    }
  };

  const filteredEmployees = employees.filter(emp =>
    emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
          <div className="grid grid-cols-12 gap-6">
            {/* Left Sidebar */}
            <div className="col-span-3">
              <div className="bg-white filter backdrop-blur-xl rounded-xl p-6 shadow-xl border border-white/40">
                <div className="flex items-center justify-between mb-6">
                  <div className="bg-blue-100 rounded-xl p-3">
                    <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path>
                    </svg>
                  </div>
                  <h2 className="text-xl font-bold text-gray-900">Управление сотрудниками</h2>
                </div>
                
                <p className="text-sm text-gray-600 mb-6">Редактируйте информацию о зарплатах и стаже сотрудников</p>
                
                <button className="w-full px-4 py-3 rounded-xl bg-blue-600 text-white hover:bg-blue-700 text-sm font-medium flex items-center justify-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path>
                  </svg>
                  Скачать отчет
                </button>
              </div>
            </div>

            {/* Right Content */}
            <div className="col-span-9">
              <div className="bg-white path text-white shadow-2xl filter backdrop-blur-xl rounded-xl right-10 w-full overflow-hidden">
                <div className="p-8 relative flex flex-col h-full">
                  {/* Sub-Header */}
                  <div className="border-b border-gray-200/40 pb-6 flow-shadow mb-8">
                    <h1 className="text-2xl font-bold block text-slate-800 mb-2">Аналитика по персоналу</h1>
                    <p className="text-gray-600">
                      {user.name} • Управление зарплатами и стажем
                    </p>
                  </div>

                  {/* Search and Save Controls */}
                  <div className="flex flex-wrap items-center justify-between mb-6 gap-4">
                    <div className="flex-1 min-w-0 relative">
                      <div className="absolute inset-y-0 left-0 flex items-center pl-3">
                        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                        </svg>
                      </div>
                      <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Поиск по имени или email..."
                        className="block w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                      />
                    </div>
                    
                    <div className="flex items-center gap-4">
                      <div className="text-sm text-gray-600">
                        Изменения: {Object.keys(modifiedProfiles).length}
                      </div>
                      
                      {Object.keys(modifiedProfiles).length > 0 && (
                        <button
                          onClick={saveChanges}
                          disabled={isSaving}
                          className="px-6 py-3 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                          {isSaving ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                              Сохранение...
                            </>
                          ) : (
                            <>
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                              </svg>
                              Сохранить изменения
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Employee Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-200">
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Сотрудник</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Город</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Стаж (лет)</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Зарплата брутто</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Зарплата нетто</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {filteredEmployees.map((employee) => {
                          const modifications = modifiedProfiles[employee.userId] || {};
                          const currentYears = modifications.yearsWorked !== undefined 
                            ? modifications.yearsWorked 
                            : employee.yearsWorked;
                          const currentSalaryGross = modifications.salaryGross !== undefined 
                            ? modifications.salaryGross 
                            : employee.salaryGross;
                          const currentSalaryNet = modifications.salaryNet !== undefined 
                            ? modifications.salaryNet 
                            : employee.salaryNet;

                          return (
                            <tr key={employee.userId} className="hover:bg-gray-50">
                              <td className="px-4 py-4 whitespace-nowrap">
                                <div className="flex items-center">
                                  <div className="flex-shrink-0 h-10 w-10">
                                    <div className="h-10 w-10 bg-gray-200 rounded-full flex items-center justify-center">
                                      <span className="text-sm font-medium text-gray-600">
                                        {employee.name.charAt(0)}
                                      </span>
                                    </div>
                                  </div>
                                  <div className="ml-4">
                                    <div className="text-sm font-medium text-gray-900">{employee.name}</div>
                                    <div className="text-sm text-gray-500">{employee.email}</div>
                                    <div className="text-xs text-gray-400">{employee.role}</div>
                                  </div>
                                </div>
                              </td>
                              <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">{employee.city}</td>
                              
                              <td className="px-4 py-4">
                                <input
                                  type="number"
                                  value={currentYears ?? ''}
                                  onChange={(e) => handleEmployeeChange(employee.userId, 'yearsWorked', e.target.value)}
                                  placeholder="Стаж"
                                  min="0"
                                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm w-20"
                                />
                              </td>
                              
                              <td className="px-4 py-4">
                                <div className="flex items-center">
                                  <input
                                    type="number"
                                    value={currentSalaryGross ?? ''}
                                    onChange={(e) => handleEmployeeChange(employee.userId, 'salaryGross', e.target.value)}
                                    placeholder="Брутто"
                                    min="0"
                                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                                  />
                                  <span className="ml-1 text-xs text-gray-500">{employee.currency}</span>
                                </div>
                              </td>
                              
                              <td className="px-4 py-4">
                                <div className="flex items-center">
                                  <input
                                    type="number"
                                    value={currentSalaryNet ?? ''}
                                    onChange={(e) => handleEmployeeChange(employee.userId, 'salaryNet', e.target.value)}
                                    placeholder="Нетто"
                                    min="0"
                                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                                  />
                                  <span className="ml-1 text-xs text-gray-500">{employee.currency}</span>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {filteredEmployees.length === 0 && (
                    <div className="text-center py-12">
                      <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                      </svg>
                      <h3 className="mt-2 text-sm font-medium text-gray-900">Сотрудники не найдены</h3>
                      <p className="mt-1 text-sm text-gray-500">
                        По вашему запросу не найдено подходящих сотрудников
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
