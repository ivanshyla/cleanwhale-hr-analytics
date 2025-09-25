import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { prisma } from '@/lib/prisma';

// GET /api/country-user-inputs?weekIso=YYYY-Www&cityId=optional
export async function GET(request: NextRequest) {
  try {
    // Проверяем токен
    const token = request.cookies.get('token')?.value;
    if (!token) {
      return NextResponse.json({ message: 'Не авторизован' }, { status: 401 });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret') as any;
    const userId = decoded.userId;

    // Проверяем права доступа (COUNTRY_MANAGER или ADMIN)
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true }
    });

    if (!user || !['ADMIN', 'COUNTRY_MANAGER'].includes(user.role)) {
      return NextResponse.json({ message: 'Нет доступа к данным по пользователям' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const weekIso = searchParams.get('weekIso');
    const cityIdParam = searchParams.get('cityId');
    
    if (!weekIso) {
      return NextResponse.json({ message: 'Параметр weekIso обязателен' }, { status: 400 });
    }

    // Формируем фильтр для получения пользователей
    const userFilter: any = {
      role: { in: ['OPS_MANAGER', 'MIXED_MANAGER'] },
      isActive: true
    };

    // Если указан cityId, фильтруем по городу
    if (cityIdParam) {
      // Нужно найти код города по ID
      const cityInfo = await prisma.cityInfo.findUnique({
        where: { id: parseInt(cityIdParam) }
      });
      
      if (cityInfo) {
        userFilter.city = cityInfo.code;
      }
    }

    // Получаем всех подходящих пользователей
    const users = await prisma.user.findMany({
      where: userFilter,
      select: {
        id: true,
        login: true,
        name: true,
        role: true,
        city: true
      },
      orderBy: [
        { city: 'asc' },
        { name: 'asc' }
      ]
    });

    // Получаем существующие записи CountryUserInput за эту неделю
    const existingInputs = await prisma.countryUserInput.findMany({
      where: {
        weekIso,
        userId: { in: users.map(u => u.id) }
      }
    });

    // Формируем ответ с данными пользователей + их инпуты
    const response = users.map(user => {
      const input = existingInputs.find(i => i.userId === user.id);
      
      return {
        userId: user.id,
        login: user.login,
        name: user.name,
        role: user.role,
        city: user.city,
        weekIso,
        // Данные из CountryUserInput (если есть)
        trengoResponses: input?.trengoResponses || 0,
        trengoTickets: input?.trengoTickets || 0,
        crmComplaintsClosed: input?.crmComplaintsClosed || 0,
        ordersHandled: input?.ordersHandled || 0,
        notes: input?.notes || '',
        hasCountryData: !!input, // флаг наличия данных от country manager
        updatedAt: input?.updatedAt || null
      };
    });

    return NextResponse.json({
      weekIso,
      cityFilter: cityIdParam ? parseInt(cityIdParam) : null,
      users: response
    });

  } catch (error) {
    console.error('Error fetching country user inputs:', error);
    return NextResponse.json(
      { message: 'Ошибка получения данных по пользователям' },
      { status: 500 }
    );
  }
}

// POST /api/country-user-inputs
export async function POST(request: NextRequest) {
  try {
    // Проверяем токен
    const token = request.cookies.get('token')?.value;
    if (!token) {
      return NextResponse.json({ message: 'Не авторизован' }, { status: 401 });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret') as any;
    const userId = decoded.userId;

    // Проверяем права доступа (COUNTRY_MANAGER или ADMIN)
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true }
    });

    if (!user || !['ADMIN', 'COUNTRY_MANAGER'].includes(user.role)) {
      return NextResponse.json({ message: 'Нет доступа к редактированию данных пользователей' }, { status: 403 });
    }

    const body = await request.json();
    const { weekIso, items } = body;

    if (!weekIso || !items || !Array.isArray(items)) {
      return NextResponse.json(
        { message: 'Отсутствуют обязательные поля: weekIso, items[]' },
        { status: 400 }
      );
    }

    // Проверяем что все пользователи в items имеют подходящие роли
    const userIds = items.map(item => item.userId).filter(Boolean);
    const validUsers = await prisma.user.findMany({
      where: {
        id: { in: userIds },
        role: { in: ['OPS_MANAGER', 'MIXED_MANAGER'] },
        isActive: true
      },
      select: { id: true }
    });

    const validUserIds = validUsers.map(u => u.id);

    // Используем транзакцию для атомарного обновления
    const result = await prisma.$transaction(async (tx) => {
      const upsertResults = [];

      for (const item of items) {
        const {
          userId: targetUserId,
          trengoResponses,
          trengoTickets,
          crmComplaintsClosed,
          ordersHandled,
          notes
        } = item;

        if (!targetUserId) {
          continue; // пропускаем записи без userId
        }

        // Проверяем что пользователь валидный
        if (!validUserIds.includes(targetUserId)) {
          throw new Error(`Пользователь ${targetUserId} не найден или не имеет подходящей роли`);
        }

        const upserted = await tx.countryUserInput.upsert({
          where: {
            weekIso_userId: {
              weekIso,
              userId: targetUserId
            }
          },
          update: {
            trengoResponses: trengoResponses || 0,
            trengoTickets: trengoTickets || 0,
            crmComplaintsClosed: crmComplaintsClosed || 0,
            ordersHandled: ordersHandled || 0,
            notes: notes || null,
            updatedAt: new Date()
          },
          create: {
            weekIso,
            userId: targetUserId,
            trengoResponses: trengoResponses || 0,
            trengoTickets: trengoTickets || 0,
            crmComplaintsClosed: crmComplaintsClosed || 0,
            ordersHandled: ordersHandled || 0,
            notes: notes || null
          },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                role: true,
                city: true
              }
            }
          }
        });

        upsertResults.push(upserted);
      }

      return upsertResults;
    });

    return NextResponse.json({
      message: 'Данные по пользователям сохранены',
      weekIso,
      updated: result.length,
      data: result
    });

  } catch (error) {
    console.error('Error saving country user inputs:', error);
    return NextResponse.json(
      { message: 'Ошибка сохранения данных по пользователям: ' + (error instanceof Error ? error.message : 'Unknown error') },
      { status: 500 }
    );
  }
}
