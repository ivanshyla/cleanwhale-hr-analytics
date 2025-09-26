import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { prisma } from '@/lib/prisma';
import { canAccessEmployeeFeatures } from '@/lib/permissions';

// GET /api/employees - получение всех сотрудников с профилями
export async function GET(request: NextRequest) {
  try {
    // Проверяем токен
    const token = request.cookies.get('token')?.value;
    if (!token) {
      return NextResponse.json({ message: 'Не авторизован' }, { status: 401 });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret') as any;

    // Проверяем доступ к Employee Management функциям
    if (!canAccessEmployeeFeatures({ userId: decoded.userId, role: decoded.role })) {
      return NextResponse.json({ message: 'Нет доступа к данным сотрудников' }, { status: 403 });
    }

    // Получаем всех сотрудников с их профилями (стаж/зарплаты)
    const users = await prisma.user.findMany({
      where: {
        isActive: true
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        city: true,
        salaryGross: true,
        salaryNet: true,
        currency: true,
        employeeProfile: true
      },
      orderBy: [
        { city: 'asc' },
        { name: 'asc' }
      ]
    });

    // Формируем ответ
    const response = users.map(user => {
      const profile = user.employeeProfile;
      
      return {
        userId: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        city: user.city,
        currency: user.currency,
        
        // Данные из EmployeeProfile (приоритет)
        yearsWorked: profile?.yearsWorked || null,
        salaryGross: profile?.salaryGross || user.salaryGross,
        salaryNet: profile?.salaryNet || user.salaryNet,
        
        // Отметка об уровне данных
        hasProfile: !!profile
      };
    });

    return NextResponse.json({
      users: response,
      total: response.length
    });

  } catch (error) {
    console.error('Error fetching employees:', error);
    return NextResponse.json(
      { message: 'Ошибка получения данных сотрудников' },
      { status: 500 }
    );
  }
}

// POST /api/employees - обновление стажа и зарплат
export async function POST(request: NextRequest) {
  try {
    // Проверяем токен
    const token = request.cookies.get('token')?.value;
    if (!token) {
      return NextResponse.json({ message: 'Не авторизован' }, { status: 401 });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret') as any;

    // Проверяем доступ к Employee Management функциям
    if (!canAccessEmployeeFeatures({ userId: decoded.userId, role: decoded.role })) {
      return NextResponse.json({ message: 'Нет доступа к редактированию данных сотрудников' }, { status: 403 });
    }

    const body = await request.json();
    const { items } = body;

    if (!items || !Array.isArray(items)) {
      return NextResponse.json(
        { message: 'Отсутствуют обязательные поля: items[]' },
        { status: 400 }
      );
    }

    // Валидация данных
    for (const item of items) {
      const { userId, yearsWorked, salaryGross, salaryNet } = item;

      if (!userId) {
        return NextResponse.json(
          { message: 'userId обязателен для каждого элемента' },
          { status: 400 }
        );
      }

      if (yearsWorked !== null && yearsWorked !== undefined && (yearsWorked < 0 || !Number.isInteger(yearsWorked))) {
        return NextResponse.json(
          { message: `yearsWorked для пользователя ${userId} должно быть положительным целым числом или null` },
          { status: 400 }
        );
      }

      if (salaryGross !== null && salaryGross !== undefined && salaryGross < 0) {
        return NextResponse.json(
          { message: `salaryGross для пользователя ${userId} должно быть положительным числом или null` },
          { status: 400 }
        );
      }

      if (salaryNet !== null && salaryNet !== undefined && salaryNet < 0) {
        return NextResponse.json(
          { message: `salaryNet для пользователя ${userId} должно быть положительным числом или null` },
          { status: 400 }
        );
      }
    }

    // Используем транзакцию для атомарного обновления
    const result = await prisma.$transaction(async (tx) => {
      const updatedProfiles = [];

      for (const item of items) {
        const { userId, yearsWorked, salaryGross, salaryNet } = item;

        // Проверяем существование пользователя
        const user = await tx.user.findUnique({
          where: { id: userId }
        });

        if (!user) {
          throw new Error(`Пользователь с ID ${userId} не найден`);
        }

        // Upsert профиля сотрудника
        const profile = await tx.employeeProfile.upsert({
          where: {
            userId: userId
          },
          update: {
            yearsWorked: yearsWorked !== undefined ? yearsWorked : undefined,
            salaryGross: salaryGross !== undefined ? salaryGross : undefined,
            salaryNet: salaryNet !== undefined ? salaryNet : undefined,
            updatedAt: new Date()
          },
          create: {
            userId: userId,
            yearsWorked: yearsWorked !== undefined ? yearsWorked : null,
            salaryGross: salaryGross !== undefined ? salaryGross : null,
            salaryNet: salaryNet !== undefined ? salaryNet : null
          },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                city: true,
                role: true
              }
            }
          }
        });

        updatedProfiles.push(profile);
      }

      return updatedProfiles;
    });

    return NextResponse.json({
      message: 'Данные сотрудников обновлены',
      updated: result.length,
      profiles: result.map(profile => ({
        userId: profile.userId,
        userName: profile.user.name,
        userEmail: profile.user.email,
        userCity: profile.user.city,
        userRole: profile.user.role,
        yearsWorked: profile.yearsWorked,
        salaryGross: profile.salaryGross,
        salaryNet: profile.salaryNet,
        updatedAt: profile.updatedAt
      }))
    });

  } catch (error: any) {
    console.error('Error updating employees:', error);
    
    if (error.message.includes('не найден')) {
      return NextResponse.json(
        { message: error.message },
        { status: 404 }
      );
    }
    
    return NextResponse.json(
      { message: 'Ошибка обновления данных сотрудников' },
      { status: 500 }
    );
  }
}
