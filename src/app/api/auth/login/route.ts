export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const login = (body?.login ?? '').trim();
    const password = (body?.password ?? '').trim();

    if (!login || !password) {
      return NextResponse.json(
        { message: 'Логин и пароль обязательны' },
        { status: 400 }
      );
    }

    // Поиск пользователя
    logger.info('Login attempt', { login });
    
    const user = await prisma.user.findFirst({
      where: { login: { equals: login, mode: 'insensitive' } },
    });

    if (!user || !user.isActive) {
      // Extra diagnostics to catch prod DB/env mismatch without exposing secrets
      const usersCount = await prisma.user.count();
      const sample = await prisma.user.findMany({ select: { login: true }, take: 3, orderBy: { createdAt: 'asc' } });
      let dbInfo: any = undefined;
      try {
        const dbUrl = process.env.DATABASE_URL || '';
        const u = new URL(dbUrl);
        dbInfo = { host: u.hostname, db: u.pathname.replace('/', '') };
      } catch {}
      logger.warn('Login failed - user not found or inactive', { login, found: !!user, active: user?.isActive, usersCount, sample, dbInfo });
      return NextResponse.json(
        { message: 'Неверные учетные данные' },
        { status: 401 }
      );
    }
    
    logger.debug('User found', { userId: user.id, login: user.login });

    // Проверка пароля
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      logger.warn('Login failed - invalid password', { login });
      return NextResponse.json(
        { message: 'Неверные учетные данные' },
        { status: 401 }
      );
    }
    
    logger.authEvent('login', { userId: user.id, login: user.login, role: user.role, city: user.city });

    // Создание JWT токена (30 дней для стабильности)
    const { getJwtSecret } = require('@/lib/env');
    const token = jwt.sign(
      { 
        userId: user.id, 
        login: user.login, 
        role: user.role,
        city: user.city 
      },
      getJwtSecret(),
      { expiresIn: '30d' }  // Увеличено до 30 дней для удобства
    );

    // Возвращаем пользователя без пароля
    const { password: _, ...userWithoutPassword } = user;

    // Создаем ответ с токеном в cookie
    const response = NextResponse.json({
      message: 'Успешный вход',
      token,
      user: userWithoutPassword,
    });

    // Устанавливаем JWT в httpOnly cookie для безопасности
    // ВАЖНО: SameSite='none' для работы на всех устройствах
    const isProduction = process.env.NODE_ENV === 'production';
    
    // Логируем вход
    logger.info('User login successful', { 
      userId: user.id, 
      login: user.login
    });
    
    response.cookies.set('token', token, {
      httpOnly: true,
      secure: isProduction, // Secure только в production (HTTPS)
      sameSite: isProduction ? 'none' : 'lax', // 'none' в production для совместимости
      maxAge: 30 * 24 * 60 * 60, // 30 дней
      path: '/',
    });

    return response;

  } catch (error) {
    logger.error('Login error', error, { endpoint: '/api/auth/login' });
    return NextResponse.json(
      { message: 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}
