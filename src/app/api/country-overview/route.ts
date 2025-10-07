export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { prisma } from '@/lib/prisma';
import { canAccessCountryFeatures } from '@/lib/permissions';

// GET /api/country-overview?weekIso=YYYY-Www
export async function GET(request: NextRequest) {
  try {
    // Проверяем токен
    const token = request.cookies.get('token')?.value;
    if (!token) {
      return NextResponse.json({ message: 'Не авторизован' }, { status: 401 });
    }

    const { getJwtSecret } = require('@/lib/env');
    const decoded = jwt.verify(token, getJwtSecret()) as any;

    // Проверяем доступ к Country Manager функциям
    if (!canAccessCountryFeatures(decoded)) {
      return NextResponse.json({ message: 'Нет доступа к данным сводки' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const weekIso = searchParams.get('weekIso');
    
    if (!weekIso) {
      return NextResponse.json({ message: 'Параметр weekIso обязателен' }, { status: 400 });
    }

    // Получаем данные для текущей недели и предыдущей для расчета deltas
    const prevWeek = getPreviousWeekISO(weekIso);
    
    // Получаем данные по городам из CountryAggregate
    const cityAggregates = await prisma.countryAggregate.findMany({
      where: { weekIso },
      include: { city: true }
    });

    const prevCityAggregates = await prisma.countryAggregate.findMany({
      where: { weekIso: prevWeek },
      include: { city: true }
    });

    // Получаем данные по менеджерам из CountryUserInput
    const userInputs = await prisma.countryUserInput.findMany({
      where: { weekIso },
      include: { user: true }
    });

    const prevUserInputs = await prisma.countryUserInput.findMany({
      where: { weekIso: prevWeek },
      include: { user: true }
    });

    // Получаем данные из самоотчетов (SELF)
    const weeklyReports = await prisma.weeklyReport.findMany({
      where: { weekIso },
      include: {
        hrMetrics: true,
        opsMetrics: true,
        user: true
      }
    });

    const prevWeeklyReports = await prisma.weeklyReport.findMany({
      where: { weekIso: prevWeek },
      include: {
        hrMetrics: true,
        opsMetrics: true,
        user: true
      }
    });

    // Производим расчет KPIs с источниками
    const kpis = calculateKPIs({
      cityAggregates,
      userInputs,
      weeklyReports
    }, {
      cityAggregates: prevCityAggregates,
      userInputs: prevUserInputs,
      weeklyReports: prevWeeklyReports
    });

    // Производим расчет по городам
    const byCity = calculateByCity({
      cityAggregates,
      userInputs,
      weeklyReports
    }, {
      cityAggregates: prevCityAggregates,
      userInputs: prevUserInputs,
      weeklyReports: prevWeeklyReports
    });

    // Получаем данные за последние 8-12 недель для графиков
    const weeks = await getRecentWeeks(weekIso, 12);
    const chartData = await getChartData(weeks);

    // Определяем время последнего обновления
    const timestamps = [
      ...cityAggregates.map(a => a.updatedAt),
      ...userInputs.map(u => u.updatedAt),
      ...weeklyReports.map(w => w.updatedAt)
    ].filter(Boolean);

    const lastUpdatedAt = timestamps.length > 0
      ? new Date(Math.max(...timestamps.map(d => d.getTime())))
      : null;

    return NextResponse.json({
      kpis,
      byCity,
      charts: {
        weeks: chartData
      },
      lastUpdatedAt,
      sources: {
        country_data: cityAggregates.length,
        manager_data: userInputs.length,
        self_reports: weeklyReports.length
      }
    });

  } catch (error) {
    console.error('Error fetching country overview:', error);
    return NextResponse.json(
      { message: 'Ошибка получения сводки по стране' },
      { status: 500 }
    );
  }
}

// Вспомогательные функции

function getPreviousWeekISO(weekISO: string): string {
  // Простая реализация получения предыдущей недели
  const match = weekISO.match(/^(\d{4})-W(\d{2})$/);
  if (!match) return weekISO;
  
  const year = parseInt(match[1]);
  const week = parseInt(match[2]);
  
  if (week > 1) {
    return `${year}-W${(week - 1).toString().padStart(2, '0')}`;
  } else {
    return `${year - 1}-W52`;
  }
}

function calculateKPIs(current: any, previous: any) {
  const data = {
    orders: getOrdersValue(current, 'country'),
    hired: getHiredValue(current, 'country'),
    messages: getMessagesValue(current, 'country'),
    tickets: getTicketsValue(current, 'country'),
    complaints: getComplaintsValue(current, 'country')
  };

  const prevData = {
    orders: getOrdersValue(previous, 'country'),
    hired: getHiredValue(previous, 'country'),
    messages: getMessagesValue(previous, 'country'),
    tickets: getTicketsValue(previous, 'country'),
    complaints: getComplaintsValue(previous, 'country')
  };

  const result: any = {};
  
  (['orders', 'hired', 'messages', 'tickets', 'complaints'] as const).forEach(key => {
    const currentValue = data[key];
    const prevValue = prevData[key];
    const source = getSource(current, key);
    
    result[key] = {
      value: currentValue.value,
      source: source,
      delta: calculateDelta(currentValue.value, prevValue.value)
    };
  });

  return result;
}

function calculateByCity(current: any, previous: any) {
  const cities = Array.from(new Set([
    ...current.cityAggregates.map((ca: any) => ca.city.name),
    ...current.weeklyReports.map((wr: any) => wr.user.city)
  ])).sort();

  return cities.map(cityName => {
    const cityData = calculateCityKPIs(cityName, current);
    const prevCityData = calculateCityKPIs(cityName, previous);
    
    return {
      city: cityName,
      orders: cityData.orders,
      messages: cityData.messages,
      // cityData не имеет value, это aggregate объект
      stressAvg: getStressAvg(current.weeklyReports.filter((wr: any) => wr.user.city === cityName)),
      fullDays: getFullDaysAvg(current.weeklyReports.filter((wr: any) => wr.user.city === cityName))
    };
  });
}

function calculateCityKPIs(cityName: string, data: any) {
  // Get pointers to values for this city
  const cityAgg = data.cityAggregates.find((ca: any) => ca.city.name === cityName);
  const userInputs = data.userInputs.filter((ui: any) => ui.user.city === cityName);
  const reports = data.weeklyReports.filter((wr: any) => wr.user.city === cityName);

  return {
    orders: {
      value: cityAgg?.cityOrders || 0,
      source: cityAgg ? 'COUNTRY' : 'NONE'
    },
    messages: {
      value: (userInputs.reduce((sum: number, ui: any) => sum + ui.trengoResponses, 0)) ||
             (reports.reduce((sum: number, wr: any) => sum + (wr.opsMetrics?.messages || 0), 0)),
      source: userInputs.length ? 'COUNTRY' : (reports.length ? 'SELF' : 'NONE')
    }
    // И т.д. для других KPI
  };
}

// Формулы для получения значений с источниками - заглушки для демонстрации структуры
function getOrdersValue(data: any, prefix: string) {
  const totalOrders = data.cityAggregates.reduce((sum: number, ca: any) => sum + ca.cityOrders, 0);
  return {
    value: totalOrders,
    source: data.cityAggregates.length ? 'COUNTRY' : 'NONE'
  };
}

function getHiredValue(data: any, prefix: string) {
  const totalHired = data.cityAggregates.reduce((sum: number, ca: any) => sum + ca.hiredPeople, 0);
  return {
    value: totalHired,
    source: data.cityAggregates.length ? 'COUNTRY' : 'NONE'
  };
}

function getMessagesValue(data: any, prefix: string) {
  const fromCountry = data.userInputs.reduce((sum: number, ui: any) => sum + ui.trengoResponses, 0);
  const fromSelf = data.weeklyReports.reduce((sum: number, wr: any) => sum + (wr.opsMetrics?.messages || 0), 0);
  
  const totalMessages = fromCountry + fromSelf;
  return {
    value: totalMessages,
    source: fromCountry > 0 ? 'COUNTRY' : (fromSelf > 0 ? 'SELF' : 'NONE')
  };
}

function getTicketsValue(data: any, prefix: string) {
  const fromCountry = data.userInputs.reduce((sum: number, ui: any) => sum + (ui.trengoTickets + ui.crmComplaintsClosed), 0);
  const fromSelf = data.weeklyReports.reduce((sum: number, wr: any) => sum + (wr.opsMetrics?.tickets || 0), 0);
  
  const totalTickets = fromCountry + fromSelf;
  return {
    value: totalTickets,
    source: fromCountry > 0 ? 'COUNTRY' : (fromSelf > 0 ? 'SELF' : 'NONE')
  };
}

function getComplaintsValue(data: any, prefix: string) {
  const fromCountry = data.cityAggregates.reduce((sum: number, ca: any) => sum + ca.crmComplaintsClosed, 0);
  const fromSelf = data.weeklyReports.reduce((sum: number, wr: any) => sum + (wr.opsMetrics?.tickets || 0), 0);
  
  const totalComplaints = fromCountry + fromSelf;
  return {
    value: totalComplaints,
    source: fromCountry > 0 ? 'COUNTRY' : (fromSelf > 0 ? 'SELF' : 'NONE')
  };
}

function getSource(data: any, key: string): string {
  if (data.cityAggregates.length || data.userInputs.length) {
    return 'COUNTRY';
  }
  if (data.weeklyReports.length) {
    return 'SELF';
  }
  return 'NONE';
}

function calculateDelta(current: number, previous: number): number | null {
  if (previous === 0) return null;
  return ((current - previous) / previous) * 100;
}

function getStressAvg(reports: any[]): number {
  if (reports.length === 0) return 0;
  const totalStress = reports.reduce((sum, r) => sum + (r.stressLevel || 0), 0);
  return Math.round(totalStress / reports.length * 10) / 10;
}

function getFullDaysAvg(reports: any[]): number {
  if (reports.length === 0) return 0;
  const totalDays = reports.reduce((sum, r) => sum + (r.workdays || 0), 0);
  return Math.round(totalDays / reports.length * 10) / 10;
}

async function getRecentWeeks(weekISO: string, count: number) {
  // Заглушка - это должно возвращать массив последних недель
  return [];
}

async function getChartData(weeks: string[]) {
  // Заглушка - это должно возвращать данные для графиков
  return { weeks: [] };
}
