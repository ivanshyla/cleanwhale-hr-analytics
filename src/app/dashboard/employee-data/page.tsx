'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { Users, Save, RefreshCw, AlertCircle, CheckCircle, ArrowLeft, MessageSquare, Package, Star } from 'lucide-react';

interface EmployeeDataForm {
  reportDate: string;
  employeeData: {
    [userId: string]: {
      crmTickets?: number;
      crmMessages?: number;
      crmComplaints?: number;
    };
  };
}

interface Employee {
  id: string;
  name: string;
  city: string;
  role: string;
}

interface EmployeeDataRecord {
  id: string;
  userId: string;
  userName: string;
  userCity: string;
  userRole: string;
  crmTickets: number;
  crmMessages: number;
  crmComplaints: number;
  reportDate: string;
  createdAt: string;
  updatedAt: string;
}

export default function EmployeeDataPage() {
  const [user, setUser] = useState<any>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [existingRecords, setExistingRecords] = useState<EmployeeDataRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const router = useRouter();

  const { register, handleSubmit, reset, watch, formState: { errors } } = useForm<EmployeeDataForm>({
    defaultValues: {
      reportDate: new Date().toISOString().split('T')[0],
      employeeData: {},
    }
  });

  useEffect(() => {
    // Проверяем токен
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      setUser({
        id: payload.userId,
        email: payload.email,
        role: payload.role,
        city: payload.city,
        name: payload.name || payload.email,
      });

      // Только country manager может видеть эту страницу
      if (payload.role !== 'COUNTRY_MANAGER') {
        router.push('/dashboard');
        return;
      }

      loadEmployees();
      loadExistingData();
    } catch (error) {
      console.error('Invalid token:', error);
      router.push('/login');
    }
  }, [router]);

  const loadEmployees = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/users/manager-list', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        // Фильтруем только операционных менеджеров
        const operationalManagers = data.managers.filter((m: Employee) => 
          m.role === 'OPERATIONS' || m.role === 'MIXED'
        );
        setEmployees(operationalManagers);
      } else {
        console.error('Failed to load employees');
      }
    } catch (error) {
      console.error('Error loading employees:', error);
    }
  };

  const loadExistingData = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/employee-data?limit=50', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const result = await response.json();
        setExistingRecords(result.data || []);
      } else {
        console.error('Failed to load employee data');
      }
    } catch (error) {
      console.error('Error loading existing data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const onSubmit = async (data: EmployeeDataForm) => {
    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      // Преобразуем данные для отправки
      const submissions = [];
      for (const [userId, employeeData] of Object.entries(data.employeeData)) {
        if (employeeData.crmTickets || employeeData.crmMessages || employeeData.crmComplaints) {
          submissions.push({
            userId,
            reportDate: data.reportDate,
            crmTickets: employeeData.crmTickets || 0,
            crmMessages: employeeData.crmMessages || 0,
            crmComplaints: employeeData.crmComplaints || 0,
          });
        }
      }

      const response = await fetch('/api/employee-data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ submissions }),
      });

      if (response.ok) {
        setShowSuccess(true);
        reset();
        loadExistingData();
        
        setTimeout(() => setShowSuccess(false), 3000);
      } else {
        const error = await response.json();
        alert(`Ошибка: ${error.message}`);
      }
    } catch (error) {
      console.error('Error saving employee data:', error);
      alert('Ошибка сохранения данных');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getCityLabel = (city: string) => {
    const labels: Record<string, string> = {
      WARSAW: 'Варшава', KRAKOW: 'Краков', GDANSK: 'Гданьск',
      WROCLAW: 'Вроцлав', POZNAN: 'Познань', LODZ: 'Лодзь'
    };
    return labels[city] || city;
  };

  const getRoleLabel = (role: string) => {
    const labels: Record<string, string> = {
      OPERATIONS: 'Операционный менеджер',
      MIXED: 'Смешанная роль',
    };
    return labels[role] || role;
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <button 
              onClick={() => router.push('/dashboard')}
              className="flex items-center hover:opacity-80 transition-opacity cursor-pointer"
            >
              <img 
                src="/cleanwhale-logo.png" 
                alt="CleanWhale" 
                className="h-10 w-10 rounded-lg mr-3"
              />
              <div className="text-left">
                <span className="text-xl font-bold cw-text-primary">
                  CleanWhale Analytics
                </span>
                <p className="text-xs text-gray-600">Данные по сотрудникам</p>
              </div>
            </button>
            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-600">
                {user.name} • {getCityLabel(user.city)}
              </div>
              <button
                onClick={() => router.push('/dashboard')}
                className="flex items-center text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
              >
                <ArrowLeft className="h-4 w-4 mr-1" />
                Назад
              </button>
              <button
                onClick={() => loadExistingData()}
                className="flex items-center text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
              >
                <RefreshCw className="h-4 w-4 mr-1" />
                Обновить
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Заголовок */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Данные CRM по сотрудникам</h1>
          <p className="text-gray-600">
            Введите данные из CRM для каждого операционного менеджера за прошедшую неделю.
          </p>
        </div>

        {/* Уведомление об успехе */}
        {showSuccess && (
          <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4 flex items-center">
            <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
            <span className="text-green-800">Данные успешно сохранены!</span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Форма ввода данных */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">Ввод данных по сотрудникам</h2>
                <p className="text-sm text-gray-600 mt-1">
                  Заполните данные CRM для каждого операционного менеджера
                </p>
              </div>

              <form onSubmit={handleSubmit(onSubmit)} className="p-6">
                {/* Дата отчета */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Дата отчета
                  </label>
                  <input
                    type="date"
                    {...register('reportDate', { required: 'Дата обязательна' })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                  {errors.reportDate && (
                    <p className="mt-1 text-sm text-red-600">{errors.reportDate.message}</p>
                  )}
                </div>

                {/* Данные по сотрудникам */}
                <div className="space-y-6">
                  {employees.map((employee) => (
                    <div key={employee.id} className="bg-gray-50 rounded-lg p-4">
                      <div className="flex items-center mb-4">
                        <Users className="h-5 w-5 text-blue-600 mr-2" />
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900">{employee.name}</h3>
                          <p className="text-sm text-gray-600">
                            {getRoleLabel(employee.role)} • {getCityLabel(employee.city)}
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            <Package className="inline h-4 w-4 mr-1" />
                            Тикеты в CRM
                          </label>
                          <input
                            type="number"
                            min="0"
                            {...register(`employeeData.${employee.id}.crmTickets`)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                            placeholder="0"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            <MessageSquare className="inline h-4 w-4 mr-1" />
                            Сообщения в CRM
                          </label>
                          <input
                            type="number"
                            min="0"
                            {...register(`employeeData.${employee.id}.crmMessages`)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                            placeholder="0"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            <AlertCircle className="inline h-4 w-4 mr-1" />
                            Жалобы в CRM
                          </label>
                          <input
                            type="number"
                            min="0"
                            {...register(`employeeData.${employee.id}.crmComplaints`)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                            placeholder="0"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Кнопка сохранения */}
                <div className="flex justify-end mt-8">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex items-center px-6 py-3 cw-button"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Сохранение...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        Сохранить данные
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Правая панель - статистика */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Статистика</h3>
              </div>
              
              <div className="p-6">
                {isLoading ? (
                  <div className="flex justify-center py-4">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Операционных менеджеров:</span>
                      <span className="font-medium">{employees.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Последних записей:</span>
                      <span className="font-medium">{existingRecords.length}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Информационная панель */}
            <div className="mt-6 bg-blue-50 rounded-lg p-4">
              <div className="flex items-start">
                <AlertCircle className="h-5 w-5 text-blue-600 mt-1 mr-2 flex-shrink-0" />
                <div>
                  <h4 className="text-sm font-medium text-blue-900 mb-1">Важно!</h4>
                  <p className="text-xs text-blue-800">
                    Данные вводятся только для операционных менеджеров и сотрудников со смешанной ролью. 
                    Эти данные будут использованы для расчета рейтингов и аналитики.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
