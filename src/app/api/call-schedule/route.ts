import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

// Получение графика звонков
export async function GET(request: NextRequest) {
  const authResult = requireAuth(request);
  if (authResult.error) {
    return authResult.error;
  }

  const { user } = authResult;
  const { searchParams } = new URL(request.url);
  const startDate = searchParams.get('startDate');
  const endDate = searchParams.get('endDate');
  const city = searchParams.get('city');
  const status = searchParams.get('status');

  try {
    // Только country manager и admin могут видеть график звонков
    if (!['COUNTRY_MANAGER', 'ADMIN'].includes(user.role)) {
      return NextResponse.json(
        { message: 'Недостаточно прав для просмотра графика звонков' },
        { status: 403 }
      );
    }

    let whereClause: any = {};

    // Фильтр по дате
    if (startDate && endDate) {
      whereClause.callDate = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      };
    }

    // Фильтр по городу
    if (city) {
      whereClause.city = city;
    }

    // Фильтр по статусу
    if (status) {
      whereClause.status = status;
    }

    // Если не админ, показываем только свои запланированные звонки
    if (user.role !== 'ADMIN') {
      whereClause.scheduledById = user.userId;
    }

    const callSchedules = await prisma.callSchedule.findMany({
      where: whereClause,
      include: {
        scheduledBy: {
          select: {
            id: true,
            name: true,
            role: true,
          }
        }
      },
      orderBy: [
        { callDate: 'asc' },
        { callTime: 'asc' }
      ]
    });

    return NextResponse.json({
      calls: callSchedules,
      total: callSchedules.length,
    });

  } catch (error) {
    console.error('Error fetching call schedule:', error);
    return NextResponse.json(
      { message: 'Ошибка получения графика звонков' },
      { status: 500 }
    );
  }
}

// Создание нового звонка в графике
export async function POST(request: NextRequest) {
  const authResult = requireAuth(request);
  if (authResult.error) {
    return authResult.error;
  }

  const { user } = authResult;

  try {
    // Только country manager и admin могут планировать звонки
    if (!['COUNTRY_MANAGER', 'ADMIN'].includes(user.role)) {
      return NextResponse.json(
        { message: 'Недостаточно прав для планирования звонков' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      callDate,
      callTime,
      duration,
      city,
      participantIds, // массив ID участников
      participantNames, // массив имен участников
      topic,
      agenda,
      callType,
      priority,
    } = body;

    if (!callDate || !callTime || !city || !participantIds || participantIds.length === 0) {
      return NextResponse.json(
        { message: 'Дата, время, город и участники обязательны' },
        { status: 400 }
      );
    }

    // Проверяем, что участники существуют и относятся к указанному городу
    const participants = await prisma.user.findMany({
      where: {
        id: { in: participantIds },
        city: city,
        active: true,
        role: { in: ['HR', 'OPERATIONS', 'MIXED'] }
      },
      select: {
        id: true,
        name: true,
        city: true,
        role: true,
      }
    });

    if (participants.length !== participantIds.length) {
      return NextResponse.json(
        { message: 'Некоторые участники не найдены или не относятся к указанному городу' },
        { status: 400 }
      );
    }

    const callDateObj = new Date(callDate);

    const savedCall = await prisma.callSchedule.create({
      data: {
        scheduledById: user.userId,
        callDate: callDateObj,
        callTime: callTime,
        duration: duration ? parseInt(duration) : null,
        city: city,
        participantIds: JSON.stringify(participantIds),
        participantNames: JSON.stringify(participants.map(p => p.name)),
        topic: topic || null,
        agenda: agenda || null,
        callType: callType || 'REGULAR',
        priority: priority || 'MEDIUM',
        status: 'SCHEDULED',
      },
      include: {
        scheduledBy: {
          select: {
            id: true,
            name: true,
            role: true,
          }
        }
      }
    });

    return NextResponse.json({
      message: 'Звонок запланирован',
      call: savedCall,
    });

  } catch (error) {
    console.error('Error creating call schedule:', error);
    return NextResponse.json(
      { message: 'Ошибка планирования звонка', error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
