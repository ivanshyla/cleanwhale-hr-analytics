export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { prisma } from '@/lib/prisma';
import { isoWeekOf, getWeekDates } from '@/lib/week';

// GET /api/weekly-reports?week=2025-W03&role=hr|ops
export async function GET(request: NextRequest) {
  try {
    // Проверяем токен
    const token = request.cookies.get('token')?.value;
    if (!token) {
      return NextResponse.json({ message: 'Не авторизован' }, { status: 401 });
    }

    const { getJwtSecret } = require('@/lib/env');
    const decoded = jwt.verify(token, getJwtSecret()) as any;
    const userId = decoded.userId;

    // Получаем параметры
    const { searchParams } = new URL(request.url);
    const weekIso = searchParams.get('week') || isoWeekOf(); // По умолчанию текущая неделя
    const role = searchParams.get('role') as 'hr' | 'ops' | null;

    // Получаем данные пользователя для проверки роли
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true, name: true, city: true }
    });

    if (!user) {
      return NextResponse.json({ message: 'Пользователь не найден' }, { status: 404 });
    }

    // Проверяем доступ к запрашиваемой роли
    const userRole = user.role;
    if (role === 'hr' && !['HIRING_MANAGER', 'MIXED_MANAGER'].includes(userRole)) {
      return NextResponse.json({ message: 'Нет доступа к HR метрикам' }, { status: 403 });
    }
    if (role === 'ops' && !['OPS_MANAGER', 'MIXED_MANAGER'].includes(userRole)) {
      return NextResponse.json({ message: 'Нет доступа к Operations метрикам' }, { status: 403 });
    }

    // Ищем существующий отчет
    const weeklyReport = await prisma.weeklyReport.findUnique({
      where: {
        userId_weekIso: {
          userId,
          weekIso
        }
      },
      include: {
        hrMetrics: true,
        opsMetrics: true
      }
    });

    // Если запрашивается конкретная роль, возвращаем только её данные
    if (role === 'hr') {
      return NextResponse.json({
        weekIso,
        role: 'hr',
        data: weeklyReport?.hrMetrics || null,
        reportExists: !!weeklyReport
      });
    }

    if (role === 'ops') {
      return NextResponse.json({
        weekIso,
        role: 'ops', 
        data: weeklyReport?.opsMetrics || null,
        reportExists: !!weeklyReport
      });
    }

    // Если роль не указана, возвращаем все доступные данные
    const response: any = {
      weekIso,
      reportExists: !!weeklyReport,
      baseReport: weeklyReport ? {
        workdays: weeklyReport.workdays,
        stressLevel: weeklyReport.stressLevel,
        overtime: weeklyReport.overtime,
        overtimeHours: weeklyReport.overtimeHours,
        nextWeekSchedule: weeklyReport.nextWeekSchedule,
        goodWorkWith: weeklyReport.goodWorkWith,
        badWorkWith: weeklyReport.badWorkWith,
        teamComment: weeklyReport.teamComment,
        notes: weeklyReport.notes,
        isCompleted: weeklyReport.isCompleted
      } : null
    };

    // Добавляем HR данные если есть доступ
    if (['HIRING_MANAGER', 'MIXED_MANAGER'].includes(userRole)) {
      response.hrData = weeklyReport?.hrMetrics || null;
    }

    // Добавляем Ops данные если есть доступ
    if (['OPS_MANAGER', 'MIXED_MANAGER'].includes(userRole)) {
      response.opsData = weeklyReport?.opsMetrics || null;
    }

    return NextResponse.json(response);

  } catch (error) {
    console.error('Error fetching weekly report:', error);
    return NextResponse.json(
      { message: 'Ошибка получения отчета' },
      { status: 500 }
    );
  }
}

