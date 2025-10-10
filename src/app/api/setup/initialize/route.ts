/**
 * SETUP ENDPOINT - Первичная инициализация БД на production
 * Используется ОДИН РАЗ для создания начальных пользователей
 * 
 * ⚠️ КРИТИЧНО: Требует SETUP_SECRET для защиты
 * ⚠️ Автоматически отключается после создания пользователей
 */

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { logger } from '@/lib/logger';

export async function POST(request: NextRequest) {
  try {
    // 1. Проверка SETUP_SECRET (обязательна!)
    const setupSecret = process.env.SETUP_SECRET;
    if (!setupSecret) {
      logger.error('SETUP_SECRET not configured');
      return NextResponse.json(
        { error: 'Setup endpoint not configured' },
        { status: 500 }
      );
    }

    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${setupSecret}`) {
      logger.warn('Unauthorized setup attempt', { 
        ip: request.headers.get('x-forwarded-for') 
      });
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // 2. Проверяем что БД еще не инициализирована
    const existingUsers = await prisma.user.count();
    if (existingUsers > 0) {
      logger.warn('Setup attempt but users already exist', { count: existingUsers });
      return NextResponse.json(
        { 
          message: 'Database already initialized',
          usersCount: existingUsers,
          note: 'Use /api/users POST endpoint to add more users'
        },
        { status: 409 }
      );
    }

    logger.info('Starting database initialization...');

    // 3. Создаем начальных пользователей
    // Пароли из USERS_LIST.md
    const users = [
      { login: 'admin', password: 'admin123', name: 'Системный администратор', role: 'ADMIN', city: 'WARSAW' },
      { login: 'country_manager', password: 'country123', name: 'Country Manager', role: 'COUNTRY_MANAGER', city: 'WARSAW' },
      { login: 'artem.communication', password: 'artem123', name: 'Артем (Коммуникация)', role: 'OPS_MANAGER', city: 'WARSAW' },
      { login: 'yuliya.hr', password: 'yuliya123', name: 'Юлия (HR)', role: 'HIRING_MANAGER', city: 'WARSAW' },
      { login: 'maryana.hr', password: 'maryana123', name: 'Марьяна (HR)', role: 'HIRING_MANAGER', city: 'WARSAW' },
      { login: 'viktoriya.communication', password: 'viktoriya123', name: 'Виктория (Коммуникация)', role: 'OPS_MANAGER', city: 'WARSAW' },
      { login: 'menedzher.lodz', password: 'menedzher123', name: 'Менеджер Лодзь', role: 'MIXED_MANAGER', city: 'LODZ' },
      { login: 'bogdana.krakow', password: 'bogdana123', name: 'Богдана (Краков)', role: 'OPS_MANAGER', city: 'KRAKOW' },
      { login: 'mariya.krakow', password: 'mariya123', name: 'Мария (Краков)', role: 'OPS_MANAGER', city: 'KRAKOW' },
      { login: 'anastasiya.krakow', password: 'anastasiya123', name: 'Анастасия (Краков HR)', role: 'HIRING_MANAGER', city: 'KRAKOW' },
      { login: 'artem.wroclaw', password: 'artem123', name: 'Артем (Вроцлав)', role: 'OPS_MANAGER', city: 'WROCLAW' },
      { login: 'anastasiya.wroclaw', password: 'anastasiya123', name: 'Анастасия (Вроцлав)', role: 'MIXED_MANAGER', city: 'WROCLAW' },
      { login: 'pavel.poznan', password: 'pavel123', name: 'Павел (Познань)', role: 'MIXED_MANAGER', city: 'POZNAN' },
      { login: 'hr.gdansk', password: 'gdansk123', name: 'HR Гданьск', role: 'HIRING_MANAGER', city: 'GDANSK' },
    ];

    const createdUsers = [];

    for (const userData of users) {
      const hashedPassword = await bcrypt.hash(userData.password, 10);
      
      const user = await prisma.user.create({
        data: {
          login: userData.login,
          password: hashedPassword,
          name: userData.name,
          role: userData.role as any,
          city: userData.city,
          isActive: true,
        },
        select: {
          id: true,
          login: true,
          name: true,
          role: true,
          city: true,
        },
      });

      createdUsers.push(user);
      logger.info('User created', { login: user.login, role: user.role });
    }

    logger.authEvent('setup_complete', { 
      usersCreated: createdUsers.length,
      timestamp: new Date().toISOString() 
    });

    return NextResponse.json({
      success: true,
      message: 'Database initialized successfully',
      usersCreated: createdUsers.length,
      users: createdUsers.map(u => ({
        login: u.login,
        name: u.name,
        role: u.role,
        city: u.city,
      })),
      nextSteps: [
        'Database is ready for use',
        'You can now login with any user from USERS_LIST.md',
        'This endpoint will not work again (users already exist)',
      ],
    });

  } catch (error) {
    logger.error('Setup initialization failed', { error });
    return NextResponse.json(
      { 
        error: 'Setup failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// GET - показывает статус инициализации (без секрета)
export async function GET(request: NextRequest) {
  try {
    const usersCount = await prisma.user.count();
    const isInitialized = usersCount > 0;

    return NextResponse.json({
      initialized: isInitialized,
      usersCount,
      message: isInitialized 
        ? 'Database already initialized' 
        : 'Database needs initialization - POST with SETUP_SECRET',
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to check status' },
      { status: 500 }
    );
  }
}

