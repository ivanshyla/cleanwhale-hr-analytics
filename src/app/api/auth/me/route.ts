export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  const token = request.cookies.get('token')?.value;

  if (!token) {
    return NextResponse.json(
      { message: 'Не авторизован' },
      { status: 401 }
    );
  }

  try {
    const { getJwtSecret } = require('@/lib/env');
    const decoded = jwt.verify(token, getJwtSecret()) as any;

    try {
      // Получаем актуальные данные пользователя из базы
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: {
          id: true,
          login: true,
          name: true,
          role: true,
          city: true,
          email: true,
          isActive: true,
        }
      });

      if (!user || !user.isActive) {
        return NextResponse.json(
          { message: 'Пользователь не найден или неактивен' },
          { status: 401 }
        );
      }

      return NextResponse.json({ user });
    } catch (dbError: any) {
      // Fallback: не роняем сессию при временных проблемах БД, отвечаем данными из JWT
      logger.warn('Auth DB lookup failed, falling back to JWT payload', {
        error: dbError instanceof Error ? dbError.message : String(dbError),
      });

      const fallbackUser = {
        id: decoded.userId,
        login: decoded.login,
        name: decoded.login,
        role: decoded.role,
        city: decoded.city,
        email: null,
        isActive: true,
      };

      const res = NextResponse.json({ user: fallbackUser });
      res.headers.set('X-Auth-Me-Fallback', 'jwt');
      return res;
    }
  } catch (error) {
    logger.warn('Auth check failed', { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json(
      { message: 'Невалидный токен' },
      { status: 401 }
    );
  }
}
