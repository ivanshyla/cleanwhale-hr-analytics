import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { hasPermission, Permission } from '@/lib/permissions';

function getWeekBounds(reportDateStr: string): { reportDate: Date; weekStartDate: Date; weekEndDate: Date } {
  const reportDate = new Date(reportDateStr);
  const day = reportDate.getDay();
  const diffToMonday = (day === 0 ? -6 : 1) - day; // Monday as start of week
  const weekStartDate = new Date(reportDate);
  weekStartDate.setDate(reportDate.getDate() + diffToMonday);
  weekStartDate.setHours(0, 0, 0, 0);
  const weekEndDate = new Date(weekStartDate);
  weekEndDate.setDate(weekStartDate.getDate() + 6);
  weekEndDate.setHours(23, 59, 59, 999);
  return { reportDate, weekStartDate, weekEndDate };
}

export async function POST(request: NextRequest) {
  const authResult = requireAuth(request);
  if (authResult.error) return authResult.error;
  const { user } = authResult;

  if (!hasPermission(user, Permission.CREATE_COUNTRY_REPORTS)) {
    return NextResponse.json({ message: 'Недостаточно прав' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const {
      targetManagerId,
      reportDate,
      orders,
      messages,
      ticketsResolved,
      complaints,
      complaintsResolved,
      notes,
    } = body || {};

    if (!targetManagerId || !reportDate) {
      return NextResponse.json({ message: 'targetManagerId и reportDate обязательны' }, { status: 400 });
    }

    const targetUser = await prisma.user.findUnique({ where: { id: targetManagerId } });
    if (!targetUser) {
      return NextResponse.json({ message: 'Пользователь не найден' }, { status: 404 });
    }

    const { reportDate: reportAt, weekStartDate, weekEndDate } = getWeekBounds(reportDate);

    const saved = await prisma.managerWeeklyStat.upsert({
      where: { targetManagerId_reportDate: { targetManagerId, reportDate: reportAt } },
      update: {
        createdById: user.userId,
        weekStartDate,
        weekEndDate,
        orders: orders ?? null,
        messages: messages ?? null,
        ticketsResolved: ticketsResolved ?? null,
        complaints: complaints ?? null,
        complaintsResolved: complaintsResolved ?? null,
        notes: notes ?? null,
        updatedAt: new Date(),
      },
      create: {
        createdById: user.userId,
        targetManagerId,
        reportDate: reportAt,
        weekStartDate,
        weekEndDate,
        orders: orders ?? null,
        messages: messages ?? null,
        ticketsResolved: ticketsResolved ?? null,
        complaints: complaints ?? null,
        complaintsResolved: complaintsResolved ?? null,
        notes: notes ?? null,
      },
      include: {
        targetManager: { select: { id: true, name: true, email: true, city: true, role: true } },
        createdBy: { select: { id: true, name: true, email: true } },
      },
    });

    return NextResponse.json({ message: 'Сохранено', stat: saved });
  } catch (error) {
    console.error('manager-stats POST error:', error);
    return NextResponse.json({ message: 'Внутренняя ошибка сервера' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const authResult = requireAuth(request);
  if (authResult.error) return authResult.error;
  const { user } = authResult;

  // Просмотр доступен директору по стране и администратору
  if (!hasPermission(user, Permission.VIEW_ALL_USERS_DATA)) {
    return NextResponse.json({ message: 'Недостаточно прав' }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const targetManagerId = searchParams.get('target_manager_id') || undefined;
    const since = searchParams.get('since') || undefined;
    const until = searchParams.get('until') || undefined;

    const where: any = {};
    if (targetManagerId) where.targetManagerId = targetManagerId;
    if (since || until) {
      where.reportDate = {} as any;
      if (since) (where.reportDate as any).gte = new Date(since);
      if (until) (where.reportDate as any).lte = new Date(until);
    }

    const stats = await prisma.managerWeeklyStat.findMany({
      where,
      include: {
        targetManager: { select: { id: true, name: true, email: true, city: true, role: true } },
        createdBy: { select: { id: true, name: true, email: true } },
      },
      orderBy: { reportDate: 'desc' },
    });

    return NextResponse.json({ stats, total: stats.length });
  } catch (error) {
    console.error('manager-stats GET error:', error);
    return NextResponse.json({ message: 'Внутренняя ошибка сервера' }, { status: 500 });
  }
}
