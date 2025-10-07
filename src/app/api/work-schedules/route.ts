export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { hasPermission, Permission } from '@/lib/permissions';

function getWeekRangeFromMonday(weekStartStr: string): { weekStartDate: Date; weekEndDate: Date } {
  const weekStartDate = new Date(weekStartStr);
  weekStartDate.setHours(0, 0, 0, 0);
  const weekEndDate = new Date(weekStartDate);
  weekEndDate.setDate(weekStartDate.getDate() + 6);
  weekEndDate.setHours(23, 59, 59, 999);
  return { weekStartDate, weekEndDate };
}

export async function POST(request: NextRequest) {
  const authResult = requireAuth(request);
  if (authResult.error) return authResult.error;
  const { user } = authResult;

  try {
    const body = await request.json();
    const {
      weekStartDate,
      mondayStart, mondayEnd, mondayNote,
      tuesdayStart, tuesdayEnd, tuesdayNote,
      wednesdayStart, wednesdayEnd, wednesdayNote,
      thursdayStart, thursdayEnd, thursdayNote,
      fridayStart, fridayEnd, fridayNote,
      saturdayStart, saturdayEnd, saturdayNote,
      sundayStart, sundayEnd, sundayNote,
      weeklyNotes,
      isFlexible,
    } = body || {};

    if (!weekStartDate) {
      return NextResponse.json({ message: 'weekStartDate обязателен (YYYY-MM-DD)' }, { status: 400 });
    }

    const { weekStartDate: weekStart, weekEndDate } = getWeekRangeFromMonday(weekStartDate);

    const schedule = await prisma.workSchedule.upsert({
      where: { userId_weekStartDate: { userId: user.userId, weekStartDate: weekStart } },
      update: {
        mondayStart: mondayStart || null,
        mondayEnd: mondayEnd || null,
        mondayNote: mondayNote || null,
        tuesdayStart: tuesdayStart || null,
        tuesdayEnd: tuesdayEnd || null,
        tuesdayNote: tuesdayNote || null,
        wednesdayStart: wednesdayStart || null,
        wednesdayEnd: wednesdayEnd || null,
        wednesdayNote: wednesdayNote || null,
        thursdayStart: thursdayStart || null,
        thursdayEnd: thursdayEnd || null,
        thursdayNote: thursdayNote || null,
        fridayStart: fridayStart || null,
        fridayEnd: fridayEnd || null,
        fridayNote: fridayNote || null,
        saturdayStart: saturdayStart || null,
        saturdayEnd: saturdayEnd || null,
        saturdayNote: saturdayNote || null,
        sundayStart: sundayStart || null,
        sundayEnd: sundayEnd || null,
        sundayNote: sundayNote || null,
        weeklyNotes: weeklyNotes || null,
        isFlexible: Boolean(isFlexible),
        weekEndDate,
        updatedAt: new Date(),
      },
      create: {
        userId: user.userId,
        weekStartDate: weekStart,
        weekEndDate,
        mondayStart: mondayStart || null,
        mondayEnd: mondayEnd || null,
        mondayNote: mondayNote || null,
        tuesdayStart: tuesdayStart || null,
        tuesdayEnd: tuesdayEnd || null,
        tuesdayNote: tuesdayNote || null,
        wednesdayStart: wednesdayStart || null,
        wednesdayEnd: wednesdayEnd || null,
        wednesdayNote: wednesdayNote || null,
        thursdayStart: thursdayStart || null,
        thursdayEnd: thursdayEnd || null,
        thursdayNote: thursdayNote || null,
        fridayStart: fridayStart || null,
        fridayEnd: fridayEnd || null,
        fridayNote: fridayNote || null,
        saturdayStart: saturdayStart || null,
        saturdayEnd: saturdayEnd || null,
        saturdayNote: saturdayNote || null,
        sundayStart: sundayStart || null,
        sundayEnd: sundayEnd || null,
        sundayNote: sundayNote || null,
        weeklyNotes: weeklyNotes || null,
        isFlexible: Boolean(isFlexible),
      }
    });

    return NextResponse.json({ message: 'График сохранен', schedule });
  } catch (error) {
    console.error('work-schedules POST error:', error);
    console.error('Error details:', {
      error: error instanceof Error ? error.message : error,
      stack: error instanceof Error ? error.stack : undefined,
      userId: user.userId,
    });
    return NextResponse.json({ 
      message: 'Внутренняя ошибка сервера',
      error: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.message : String(error)) : undefined
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const authResult = requireAuth(request);
  if (authResult.error) return authResult.error;
  const { user } = authResult;

  try {
    const { searchParams } = new URL(request.url);
    const forUserId = searchParams.get('user_id') || undefined;
    const includeAll = searchParams.get('include_all') === 'true';
    const since = searchParams.get('since') || undefined;
    const until = searchParams.get('until') || undefined;

    let where: any = {};

    if (includeAll) {
      if (!hasPermission(user, Permission.VIEW_ALL_USERS_DATA) && !hasPermission(user, Permission.VIEW_CITY_DATA)) {
        return NextResponse.json({ message: 'Недостаточно прав' }, { status: 403 });
      }
      // Country manager: all; City-level roles: only same city
      if (hasPermission(user, Permission.VIEW_ALL_USERS_DATA)) {
        // no constraints
      } else {
        where.user = { city: user.city as any };
      }
    } else if (forUserId) {
      // view specific user's schedule if allowed
      if (forUserId !== user.userId && !hasPermission(user, Permission.VIEW_ALL_USERS_DATA)) {
        return NextResponse.json({ message: 'Недостаточно прав' }, { status: 403 });
      }
      where.userId = forUserId;
    } else {
      where.userId = user.userId;
    }

    if (since || until) {
      where.weekStartDate = {} as any;
      if (since) (where.weekStartDate as any).gte = new Date(since);
      if (until) (where.weekStartDate as any).lte = new Date(until);
    }

    const schedules = await prisma.workSchedule.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, email: true, city: true, role: true } }
      },
      orderBy: [{ weekStartDate: 'desc' }],
    });

    return NextResponse.json({ schedules, total: schedules.length });
  } catch (error) {
    console.error('work-schedules GET error:', error);
    return NextResponse.json({ message: 'Внутренняя ошибка сервера' }, { status: 500 });
  }
}
