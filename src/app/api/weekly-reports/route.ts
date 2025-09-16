import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { getWeekISO, getWeekDates } from '@/types';

// GET - получить еженедельные отчеты
export async function GET(request: NextRequest) {
  const authResult = requireAuth(request);
  if (authResult.error) return authResult.error;

  const { searchParams } = new URL(request.url);
  const weekIso = searchParams.get('weekIso');
  const userId = searchParams.get('userId') || authResult.user.userId;

  try {
    const where: any = { userId };
    if (weekIso) {
      where.weekIso = weekIso;
    }

    const reports = await prisma.weeklyReport.findMany({
      where,
      include: {
        hrMetrics: true,
        opsMetrics: true,
        user: {
          select: {
            id: true,
            name: true,
            login: true,
            role: true,
            city: true,
          },
        },
      },
      orderBy: {
        weekStartDate: 'desc',
      },
    });

    return NextResponse.json(reports);
  } catch (error) {
    console.error('Error fetching weekly reports:', error);
    return NextResponse.json(
      { message: 'Ошибка при получении отчетов' },
      { status: 500 }
    );
  }
}

// POST - создать еженедельный отчет
export async function POST(request: NextRequest) {
  const authResult = requireAuth(request);
  if (authResult.error) return authResult.error;

  try {
    const data = await request.json();
    const {
      weekIso,
      workdays,
      stressLevel,
      overtime,
      overtimeHours,
      nextWeekSchedule,
      goodWorkWith,
      badWorkWith,
      teamComment,
      notes,
      hrMetrics,
      opsMetrics,
    } = data;

    // Получаем даты недели
    const weekDates = getWeekDates(weekIso);

    // Проверяем, есть ли уже отчет за эту неделю
    const existingReport = await prisma.weeklyReport.findUnique({
      where: {
        userId_weekIso: {
          userId: authResult.user.userId,
          weekIso,
        },
      },
    });

    if (existingReport) {
      return NextResponse.json(
        { message: 'Отчет за эту неделю уже существует' },
        { status: 400 }
      );
    }

    // Создаем отчет в транзакции
    const result = await prisma.$transaction(async (tx) => {
      // Создаем основной отчет
      const report = await tx.weeklyReport.create({
        data: {
          userId: authResult.user.userId,
          weekIso,
          weekStartDate: weekDates.start,
          weekEndDate: weekDates.end,
          workdays: workdays || 0,
          stressLevel: stressLevel || 0,
          overtime: overtime || false,
          overtimeHours,
          nextWeekSchedule,
          goodWorkWith,
          badWorkWith,
          teamComment,
          notes,
          isCompleted: false,
        },
      });

      // Создаем HR метрики, если пользователь HR или MIXED
      if ((authResult.user.role === 'HR' || authResult.user.role === 'MIXED') && hrMetrics) {
        await tx.hrMetrics.create({
          data: {
            userId: authResult.user.userId,
            reportId: report.id,
            interviews: hrMetrics.interviews || 0,
            jobPosts: hrMetrics.jobPosts || 0,
            registrations: hrMetrics.registrations || 0,
            difficultCases: hrMetrics.difficultCases,
          },
        });
      }

      // Создаем операционные метрики, если пользователь OPERATIONS или MIXED
      if ((authResult.user.role === 'OPERATIONS' || authResult.user.role === 'MIXED') && opsMetrics) {
        await tx.opsMetrics.create({
          data: {
            userId: authResult.user.userId,
            reportId: report.id,
            trengoMessages: opsMetrics.trengoMessages || 0,
            trengoTicketsResolved: opsMetrics.trengoTicketsResolved || 0,
            crmTicketsResolved: opsMetrics.crmTicketsResolved || 0,
            crmOrdersCity: opsMetrics.crmOrdersCity || 0,
            difficultCleanerCases: opsMetrics.difficultCleanerCases,
            difficultClientCases: opsMetrics.difficultClientCases,
          },
        });
      }

      return report;
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error('Error creating weekly report:', error);
    return NextResponse.json(
      { message: 'Ошибка при создании отчета' },
      { status: 500 }
    );
  }
}
