export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

export async function POST(request: NextRequest) {
  try {
    const { login, password } = await request.json();

    if (!login || !password) {
      return NextResponse.json(
        { message: 'Логин и пароль обязательны' },
        { status: 400 }
      );
    }

    // Поиск пользователя
    logger.info('Login attempt', { login });
    
    const user = await prisma.user.findUnique({
      where: { login },
    });

    if (!user || !user.isActive) {
      logger.warn('Login failed - user not found or inactive', { login, found: !!user, active: user?.isActive });
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
    // Проверяем протокол для правильной установки Secure флага
    const isHttps = request.headers.get('x-forwarded-proto') === 'https' || 
                   new URL(request.url).protocol === 'https:';
    
    response.cookies.set('token', token, {
      httpOnly: true,
      secure: isHttps, // Secure только для HTTPS
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60, // 30 дней (синхронизировано с JWT)
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
