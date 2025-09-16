import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { hasPermission, Permission } from '@/lib/permissions';

function parseDuration(start: string, end: string): number | null {
  if (!start || !end) return null;
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  if (Number.isNaN(sh) || Number.isNaN(sm) || Number.isNaN(eh) || Number.isNaN(em)) return null;
  const minutes = (eh * 60 + em) - (sh * 60 + sm);
  return minutes > 0 ? Math.round((minutes / 60) * 100) / 100 : null;
}

export async function POST(request: NextRequest) {
  const authResult = requireAuth(request);
  if (authResult.error) return authResult.error;
  const { user } = authResult;

  try {
    const body = await request.json();
    const {
      meetingDate,
      startTime,
      endTime,
      meetingType,
      topic,
      participants, // string[] or comma-separated
      location,
      outcome,
      nextSteps,
      rating,
    } = body || {};

    if (!meetingDate || !startTime || !endTime || !meetingType || !topic) {
      return NextResponse.json({ message: 'meetingDate, startTime, endTime, meetingType, topic обязательны' }, { status: 400 });
    }

    const duration = parseDuration(startTime, endTime);
    const pStr = Array.isArray(participants) ? JSON.stringify(participants) : (participants || '[]');

    const dateObj = new Date(meetingDate);
    const day = dateObj.getDay();
    const diffToMonday = (day === 0 ? -6 : 1) - day;
    const weekStartDate = new Date(dateObj);
    weekStartDate.setDate(dateObj.getDate() + diffToMonday);
    weekStartDate.setHours(0,0,0,0);

    const saved = await prisma.teamMeeting.create({
      data: {
        userId: user.userId,
        meetingDate: dateObj,
        startTime,
        endTime,
        duration: duration ?? undefined as any,
        meetingType,
        topic,
        participants: pStr,
        location: location ?? null,
        outcome: outcome ?? null,
        nextSteps: nextSteps ?? null,
        rating: rating ?? null,
        weekStartDate,
        reportDate: new Date(weekStartDate),
      }
    });

    return NextResponse.json({ message: 'Встреча сохранена', meeting: saved });
  } catch (error) {
    console.error('team-meetings POST error:', error);
    return NextResponse.json({ message: 'Внутренняя ошибка сервера' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const authResult = requireAuth(request);
  if (authResult.error) return authResult.error;
  const { user } = authResult;

  try {
    const { searchParams } = new URL(request.url);
    const includeAll = searchParams.get('include_all') === 'true';
    const since = searchParams.get('since') || undefined;
    const until = searchParams.get('until') || undefined;

    let where: any = { userId: user.userId };
    if (includeAll) {
      if (hasPermission(user, Permission.VIEW_ALL_USERS_DATA)) {
        where = {};
      } else if (hasPermission(user, Permission.VIEW_CITY_DATA)) {
        where = { user: { city: user.city as any } };
      }
    }

    if (since || until) {
      where.meetingDate = {} as any;
      if (since) (where.meetingDate as any).gte = new Date(since);
      if (until) (where.meetingDate as any).lte = new Date(until);
    }

    const meetings = await prisma.teamMeeting.findMany({
      where,
      include: { user: { select: { id: true, name: true, email: true, city: true, role: true } } },
      orderBy: { meetingDate: 'desc' },
    });

    return NextResponse.json({ meetings, total: meetings.length });
  } catch (error) {
    console.error('team-meetings GET error:', error);
    return NextResponse.json({ message: 'Внутренняя ошибка сервера' }, { status: 500 });
  }
}
