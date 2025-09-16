import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/auth';
import { getWeekDates } from '@/types';

// GET - получить агрегированные данные по стране
export async function GET(request: NextRequest) {
  const authResult = requireRole(['COUNTRY_MANAGER', 'ADMIN'])(request);
  if (authResult.error) return authResult.error;

  const { searchParams } = new URL(request.url);
  const weekIso = searchParams.get('weekIso');

  try {
    const where: any = {};
    if (weekIso) {
      where.weekIso = weekIso;
    }

    const aggregates = await prisma.countryAggregates.findMany({
      where,
      include: {
        manager: {
          select: {
            id: true,
            name: true,
            login: true,
            role: true,
          },
        },
      },
      orderBy: {
        weekStartDate: 'desc',
      },
    });

    return NextResponse.json(aggregates);
  } catch (error) {
    console.error('Error fetching country aggregates:', error);
    return NextResponse.json(
      { message: 'Ошибка при получении данных по стране' },
      { status: 500 }
    );
  }
}

// POST - создать агрегированные данные по стране
export async function POST(request: NextRequest) {
  const authResult = requireRole(['COUNTRY_MANAGER', 'ADMIN'])(request);
  if (authResult.error) return authResult.error;

  try {
    const data = await request.json();
    const {
      weekIso,
      trengoByPeople,
      trengoByCity,
      crmByPeople,
      crmByCity,
      hiresByCity,
      ordersByCity,
      adjustments,
      comments,
    } = data;

    // Получаем даты недели
    const weekDates = getWeekDates(weekIso);

    // Проверяем, есть ли уже данные за эту неделю от этого менеджера
    const existing = await prisma.countryAggregates.findUnique({
      where: {
        managerId_weekIso: {
          managerId: authResult.user.userId,
          weekIso,
        },
      },
    });

    if (existing) {
      return NextResponse.json(
        { message: 'Данные за эту неделю уже существуют' },
        { status: 400 }
      );
    }

    const aggregate = await prisma.countryAggregates.create({
      data: {
        managerId: authResult.user.userId,
        weekIso,
        weekStartDate: weekDates.start,
        weekEndDate: weekDates.end,
        trengoByPeople,
        trengoByCity,
        crmByPeople,
        crmByCity,
        hiresByCity,
        ordersByCity,
        adjustments,
        comments,
      },
    });

    return NextResponse.json(aggregate, { status: 201 });
  } catch (error) {
    console.error('Error creating country aggregates:', error);
    return NextResponse.json(
      { message: 'Ошибка при создании данных по стране' },
      { status: 500 }
    );
  }
}
