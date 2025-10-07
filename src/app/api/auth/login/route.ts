export const dynamic = 'force-dynamic';

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

    // Создание JWT токена
    const { getJwtSecret } = require('@/lib/env');
    const token = jwt.sign(
      { 
        userId: user.id, 
        login: user.login, 
        role: user.role,
        city: user.city 
      },
      getJwtSecret(),
      { expiresIn: '7d' }
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
    response.cookies.set('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60, // 7 дней
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
