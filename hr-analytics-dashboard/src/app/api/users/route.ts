import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/auth';
import bcrypt from 'bcryptjs';

// GET - получить список всех пользователей (только для админов и менеджеров по стране)
export async function GET(request: NextRequest) {
  const authResult = requireRole(['ADMIN', 'COUNTRY_MANAGER'])(request);
  if (authResult.error) return authResult.error;

  const { searchParams } = new URL(request.url);
  const city = searchParams.get('city');
  const role = searchParams.get('role');
  const isActive = searchParams.get('isActive');

  try {
    const where: any = {};
    
    if (city) where.city = city;
    if (role) where.role = role;
    if (isActive !== null) where.isActive = isActive === 'true';

    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        login: true,
        email: true,
        name: true,
        role: true,
        city: true,
        salaryGross: true,
        salaryNet: true,
        currency: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        workSchedules: {
          take: 1,
          orderBy: {
            weekStartDate: 'desc'
          }
        }
      },
      orderBy: [
        { city: 'asc' },
        { role: 'asc' },
        { name: 'asc' },
      ],
    });

    return NextResponse.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json(
      { message: 'Ошибка при получении пользователей' },
      { status: 500 }
    );
  }
}

// POST - создать нового пользователя (только для админов)
export async function POST(request: NextRequest) {
  const authResult = requireRole(['ADMIN'])(request);
  if (authResult.error) return authResult.error;

  try {
    const data = await request.json();
    const { login, password, email, name, role, city, salaryGross, salaryNet, currency = 'PLN' } = data;

    if (!login || !password || !name || !role || !city) {
      return NextResponse.json(
        { message: 'Обязательные поля: login, password, name, role, city' },
        { status: 400 }
      );
    }

    // Проверяем, не существует ли уже пользователь с таким логином
    const existingUser = await prisma.user.findUnique({
      where: { login },
    });

    if (existingUser) {
      return NextResponse.json(
        { message: 'Пользователь с таким логином уже существует' },
        { status: 400 }
      );
    }

    // Хешируем пароль
    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        login,
        password: hashedPassword,
        email,
        name,
        role,
        city,
        salaryGross,
        salaryNet,
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
        salaryNet: true,
        currency: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json(user, { status: 201 });
  } catch (error) {
    console.error('Error creating user:', error);
    return NextResponse.json(
      { message: 'Ошибка при создании пользователя' },
      { status: 500 }
    );
  }
}
