import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { hasPermission, Permission, getAllowedCities } from '@/lib/permissions';

export async function GET(request: NextRequest) {
  const authResult = requireAuth(request);
  if (authResult.error) {
    return authResult.error;
  }

  try {
    const { user } = authResult;
    const isCountryManager = user.role === 'COUNTRY_MANAGER' || user.role === 'ADMIN';
    const allowedCities = getAllowedCities(user);

    // Фильтр для пользователей
    let userFilter: any = {};
    if (!isCountryManager) {
      // Обычные менеджеры видят только пользователей своего города
      userFilter = { city: user.city };
    }

    // Получаем статистику пользователей
    const totalUsers = await prisma.user.count({
      where: userFilter,
    });

    // Получаем статистику по найму за последнюю неделю
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    let metricsFilter: any = {
      reportDate: {
        gte: oneWeekAgo,
      },
    };

    if (!isCountryManager) {
      // Обычные менеджеры видят метрики только своего города
      metricsFilter.user = { city: user.city };
    }

    const weeklyReports = await prisma.weeklyReport.findMany({
      where: metricsFilter,
      include: {
        user: true,
        hrMetrics: true,
        opsMetrics: true,
      },
    });

    // Подсчитываем найм за неделю
    const weeklyHires = weeklyReports.reduce((sum, report) => {
      return sum + (report.hrMetrics?.registrations || 0);
    }, 0);

    const stats = {
      totalUsers,
      weeklyHires,
      userRole: user.role,
      userCity: user.city,
      allowedCities,
      isCountryManager,
    };

    return NextResponse.json(stats);

  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    return NextResponse.json(
      { message: 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}
