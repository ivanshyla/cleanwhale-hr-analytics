export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { prisma } from '@/lib/prisma';
import { canAccessCountryFeatures } from '@/lib/permissions';

// GET /api/team-calls/admin?weekIso&cityId
export async function GET(request: NextRequest) {
  try {
    // Проверяем токен
    const token = request.cookies.get('token')?.value;
    if (!token) {
      return NextResponse.json({ message: 'Не авторизован' }, { status: 401 });
    }

    const { getJwtSecret } = require('@/lib/env');
    const decoded = jwt.verify(token, getJwtSecret()) as any;

    // Проверяем доступ к Country Manager функциям
    if (!canAccessCountryFeatures(decoded)) {
      return NextResponse.json({ message: 'Нет доступа к данным звонков' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const weekIso = searchParams.get('weekIso');
    const cityId = searchParams.get('cityId');
    
    if (!weekIso) {
      return NextResponse.json({ message: 'Параметр weekIso обязателен' }, { status: 400 });
    }

    // Строим фильтр для запроса
    const where: any = { weekIso };
    if (cityId) {
      where.cityId = parseInt(cityId);
    }

    const slots = await prisma.teamCallSlot.findMany({
      where,
      include: {
        city: true,
        attendees: {
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
        }
      },
      orderBy: [
        { weekday: 'asc' },
        { startMin: 'asc' }
      ]
    });

    // Формируем ответ в нужном формате
    const formattedSlots = slots.map(slot => ({
      id: slot.id,
      weekIso: slot.weekIso,
      cityId: slot.cityId,
      cityName: slot.city.name,
      team: slot.team,
      weekday: slot.weekday,
      date: slot.date,
      startMin: slot.startMin,
      endMin: slot.endMin,
      title: slot.title,
      linkUrl: slot.linkUrl,
      note: slot.note,
      createdAt: slot.createdAt,
      updatedAt: slot.updatedAt,
      attendees: slot.attendees.map(attendee => attendee.userId)
    }));

    return NextResponse.json({
      slots: formattedSlots,
      total: formattedSlots.length
    });

  } catch (error) {
    console.error('Error fetching team calls:', error);
    return NextResponse.json(
      { message: 'Ошибка получения данных звонков' },
      { status: 500 }
    );
  }
}

// POST /api/team-calls/admin
export async function POST(request: NextRequest) {
  try {
    // Проверяем токен
    const token = request.cookies.get('token')?.value;
    if (!token) {
      return NextResponse.json({ message: 'Не авторизован' }, { status: 401 });
    }

    const { getJwtSecret } = require('@/lib/env');
    const decoded = jwt.verify(token, getJwtSecret()) as any;

    // Проверяем доступ к Country Manager функциям
    if (!canAccessCountryFeatures(decoded)) {
      return NextResponse.json({ message: 'Нет доступа к управлению звонками' }, { status: 403 });
    }

    const body = await request.json();
    const { weekIso, slot } = body;

    if (!weekIso || !slot) {
      return NextResponse.json(
        { message: 'Отсутствуют обязательные поля: weekIso, slot' },
        { status: 400 }
      );
    }

    const {
      id,
      cityId,
      team,
      weekday,
      date,
      startMin,
      endMin,
      title,
      linkUrl,
      note,
      attendeesUserIds
    } = slot;

    if (!cityId || !weekday || !title || startMin === undefined || endMin === undefined) {
      return NextResponse.json(
        { message: 'Отсутствуют обязательные поля слота' },
        { status: 400 }
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      let slotRecord;

      if (id) {
        // Обновляем существующий слот
        slotRecord = await tx.teamCallSlot.update({
          where: { id },
          data: {
            weekIso,
            cityId: parseInt(cityId),
            team: team || null,
            weekday: parseInt(weekday),
            date: new Date(date),
            startMin: parseInt(startMin),
            endMin: parseInt(endMin),
            title,
            linkUrl: linkUrl || null,
            note: note || null,
            updatedAt: new Date()
          }
        });

        // Удаляем все существующие attendees
        await tx.teamCallAttendee.deleteMany({
          where: { slotId: id }
        });
      } else {
        // Создаем новый слот
        slotRecord = await tx.teamCallSlot.create({
          data: {
            weekIso,
            cityId: parseInt(cityId),
            team: team || null,
            weekday: parseInt(weekday),
            date: new Date(date),
            startMin: parseInt(startMin),
            endMin: parseInt(endMin),
            title,
            linkUrl: linkUrl || null,
            note: note || null
          }
        });
      }

      // Добавляем participants если они указаны
      if (attendeesUserIds && Array.isArray(attendeesUserIds) && attendeesUserIds.length > 0) {
        const attendeesData = attendeesUserIds.map((userId: string) => ({
          slotId: slotRecord.id,
          userId
        }));

        await tx.teamCallAttendee.createMany({
          data: attendeesData
        });
      }

      return slotRecord;
    });

    return NextResponse.json({
      message: id ? 'Слот звонка обновлен' : 'Слот звонка создан',
      slot: {
        id: result.id,
        weekIso: result.weekIso,
        cityId: result.cityId,
        team: result.team,
        weekday: result.weekday,
        date: result.date,
        startMin: result.startMin,
        endMin: result.endMin,
        title: result.title,
        linkUrl: result.linkUrl,
        note: result.note
      }
    });

  } catch (error) {
    console.error('Error managing team calls:', error);
    return NextResponse.json(
      { message: 'Ошибка управления звонками' },
      { status: 500 }
    );
  }
}
