import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { getDataFilter, hasPermission, Permission } from '@/lib/permissions';

export async function GET(request: NextRequest) {
  const authResult = requireAuth(request);
  if (authResult.error) {
    return authResult.error;
  }

  try {
    const { user } = authResult;
    const { searchParams } = new URL(request.url);
    
    const period = searchParams.get('period') || '30'; // дней
    const chartType = searchParams.get('type') || 'overview'; // overview, trends, comparison

    // Вычисляем период
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - parseInt(period));

    // Получаем фильтр на основе прав пользователя
    const dataFilter = getDataFilter(user);
    
    // Базовый фильтр по дате
    const whereClause = {
      ...dataFilter,
      reportDate: {
        gte: startDate,
        lte: endDate,
      },
      isCompleted: true,
    };

    // Получаем метрики
    const metrics = await prisma.userMetrics.findMany({
      where: whereClause,
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

    // Обрабатываем данные в зависимости от типа графика
    let processedData = {};

    switch (chartType) {
      case 'overview':
        processedData = generateOverviewData(metrics);
        break;
      case 'trends':
        processedData = generateTrendsData(metrics);
        break;
      case 'comparison':
        processedData = generateComparisonData(metrics);
        break;
      case 'employee-performance':
        processedData = generateEmployeePerformanceData(metrics);
        break;
      default:
        processedData = generateOverviewData(metrics);
    }

    return NextResponse.json({
      data: processedData,
      period: { start: startDate, end: endDate, days: period },
      userRole: user.role,
      userCity: user.city,
      totalRecords: metrics.length,
    });

  } catch (error) {
    console.error('Error fetching analytics data:', error);
    return NextResponse.json(
      { message: 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}

function generateOverviewData(metrics: any[]) {
  // Группируем данные по дням
  const dailyData = metrics.reduce((acc, metric) => {
    const date = new Date(metric.reportDate).toISOString().split('T')[0];
    
    if (!acc[date]) {
      acc[date] = {
        date,
        hiredPeople: 0,
        interviews: 0,
        applications: 0,
        ordersProcessed: 0,
        customerCalls: 0,
        overtimeHours: 0,
        teamMeetings: 0,
        trainingHours: 0,
        stressLevel: [],
        activeUsers: new Set(),
      };
    }

    // Суммируем метрики
    acc[date].hiredPeople += metric.hiredPeople || 0;
    acc[date].interviews += metric.hrInterviews || 0;
    acc[date].applications += metric.applications || 0;
    acc[date].ordersProcessed += metric.ordersProcessed || 0;
    acc[date].customerCalls += metric.customerCalls || 0;
    acc[date].overtimeHours += metric.overtimeHours || 0;
    acc[date].teamMeetings += metric.teamMeetings || 0;
    acc[date].trainingHours += metric.trainingHours || 0;

    // Собираем уровни стресса для расчета среднего
    if (metric.hrStressLevel) acc[date].stressLevel.push(metric.hrStressLevel);
    if (metric.opsStressLevel) acc[date].stressLevel.push(metric.opsStressLevel);

    // Считаем активных пользователей
    acc[date].activeUsers.add(metric.userId);

    return acc;
  }, {} as any);

  // Преобразуем в массив и вычисляем средние значения
  return Object.values(dailyData).map((day: any) => ({
    ...day,
    avgStressLevel: day.stressLevel.length > 0 
      ? day.stressLevel.reduce((sum: number, level: number) => sum + level, 0) / day.stressLevel.length 
      : 0,
    activeUsers: day.activeUsers.size,
  })).sort((a: any, b: any) => a.date.localeCompare(b.date));
}

function generateTrendsData(metrics: any[]) {
  // Группируем по неделям
  const weeklyData = metrics.reduce((acc, metric) => {
    const date = new Date(metric.reportDate);
    const weekStart = new Date(date);
    weekStart.setDate(date.getDate() - date.getDay() + 1); // Понедельник
    const weekKey = weekStart.toISOString().split('T')[0];

    if (!acc[weekKey]) {
      acc[weekKey] = {
        week: weekKey,
        totalHired: 0,
        totalInterviews: 0,
        totalOrders: 0,
        avgStress: [],
        cities: new Set(),
        bestEmployees: [],
        worstEmployees: [],
      };
    }

    acc[weekKey].totalHired += metric.hiredPeople || 0;
    acc[weekKey].totalInterviews += metric.hrInterviews || 0;
    acc[weekKey].totalOrders += metric.ordersProcessed || 0;
    
    if (metric.hrStressLevel) acc[weekKey].avgStress.push(metric.hrStressLevel);
    if (metric.opsStressLevel) acc[weekKey].avgStress.push(metric.opsStressLevel);
    
    acc[weekKey].cities.add(metric.user.city);
    
    if (metric.bestEmployeeWeek) {
      acc[weekKey].bestEmployees.push(metric.bestEmployeeWeek);
    }
    if (metric.worstEmployeeWeek) {
      acc[weekKey].worstEmployees.push(metric.worstEmployeeWeek);
    }

    return acc;
  }, {} as any);

  return Object.values(weeklyData).map((week: any) => ({
    ...week,
    avgStress: week.avgStress.length > 0 
      ? week.avgStress.reduce((sum: number, level: number) => sum + level, 0) / week.avgStress.length 
      : 0,
    citiesCount: week.cities.size,
    bestEmployeesCount: week.bestEmployees.length,
    worstEmployeesCount: week.worstEmployees.length,
  })).sort((a: any, b: any) => a.week.localeCompare(b.week));
}

function generateComparisonData(metrics: any[]) {
  // Группируем по городам
  const cityData = metrics.reduce((acc, metric) => {
    const city = metric.user.city;
    
    if (!acc[city]) {
      acc[city] = {
        city,
        totalHired: 0,
        totalInterviews: 0,
        totalOrders: 0,
        totalOvertimeHours: 0,
        avgStress: [],
        employeeCount: new Set(),
        bestEmployees: new Set(),
        worstEmployees: new Set(),
      };
    }

    acc[city].totalHired += metric.hiredPeople || 0;
    acc[city].totalInterviews += metric.hrInterviews || 0;
    acc[city].totalOrders += metric.ordersProcessed || 0;
    acc[city].totalOvertimeHours += metric.overtimeHours || 0;
    
    if (metric.hrStressLevel) acc[city].avgStress.push(metric.hrStressLevel);
    if (metric.opsStressLevel) acc[city].avgStress.push(metric.opsStressLevel);
    
    acc[city].employeeCount.add(metric.userId);
    
    if (metric.bestEmployeeWeek) {
      acc[city].bestEmployees.add(metric.bestEmployeeWeek);
    }
    if (metric.worstEmployeeWeek) {
      acc[city].worstEmployees.add(metric.worstEmployeeWeek);
    }

    return acc;
  }, {} as any);

  return Object.values(cityData).map((city: any) => ({
    ...city,
    avgStress: city.avgStress.length > 0 
      ? city.avgStress.reduce((sum: number, level: number) => sum + level, 0) / city.avgStress.length 
      : 0,
    employeeCount: city.employeeCount.size,
    bestEmployeesCount: city.bestEmployees.size,
    worstEmployeesCount: city.worstEmployees.size,
    efficiency: city.totalOrders > 0 ? (city.totalHired / city.totalOrders * 100) : 0,
  }));
}

function generateEmployeePerformanceData(metrics: any[]) {
  // Анализ производительности сотрудников
  const employeeData = metrics.reduce((acc, metric) => {
    if (!metric.bestEmployeeWeek && !metric.worstEmployeeWeek) return acc;

    // Лучшие сотрудники
    if (metric.bestEmployeeWeek) {
      if (!acc.best[metric.bestEmployeeWeek]) {
        acc.best[metric.bestEmployeeWeek] = {
          name: metric.bestEmployeeWeek,
          count: 0,
          reasons: [],
          cities: new Set(),
          managers: new Set(),
        };
      }
      acc.best[metric.bestEmployeeWeek].count++;
      if (metric.bestEmployeeReason) {
        acc.best[metric.bestEmployeeWeek].reasons.push(metric.bestEmployeeReason);
      }
      acc.best[metric.bestEmployeeWeek].cities.add(metric.user.city);
      acc.best[metric.bestEmployeeWeek].managers.add(metric.user.name);
    }

    // Худшие сотрудники
    if (metric.worstEmployeeWeek) {
      if (!acc.worst[metric.worstEmployeeWeek]) {
        acc.worst[metric.worstEmployeeWeek] = {
          name: metric.worstEmployeeWeek,
          count: 0,
          reasons: [],
          cities: new Set(),
          managers: new Set(),
        };
      }
      acc.worst[metric.worstEmployeeWeek].count++;
      if (metric.worstEmployeeReason) {
        acc.worst[metric.worstEmployeeWeek].reasons.push(metric.worstEmployeeReason);
      }
      acc.worst[metric.worstEmployeeWeek].cities.add(metric.user.city);
      acc.worst[metric.worstEmployeeWeek].managers.add(metric.user.name);
    }

    return acc;
  }, { best: {} as any, worst: {} as any });

  return {
    topPerformers: Object.values(employeeData.best)
      .map((emp: any) => ({
        ...emp,
        cities: Array.from(emp.cities),
        managers: Array.from(emp.managers),
        score: emp.count * 2, // Позитивный скор
      }))
      .sort((a: any, b: any) => b.count - a.count)
      .slice(0, 10),
    
    needsAttention: Object.values(employeeData.worst)
      .map((emp: any) => ({
        ...emp,
        cities: Array.from(emp.cities),
        managers: Array.from(emp.managers),
        score: emp.count * -1, // Негативный скор
      }))
      .sort((a: any, b: any) => b.count - a.count)
      .slice(0, 10),
  };
}
