'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Building2, Users, DollarSign, Clock, MapPin } from 'lucide-react';

// Моковые данные сотрудников CleanWhale
const mockEmployees = [
  {
    id: '1',
    name: 'Артем',
    email: 'artem@cleanwhale.pl',
    role: 'OPS_MANAGER',
    city: 'WARSAW',
    salaryGross: 5400,
    salaryNet: 4050,
    schedule: 'Пн-Пт 8:00-18:00 чаты (офис 10:30-16:00) + выходные 1/2 удаленно',
    notes: 'График: пн-пт чаты (в офисе 10:30-16:00), выходные 1/2 удаленно'
  },
  {
    id: '2',
    name: 'Юлия',
    email: 'yuliya@cleanwhale.pl',
    role: 'HIRING_MANAGER',
    city: 'WARSAW',
    salaryGross: 5500,
    salaryNet: 4125,
    schedule: 'Пн-Пт 10:30-15:30 найм + Сб-Вс 1/2 чаты и заказы 08:00-18:00',
    notes: 'Основной график найма + дополнительные чаты и заказы в выходные'
  },
  {
    id: '3',
    name: 'Марьяна',
    email: 'maryana@cleanwhale.pl',
    role: 'HIRING_MANAGER',
    city: 'WARSAW',
    salaryGross: 4000,
    salaryNet: 3000,
    schedule: 'Пн-Пт 12:30-17:30 найм в офисе',
    notes: 'Стандартный график найма в офисе'
  },
  {
    id: '4',
    name: 'Виктория',
    email: 'viktoriya@cleanwhale.pl',
    role: 'OPS_MANAGER',
    city: 'WARSAW',
    salaryGross: 5900,
    salaryNet: 4425,
    schedule: 'Пн-Пт 08:00-18:00 + Сб-Вс 1/2 удаленно',
    notes: 'Полная удаленка, работа в выходные через день'
  },
  {
    id: '5',
    name: 'Менеджер Лодзь',
    email: 'menedzher@cleanwhale.pl',
    role: 'MIXED_MANAGER',
    city: 'LODZ',
    salaryGross: 4500,
    salaryNet: 3375,
    schedule: 'Ненормированный график, офис/удаленно',
    notes: 'Ненормированный график, офис/удаленно'
  },
  {
    id: '6',
    name: 'Богдана',
    email: 'bogdana@cleanwhale.pl',
    role: 'OPS_MANAGER',
    city: 'KRAKOW',
    salaryGross: 4400,
    salaryNet: 3300,
    schedule: 'График 2 через 2, удаленно',
    notes: 'График 2 через 2, коммуникация, удаленно из Кракова'
  },
  {
    id: '7',
    name: 'Мария',
    email: 'mariya@cleanwhale.pl',
    role: 'OPS_MANAGER',
    city: 'KRAKOW',
    salaryGross: 4400,
    salaryNet: 3300,
    schedule: 'График 2 через 2, удаленно',
    notes: 'График 2 через 2, коммуникация, удаленно из Кракова'
  },
  {
    id: '8',
    name: 'Анастасия',
    email: 'anastasiya@cleanwhale.pl',
    role: 'HIRING_MANAGER',
    city: 'KRAKOW',
    salaryGross: 4000,
    salaryNet: 3000,
    schedule: 'Пн-Пт 10:00-16:00 найм в офисе',
    notes: 'Стандартный график найма в офисе Кракова'
  },
  {
    id: '9',
    name: 'Артем',
    email: 'artem.wroclaw@cleanwhale.pl',
    role: 'OPS_MANAGER',
    city: 'WROCLAW',
    salaryGross: null,
    salaryNet: null,
    schedule: 'Первая смена 08:00-16:00, чередуется с Анастасией',
    notes: 'График 2 смены, чередуется с Анастасией каждую неделю'
  },
  {
    id: '10',
    name: 'Анастасия',
    email: 'anastasiya.wroclaw@cleanwhale.pl',
    role: 'OPS_MANAGER',
    city: 'WROCLAW',
    salaryGross: 4600,
    salaryNet: 3450,
    schedule: 'Вторая смена 16:00-00:00, чередуется с Артемом',
    notes: 'График 2 смены, чередуется с Артемом каждую неделю'
  },
  {
    id: '11',
    name: 'Павел',
    email: 'pavel@cleanwhale.pl',
    role: 'OPS_MANAGER',
    city: 'POZNAN',
    salaryGross: 4300,
    salaryNet: 3225,
    schedule: 'Ненормированный, чередует первую/вторую половину дня',
    notes: 'Ненормированный график, чередует время работы, офис/удаленно'
  },
  {
    id: '12',
    name: 'Менеджер по стране',
    email: 'country.manager@cleanwhale.pl',
    role: 'COUNTRY_MANAGER',
    city: 'WARSAW',
    salaryGross: 15000,
    salaryNet: 11250,
    schedule: 'Стандартный график менеджера по стране',
    notes: 'Стандартный график менеджера по стране'
  }
];

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

export default function HomePage() {
  // Группировка по городам
  const employeesByCity = mockEmployees.reduce((acc, emp) => {
    if (!acc[emp.city]) acc[emp.city] = [];
    acc[emp.city].push(emp);
    return acc;
  }, {} as Record<string, typeof mockEmployees>);

  const formatSalary = (gross: number | null, net: number | null) => {
    if (!gross && !net) return 'Не указано';
    return `${gross ? `${gross.toLocaleString()} PLN` : ''} ${net ? `(${net.toLocaleString()} нетто)` : ''}`;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto p-6">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            CleanWhale Analytics
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
              <div className="text-2xl font-bold">{mockEmployees.length}</div>
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
                  mockEmployees
                    .filter(emp => emp.salaryGross)
                    .reduce((sum, emp) => sum + (emp.salaryGross || 0), 0) /
                  mockEmployees.filter(emp => emp.salaryGross).length
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
              <div className="text-2xl font-bold">{mockEmployees.length}</div>
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
                    className="border rounded-lg p-4 hover:shadow-md transition-shadow bg-white"
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

                      <div className="flex items-start gap-2">
                        <Clock className="h-4 w-4 text-gray-500 mt-0.5" />
                        <div>
                          <span className="font-medium">График:</span>
                          <p className="text-xs text-gray-600 mt-1">{employee.schedule}</p>
                        </div>
                      </div>

                      {employee.notes && (
                        <div className="text-xs text-gray-600 mt-2 p-2 bg-gray-50 rounded">
                          {employee.notes}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}

        {/* Footer */}
        <div className="mt-12 text-center text-gray-500">
          <p>CleanWhale Analytics Dashboard - Демо версия</p>
          <p className="text-sm mt-2">
            Данные загружены из моковых источников. Для работы с реальной БД настройте DATABASE_URL.
          </p>
        </div>
      </div>
    </div>
  );
}
