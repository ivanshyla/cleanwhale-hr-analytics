import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

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
    const includeAll = searchParams.get('include_all') === 'true';

    // Проверяем права доступа
    const canViewAllData = ['ADMIN', 'COUNTRY_MANAGER'].includes(user.role);
    
    if (!canViewAllData && !includeAll) {
      // Обычные пользователи видят только свой город
      const singleCityData = await getSingleCityData(user.city, since, until);
      return NextResponse.json({
        data: singleCityData,
        message: 'Данные по вашему городу',
      });
    }

    // Админы и менеджеры по стране видят все города
    const allCitiesData = await getAllCitiesData(since, until);
    
    return NextResponse.json({
      data: allCitiesData,
      message: 'Данные по всем городам',
    });

  } catch (error) {
    console.error('Error fetching comparison data:', error);
    return NextResponse.json(
      { message: 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}

async function getSingleCityData(userCity: string, since?: string | null, until?: string | null) {
  const whereClause: any = {
    user: {
      city: userCity,
    },
  };

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
          role: true,
          city: true,
        },
      },
    },
  });

  const cityData = aggregateMetricsByCity([userCity], metrics);
  return cityData;
}

async function getAllCitiesData(since?: string | null, until?: string | null) {
  const whereClause: any = {};

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
          role: true,
          city: true,
        },
      },
    },
  });

  // Получаем все уникальные города
  const cities = [...new Set(metrics.map(m => m.user.city))];
  
  return aggregateMetricsByCity(cities, metrics);
}

function aggregateMetricsByCity(cities: string[], metrics: any[]) {
  const cityLabels: Record<string, string> = {
    WARSAW: 'Варшава',
    KRAKOW: 'Краков', 
    GDANSK: 'Гданьск',
    WROCLAW: 'Вроцлав',
    POZNAN: 'Познань',
    LODZ: 'Лодзь',
    LUBLIN: 'Люблин',
    KATOWICE: 'Катовице',
    BYDGOSZCZ: 'Быдгощ',
    SZCZECIN: 'Щецин',
    TORUN: 'Торунь',
    RADOM: 'Радом',
    RZESZOW: 'Жешув',
    OLSZTYN: 'Ольштын',
    BIALYSTOK: 'Белосток',
  };

  return cities.map(city => {
    const cityMetrics = metrics.filter(m => m.user.city === city);
    const cityUsers = [...new Set(cityMetrics.map(m => m.user))];
    
    // Считаем количество пользователей по ролям
    const hrEmployees = cityUsers.filter(u => u.role === 'HR').length;
    const opsEmployees = cityUsers.filter(u => u.role === 'OPERATIONS').length;
    const mixedEmployees = cityUsers.filter(u => u.role === 'MIXED').length;
    const totalEmployees = hrEmployees + opsEmployees + mixedEmployees;

    if (cityMetrics.length === 0) {
      return {
        city,
        cityLabel: cityLabels[city] || city,
        avgInterviews: 0,
        avgJobPostings: 0,
        avgRegistrations: 0,
        avgHrWorkingDays: 0,
        avgHrStress: 0,
        hrOvertimeRate: 0,
        avgOrdersWeek: 0,
        avgOpsWorkingDays: 0,
        avgOpsStress: 0,
        opsOvertimeRate: 0,
        avgTrengoMessages: 0,
        avgTrengoTickets: 0,
        avgCrmTickets: 0,
        totalEmployees,
        hrEmployees,
        opsEmployees,
        mixedEmployees,
      };
    }

    // Вычисляем средние значения
    const count = cityMetrics.length;
    
    const avgInterviews = cityMetrics.reduce((sum, m) => sum + (m.hrInterviews || 0), 0) / count;
    const avgJobPostings = cityMetrics.reduce((sum, m) => sum + (m.hrJobPostings || 0), 0) / count;
    const avgRegistrations = cityMetrics.reduce((sum, m) => sum + (m.hrRegistrations || 0), 0) / count;
    const avgHrWorkingDays = cityMetrics.reduce((sum, m) => sum + (m.hrWorkingDays || 0), 0) / count;
    
    // Для стресса считаем среднее только среди тех, кто указал значение
    const hrStressValues = cityMetrics.filter(m => m.hrStressLevel !== null).map(m => m.hrStressLevel || 0);
    const avgHrStress = hrStressValues.length > 0 ? 
      hrStressValues.reduce((sum, val) => sum + val, 0) / hrStressValues.length : 0;
    
    // Процент переработок HR
    const hrOvertimeCount = cityMetrics.filter(m => m.hrOvertime === true).length;
    const hrOvertimeRate = count > 0 ? (hrOvertimeCount / count) * 100 : 0;
    
    // Операционные метрики
    const avgOrdersWeek = cityMetrics.reduce((sum, m) => sum + (m.opsOrdersWeek || 0), 0) / count;
    const avgOpsWorkingDays = cityMetrics.reduce((sum, m) => sum + (m.opsWorkingDays || 0), 0) / count;
    
    const opsStressValues = cityMetrics.filter(m => m.opsStressLevel !== null).map(m => m.opsStressLevel || 0);
    const avgOpsStress = opsStressValues.length > 0 ? 
      opsStressValues.reduce((sum, val) => sum + val, 0) / opsStressValues.length : 0;
    
    const opsOvertimeCount = cityMetrics.filter(m => m.opsOvertime === true).length;
    const opsOvertimeRate = count > 0 ? (opsOvertimeCount / count) * 100 : 0;
    
    // Автоматические данные
    const avgTrengoMessages = cityMetrics.reduce((sum, m) => sum + (m.trengoMessages || 0), 0) / count;
    const avgTrengoTickets = cityMetrics.reduce((sum, m) => sum + (m.trengoTicketsResolved || 0), 0) / count;
    const avgCrmTickets = cityMetrics.reduce((sum, m) => sum + (m.crmTicketsResolved || 0), 0) / count;

    return {
      city,
      cityLabel: cityLabels[city] || city,
      avgInterviews: Number(avgInterviews.toFixed(1)),
      avgJobPostings: Number(avgJobPostings.toFixed(1)),
      avgRegistrations: Number(avgRegistrations.toFixed(1)),
      avgHrWorkingDays: Number(avgHrWorkingDays.toFixed(1)),
      avgHrStress: Number(avgHrStress.toFixed(1)),
      hrOvertimeRate: Number(hrOvertimeRate.toFixed(0)),
      avgOrdersWeek: Number(avgOrdersWeek.toFixed(0)),
      avgOpsWorkingDays: Number(avgOpsWorkingDays.toFixed(1)),
      avgOpsStress: Number(avgOpsStress.toFixed(1)),
      opsOvertimeRate: Number(opsOvertimeRate.toFixed(0)),
      avgTrengoMessages: Number(avgTrengoMessages.toFixed(0)),
      avgTrengoTickets: Number(avgTrengoTickets.toFixed(0)),
      avgCrmTickets: Number(avgCrmTickets.toFixed(0)),
      totalEmployees,
      hrEmployees,
      opsEmployees,
      mixedEmployees,
    };
  });
}
