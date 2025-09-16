import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { personalAI } from '@/lib/personal-ai-assistant';

export async function GET(request: NextRequest) {
  const authResult = requireAuth(request);
  if (authResult.error) {
    return authResult.error;
  }

  const { user } = authResult;

  try {
    // Получаем текущие метрики пользователя
    const currentMetrics = await prisma.userMetrics.findFirst({
      where: {
        userId: user.id,
      },
      orderBy: {
        reportDate: 'desc',
      },
    });

    // Получаем исторические данные (последние 4 недели)
    const historicalMetrics = await prisma.userMetrics.findMany({
      where: {
        userId: user.id,
      },
      orderBy: {
        reportDate: 'desc',
      },
      take: 4,
      skip: 1, // пропускаем текущую неделю
    });

    // Получаем данные коллег для сравнения (та же роль)
    const peerMetrics = await prisma.userMetrics.findMany({
      where: {
        user: {
          role: user.role,
          id: {
            not: user.id, // исключаем самого пользователя
          },
        },
        reportDate: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // последняя неделя
        },
      },
      include: {
        user: {
          select: {
            role: true,
            city: true,
          },
        },
      },
    });

    // Формируем данные для анализа
    const personalMetrics = {
      current: currentMetrics ? {
        hrInterviews: currentMetrics.hrInterviews,
        hrJobPostings: currentMetrics.hrJobPostings,
        hrRegistrations: currentMetrics.hrRegistrations,
        hrWorkingDays: currentMetrics.hrWorkingDays,
        hrStressLevel: currentMetrics.hrStressLevel,
        hrOvertime: currentMetrics.hrOvertime,
        hrDifficultSituations: currentMetrics.hrDifficultSituations,
        
        opsOrdersWeek: currentMetrics.opsOrdersWeek,
        opsWorkingDays: currentMetrics.opsWorkingDays,
        opsStressLevel: currentMetrics.opsStressLevel,
        opsOvertime: currentMetrics.opsOvertime,
        opsCleanerIssues: currentMetrics.opsCleanerIssues,
        opsClientIssues: currentMetrics.opsClientIssues,
        
        trengoMessages: currentMetrics.trengoMessages,
        trengoTicketsResolved: currentMetrics.trengoTicketsResolved,
        crmTicketsResolved: currentMetrics.crmTicketsResolved,
        
        reportDate: currentMetrics.reportDate.toISOString(),
      } : {
        reportDate: new Date().toISOString(),
      },
      previous: historicalMetrics.map(metric => ({
        hrInterviews: metric.hrInterviews,
        hrJobPostings: metric.hrJobPostings,
        hrRegistrations: metric.hrRegistrations,
        hrWorkingDays: metric.hrWorkingDays,
        hrStressLevel: metric.hrStressLevel,
        hrOvertime: metric.hrOvertime,
        hrDifficultSituations: metric.hrDifficultSituations,
        
        opsOrdersWeek: metric.opsOrdersWeek,
        opsWorkingDays: metric.opsWorkingDays,
        opsStressLevel: metric.opsStressLevel,
        opsOvertime: metric.opsOvertime,
        opsCleanerIssues: metric.opsCleanerIssues,
        opsClientIssues: metric.opsClientIssues,
        
        trengoMessages: metric.trengoMessages,
        trengoTicketsResolved: metric.trengoTicketsResolved,
        crmTicketsResolved: metric.crmTicketsResolved,
        
        reportDate: metric.reportDate.toISOString(),
      })),
      user: {
        role: user.role as 'HR' | 'OPERATIONS' | 'MIXED',
        city: user.city,
        name: user.email.split('@')[0], // Берем часть email как имя
      },
    };

    // Генерируем AI анализ
    const analysis = await personalAI.analyzePersonalMetrics(personalMetrics);

    // Генерируем предупреждения перед заполнением формы
    const warnings = await personalAI.generatePreFormWarnings(personalMetrics);

    // Сравнение с коллегами
    const peerComparison = await personalAI.compareWithPeers(
      personalMetrics,
      peerMetrics.map(peer => ({
        current: {
          hrInterviews: peer.hrInterviews,
          hrJobPostings: peer.hrJobPostings,
          hrRegistrations: peer.hrRegistrations,
          hrWorkingDays: peer.hrWorkingDays,
          hrStressLevel: peer.hrStressLevel,
          hrOvertime: peer.hrOvertime,
          hrDifficultSituations: peer.hrDifficultSituations,
          
          opsOrdersWeek: peer.opsOrdersWeek,
          opsWorkingDays: peer.opsWorkingDays,
          opsStressLevel: peer.opsStressLevel,
          opsOvertime: peer.opsOvertime,
          opsCleanerIssues: peer.opsCleanerIssues,
          opsClientIssues: peer.opsClientIssues,
          
          trengoMessages: peer.trengoMessages,
          trengoTicketsResolved: peer.trengoTicketsResolved,
          crmTicketsResolved: peer.crmTicketsResolved,
          
          reportDate: peer.reportDate.toISOString(),
        },
        previous: [],
        user: {
          role: peer.user.role as 'HR' | 'OPERATIONS' | 'MIXED',
          city: peer.user.city,
        },
      }))
    );

    // Сохраняем результат анализа
    await prisma.personalAIInsight.create({
      data: {
        userId: user.id,
        insightType: 'weekly_analysis',
        analysis: JSON.stringify({
          ...analysis,
          warnings,
          peerComparison,
        }),
        weekNumber: getCurrentWeekNumber(),
      },
    }).catch(() => {
      // Если таблица не существует, игнорируем
      console.log('PersonalAIInsight table not found, skipping save...');
    });

    return NextResponse.json({
      success: true,
      analysis,
      warnings,
      peerComparison,
      hasCurrentData: !!currentMetrics,
      historicalWeeks: historicalMetrics.length,
      peersCompared: peerMetrics.length,
    });

  } catch (error) {
    console.error('Error generating personal insights:', error);
    return NextResponse.json(
      { message: 'Ошибка генерации персональных инсайтов', error: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const authResult = requireAuth(request);
  if (authResult.error) {
    return authResult.error;
  }

  const { user } = authResult;
  const { action, formData } = await request.json();

  try {
    switch (action) {
      case 'pre_form_check':
        // Анализ перед заполнением формы
        return await generatePreFormAnalysis(user);
      
      case 'trend_analysis':
        // Детальный анализ трендов
        return await generateTrendAnalysis(user);
      
      case 'peer_comparison':
        // Сравнение с коллегами
        return await generatePeerComparison(user);
      
      default:
        return NextResponse.json(
          { message: 'Неизвестное действие' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Error handling personal insights POST:', error);
    return NextResponse.json(
      { message: 'Ошибка обработки запроса' },
      { status: 500 }
    );
  }
}

async function generatePreFormAnalysis(user: any) {
  // Получаем последние 2 недели для сравнения
  const recentMetrics = await prisma.userMetrics.findMany({
    where: {
      userId: user.id,
    },
    orderBy: {
      reportDate: 'desc',
    },
    take: 2,
  });

  if (recentMetrics.length < 2) {
    return NextResponse.json({
      success: true,
      message: 'Недостаточно данных для анализа трендов',
      suggestions: [
        'Заполните форму как обычно',
        'После накопления данных AI предоставит персональные рекомендации',
      ],
    });
  }

  const current = recentMetrics[0];
  const previous = recentMetrics[1];
  
  const insights = [];
  const suggestions = [];

  // Анализ изменений HR метрик
  if (user.role === 'HR' || user.role === 'MIXED') {
    if (previous.hrInterviews && current.hrInterviews) {
      const change = ((current.hrInterviews - previous.hrInterviews) / previous.hrInterviews) * 100;
      if (change < -20) {
        insights.push({
          type: 'warning',
          message: `Собеседования снизились на ${Math.abs(change).toFixed(1)}%`,
          recommendation: 'Увеличьте активность размещения объявлений',
        });
        suggestions.push('Проверить эффективность объявлений о вакансиях');
      } else if (change > 20) {
        insights.push({
          type: 'positive',
          message: `Отличный рост собеседований на ${change.toFixed(1)}%`,
          recommendation: 'Продолжайте в том же духе!',
        });
        suggestions.push('Проанализировать, что способствовало росту');
      }
    }

    if (current.hrStressLevel && current.hrStressLevel > 7) {
      insights.push({
        type: 'critical',
        message: `Высокий уровень стресса: ${current.hrStressLevel}/10`,
        recommendation: 'Обратитесь к руководству по вопросу нагрузки',
      });
      suggestions.push('Запланировать отдых и восстановление');
    }
  }

  // Анализ операционных метрик
  if (user.role === 'OPERATIONS' || user.role === 'MIXED') {
    if (previous.opsOrdersWeek && current.opsOrdersWeek) {
      const change = ((current.opsOrdersWeek - previous.opsOrdersWeek) / previous.opsOrdersWeek) * 100;
      if (change < -15) {
        insights.push({
          type: 'warning',
          message: `Заказы снизились на ${Math.abs(change).toFixed(1)}%`,
          recommendation: 'Проанализировать причины снижения спроса',
        });
        suggestions.push('Усилить работу с клиентами');
      } else if (change > 15) {
        insights.push({
          type: 'positive',
          message: `Отличный рост заказов на ${change.toFixed(1)}%`,
          recommendation: 'Поделитесь опытом с коллегами!',
        });
      }
    }
  }

  return NextResponse.json({
    success: true,
    insights,
    suggestions: suggestions.length > 0 ? suggestions : ['Заполните форму, как обычно'],
    motivationalMessage: personalAI.generateMotivationalMessage(insights, user.role),
  });
}

async function generateTrendAnalysis(user: any) {
  const metrics = await prisma.userMetrics.findMany({
    where: {
      userId: user.id,
    },
    orderBy: {
      reportDate: 'desc',
    },
    take: 8, // последние 8 недель
  });

  if (metrics.length < 3) {
    return NextResponse.json({
      success: true,
      message: 'Недостаточно данных для анализа трендов',
    });
  }

  // Вычисляем тренды
  const trends = [];
  
  if (user.role === 'HR' || user.role === 'MIXED') {
    const interviews = metrics.map(m => m.hrInterviews || 0).reverse();
    const interviewTrend = calculateTrend(interviews);
    trends.push({
      metric: 'Собеседования',
      trend: interviewTrend,
      values: interviews,
    });

    const stress = metrics.map(m => m.hrStressLevel || 0).reverse();
    const stressTrend = calculateTrend(stress);
    trends.push({
      metric: 'Уровень стресса (HR)',
      trend: stressTrend,
      values: stress,
    });
  }

  if (user.role === 'OPERATIONS' || user.role === 'MIXED') {
    const orders = metrics.map(m => m.opsOrdersWeek || 0).reverse();
    const orderTrend = calculateTrend(orders);
    trends.push({
      metric: 'Заказы в неделю',
      trend: orderTrend,
      values: orders,
    });
  }

  return NextResponse.json({
    success: true,
    trends,
    analysis: 'Детальный анализ трендов готов',
  });
}

async function generatePeerComparison(user: any) {
  // Получаем метрики пользователя за последнюю неделю
  const userMetric = await prisma.userMetrics.findFirst({
    where: {
      userId: user.id,
    },
    orderBy: {
      reportDate: 'desc',
    },
  });

  // Получаем метрики коллег той же роли
  const peerMetrics = await prisma.userMetrics.findMany({
    where: {
      user: {
        role: user.role,
        id: {
          not: user.id,
        },
      },
      reportDate: {
        gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      },
    },
    include: {
      user: {
        select: {
          city: true,
        },
      },
    },
  });

  if (!userMetric || peerMetrics.length === 0) {
    return NextResponse.json({
      success: true,
      message: 'Недостаточно данных для сравнения с коллегами',
    });
  }

  const comparison = [];

  // Сравнение по ключевым метрикам
  if (user.role === 'HR' || user.role === 'MIXED') {
    const userInterviews = userMetric.hrInterviews || 0;
    const peerInterviews = peerMetrics.map(p => p.hrInterviews || 0);
    const avgPeer = peerInterviews.reduce((sum, val) => sum + val, 0) / peerInterviews.length;
    
    comparison.push({
      metric: 'Собеседования',
      userValue: userInterviews,
      peerAverage: avgPeer,
      position: userInterviews > avgPeer ? 'above' : userInterviews < avgPeer ? 'below' : 'average',
      difference: userInterviews - avgPeer,
    });
  }

  if (user.role === 'OPERATIONS' || user.role === 'MIXED') {
    const userOrders = userMetric.opsOrdersWeek || 0;
    const peerOrders = peerMetrics.map(p => p.opsOrdersWeek || 0);
    const avgPeer = peerOrders.reduce((sum, val) => sum + val, 0) / peerOrders.length;
    
    comparison.push({
      metric: 'Заказы в неделю',
      userValue: userOrders,
      peerAverage: avgPeer,
      position: userOrders > avgPeer ? 'above' : userOrders < avgPeer ? 'below' : 'average',
      difference: userOrders - avgPeer,
    });
  }

  return NextResponse.json({
    success: true,
    comparison,
    peersCompared: peerMetrics.length,
  });
}

function calculateTrend(values: number[]): 'up' | 'down' | 'stable' {
  if (values.length < 2) return 'stable';
  
  const recent = values.slice(-3); // последние 3 значения
  const older = values.slice(0, -3); // более старые значения
  
  if (recent.length === 0 || older.length === 0) return 'stable';
  
  const recentAvg = recent.reduce((sum, val) => sum + val, 0) / recent.length;
  const olderAvg = older.reduce((sum, val) => sum + val, 0) / older.length;
  
  const change = (recentAvg - olderAvg) / olderAvg;
  
  if (change > 0.1) return 'up';
  if (change < -0.1) return 'down';
  return 'stable';
}

function getCurrentWeekNumber() {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 1);
  const diff = (now.getTime() - start.getTime()) + ((start.getTimezoneOffset() - now.getTimezoneOffset()) * 60 * 1000);
  const oneWeek = 1000 * 60 * 60 * 24 * 7;
  return Math.floor(diff / oneWeek);
}
