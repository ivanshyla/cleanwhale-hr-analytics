// ✅ Убрано force-dynamic для кэширования
// Кэш на 60 секунд для списка пользователей
export const revalidate = 60;

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/auth';
import { logger } from '@/lib/logger';
import { parsePaginationParams, createPaginatedResponse } from '@/lib/pagination';
import { cacheUtils } from '@/lib/cache';
import bcrypt from 'bcryptjs';

// GET - получить список всех пользователей (только для админов и менеджеров по стране)
export async function GET(request: NextRequest) {
  const authResult = requireRole(['ADMIN', 'COUNTRY_MANAGER'])(request);
  if (authResult.error) return authResult.error;

  const { searchParams } = new URL(request.url);
  const city = searchParams.get('city');
  const role = searchParams.get('role');
  const isActive = searchParams.get('isActive');
  
  // ✅ Добавлена пагинация
  const { page, limit, skip, take } = parsePaginationParams(searchParams, { page: 1, limit: 50 });

  try {
    // Генерируем ключ кэша
    const cacheKey = cacheUtils.keys.users(city || undefined, role || undefined);
    
    // Пытаемся получить из кэша
    const cached = await cacheUtils.get<{users: any[], page: number, limit: number, total: number}>(cacheKey);
    if (cached) {
      console.log('📦 Users cache hit:', cacheKey);
      return NextResponse.json(createPaginatedResponse(cached.users, cached.page, cached.limit, cached.total));
    }

    const where: any = {};
    
    if (city) where.city = city;
    if (role) where.role = role;
    if (isActive !== null) where.isActive = isActive === 'true';

    // ✅ Параллельные запросы count и data
    const [total, users] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        select: {
          id: true,
          login: true,
          email: true,
          name: true,
          role: true,
          city: true,
          salaryGross: true,
          currency: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: [
          { city: 'asc' },
          { role: 'asc' },
          { name: 'asc' },
        ],
        skip,
        take,
      }),
    ]);

    const result = { users, page, limit, total };
    
    // Кэшируем результат на 5 минут
    await cacheUtils.set(cacheKey, result, 300);
    console.log('💾 Users cached:', cacheKey);

    // ✅ Возвращаем с мета-данными пагинации
    return NextResponse.json(createPaginatedResponse(users, page, limit, total));
  } catch (error) {
    logger.error('Error fetching users', { error });
    return NextResponse.json(
      { message: 'Ошибка при получении списка пользователей' },
      { status: 500 }
    );
  }
}

// POST - создать нового пользователя (временно открыто с секретом)
export async function POST(request: NextRequest) {
  try {
    console.log('[Create User] Received request');
    const data = await request.json();
    const { login, password, email, name, role, city, salary, currency = 'PLN', secret } = data;
    console.log(`[Create User] Data parsed for login: ${login}`);

    // Временная проверка секрета для первой регистрации
    if (process.env.REGISTRATION_SECRET && secret !== process.env.REGISTRATION_SECRET) {
      console.log('[Create User] Secret provided is invalid');
      const authResult = requireRole(['ADMIN'])(request);
      if (authResult.error) return authResult.error;
    } else if (!process.env.REGISTRATION_SECRET) {
      console.log('[Create User] REGISTRATION_SECRET is not set, requiring ADMIN role');
      const authResult = requireRole(['ADMIN'])(request);
      if (authResult.error) return authResult.error;
    }
    console.log('[Create User] Authorization check passed');

    if (!login || !password || !name || !role || !city) {
      console.error('[Create User] Missing required fields');
      return NextResponse.json(
        { message: 'Обязательные поля: login, password, name, role, city' },
        { status: 400 }
      );
    }
    console.log('[Create User] All required fields are present');

    // Проверяем, не существует ли уже пользователь с таким логином
    console.log(`[Create User] Checking for existing user: ${login}`);
    const existingUser = await prisma.user.findUnique({
      where: { login },
    });
    console.log(`[Create User] Prisma check for existing user completed`);

    if (existingUser) {
      console.error(`[Create User] User with login ${login} already exists`);
      return NextResponse.json(
        { message: 'Пользователь с таким логином уже существует' },
        { status: 400 }
      );
    }

    // Хешируем пароль
    console.log(`[Create User] Hashing password for: ${login}`);
    const hashedPassword = await bcrypt.hash(password, 10);
    console.log(`[Create User] Password hashed for: ${login}`);

    console.log(`[Create User] Attempting to create user in database: ${login}`);
    const user = await prisma.user.create({
      data: {
        login,
        password: hashedPassword,
        email,
        name,
        role,
        city,
        salaryGross: salary,
        currency,
      },
      select: {
        id: true,
        login: true,
        email: true,
        name: true,
        role: true,
        city: true,
        salaryGross: true,
        currency: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    console.log(`[Create User] Successfully created user: ${login}`);

    return NextResponse.json(user, { status: 201 });
  } catch (error) {
    console.error('Error creating user:', error);
    return NextResponse.json(
      { message: 'Ошибка при создании пользователя' },
      { status: 500 }
    );
  }
}