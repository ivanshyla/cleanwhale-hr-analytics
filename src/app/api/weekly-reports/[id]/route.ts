import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

// GET - получить конкретный отчет
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authResult = requireAuth(request);
  if (authResult.error) return authResult.error;

  try {
    const report = await prisma.weeklyReport.findUnique({
      where: { id: params.id },
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
    });

    if (!report) {
      return NextResponse.json(
        { message: 'Отчет не найден' },
        { status: 404 }
      );
    }

    // Проверяем права доступа
    if (
      report.userId !== authResult.user.userId &&
      authResult.user.role !== 'ADMIN' &&
      authResult.user.role !== 'COUNTRY_MANAGER'
    ) {
      return NextResponse.json(
        { message: 'Недостаточно прав доступа' },
        { status: 403 }
      );
    }

    return NextResponse.json(report);
  } catch (error) {
    console.error('Error fetching weekly report:', error);
    return NextResponse.json(
      { message: 'Ошибка при получении отчета' },
      { status: 500 }
    );
  }
}

// PUT - обновить отчет
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authResult = requireAuth(request);
  if (authResult.error) return authResult.error;

  try {
    const data = await request.json();
    const {
      workdays,
      stressLevel,
      overtime,
      overtimeHours,
      nextWeekSchedule,
      goodWorkWith,
      badWorkWith,
      teamComment,
      notes,
      isCompleted,
      hrMetrics,
      opsMetrics,
    } = data;

    // Проверяем существование отчета
    const existingReport = await prisma.weeklyReport.findUnique({
      where: { id: params.id },
      include: {
        hrMetrics: true,
        opsMetrics: true,
      },
    });

    if (!existingReport) {
      return NextResponse.json(
        { message: 'Отчет не найден' },
        { status: 404 }
      );
    }

    // Проверяем права доступа
    if (
      existingReport.userId !== authResult.user.userId &&
      authResult.user.role !== 'ADMIN'
    ) {
      return NextResponse.json(
        { message: 'Недостаточно прав доступа' },
        { status: 403 }
      );
    }

    // Обновляем в транзакции
    const result = await prisma.$transaction(async (tx) => {
      // Обновляем основной отчет
      const updatedReport = await tx.weeklyReport.update({
        where: { id: params.id },
        data: {
          workdays: workdays ?? existingReport.workdays,
          stressLevel: stressLevel ?? existingReport.stressLevel,
          overtime: overtime ?? existingReport.overtime,
          overtimeHours: overtimeHours ?? existingReport.overtimeHours,
          nextWeekSchedule: nextWeekSchedule ?? existingReport.nextWeekSchedule,
          goodWorkWith: goodWorkWith ?? existingReport.goodWorkWith,
          badWorkWith: badWorkWith ?? existingReport.badWorkWith,
          teamComment: teamComment ?? existingReport.teamComment,
          notes: notes ?? existingReport.notes,
          isCompleted: isCompleted ?? existingReport.isCompleted,
          submittedAt: isCompleted ? new Date() : existingReport.submittedAt,
        },
      });

      // Обновляем HR метрики, если они переданы
      if (hrMetrics && (authResult.user.role === 'HR' || authResult.user.role === 'MIXED')) {
        if (existingReport.hrMetrics) {
          await tx.hrMetrics.update({
            where: { id: existingReport.hrMetrics.id },
            data: {
              interviews: hrMetrics.interviews ?? existingReport.hrMetrics.interviews,
              jobPosts: hrMetrics.jobPosts ?? existingReport.hrMetrics.jobPosts,
              registrations: hrMetrics.registrations ?? existingReport.hrMetrics.registrations,
              difficultCases: hrMetrics.difficultCases ?? existingReport.hrMetrics.difficultCases,
            },
          });
        } else {
          await tx.hrMetrics.create({
            data: {
              userId: authResult.user.userId,
              reportId: params.id,
              interviews: hrMetrics.interviews || 0,
              jobPosts: hrMetrics.jobPosts || 0,
              registrations: hrMetrics.registrations || 0,
              difficultCases: hrMetrics.difficultCases,
            },
          });
        }
      }

      // Обновляем операционные метрики, если они переданы
      if (opsMetrics && (authResult.user.role === 'OPERATIONS' || authResult.user.role === 'MIXED')) {
        if (existingReport.opsMetrics) {
          await tx.opsMetrics.update({
            where: { id: existingReport.opsMetrics.id },
            data: {
              trengoMessages: opsMetrics.trengoMessages ?? existingReport.opsMetrics.trengoMessages,
              trengoTicketsResolved: opsMetrics.trengoTicketsResolved ?? existingReport.opsMetrics.trengoTicketsResolved,
              crmTicketsResolved: opsMetrics.crmTicketsResolved ?? existingReport.opsMetrics.crmTicketsResolved,
              crmOrdersCity: opsMetrics.crmOrdersCity ?? existingReport.opsMetrics.crmOrdersCity,
              difficultCleanerCases: opsMetrics.difficultCleanerCases ?? existingReport.opsMetrics.difficultCleanerCases,
              difficultClientCases: opsMetrics.difficultClientCases ?? existingReport.opsMetrics.difficultClientCases,
            },
          });
        } else {
          await tx.opsMetrics.create({
            data: {
              userId: authResult.user.userId,
              reportId: params.id,
              trengoMessages: opsMetrics.trengoMessages || 0,
              trengoTicketsResolved: opsMetrics.trengoTicketsResolved || 0,
              crmTicketsResolved: opsMetrics.crmTicketsResolved || 0,
              crmOrdersCity: opsMetrics.crmOrdersCity || 0,
              difficultCleanerCases: opsMetrics.difficultCleanerCases,
              difficultClientCases: opsMetrics.difficultClientCases,
            },
          });
        }
      }

      return updatedReport;
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error updating weekly report:', error);
    return NextResponse.json(
      { message: 'Ошибка при обновлении отчета' },
      { status: 500 }
    );
  }
}

// DELETE - удалить отчет
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authResult = requireAuth(request);
  if (authResult.error) return authResult.error;

  try {
    const report = await prisma.weeklyReport.findUnique({
      where: { id: params.id },
    });

    if (!report) {
      return NextResponse.json(
        { message: 'Отчет не найден' },
        { status: 404 }
      );
    }

    // Проверяем права доступа
    if (
      report.userId !== authResult.user.userId &&
      authResult.user.role !== 'ADMIN'
    ) {
      return NextResponse.json(
        { message: 'Недостаточно прав доступа' },
        { status: 403 }
      );
    }

    // Удаляем отчет (каскадное удаление удалит связанные метрики)
    await prisma.weeklyReport.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ message: 'Отчет удален' });
  } catch (error) {
    console.error('Error deleting weekly report:', error);
    return NextResponse.json(
      { message: 'Ошибка при удалении отчета' },
      { status: 500 }
    );
  }
}