// POST /api/weekly-reports
export async function POST(request: NextRequest) {
  try {
    // Проверяем токен
    const token = request.cookies.get('token')?.value;
    if (!token) {
      return NextResponse.json({ message: 'Не авторизован' }, { status: 401 });
    }

    const { getJwtSecret } = require('@/lib/env');
    const decoded = jwt.verify(token, getJwtSecret()) as any;
    const userId = decoded.userId;

    // Получаем данные из тела запроса согласно новому контракту
    const body = await request.json();
    const { weekIso, role, hr, ops, base } = body;

    if (!weekIso || !role) {
      return NextResponse.json(
        { message: 'Отсутствуют обязательные поля: weekIso, role' },
        { status: 400 }
      );
    }

    if (role === 'hr' && !hr) {
      return NextResponse.json(
        { message: 'Для роли hr требуются данные в поле hr' },
        { status: 400 }
      );
    }

    if (role === 'ops' && !ops) {
      return NextResponse.json(
        { message: 'Для роли ops требуются данные в поле ops' },
        { status: 400 }
      );
    }

    if (role === 'mixed' && (!hr && !ops)) {
      return NextResponse.json(
        { message: 'Для роли mixed требуются данные в полях hr или ops' },
        { status: 400 }
      );
    }

    // Проверяем пользователя
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true, name: true, city: true }
    });

    if (!user) {
      return NextResponse.json({ message: 'Пользователь не найден' }, { status: 404 });
    }

    // Проверяем доступ к запрашиваемой роли
    const userRole = user.role;
    if (role === 'hr' && !['HIRING_MANAGER', 'MIXED_MANAGER'].includes(userRole)) {
      return NextResponse.json({ message: 'Нет доступа к HR метрикам' }, { status: 403 });
    }
    if (role === 'ops' && !['OPS_MANAGER', 'MIXED_MANAGER'].includes(userRole)) {
      return NextResponse.json({ message: 'Нет доступа к Operations метрикам' }, { status: 403 });
    }

    // Получаем даты недели
    const { start: weekStartDate, end: weekEndDate } = getWeekDates(weekIso);

    // Используем транзакцию для атомарного создания/обновления (новая структура)
    const result = await prisma.$transaction(async (tx) => {
      // Создаем или обновляем базовый отчет (минимальные данные)
      const weeklyReport = await tx.weeklyReport.upsert({
        where: {
          userId_weekIso: { userId, weekIso }
        },
        update: {
          workdays: base?.workdays !== undefined ? base.workdays : undefined,
          stressLevel: base?.stressLevel !== undefined ? base.stressLevel : undefined,
          overtime: base?.overtime !== undefined ? base.overtime : undefined,
          overtimeHours: base?.overtimeHours !== undefined ? base.overtimeHours : undefined,
          notes: base?.notes !== undefined ? (base.notes || null) : undefined,
          teamComment: base?.teamComment !== undefined ? (base.teamComment || null) : undefined,
          isCompleted: true, // Отмечаем отчет как завершенный
          updatedAt: new Date()
        },
        create: {
          userId,
          weekIso,
          weekStartDate,
          weekEndDate,
          workdays: base?.workdays || 0,
          stressLevel: base?.stressLevel || 0,
          overtime: base?.overtime || false,
          overtimeHours: base?.overtimeHours || 0,
          notes: base?.notes || null,
          teamComment: base?.teamComment || null,
          isCompleted: true // Отмечаем отчет как завершенный
        }
      });

      let hrMetrics = null;
      let opsMetrics = null;

      // Обновляем HR метрики если переданы HR данные
      if ((role === 'hr' || role === 'mixed') && hr) {
        hrMetrics = await tx.hrMetrics.upsert({
          where: {
            userId_weekIso: { userId, weekIso }
          },
          update: {
            interviews: hr.interviews !== undefined ? hr.interviews : undefined,
            jobPosts: hr.jobPosts !== undefined ? hr.jobPosts : undefined,
            registrations: hr.registered !== undefined ? hr.registered : undefined,
            fullDays: hr.fullDays !== undefined ? hr.fullDays : undefined,
            difficultCases: hr.difficult !== undefined ? (hr.difficult || null) : undefined, // mapping
            stress: hr.stress !== undefined ? hr.stress : undefined,
            overtime: hr.overtime !== undefined ? hr.overtime : undefined,
            updatedAt: new Date()
          },
          create: {
            userId,
            reportId: weeklyReport.id,
            weekIso,
            interviews: hr.interviews || 0,
            jobPosts: hr.jobPosts || 0,
            registrations: hr.registered || 0,
            fullDays: hr.fullDays || 0,
            difficultCases: hr.difficult || null,
            stress: hr.stress || null,
            overtime: hr.overtime || false
          }
        });
      }

      // Обновляем Ops метрики если переданы Ops данные
      if ((role === 'ops' || role === 'mixed') && ops) {
        opsMetrics = await tx.opsMetrics.upsert({
          where: {
            userId_weekIso: { userId, weekIso }
          },
          update: {
            messages: ops.messages !== undefined ? ops.messages : undefined,
            orders: ops.orders !== undefined ? ops.orders : undefined,
            fullDays: base?.workdays !== undefined ? base.workdays : undefined,
            diffCleaners: ops.diffCleaners !== undefined ? (ops.diffCleaners || null) : undefined,
            diffClients: ops.diffClients !== undefined ? (ops.diffClients || null) : undefined,
            stress: ops.stress !== undefined ? ops.stress : undefined,
            overtime: ops.overtime !== undefined ? ops.overtime : undefined,
            updatedAt: new Date()
          },
          create: {
            userId,
            reportId: weeklyReport.id,
            weekIso,
            messages: ops.messages || 0,
            orders: ops.orders || 0,
            fullDays: base?.workdays || 0,
            diffCleaners: ops.diffCleaners || null,
            diffClients: ops.diffClients || null,
            stress: ops.stress || null,
            overtime: ops.overtime || false
          }
        });
      }

      return { weeklyReport, hrMetrics, opsMetrics };
    });

    return NextResponse.json({
      message: 'Отчет сохранен',
      weekIso,
      role,
      data: result
    });

  } catch (error) {
    console.error('Error saving weekly report:', error);
    return NextResponse.json(
      { message: 'Ошибка сохранения отчета' },
      { status: 500 }
    );
  }
}