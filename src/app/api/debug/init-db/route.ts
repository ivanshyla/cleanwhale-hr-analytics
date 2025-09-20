import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export async function POST(request: NextRequest) {
  try {
    console.log('🌱 Начинаем инициализацию базы данных...');

    // Хешируем пароль для всех пользователей
    const hashedPassword = await bcrypt.hash('password123', 10);

    // Создание информации о городах
    const cities = [
      { code: 'WARSAW', name: 'Варшава' },
      { code: 'KRAKOW', name: 'Краков' },
      { code: 'GDANSK', name: 'Гданьск' },
      { code: 'WROCLAW', name: 'Вроцлав' },
      { code: 'POZNAN', name: 'Познань' },
      { code: 'LODZ', name: 'Лодзь' },
    ] as const;

    // Создаем города если их еще нет
    for (const city of cities) {
      await prisma.cityInfo.upsert({
        where: { code: city.code },
        update: {},
        create: {
          code: city.code,
          name: city.name,
        },
      });
    }

    // Создание демо пользователей
    const users = [
      {
        login: 'admin',
        name: 'Системный администратор',
        email: 'admin@cleanwhale.com',
        role: 'ADMIN' as const,
        city: 'WARSAW' as const,
        salaryGross: 12000.0,
      },
      {
        login: 'country_manager',
        name: 'Анна Ковальская',
        email: 'anna.kowalska@cleanwhale.com',
        role: 'COUNTRY_MANAGER' as const,
        city: 'WARSAW' as const,
        salaryGross: 15000.0,
      },
      {
        login: 'hr_manager',
        name: 'Петр Новак',
        email: 'petr.novak@cleanwhale.com',
        role: 'HIRING_MANAGER' as const,
        city: 'WARSAW' as const,
        salaryGross: 8500.0,
      },
      {
        login: 'ops_manager',
        name: 'Мария Вишневская',
        email: 'maria.wisz@cleanwhale.com',
        role: 'OPS_MANAGER' as const,
        city: 'WARSAW' as const,
        salaryGross: 7800.0,
      },
      {
        login: 'mixed_manager',
        name: 'Томаш Лесняк',
        email: 'tomasz.lesny@cleanwhale.com',
        role: 'MIXED_MANAGER' as const,
        city: 'KRAKOW' as const,
        salaryGross: 9200.0,
      },
    ];

    // Создаем пользователей
    for (const userData of users) {
      await prisma.user.upsert({
        where: { login: userData.login },
        update: {},
        create: {
          ...userData,
          password: hashedPassword,
        },
      });
    }

    // Создание базовых настроек
    const settings = [
      { key: 'system_name', value: 'CleanWhale Analytics', category: 'general' },
      { key: 'default_timezone', value: 'Europe/Warsaw', category: 'general' },
    ];

    for (const setting of settings) {
      await prisma.settings.upsert({
        where: { key: setting.key },
        update: setting,
        create: setting,
      });
    }

    return NextResponse.json({
      success: true,
      message: 'База данных успешно инициализирована!',
      users: users.map(u => ({ login: u.login, role: u.role })),
    });

  } catch (error) {
    console.error('❌ Ошибка инициализации:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Неизвестная ошибка' 
      },
      { status: 500 }
    );
  }
}
