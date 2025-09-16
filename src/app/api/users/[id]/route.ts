import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/auth';
import bcrypt from 'bcryptjs';

// GET - получить конкретного пользователя
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authResult = requireRole(['ADMIN', 'COUNTRY_MANAGER'])(request);
  if (authResult.error) return authResult.error;

  try {
    const user = await prisma.user.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        login: true,
        email: true,
        name: true,
        role: true,
        city: true,
        salary: true,
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

    return NextResponse.json(user);
  } catch (error) {
    console.error('Error fetching user:', error);
    return NextResponse.json(
      { message: 'Ошибка при получении пользователя' },
      { status: 500 }
    );
  }
}

// PUT - обновить пользователя
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authResult = requireRole(['ADMIN'])(request);
  if (authResult.error) return authResult.error;

  try {
    const data = await request.json();
    const { login, password, email, name, role, city, salary, currency, isActive } = data;

    // Проверяем существование пользователя
    const existingUser = await prisma.user.findUnique({
      where: { id: params.id },
    });

    if (!existingUser) {
      return NextResponse.json(
        { message: 'Пользователь не найден' },
        { status: 404 }
      );
    }

    // Проверяем уникальность логина, если он изменился
    if (login && login !== existingUser.login) {
      const userWithLogin = await prisma.user.findUnique({
        where: { login },
      });

      if (userWithLogin) {
        return NextResponse.json(
          { message: 'Пользователь с таким логином уже существует' },
          { status: 400 }
        );
      }
    }

    // Подготавливаем данные для обновления
    const updateData: any = {
      login: login ?? existingUser.login,
      email: email ?? existingUser.email,
      name: name ?? existingUser.name,
      role: role ?? existingUser.role,
      city: city ?? existingUser.city,
      salary: salary ?? existingUser.salary,
      currency: currency ?? existingUser.currency,
      isActive: isActive ?? existingUser.isActive,
    };

    // Хешируем новый пароль, если он передан
    if (password) {
      updateData.password = await bcrypt.hash(password, 10);
    }

    const user = await prisma.user.update({
      where: { id: params.id },
      data: updateData,
      select: {
        id: true,
        login: true,
        email: true,
        name: true,
        role: true,
        city: true,
        salary: true,
        currency: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json(user);
  } catch (error) {
    console.error('Error updating user:', error);
    return NextResponse.json(
      { message: 'Ошибка при обновлении пользователя' },
      { status: 500 }
    );
  }
}

// DELETE - удалить пользователя (деактивировать)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authResult = requireRole(['ADMIN'])(request);
  if (authResult.error) return authResult.error;

  try {
    const user = await prisma.user.findUnique({
      where: { id: params.id },
    });

    if (!user) {
      return NextResponse.json(
        { message: 'Пользователь не найден' },
        { status: 404 }
      );
    }

    // Деактивируем пользователя вместо физического удаления
    await prisma.user.update({
      where: { id: params.id },
      data: { isActive: false },
    });

    return NextResponse.json({ message: 'Пользователь деактивирован' });
  } catch (error) {
    console.error('Error deleting user:', error);
    return NextResponse.json(
      { message: 'Ошибка при удалении пользователя' },
      { status: 500 }
    );
  }
}
