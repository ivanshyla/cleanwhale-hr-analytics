import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value;

    if (!token) {
      return NextResponse.json(
        { message: 'Не авторизован' },
        { status: 401 }
      );
    }

    // Проверяем токен
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret') as any;
    
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

  } catch (error) {
    console.error('Auth check error:', error);
    return NextResponse.json(
      { message: 'Невалидный токен' },
      { status: 401 }
    );
  }
}
