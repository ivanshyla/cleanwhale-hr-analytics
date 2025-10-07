export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

export async function POST(request: NextRequest) {
  try {
    const { login, password } = await request.json();
    
    console.log('=== LOGIN DEBUG START ===');
    console.log('Login received:', login);
    console.log('Password provided:', password ? 'YES' : 'NO');

    if (!login || !password) {
      return NextResponse.json(
        { message: 'Логин и пароль обязательны' },
        { status: 400 }
      );
    }

    // Поиск пользователя
    logger.info('Login attempt', { login });
    console.log('Searching for user with login:', login);
    console.log('DATABASE_URL exists:', !!process.env.DATABASE_URL);
    console.log('DATABASE_URL starts with:', process.env.DATABASE_URL?.substring(0, 30));
    
    // Сначала проверим что вообще есть в БД
    const allUsers = await prisma.user.findMany({
      select: { login: true, isActive: true }
    });
    console.log('Total users in DB:', allUsers.length);
    console.log('All logins:', allUsers.map(u => u.login).join(', '));
    
    const user = await prisma.user.findUnique({
      where: { login },
    });
    
    console.log('User found:', user ? `YES (id: ${user.id}, active: ${user.isActive})` : 'NO');

    if (!user) {
      console.log('Login FAILED - USER NOT FOUND');
      logger.warn('Login failed - user not found', { login, availableUsers: allUsers.length });
      return NextResponse.json(
        { message: 'Неверные учетные данные' },
        { status: 401 }
      );
    }
    
    if (!user.isActive) {
      console.log('Login FAILED - USER INACTIVE');
      logger.warn('Login failed - user inactive', { login });
      return NextResponse.json(
        { message: 'Неверные учетные данные' },
        { status: 401 }
      );
    }
    
    console.log('User validated, checking password...');
    logger.debug('User found', { userId: user.id, login: user.login });

    // Проверка пароля
    logger.debug('Verifying password', { login });
    const isPasswordValid = await bcrypt.compare(password, user.password);
    
    console.log('Password valid:', isPasswordValid ? 'YES' : 'NO');

    if (!isPasswordValid) {
      console.log('Login FAILED - invalid password');
      logger.warn('Login failed - invalid password', { login });
      return NextResponse.json(
        { message: 'Неверные учетные данные' },
        { status: 401 }
      );
    }
    
    console.log('Login SUCCESS!');
    console.log('=== LOGIN DEBUG END ===');
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
