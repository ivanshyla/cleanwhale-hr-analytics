import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { prisma } from '@/lib/prisma';
import { getPreviousWeek } from '@/lib/week';
import type { AnalyticsResponse, CityAggregate, WeekComparison } from '@/types/api';

// GET /api/analytics-data?weekIso=...
export async function GET(request: NextRequest) {
  try {
    // Проверяем токен
    const token = request.cookies.get('token')?.value;
    if (!token) {
      return NextResponse.json({ message: 'Не авторизован' }, { status: 401 });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret') as any;
    const userId = decoded.userId;

    // Проверяем права доступа (только для админов и country manager)
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true }
    });

    if (!user || !['ADMIN', 'COUNTRY_MANAGER'].includes(user.role)) {
      return NextResponse.json({ message: 'Нет доступа к аналитике' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const weekIso = searchParams.get('weekIso');
    
    if (!weekIso) {
      return NextResponse.json({ message: 'Параметр weekIso обязателен' }, { status: 400 });
    }

    const previousWeekIso = getPreviousWeek(weekIso);

    // Получаем агрегированные данные по городам за текущую неделю
    const currentWeekData = await getWeekAggregates(weekIso);
    const previousWeekData = await getWeekAggregates(previousWeekIso);

    // Рассчитываем общие показатели
    const currentTotals = calculateTotals(currentWeekData);
    const previousTotals = calculateTotals(previousWeekData);

    // Создаем сравнения
    const summary = {
      totalFullDays: createComparison(currentTotals.fullDays, previousTotals.fullDays),
      totalInterviews: createComparison(currentTotals.interviews, previousTotals.interviews),
      totalMessages: createComparison(currentTotals.messages, previousTotals.messages),
      totalTickets: createComparison(currentTotals.tickets, previousTotals.tickets),
      totalOrders: createComparison(currentTotals.orders, previousTotals.orders),
      activeUsers: currentTotals.activeUsers
    };

    // Получаем тренды за последние 4 недели
    const trends = await getTrends(weekIso, 4);

    const response: AnalyticsResponse = {
      weekIso,
      summary,
      byCity: currentWeekData,
      trends
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Error fetching analytics data:', error);
    return NextResponse.json(
      { message: 'Ошибка получения аналитики' },
      { status: 500 }
    );
  }
}

// Функция для получения агрегированных данных по городам за неделю
async function getWeekAggregates(weekIso: string): Promise<CityAggregate[]> {
  const aggregates = await prisma.$queryRaw<any[]>`
    SELECT 
      u."city",
      COUNT(DISTINCT u.id) as "usersCount",
      COALESCE(SUM(hr."fullDays"), 0) + COALESCE(SUM(ops."fullDays"), 0) as "fullDays",
      COALESCE(SUM(hr."interviews"), 0) as "interviews",
      COALESCE(SUM(hr."jobPosts"), 0) as "jobPosts", 
      COALESCE(SUM(hr."registrations"), 0) as "registered",
      COALESCE(SUM(ops."messages"), 0) as "messages",
      COALESCE(SUM(ops."tickets"), 0) as "tickets",
      COALESCE(SUM(ops."orders"), 0) as "orders"
    FROM "users" u
    LEFT JOIN "hr_metrics" hr ON u.id = hr."userId" AND hr."weekIso" = ${weekIso}
    LEFT JOIN "ops_metrics" ops ON u.id = ops."userId" AND ops."weekIso" = ${weekIso}
    WHERE u."isActive" = true
    GROUP BY u."city"
    ORDER BY u."city"
  `;

  return aggregates.map(row => ({
    city: row.city,
    usersCount: parseInt(row.usersCount),
    fullDays: parseFloat(row.fullDays) || 0,
    interviews: parseInt(row.interviews) || 0,
    jobPosts: parseInt(row.jobPosts) || 0,
    registered: parseInt(row.registered) || 0,
    messages: parseInt(row.messages) || 0,
    tickets: parseInt(row.tickets) || 0,
    orders: parseInt(row.orders) || 0
  }));
}

// Функция для расчета общих показателей
function calculateTotals(cityData: CityAggregate[]) {
  return cityData.reduce((totals, city) => ({
    fullDays: totals.fullDays + city.fullDays,
    interviews: totals.interviews + (city.interviews || 0),
    messages: totals.messages + (city.messages || 0),
    tickets: totals.tickets + (city.tickets || 0),
    orders: totals.orders + (city.orders || 0),
    activeUsers: totals.activeUsers + city.usersCount
  }), {
    fullDays: 0,
    interviews: 0,
    messages: 0,
    tickets: 0,
    orders: 0,
    activeUsers: 0
  });
}

// Функция для создания сравнения недель
function createComparison(thisWeek: number, lastWeek: number | null): WeekComparison {
  const delta = lastWeek !== null && lastWeek > 0 ? (thisWeek - lastWeek) / lastWeek : null;
  const deltaPercent = delta !== null 
    ? `${delta >= 0 ? '+' : ''}${(delta * 100).toFixed(1)}%`
    : 'N/A';

  return {
    thisWeek,
    lastWeek,
    delta,
    deltaPercent
  };
}

// Функция для получения трендов
async function getTrends(currentWeekIso: string, weeksCount: number = 4) {
  // Получаем недели для анализа трендов (упрощенная версия)
  const weeks = [currentWeekIso]; // В продакшене здесь будет логика получения предыдущих недель
  
  const trends = [];
  for (const weekIso of weeks) {
    const weekData = await getWeekAggregates(weekIso);
    const totals = calculateTotals(weekData);
    
    trends.push({
      weekIso,
      totalFullDays: totals.fullDays,
      totalUsers: totals.activeUsers
    });
  }

  return trends;
}