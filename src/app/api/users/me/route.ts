export const revalidate = 60; // кэш на 60 секунд

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

// GET - получить информацию о текущем пользователе
export async function GET(request: NextRequest) {
  const authResult = requireAuth(request);
  if (authResult.error) return authResult.error;

  try {
    const user = await prisma.user.findUnique({
      where: { id: authResult.user.userId },
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

    if (!user) {
      return NextResponse.json(
        { message: 'Пользователь не найден' },
        { status: 404 }
      );
    }

    if (!user.isActive) {
      return NextResponse.json(
        { message: 'Аккаунт деактивирован' },
        { status: 403 }
      );
    }

    return NextResponse.json(user);
  } catch (error) {
    console.error('Error fetching user:', error);
    return NextResponse.json(
      { message: 'Ошибка при получении данных пользователя' },
      { status: 500 }
    );
  }
}
