import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

// Получение внешних данных
export async function GET(request: NextRequest) {
  const authResult = requireAuth(request);
  if (authResult.error) {
    return authResult.error;
  }

  const { user } = authResult;
  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get('limit') || '20');
  const userId = searchParams.get('userId');

  try {
    let whereClause: any = {};

    // Если запрашиваются данные конкретного пользователя
    if (userId) {
      whereClause.userId = userId;
    } else {
      // Если не админ/country manager, показываем только свои данные
      if (!['COUNTRY_MANAGER', 'ADMIN'].includes(user.role)) {
        whereClause.userId = user.userId;
      }
    }

    const externalData = await prisma.externalData.findMany({
      where: whereClause,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            city: true,
            role: true,
          }
        }
      },
      orderBy: {
        reportDate: 'desc'
      },
      take: limit
    });

    return NextResponse.json({
      data: externalData,
      total: externalData.length,
    });

  } catch (error) {
    console.error('Error fetching external data:', error);
    return NextResponse.json(
      { message: 'Ошибка получения данных' },
      { status: 500 }
    );
  }
}

// Создание/обновление внешних данных
export async function POST(request: NextRequest) {
  const authResult = requireAuth(request);
  if (authResult.error) {
    return authResult.error;
  }

  const { user } = authResult;

  try {
    const body = await request.json();
    const {
      trengoMessages,
      trengoTicketsResolved,
      crmTicketsResolved,
      crmOrdersLocal,
      badRatingsCount,
      subscriptionCancellations,
      averageRating,
      cleanersLeft,
      cleanersNew,
      countryTotalOrders,
      countryBadRatings,
      countryCancellations,
      countryAvgRating,
      countryCleanersLeft,
      countryCleanersNew,
      reportDate,
      notes,
    } = body;

    if (!reportDate || trengoMessages === undefined || trengoTicketsResolved === undefined || 
        crmTicketsResolved === undefined || crmOrdersLocal === undefined) {
      return NextResponse.json(
        { message: 'Все основные поля обязательны' },
        { status: 400 }
      );
    }

    // Проверяем права на ввод данных по стране
    if ((countryTotalOrders !== undefined || countryBadRatings !== undefined || 
         countryCancellations !== undefined || countryAvgRating !== undefined ||
         countryCleanersLeft !== undefined || countryCleanersNew !== undefined) && 
        !['COUNTRY_MANAGER', 'ADMIN'].includes(user.role)) {
      return NextResponse.json(
        { message: 'Недостаточно прав для ввода данных по стране' },
        { status: 403 }
      );
    }

    const reportDateObj = new Date(reportDate);

    // Проверяем, есть ли уже запись за эту дату
    const existingRecord = await prisma.externalData.findFirst({
      where: {
        userId: user.userId,
        reportDate: reportDateObj,
      }
    });

    let savedData;

    if (existingRecord) {
      // Обновляем существующую запись
      savedData = await prisma.externalData.update({
        where: { id: existingRecord.id },
        data: {
          trengoMessages: parseInt(trengoMessages),
          trengoTicketsResolved: parseInt(trengoTicketsResolved),
          crmTicketsResolved: parseInt(crmTicketsResolved),
          crmOrdersLocal: parseInt(crmOrdersLocal),
          badRatingsCount: badRatingsCount !== undefined ? parseInt(badRatingsCount) : null,
          subscriptionCancellations: subscriptionCancellations !== undefined ? parseInt(subscriptionCancellations) : null,
          averageRating: averageRating !== undefined ? parseFloat(averageRating) : null,
          cleanersLeft: cleanersLeft !== undefined ? parseInt(cleanersLeft) : null,
          cleanersNew: cleanersNew !== undefined ? parseInt(cleanersNew) : null,
          countryTotalOrders: countryTotalOrders !== undefined ? parseInt(countryTotalOrders) : null,
          countryBadRatings: countryBadRatings !== undefined ? parseInt(countryBadRatings) : null,
          countryCancellations: countryCancellations !== undefined ? parseInt(countryCancellations) : null,
          countryAvgRating: countryAvgRating !== undefined ? parseFloat(countryAvgRating) : null,
          countryCleanersLeft: countryCleanersLeft !== undefined ? parseInt(countryCleanersLeft) : null,
          countryCleanersNew: countryCleanersNew !== undefined ? parseInt(countryCleanersNew) : null,
          notes: notes || null,
          updatedAt: new Date(),
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              city: true,
              role: true,
            }
          }
        }
      });
    } else {
      // Создаем новую запись
      savedData = await prisma.externalData.create({
        data: {
          userId: user.userId,
          trengoMessages: parseInt(trengoMessages),
          trengoTicketsResolved: parseInt(trengoTicketsResolved),
          crmTicketsResolved: parseInt(crmTicketsResolved),
          crmOrdersLocal: parseInt(crmOrdersLocal),
          badRatingsCount: badRatingsCount !== undefined ? parseInt(badRatingsCount) : null,
          subscriptionCancellations: subscriptionCancellations !== undefined ? parseInt(subscriptionCancellations) : null,
          averageRating: averageRating !== undefined ? parseFloat(averageRating) : null,
          cleanersLeft: cleanersLeft !== undefined ? parseInt(cleanersLeft) : null,
          cleanersNew: cleanersNew !== undefined ? parseInt(cleanersNew) : null,
          countryTotalOrders: countryTotalOrders !== undefined ? parseInt(countryTotalOrders) : null,
          countryBadRatings: countryBadRatings !== undefined ? parseInt(countryBadRatings) : null,
          countryCancellations: countryCancellations !== undefined ? parseInt(countryCancellations) : null,
          countryAvgRating: countryAvgRating !== undefined ? parseFloat(countryAvgRating) : null,
          countryCleanersLeft: countryCleanersLeft !== undefined ? parseInt(countryCleanersLeft) : null,
          countryCleanersNew: countryCleanersNew !== undefined ? parseInt(countryCleanersNew) : null,
          reportDate: reportDateObj,
          notes: notes || null,
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              city: true,
              role: true,
            }
          }
        }
      });
    }

    return NextResponse.json({
      message: existingRecord ? 'Данные обновлены' : 'Данные сохранены',
      data: savedData,
    });

  } catch (error) {
    console.error('Error saving external data:', error);
    return NextResponse.json(
      { message: 'Ошибка сохранения данных', error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
