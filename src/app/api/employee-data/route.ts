import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

// Получение данных по сотрудникам
export async function GET(request: NextRequest) {
  const authResult = requireAuth(request);
  if (authResult.error) {
    return authResult.error;
  }

  const { user } = authResult;
  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get('limit') || '20');

  try {
    // Только country manager может видеть данные
    if (user.role !== 'COUNTRY_MANAGER' && user.role !== 'ADMIN') {
      return NextResponse.json(
        { message: 'Недостаточно прав для просмотра данных по сотрудникам' },
        { status: 403 }
      );
    }

    const employeeData = await prisma.employeeData.findMany({
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
      data: employeeData,
      total: employeeData.length,
    });

  } catch (error) {
    console.error('Error fetching employee data:', error);
    return NextResponse.json(
      { message: 'Ошибка получения данных' },
      { status: 500 }
    );
  }
}

// Создание/обновление данных по сотрудникам
export async function POST(request: NextRequest) {
  const authResult = requireAuth(request);
  if (authResult.error) {
    return authResult.error;
  }

  const { user } = authResult;

  try {
    // Только country manager может вносить данные
    if (user.role !== 'COUNTRY_MANAGER' && user.role !== 'ADMIN') {
      return NextResponse.json(
        { message: 'Недостаточно прав для ввода данных по сотрудникам' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { submissions } = body;

    if (!submissions || !Array.isArray(submissions)) {
      return NextResponse.json(
        { message: 'Неверный формат данных' },
        { status: 400 }
      );
    }

    const results = [];

    for (const submission of submissions) {
      const {
        userId,
        reportDate,
        crmTickets,
        crmMessages,
        crmComplaints,
      } = submission;

      if (!userId || !reportDate) {
        continue; // Пропускаем некорректные записи
      }

      // Проверяем, что пользователь существует и имеет операционную роль
      const targetUser = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, role: true, active: true }
      });

      if (!targetUser || !targetUser.active || 
          !['OPERATIONS', 'MIXED'].includes(targetUser.role)) {
        continue; // Пропускаем неподходящих пользователей
      }

      const reportDateObj = new Date(reportDate);

      // Проверяем, есть ли уже запись за эту дату для этого пользователя
      const existingRecord = await prisma.employeeData.findFirst({
        where: {
          userId: userId,
          reportDate: reportDateObj,
        }
      });

      let savedData;

      if (existingRecord) {
        // Обновляем существующую запись
        savedData = await prisma.employeeData.update({
          where: { id: existingRecord.id },
          data: {
            crmTickets: parseInt(crmTickets) || 0,
            crmMessages: parseInt(crmMessages) || 0,
            crmComplaints: parseInt(crmComplaints) || 0,
            updatedAt: new Date(),
          }
        });
      } else {
        // Создаем новую запись
        savedData = await prisma.employeeData.create({
          data: {
            userId: userId,
            crmTickets: parseInt(crmTickets) || 0,
            crmMessages: parseInt(crmMessages) || 0,
            crmComplaints: parseInt(crmComplaints) || 0,
            reportDate: reportDateObj,
          }
        });
      }

      results.push(savedData);
    }

    return NextResponse.json({
      message: `Обработано ${results.length} записей`,
      data: results,
    });

  } catch (error) {
    console.error('Error saving employee data:', error);
    return NextResponse.json(
      { message: 'Ошибка сохранения данных', error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
