import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { createTrengoIntegration } from '@/lib/integrations/trengo';

export async function POST(request: NextRequest) {
  const authResult = requireAuth(request);
  if (authResult.error) {
    return authResult.error;
  }

  try {
    const { user } = authResult;
    const { apiToken, weekStart, weekEnd } = await request.json();

    if (!apiToken) {
      return NextResponse.json(
        { message: 'API токен Trengo обязателен' },
        { status: 400 }
      );
    }

    if (!weekStart || !weekEnd) {
      return NextResponse.json(
        { message: 'Даты начала и окончания недели обязательны' },
        { status: 400 }
      );
    }

    // Создаем интеграцию с Trengo
    const trengoIntegration = createTrengoIntegration(apiToken);

    // Проверяем подключение
    const connectionTest = await trengoIntegration.testConnection();
    if (!connectionTest.success) {
      return NextResponse.json(
        { message: `Ошибка подключения к Trengo: ${connectionTest.message}` },
        { status: 400 }
      );
    }

    const startDate = new Date(weekStart);
    const endDate = new Date(weekEnd);

    // Получаем метрики за неделю
    const metrics = await trengoIntegration.getWeeklyMetrics(startDate, endDate);

    // Сохраняем или обновляем метрики в базе данных
    const reportDate = new Date(weekStart);
    reportDate.setDate(startDate.getDate() + 3); // Среда недели

    const savedMetrics = await prisma.userMetrics.upsert({
      where: {
        userId_reportDate: {
          userId: user.userId,
          reportDate,
        },
      },
      update: {
        trengoMessages: metrics.totalMessages,
        trengoTicketsCreated: metrics.newTickets,
        trengoTicketsResolved: metrics.resolvedTickets,
        trengoLastSync: new Date(),
        isAutoSynced: true,
        updatedAt: new Date(),
      },
      create: {
        userId: user.userId,
        reportDate,
        weekStartDate: startDate,
        weekEndDate: endDate,
        trengoMessages: metrics.totalMessages,
        trengoTicketsCreated: metrics.newTickets,
        trengoTicketsResolved: metrics.resolvedTickets,
        trengoLastSync: new Date(),
        isAutoSynced: true,
        isCompleted: false,
      },
    });

    // Сохраняем конфигурацию интеграции (если не существует)
    await prisma.apiIntegration.upsert({
      where: {
        userId: user.userId,
        type: 'TRENGO',
      },
      update: {
        lastSync: new Date(),
        lastSyncStatus: 'SUCCESS',
        errorMessage: null,
        updatedAt: new Date(),
      },
      create: {
        userId: user.userId,
        type: 'TRENGO',
        name: 'Trengo Integration',
        isActive: true,
        apiKey: apiToken, // В продакшене следует зашифровать
        syncFrequency: 24,
        lastSync: new Date(),
        lastSyncStatus: 'SUCCESS',
      },
    });

    // Создаем лог синхронизации
    const integration = await prisma.apiIntegration.findFirst({
      where: {
        userId: user.userId,
        type: 'TRENGO',
      },
    });

    if (integration) {
      await prisma.syncLog.create({
        data: {
          integrationId: integration.id,
          status: 'SUCCESS',
          startTime: new Date(),
          endTime: new Date(),
          recordsProcessed: 1,
          details: {
            weekStart,
            weekEnd,
            metrics: {
              totalMessages: metrics.totalMessages,
              newTickets: metrics.newTickets,
              resolvedTickets: metrics.resolvedTickets,
              avgResponseTime: metrics.avgResponseTime,
              avgResolutionTime: metrics.avgResolutionTime,
            },
          },
        },
      });
    }

    return NextResponse.json({
      message: 'Данные Trengo успешно синхронизированы',
      metrics: savedMetrics,
      trengoMetrics: metrics,
    });

  } catch (error) {
    console.error('Error syncing Trengo data:', error);
    
    // Логируем ошибку синхронизации
    try {
      const { user } = authResult;
      const integration = await prisma.apiIntegration.findFirst({
        where: {
          userId: user.userId,
          type: 'TRENGO',
        },
      });

      if (integration) {
        await prisma.apiIntegration.update({
          where: { id: integration.id },
          data: {
            lastSyncStatus: 'ERROR',
            errorMessage: error instanceof Error ? error.message : 'Unknown error',
          },
        });

        await prisma.syncLog.create({
          data: {
            integrationId: integration.id,
            status: 'ERROR',
            startTime: new Date(),
            endTime: new Date(),
            recordsProcessed: 0,
            errorMessage: error instanceof Error ? error.message : 'Unknown error',
          },
        });
      }
    } catch (logError) {
      console.error('Error logging sync failure:', logError);
    }

    return NextResponse.json(
      { 
        message: 'Ошибка синхронизации с Trengo',
        error: error instanceof Error ? error.message : 'Неизвестная ошибка'
      },
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

    // Получаем информацию об интеграции
    const integration = await prisma.apiIntegration.findFirst({
      where: {
        userId: user.userId,
        type: 'TRENGO',
      },
      include: {
        syncLogs: {
          take: 10,
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
    });

    if (!integration) {
      return NextResponse.json({
        isConfigured: false,
        message: 'Интеграция с Trengo не настроена',
      });
    }

    return NextResponse.json({
      isConfigured: true,
      integration: {
        id: integration.id,
        name: integration.name,
        isActive: integration.isActive,
        lastSync: integration.lastSync,
        lastSyncStatus: integration.lastSyncStatus,
        errorMessage: integration.errorMessage,
        syncFrequency: integration.syncFrequency,
      },
      recentLogs: integration.syncLogs,
    });

  } catch (error) {
    console.error('Error fetching Trengo integration:', error);
    return NextResponse.json(
      { message: 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}
