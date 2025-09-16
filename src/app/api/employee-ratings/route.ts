import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { hasPermission, Permission } from '@/lib/permissions';
import { calculateEmployeeRating, getRatingColor, generateRecommendations } from '@/lib/rating-algorithm';

export async function GET(request: NextRequest) {
  const authResult = requireAuth(request);
  if (authResult.error) {
    return authResult.error;
  }

  try {
    const { user } = authResult;
    const { searchParams } = new URL(request.url);
    
    // Проверяем права доступа - только менеджеры по стране и админы
    if (!['COUNTRY_MANAGER', 'ADMIN'].includes(user.role)) {
      return NextResponse.json(
        { message: 'Доступ запрещен. Только для менеджеров по стране и администраторов.' },
        { status: 403 }
      );
    }

    const since = searchParams.get('since');
    const until = searchParams.get('until');

    // Убираем фильтр по оценкам - теперь рейтинг считается по всем метрикам

    // Получаем все метрики пользователей за период
    let metricsWhere: any = {};
    if (since || until) {
      metricsWhere.reportDate = {};
      if (since) metricsWhere.reportDate.gte = new Date(since);
      if (until) metricsWhere.reportDate.lte = new Date(until);
    }

    const userMetrics = await prisma.userMetrics.findMany({
      where: metricsWhere,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            city: true,
            role: true,
          },
        },
      },
      orderBy: {
        reportDate: 'desc',
      },
    });

    // Группируем метрики по пользователям и рассчитываем рейтинги
    const userRatings = new Map();

    userMetrics.forEach(metric => {
      const userId = metric.user.id;
      
      if (!userRatings.has(userId)) {
        userRatings.set(userId, {
          user: metric.user,
          metrics: [],
          totalRating: 0,
          components: { productivity: 0, communication: 0, quality: 0, wellbeing: 0 },
          recommendations: [],
          breakdown: [],
        });
      }

      const userRating = userRatings.get(userId);
      userRating.metrics.push(metric);
    });

    // Рассчитываем рейтинги для каждого пользователя
    const calculatedRatings = Array.from(userRatings.values()).map(userRating => {
      // Агрегируем метрики за период
      const aggregatedMetrics = userRating.metrics.reduce((acc: any, metric: any) => {
        return {
          workingDays: (acc.workingDays || 0) + (metric.hrWorkingDays || metric.opsWorkingDays || 0),
          interviews: (acc.interviews || 0) + (metric.hrInterviews || metric.interviews || 0),
          hiredPeople: (acc.hiredPeople || 0) + (metric.hiredPeople || 0),
          ordersProcessed: (acc.ordersProcessed || 0) + (metric.ordersProcessed || metric.opsOrdersWeek || 0),
          teamMeetings: (acc.teamMeetings || 0) + (metric.teamMeetings || 0),
          messages: (acc.messages || 0) + (metric.trengoMessages || 0),
          trainingHours: (acc.trainingHours || 0) + (metric.trainingHours || 0),
          stressLevel: Math.max(acc.stressLevel || 0, metric.hrStressLevel || metric.opsStressLevel || 0),
          overtime: acc.overtime || metric.hrOvertime || metric.opsOvertime || false,
          complaints: (acc.complaints || 0), // TODO: добавить поле complaints в схему
          difficultSituations: [acc.difficultSituations, metric.hrDifficultSituations, metric.opsClientIssues, metric.opsCleanerIssues].filter(Boolean).join(' '),
          clientIssues: metric.opsClientIssues || '',
          cleanerIssues: metric.opsCleanerIssues || '',
        };
      }, {});

      // Рассчитываем рейтинг
      const ratingResult = calculateEmployeeRating(aggregatedMetrics);
      const ratingColor = getRatingColor(ratingResult.totalRating);
      const recommendations = generateRecommendations(aggregatedMetrics, ratingResult.totalRating);

      return {
        user: userRating.user,
        rating: ratingResult.totalRating,
        ratingLabel: ratingColor.label,
        ratingColor: ratingColor.color,
        components: ratingResult.components,
        breakdown: ratingResult.breakdown,
        recommendations,
        metricsCount: userRating.metrics.length,
        aggregatedMetrics,
        bestEmployeeWeek: userRating.metrics.find((m: any) => m.bestEmployeeWeek)?.bestEmployeeWeek || null,
        worstEmployeeWeek: userRating.metrics.find((m: any) => m.worstEmployeeWeek)?.worstEmployeeWeek || null,
      };
    });

    // Сортируем по рейтингу
    calculatedRatings.sort((a, b) => b.rating - a.rating);

    return NextResponse.json({
      ratings: calculatedRatings,
      total: calculatedRatings.length,
      period: { since, until },
      algorithm: 'weighted_comprehensive_v1',
    });

  } catch (error) {
    console.error('Error fetching employee ratings:', error);
    return NextResponse.json(
      { message: 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}
