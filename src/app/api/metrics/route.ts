import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { 
  hasPermission, 
  Permission, 
  canAccessUserData, 
  filterDataByPermissions,
  requirePermission,
  getDataFilter 
} from '@/lib/permissions';

export async function POST(request: NextRequest) {
  const authResult = requireAuth(request);
  if (authResult.error) {
    return authResult.error;
  }

  try {
    const data = await request.json();
    const { user } = authResult;

    // Валидация данных
    if (!data.reportDate) {
      return NextResponse.json(
        { message: 'Дата отчета обязательна' },
        { status: 400 }
      );
    }

    const reportDate = new Date(data.reportDate);
    const weekStartDate = new Date(reportDate);
    weekStartDate.setDate(reportDate.getDate() - reportDate.getDay() + 1); // Понедельник
    
    const weekEndDate = new Date(weekStartDate);
    weekEndDate.setDate(weekStartDate.getDate() + 6); // Воскресенье

    // Создаем или обновляем метрики
    const metrics = await prisma.userMetrics.upsert({
      where: {
        userId_reportDate: {
          userId: user.userId,
          reportDate,
        },
      },
      update: {
        // HR метрики (только для HR)
        hiredPeople: user.role === 'HR' ? data.hiredPeople : undefined,
        interviews: user.role === 'HR' ? data.interviews : undefined,
        applications: user.role === 'HR' ? data.applications : undefined,
        
        // Операционные метрики (только для Operations Manager)
        ordersProcessed: user.role === 'OPERATIONS_MANAGER' ? data.ordersProcessed : undefined,
        customerCalls: user.role === 'OPERATIONS_MANAGER' ? data.customerCalls : undefined,
        
        // Общие метрики (для всех)
        overtimeHours: data.overtimeHours,
        teamMeetings: data.teamMeetings,
        trainingHours: data.trainingHours,
        notes: data.notes,
        
        // CSV данные
        csvDataSource: data.csvDataSource,
        csvUploadedAt: data.csvDataSource ? new Date() : undefined,
        
        // Оценки сотрудников
        bestEmployeeWeek: data.bestEmployeeWeek,
        bestEmployeeReason: data.bestEmployeeReason,
        worstEmployeeWeek: data.worstEmployeeWeek,
        worstEmployeeReason: data.worstEmployeeReason,
        teamFeedback: data.teamFeedback,
        
        isCompleted: true,
        updatedAt: new Date(),
      },
      create: {
        userId: user.userId,
        reportDate,
        weekStartDate,
        weekEndDate,
        
        // HR метрики
        hiredPeople: user.role === 'HR' ? data.hiredPeople : null,
        interviews: user.role === 'HR' ? data.interviews : null,
        applications: user.role === 'HR' ? data.applications : null,
        
        // Операционные метрики
        ordersProcessed: user.role === 'OPERATIONS_MANAGER' ? data.ordersProcessed : null,
        customerCalls: user.role === 'OPERATIONS_MANAGER' ? data.customerCalls : null,
        
        // Общие метрики
        overtimeHours: data.overtimeHours || null,
        teamMeetings: data.teamMeetings || null,
        trainingHours: data.trainingHours || null,
        notes: data.notes || null,
        
        // CSV данные
        csvDataSource: data.csvDataSource || null,
        csvUploadedAt: data.csvDataSource ? new Date() : null,
        
        // Оценки сотрудников
        bestEmployeeWeek: data.bestEmployeeWeek || null,
        bestEmployeeReason: data.bestEmployeeReason || null,
        worstEmployeeWeek: data.worstEmployeeWeek || null,
        worstEmployeeReason: data.worstEmployeeReason || null,
        teamFeedback: data.teamFeedback || null,
        
        isCompleted: true,
      },
    });

    return NextResponse.json({
      message: 'Метрики успешно сохранены',
      metrics,
    });

  } catch (error) {
    console.error('Error saving metrics:', error);
    return NextResponse.json(
      { message: 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const authResult = requireAuth(request);
  if (authResult.error) {
    return authResult.error;
  }

  try {
    const { user } = authResult;
    const { searchParams } = new URL(request.url);
    
    const since = searchParams.get('since');
    const until = searchParams.get('until');
    const includeAllUsers = searchParams.get('include_all') === 'true';
    const targetUserId = searchParams.get('user_id');

    // Проверяем разрешение на просмотр данных
    const permissionCheck = requirePermission(Permission.VIEW_OWN_DATA)(user);
    if (!permissionCheck.allowed) {
      return permissionCheck.error;
    }

    let whereClause: any = {};

    // Строгий контроль доступа к данным
    if (targetUserId) {
      // Запрос данных конкретного пользователя
      if (!canAccessUserData(user, targetUserId)) {
        return new Response(
          JSON.stringify({ message: 'Доступ к данным этого пользователя запрещен' }),
          { status: 403, headers: { 'Content-Type': 'application/json' } }
        );
      }
      whereClause.userId = targetUserId;
    } else if (includeAllUsers) {
      // Используем фильтр на основе прав пользователя
      const dataFilter = getDataFilter(user);
      whereClause = { ...whereClause, ...dataFilter };
    } else {
      // По умолчанию показываем только свои данные
      whereClause.userId = user.userId;
    }

    // Фильтр по дате
    if (since || until) {
      whereClause.reportDate = {};
      if (since) whereClause.reportDate.gte = new Date(since);
      if (until) whereClause.reportDate.lte = new Date(until);
    }

    const metrics = await prisma.userMetrics.findMany({
      where: whereClause,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            city: true,
          },
        },
      },
      orderBy: {
        reportDate: 'desc',
      },
    });

    // Дополнительная фильтрация на уровне приложения для безопасности
    const filteredMetrics = filterDataByPermissions(user, metrics);

    return NextResponse.json({
      metrics: filteredMetrics,
      total: filteredMetrics.length,
      userRole: user.role,
      canViewAll: hasPermission(user, Permission.VIEW_ALL_USERS_DATA),
    });

  } catch (error) {
    console.error('Error fetching metrics:', error);
    return NextResponse.json(
      { message: 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}
