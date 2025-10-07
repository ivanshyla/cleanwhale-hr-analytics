export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { guardDebugEndpoint, logDebugAccess } from '@/lib/debug-guard';

export async function POST(request: NextRequest) {
  const guardError = guardDebugEndpoint();
  if (guardError) return guardError;
  logDebugAccess('/api/debug/init-db', 'POST');
  
  try {
    console.log('🌱 Начинаем инициализацию базы данных...');

    // Сначала создаем таблицы если их нет (упрощенная версия)
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS "cities" (
        "id" TEXT NOT NULL,
        "code" TEXT NOT NULL,
        "name" TEXT NOT NULL,
        "timezone" TEXT NOT NULL DEFAULT 'Europe/Warsaw',
        "isActive" BOOLEAN NOT NULL DEFAULT true,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "cities_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "cities_code_key" UNIQUE ("code")
      );
    `;

    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS "users" (
        "id" TEXT NOT NULL,
        "login" TEXT NOT NULL,
        "password" TEXT NOT NULL,
        "email" TEXT,
        "name" TEXT NOT NULL,
        "role" TEXT NOT NULL,
        "city" TEXT NOT NULL,
        "salaryGross" DOUBLE PRECISION,
        "salaryNet" DOUBLE PRECISION,
        "currency" TEXT NOT NULL DEFAULT 'PLN',
        "isActive" BOOLEAN NOT NULL DEFAULT true,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "users_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "users_login_key" UNIQUE ("login")
      );
    `;

    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS "settings" (
        "id" TEXT NOT NULL,
        "key" TEXT NOT NULL,
        "value" TEXT NOT NULL,
        "category" TEXT NOT NULL DEFAULT 'general',
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "settings_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "settings_key_key" UNIQUE ("key")
      );
    `;

    // Хешируем пароль для всех пользователей
    const hashedPassword = await bcrypt.hash('password123', 10);

    // Создание демо пользователей через SQL
    const users = [
      { login: 'admin', name: 'Системный администратор', role: 'ADMIN', city: 'WARSAW' },
      { login: 'country_manager', name: 'Анна Ковальская', role: 'COUNTRY_MANAGER', city: 'WARSAW' },
      { login: 'hr_manager', name: 'Петр Новак', role: 'HIRING_MANAGER', city: 'WARSAW' },
      { login: 'ops_manager', name: 'Мария Вишневская', role: 'OPS_MANAGER', city: 'WARSAW' },
      { login: 'mixed_manager', name: 'Томаш Лесняк', role: 'MIXED_MANAGER', city: 'KRAKOW' },
    ];

    // Создаем пользователей напрямую через SQL
    for (const user of users) {
      await prisma.$executeRaw`
        INSERT INTO "users" (id, login, password, name, role, city, "isActive", "createdAt", "updatedAt")
        VALUES (
          ${crypto.randomUUID()},
          ${user.login},
          ${hashedPassword},
          ${user.name},
          ${user.role},
          ${user.city},
          true,
          CURRENT_TIMESTAMP,
          CURRENT_TIMESTAMP
        )
        ON CONFLICT (login) DO NOTHING;
      `;
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
      credentials: 'Все пользователи имеют пароль: password123'
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
