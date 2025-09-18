'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Building2, Users, DollarSign, Clock, MapPin } from 'lucide-react';

interface Employee {
  id: string;
  name: string;
  email: string | null;
  role: string;
  city: string;
  salaryGross: number | null;
  salaryNet: number | null;
  isActive: boolean;
  workSchedules?: WorkSchedule[];
}

interface WorkSchedule {
  id: string;
  weekStartDate: string;
  weekEndDate: string;
  weeklyNotes: string | null;
  isFlexible: boolean;
}

const roleLabels: Record<string, string> = {
  'HIRING_MANAGER': 'HR (Найм)',
  'OPS_MANAGER': 'Операции',
  'MIXED_MANAGER': 'Смешанный',
  'COUNTRY_MANAGER': 'Менеджер по стране',
  'ADMIN': 'Администратор'
};

const roleColors: Record<string, string> = {
  'HIRING_MANAGER': 'bg-blue-100 text-blue-800',
  'OPS_MANAGER': 'bg-green-100 text-green-800',
  'MIXED_MANAGER': 'bg-purple-100 text-purple-800',
  'COUNTRY_MANAGER': 'bg-orange-100 text-orange-800',
  'ADMIN': 'bg-red-100 text-red-800'
};

const cityLabels: Record<string, string> = {
  'WARSAW': 'Варшава',
  'KRAKOW': 'Краков',
  'GDANSK': 'Гданьск',
  'WROCLAW': 'Вроцлав',
  'POZNAN': 'Познань',
  'LODZ': 'Лодзь'
};

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    try {
      const response = await fetch('/api/users');
      if (!response.ok) {
        throw new Error('Ошибка загрузки данных');
      }
      const data = await response.json();
      setEmployees(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Неизвестная ошибка');
    } finally {
      setLoading(false);
    }
  };

  const formatSalary = (gross: number | null, net: number | null) => {
    if (!gross && !net) return 'Не указано';
    return `${gross ? `${gross.toLocaleString()} PLN` : ''} ${net ? `(${net.toLocaleString()} нетто)` : ''}`;
  };

  const formatSchedule = (schedule: WorkSchedule | undefined) => {
    if (!schedule) return 'График не настроен';
    
    const startDate = new Date(schedule.weekStartDate);
    const endDate = new Date(schedule.weekEndDate);
    
    return `${startDate.toLocaleDateString('ru-RU')} - ${endDate.toLocaleDateString('ru-RU')}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Загрузка сотрудников...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-red-600">Ошибка: {error}</div>
      </div>
    );
  }

  // Группировка по городам
  const employeesByCity = employees.reduce((acc, emp) => {
    if (!acc[emp.city]) acc[emp.city] = [];
    acc[emp.city].push(emp);
    return acc;
  }, {} as Record<string, Employee[]>);

  return (
    <div className="container mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Команда CleanWhale
        </h1>
        <p className="text-gray-600">
          Список сотрудников с зарплатами и графиками работы
        </p>
      </div>

      {/* Общая статистика */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Всего сотрудников</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{employees.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Городов</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Object.keys(employeesByCity).length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Средняя ЗП (брутто)</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Math.round(
                employees
                  .filter(emp => emp.salaryGross)
                  .reduce((sum, emp) => sum + (emp.salaryGross || 0), 0) /
                employees.filter(emp => emp.salaryGross).length
              ).toLocaleString()} PLN
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Активных</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {employees.filter(emp => emp.isActive).length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Список по городам */}
      {Object.entries(employeesByCity).map(([city, cityEmployees]) => (
        <Card key={city} className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              {cityLabels[city] || city} ({cityEmployees.length} чел.)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {cityEmployees.map((employee) => (
                <div
                  key={employee.id}
                  className="border rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-semibold text-lg">{employee.name}</h3>
                      <p className="text-sm text-gray-600">{employee.email}</p>
                    </div>
                    <Badge className={roleColors[employee.role]}>
                      {roleLabels[employee.role]}
                    </Badge>
                  </div>

                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-gray-500" />
                      <span className="font-medium">Зарплата:</span>
                      <span>{formatSalary(employee.salaryGross, employee.salaryNet)}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-gray-500" />
                      <span className="font-medium">График:</span>
                      <span className="text-xs">
                        {formatSchedule(employee.workSchedules?.[0])}
                      </span>
                    </div>

                    {employee.workSchedules?.[0]?.weeklyNotes && (
                      <div className="text-xs text-gray-600 mt-2 p-2 bg-gray-50 rounded">
                        {employee.workSchedules[0].weeklyNotes}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
