import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

// Получение комплексной аналитики
export async function GET(request: NextRequest) {
  const authResult = requireAuth(request);
  if (authResult.error) {
    return authResult.error;
  }

  const { user } = authResult;
  const { searchParams } = new URL(request.url);
  const startDate = searchParams.get('startDate');
  const endDate = searchParams.get('endDate');
  const city = searchParams.get('city');

  try {
    let whereClause: any = {};

    // Фильтр по дате
    if (startDate && endDate) {
      whereClause.reportDate = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      };
    }

    // Фильтр по городу
    if (city) {
      whereClause.city = city;
    }

    // Права доступа: country manager видит все, остальные только свой город
    if (!['COUNTRY_MANAGER', 'ADMIN'].includes(user.role)) {
      whereClause.city = user.city;
    }

    const analytics = await prisma.unifiedAnalytics.findMany({
      where: whereClause,
      orderBy: [
        { reportDate: 'desc' },
        { city: 'asc' }
      ]
    });

    // Группируем данные по городам для анализа
    const cityGroups = analytics.reduce((acc: any, record) => {
      const cityKey = record.city;
      if (!acc[cityKey]) {
        acc[cityKey] = [];
      }
      acc[cityKey].push(record);
      return acc;
    }, {});

    // Вычисляем корреляции
    const correlations = calculateCorrelations(analytics);

    return NextResponse.json({
      analytics,
      cityGroups,
      correlations,
      total: analytics.length,
    });

  } catch (error) {
    console.error('Error fetching unified analytics:', error);
    return NextResponse.json(
      { message: 'Ошибка получения аналитики' },
      { status: 500 }
    );
  }
}

