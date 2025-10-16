export const revalidate = 60; // кэшировать на 60 секунд

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { isoWeekOf } from '@/lib/week';

// Кэш для результатов (простой in-memory кэш)
const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 60000; // 60 секунд

export async function GET(request: NextRequest) {
  const authResult = requireAuth(request);
  if (authResult.error) return authResult.error;

  const { user } = authResult;
  
  // Только Country Manager и Admin
  if (!['COUNTRY_MANAGER', 'ADMIN'].includes(user.role)) {
    return NextResponse.json({ message: 'Недостаточно прав' }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const weekIso = searchParams.get('weekIso') || isoWeekOf();

    // Проверяем кэш
    const cacheKey = `country-analytics-${weekIso}`;
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return NextResponse.json({
        ...cached.data,
        cached: true,
      });
    }

    // Получаем все отчеты за неделю с метриками и данными пользователей
    // Оптимизируем select - загружаем только нужные поля
    const allReports = await prisma.weeklyReport.findMany({
      where: { weekIso },
      select: {
        id: true,
        weekIso: true,
        workdays: true,
        stressLevel: true,
        overtime: true,
        overtimeHours: true,
        user: {
          select: {
            id: true,
            name: true,
            login: true,
            role: true,
            city: true,
          }
        },
        hrMetrics: {
          select: {
            interviews: true,
            jobPosts: true,
            registrations: true,
            fullDays: true,
            stress: true,
            overtime: true,
          }
        },
        opsMetrics: {
          select: {
            messages: true,
            orders: true,
            fullDays: true,
            stress: true,
            overtime: true,
          }
        },
      }
    });

    // Фильтруем отчеты с существующими пользователями
    const weeklyReports = allReports.filter(r => r.user !== null);

    // 1. РАЗРЕЗ ПО СОТРУДНИКАМ
    const byEmployee = weeklyReports.map(report => ({
      userId: report.user.id,
      name: report.user.name,
      login: report.user.login,
      role: report.user.role,
      city: report.user.city,
      
      // HR метрики
      interviews: report.hrMetrics?.interviews || 0,
      jobPosts: report.hrMetrics?.jobPosts || 0,
      registered: report.hrMetrics?.registrations || 0,
      hrFullDays: report.hrMetrics?.fullDays || 0,
      hrStress: report.hrMetrics?.stress || 0,
      hrOvertime: report.hrMetrics?.overtime || false,
      
      // Ops метрики
      messages: report.opsMetrics?.messages || 0,
      orders: report.opsMetrics?.orders || 0,
      opsFullDays: report.opsMetrics?.fullDays || 0,
      opsStress: report.opsMetrics?.stress || 0,
      opsOvertime: report.opsMetrics?.overtime || false,
      
      // Общие метрики
      workdays: report.workdays,
      stressLevel: report.stressLevel,
      overtime: report.overtime,
      overtimeHours: report.overtimeHours,
    }));

    // 2. РАЗРЕЗ ПО ГОРОДАМ
    const cityMap = new Map<string, any>();
    
    weeklyReports.forEach(report => {
      const city = report.user.city;
      if (!cityMap.has(city)) {
        cityMap.set(city, {
          city,
          totalEmployees: 0,
          hrManagers: 0,
          opsManagers: 0,
          mixedManagers: 0,
          
          // HR метрики
          totalInterviews: 0,
          totalJobPosts: 0,
          totalRegistered: 0,
          
          // Ops метрики
          totalMessages: 0,
          totalOrders: 0,
          
          // Общее
          totalWorkdays: 0,
          avgStress: 0,
          totalOvertime: 0,
        });
      }
      
      const cityData = cityMap.get(city)!;
      cityData.totalEmployees++;
      
      // Подсчет по типам
      if (report.user.role === 'HIRING_MANAGER') cityData.hrManagers++;
      if (report.user.role === 'OPS_MANAGER') cityData.opsManagers++;
      if (report.user.role === 'MIXED_MANAGER') cityData.mixedManagers++;
      
      // HR метрики
      if (report.hrMetrics) {
        cityData.totalInterviews += report.hrMetrics.interviews || 0;
        cityData.totalJobPosts += report.hrMetrics.jobPosts || 0;
        cityData.totalRegistered += report.hrMetrics.registrations || 0;
      }
      
      // Ops метрики
      if (report.opsMetrics) {
        cityData.totalMessages += report.opsMetrics.messages || 0;
        cityData.totalOrders += report.opsMetrics.orders || 0;
      }
      
      // Общее
      cityData.totalWorkdays += report.workdays || 0;
      cityData.avgStress += report.stressLevel || 0;
      cityData.totalOvertime += report.overtimeHours || 0;
    });
    
    const byCity = Array.from(cityMap.values()).map(city => ({
      ...city,
      avgStress: city.totalEmployees > 0 ? (city.avgStress / city.totalEmployees).toFixed(1) : 0,
    }));

    // 3. РАЗРЕЗ ПО ТИПУ СОТРУДНИКА
    const typeMap = new Map<string, any>();
    
    weeklyReports.forEach(report => {
      const type = report.user.role;
      if (!typeMap.has(type)) {
        typeMap.set(type, {
          type,
          count: 0,
          totalInterviews: 0,
          totalRegistered: 0,
          totalMessages: 0,
          totalOrders: 0,
          totalWorkdays: 0,
          avgStress: 0,
        });
      }
      
      const typeData = typeMap.get(type)!;
      typeData.count++;
      
      if (report.hrMetrics) {
        typeData.totalInterviews += report.hrMetrics.interviews || 0;
        typeData.totalRegistered += report.hrMetrics.registrations || 0;
      }
      
      if (report.opsMetrics) {
        typeData.totalMessages += report.opsMetrics.messages || 0;
        typeData.totalOrders += report.opsMetrics.orders || 0;
      }
      
      typeData.totalWorkdays += report.workdays || 0;
      typeData.avgStress += report.stressLevel || 0;
    });
    
    const byType = Array.from(typeMap.values()).map(type => ({
      ...type,
      avgStress: type.count > 0 ? (type.avgStress / type.count).toFixed(1) : 0,
    }));

    // 4. ОБЩАЯ ПО ПОЛЬШЕ
    const totalPoland = {
      totalEmployees: weeklyReports.length,
      totalCities: cityMap.size,
      
      // HR метрики
      totalInterviews: byCity.reduce((sum, c) => sum + c.totalInterviews, 0),
      totalJobPosts: byCity.reduce((sum, c) => sum + c.totalJobPosts, 0),
      totalRegistered: byCity.reduce((sum, c) => sum + c.totalRegistered, 0),
      
      // Ops метрики
      totalMessages: byCity.reduce((sum, c) => sum + c.totalMessages, 0),
      totalOrders: byCity.reduce((sum, c) => sum + c.totalOrders, 0),
      
      // Общее
      totalWorkdays: byCity.reduce((sum, c) => sum + c.totalWorkdays, 0),
      avgStress: weeklyReports.length > 0 
        ? (weeklyReports.reduce((sum, r) => sum + (r.stressLevel || 0), 0) / weeklyReports.length).toFixed(1)
        : 0,
      totalOvertime: byCity.reduce((sum, c) => sum + c.totalOvertime, 0),
      
      // По типам
      hrManagersCount: byType.find(t => t.type === 'HIRING_MANAGER')?.count || 0,
      opsManagersCount: byType.find(t => t.type === 'OPS_MANAGER')?.count || 0,
      mixedManagersCount: byType.find(t => t.type === 'MIXED_MANAGER')?.count || 0,
    };

    const result = {
      weekIso,
      byEmployee,
      byCity,
      byType,
      totalPoland,
      generatedAt: new Date().toISOString(),
    };

    // Сохраняем в кэш
    cache.set(cacheKey, {
      data: result,
      timestamp: Date.now(),
    });

    return NextResponse.json(result);

  } catch (error) {
    console.error('Error fetching country analytics:', error);
    return NextResponse.json(
      { message: 'Ошибка получения аналитики', error: String(error) },
      { status: 500 }
    );
  }
}

