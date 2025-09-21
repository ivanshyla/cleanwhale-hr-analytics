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

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret') as any;
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

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret') as any;
    const userId = decoded.userId;

    // Получаем данные из тела запроса
    const body = await request.json();
    const { weekIso, role, payload } = body;

    if (!weekIso || !role || !payload) {
      return NextResponse.json(
        { message: 'Отсутствуют обязательные поля: weekIso, role, payload' },
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

    // Используем транзакцию для атомарного создания/обновления
    const result = await prisma.$transaction(async (tx) => {
      // Создаем или обновляем базовый отчет
      const weeklyReport = await tx.weeklyReport.upsert({
        where: {
          userId_weekIso: {
            userId,
            weekIso
          }
        },
        update: {
          workdays: payload.workdays || 0,
          stressLevel: payload.stressLevel || 0,
          overtime: payload.overtime || false,
          overtimeHours: payload.overtimeHours || null,
          nextWeekSchedule: payload.nextWeekSchedule || null,
          goodWorkWith: payload.goodWorkWith || null,
          badWorkWith: payload.badWorkWith || null,
          teamComment: payload.teamComment || null,
          notes: payload.notes || null,
          isCompleted: payload.isCompleted || false,
          submittedAt: payload.isCompleted ? new Date() : null,
          updatedAt: new Date()
        },
        create: {
          userId,
          weekIso,
          weekStartDate,
          weekEndDate,
          workdays: payload.workdays || 0,
          stressLevel: payload.stressLevel || 0,
          overtime: payload.overtime || false,
          overtimeHours: payload.overtimeHours || null,
          nextWeekSchedule: payload.nextWeekSchedule || null,
          goodWorkWith: payload.goodWorkWith || null,
          badWorkWith: payload.badWorkWith || null,
          teamComment: payload.teamComment || null,
          notes: payload.notes || null,
          isCompleted: payload.isCompleted || false,
          submittedAt: payload.isCompleted ? new Date() : null
        }
      });

      // Создаем или обновляем метрики в зависимости от роли
      if (role === 'hr') {
        const hrMetrics = await tx.hrMetrics.upsert({
          where: {
            userId_weekIso: {
              userId,
              weekIso
            }
          },
          update: {
            interviews: payload.interviews || 0,
            jobPosts: payload.jobPosts || 0,
            registrations: payload.registrations || 0,
            difficultCases: payload.difficultCases || null,
            updatedAt: new Date()
          },
          create: {
            userId,
            reportId: weeklyReport.id,
            weekIso,
            interviews: payload.interviews || 0,
            jobPosts: payload.jobPosts || 0,
            registrations: payload.registrations || 0,
            difficultCases: payload.difficultCases || null
          }
        });
        return { weeklyReport, hrMetrics };
      }

      if (role === 'ops') {
        const opsMetrics = await tx.opsMetrics.upsert({
          where: {
            userId_weekIso: {
              userId,
              weekIso
            }
          },
          update: {
            trengoMessages: payload.trengoMessages || 0,
            trengoTicketsResolved: payload.trengoTicketsResolved || 0,
            crmTicketsResolved: payload.crmTicketsResolved || 0,
            crmOrdersCity: payload.crmOrdersCity || 0,
            difficultCleanerCases: payload.difficultCleanerCases || null,
            difficultClientCases: payload.difficultClientCases || null,
            updatedAt: new Date()
          },
          create: {
            userId,
            reportId: weeklyReport.id,
            weekIso,
            trengoMessages: payload.trengoMessages || 0,
            trengoTicketsResolved: payload.trengoTicketsResolved || 0,
            crmTicketsResolved: payload.crmTicketsResolved || 0,
            crmOrdersCity: payload.crmOrdersCity || 0,
            difficultCleanerCases: payload.difficultCleanerCases || null,
            difficultClientCases: payload.difficultClientCases || null
          }
        });
        return { weeklyReport, opsMetrics };
      }

      return { weeklyReport };
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