// Создание/обновление аналитики
export async function POST(request: NextRequest) {
  const authResult = requireAuth(request);
  if (authResult.error) {
    return authResult.error;
  }

  const { user } = authResult;

  try {
    // Только country manager может вносить данные
    if (!['COUNTRY_MANAGER', 'ADMIN'].includes(user.role)) {
      return NextResponse.json(
        { message: 'Недостаточно прав для ввода аналитических данных' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      reportDate,
      weekStartDate,
      city,
      // HR данные
      hrInterviews,
      hrJobPostings,
      hrRegistrations,
      hrCommunications,
      hrMeetings,
      hrNewHires,
      // Операционные данные
      totalOrders,
      completedOrders,
      cancelledOrders,
      // Жалобы и качество
      totalComplaints,
      resolvedComplaints,
      complaintTypes,
      // Оценки
      avgCustomerRating,
      positiveRatings,
      negativeRatings,
      // Персонал
      activeEmployees,
      workingDays,
      overtimeHours,
      employeeSatisfaction,
    } = body;

    if (!reportDate || !weekStartDate || !city) {
      return NextResponse.json(
        { message: 'Дата отчета, начало недели и город обязательны' },
        { status: 400 }
      );
    }

    const reportDateObj = new Date(reportDate);
    const weekStartDateObj = new Date(weekStartDate);

    // Проверяем, есть ли уже запись за эту дату и город
    const existingRecord = await prisma.unifiedAnalytics.findFirst({
      where: {
        reportDate: reportDateObj,
        city: city,
      }
    });

    let savedData;

    if (existingRecord) {
      // Обновляем существующую запись
      savedData = await prisma.unifiedAnalytics.update({
        where: { id: existingRecord.id },
        data: {
          weekStartDate: weekStartDateObj,
          // HR данные
          hrInterviews: parseInt(hrInterviews) || 0,
          hrJobPostings: parseInt(hrJobPostings) || 0,
          hrRegistrations: parseInt(hrRegistrations) || 0,
          hrCommunications: parseInt(hrCommunications) || 0,
          hrMeetings: parseInt(hrMeetings) || 0,
          hrNewHires: parseInt(hrNewHires) || 0,
          // Операционные данные
          totalOrders: parseInt(totalOrders) || 0,
          completedOrders: parseInt(completedOrders) || 0,
          cancelledOrders: parseInt(cancelledOrders) || 0,
          // Жалобы и качество
          totalComplaints: parseInt(totalComplaints) || 0,
          resolvedComplaints: parseInt(resolvedComplaints) || 0,
          complaintTypes: complaintTypes || null,
          // Оценки
          avgCustomerRating: avgCustomerRating ? parseFloat(avgCustomerRating) : null,
          positiveRatings: parseInt(positiveRatings) || 0,
          negativeRatings: parseInt(negativeRatings) || 0,
          // Персонал
          activeEmployees: parseInt(activeEmployees) || 0,
          workingDays: workingDays ? parseFloat(workingDays) : 0,
          overtimeHours: overtimeHours ? parseFloat(overtimeHours) : 0,
          employeeSatisfaction: employeeSatisfaction ? parseFloat(employeeSatisfaction) : null,
          updatedAt: new Date(),
        }
      });
    } else {
      // Создаем новую запись
      savedData = await prisma.unifiedAnalytics.create({
        data: {
          reportDate: reportDateObj,
          weekStartDate: weekStartDateObj,
          city: city,
          // HR данные
          hrInterviews: parseInt(hrInterviews) || 0,
          hrJobPostings: parseInt(hrJobPostings) || 0,
          hrRegistrations: parseInt(hrRegistrations) || 0,
          hrCommunications: parseInt(hrCommunications) || 0,
          hrMeetings: parseInt(hrMeetings) || 0,
          hrNewHires: parseInt(hrNewHires) || 0,
          // Операционные данные
          totalOrders: parseInt(totalOrders) || 0,
          completedOrders: parseInt(completedOrders) || 0,
          cancelledOrders: parseInt(cancelledOrders) || 0,
          // Жалобы и качество
          totalComplaints: parseInt(totalComplaints) || 0,
          resolvedComplaints: parseInt(resolvedComplaints) || 0,
          complaintTypes: complaintTypes || null,
          // Оценки
          avgCustomerRating: avgCustomerRating ? parseFloat(avgCustomerRating) : null,
          positiveRatings: parseInt(positiveRatings) || 0,
          negativeRatings: parseInt(negativeRatings) || 0,
          // Персонал
          activeEmployees: parseInt(activeEmployees) || 0,
          workingDays: workingDays ? parseFloat(workingDays) : 0,
          overtimeHours: overtimeHours ? parseFloat(overtimeHours) : 0,
          employeeSatisfaction: employeeSatisfaction ? parseFloat(employeeSatisfaction) : null,
        }
      });
    }

    return NextResponse.json({
      message: existingRecord ? 'Данные обновлены' : 'Данные сохранены',
      data: savedData,
    });

  } catch (error) {
    console.error('Error saving unified analytics:', error);
    return NextResponse.json(
      { message: 'Ошибка сохранения данных', error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

// Функция для расчета корреляций между HR и операционными данными
function calculateCorrelations(data: any[]) {
  if (data.length < 3) return {};

  const correlations: any = {};

  // Корреляция найма и заказов
  correlations.hiresOrders = calculatePearsonCorrelation(
    data.map(d => d.hrNewHires),
    data.map(d => d.totalOrders)
  );

  // Корреляция коммуникаций и жалоб
  correlations.communicationsComplaints = calculatePearsonCorrelation(
    data.map(d => d.hrCommunications),
    data.map(d => d.totalComplaints)
  );

  // Корреляция удовлетворенности сотрудников и оценок клиентов
  const employeeSat = data.filter(d => d.employeeSatisfaction !== null).map(d => d.employeeSatisfaction);
  const customerRat = data.filter(d => d.avgCustomerRating !== null).map(d => d.avgCustomerRating);
  
  if (employeeSat.length > 2 && customerRat.length > 2) {
    correlations.employeeCustomerSatisfaction = calculatePearsonCorrelation(employeeSat, customerRat);
  }

  return correlations;
}

// Функция расчета корреляции Пирсона
function calculatePearsonCorrelation(x: number[], y: number[]): number {
  if (x.length !== y.length || x.length < 2) return 0;

  const n = x.length;
  const sumX = x.reduce((a, b) => a + b, 0);
  const sumY = y.reduce((a, b) => a + b, 0);
  const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
  const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0);
  const sumY2 = y.reduce((sum, yi) => sum + yi * yi, 0);

  const numerator = n * sumXY - sumX * sumY;
  const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));

  if (denominator === 0) return 0;
  return numerator / denominator;
}
