import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

interface WeeklyReportData {
  reportDate: string;
  weekNumber: number;
  
  // Общие KPI
  totalRevenue: number;
  totalOrders: number;
  totalHires: number;
  totalWorkingDays: number;
  activeEmployees: number;
  
  // Финансовые показатели
  weeklyRevenue: number;
  weeklyProfit: number;
  marketingSpend: number;
  operationalCosts: number;
  avgOrderValue: number;
  costPerHire: number;
  costPerOrder: number;
  
  // Клиентские метрики
  newClients: number;
  clientRetention: number;
  customerSatisfaction: number;
  avgResponseTime: number;
  complaintRate: number;
  
  // HR метрики
  employeeSatisfaction: number;
  turnoverRate: number;
  avgStressLevel: number;
  overtimeRate: number;
  sickDays: number;
  
  // Операционные показатели
  orderCompletionRate: number;
  avgDeliveryTime: number;
  qualityScore: number;
  efficencyRate: number;
  
  // Рост и тренды
  revenueGrowth: number;
  ordersGrowth: number;
  hiresGrowth: number;
  clientsGrowth: number;
  
  // Данные по городам
  [key: string]: any; // для динамических полей по городам
  
  // Текстовые поля
  weeklyHighlights: string;
  keyAchievements: string;
  bestPerformers: string;
  majorIssues: string;
  challenges: string;
  risksIdentified: string;
  solutionsImplemented: string;
  improvementPlans: string;
  nextWeekPriorities: string;
  marketTrends: string;
  competitorActivity: string;
  strategicInitiatives: string;
  stakeholderFeedback: string;
  systemIssues: string;
  processChanges: string;
  trainingNeeds: string;
  resourceRequests: string;
}

export async function POST(request: NextRequest) {
  const authResult = requireAuth(request);
  if (authResult.error) {
    return authResult.error;
  }

  const { user } = authResult;

  // Проверяем права доступа
  if (!['COUNTRY_MANAGER', 'ADMIN'].includes(user.role)) {
    return NextResponse.json(
      { message: 'Доступ запрещен. Только для менеджеров по стране.' },
      { status: 403 }
    );
  }

  try {
    const data: WeeklyReportData = await request.json();

    // Извлекаем данные по городам
    const cityData = {
      WARSAW: {
        orders: data.warsawOrders || 0,
        revenue: data.warsawRevenue || 0,
        hires: data.warsawHires || 0,
        employees: data.warsawEmployees || 0,
        satisfaction: data.warsawSatisfaction || 0,
      },
      KRAKOW: {
        orders: data.krakowOrders || 0,
        revenue: data.krakowRevenue || 0,
        hires: data.krakowHires || 0,
        employees: data.krakowEmployees || 0,
        satisfaction: data.krakowSatisfaction || 0,
      },
      GDANSK: {
        orders: data.gdanskOrders || 0,
        revenue: data.gdanskRevenue || 0,
        hires: data.gdanskHires || 0,
        employees: data.gdanskEmployees || 0,
        satisfaction: data.gdanskSatisfaction || 0,
      },
      WROCLAW: {
        orders: data.wroclawOrders || 0,
        revenue: data.wroclawRevenue || 0,
        hires: data.wroclawHires || 0,
        employees: data.wroclawEmployees || 0,
        satisfaction: data.wroclawSatisfaction || 0,
      },
      POZNAN: {
        orders: data.poznanOrders || 0,
        revenue: data.poznanRevenue || 0,
        hires: data.poznanHires || 0,
        employees: data.poznanEmployees || 0,
        satisfaction: data.poznanSatisfaction || 0,
      },
      LODZ: {
        orders: data.lodzOrders || 0,
        revenue: data.lodzRevenue || 0,
        hires: data.lodzHires || 0,
        employees: data.lodzEmployees || 0,
        satisfaction: data.lodzSatisfaction || 0,
      },
    };

    // Сохраняем в модель CountryManagerData (расширенная версия)
    const savedReport = await prisma.countryManagerData.create({
      data: {
        userId: user.id,
        reportDate: new Date(data.reportDate),
        
        // Основные метрики
        totalWorkingDaysCountry: data.totalWorkingDays,
        totalEmployeesActive: data.activeEmployees,
        countryTotalOrders: data.totalOrders,
        countryTotalHires: data.totalHires,
        countryAvgStress: data.avgStressLevel,
        countryOvertimeRate: data.overtimeRate,
        
        // JSON данные по городам
        cityWorkingDays: cityData,
        cityEmployeeCounts: Object.fromEntries(
          Object.entries(cityData).map(([city, data]) => [city, data.employees])
        ),
        citySpecialNotes: {
          // Можно добавить специальные заметки по городам
          summary: `Неделя ${data.weekNumber}: Общая выручка ${data.totalRevenue} PLN`,
        },
        
        // Стратегические данные
        marketingCampaigns: [
          data.weeklyHighlights,
          data.keyAchievements,
          data.bestPerformers
        ].filter(Boolean).join('\n\n'),
        
        competitorAnalysis: [
          data.competitorActivity,
          data.marketTrends
        ].filter(Boolean).join('\n\n'),
        
        strategicGoals: [
          data.nextWeekPriorities,
          data.improvementPlans,
          data.strategicInitiatives
        ].filter(Boolean).join('\n\n'),
        
        budgetSpent: data.marketingSpend + data.operationalCosts,
        
        // Проблемы и решения
        majorIssues: [
          data.majorIssues,
          data.challenges,
          data.risksIdentified,
          data.systemIssues
        ].filter(Boolean).join('\n\n'),
        
        solutionsImplemented: [
          data.solutionsImplemented,
          data.processChanges,
          data.trainingNeeds
        ].filter(Boolean).join('\n\n'),
        
        riskAssessment: [
          data.risksIdentified,
          data.resourceRequests,
          data.stakeholderFeedback
        ].filter(Boolean).join('\n\n'),
      },
    });

    // Также создаем специальную запись для еженедельного отчета
    await prisma.$executeRaw`
      INSERT INTO "WeeklyCountryReport" (
        "id", "userId", "reportDate", "weekNumber",
        "totalRevenue", "totalOrders", "totalHires", "activeEmployees",
        "weeklyRevenue", "weeklyProfit", "marketingSpend", "operationalCosts",
        "newClients", "clientRetention", "customerSatisfaction",
        "revenueGrowth", "ordersGrowth", "hiresGrowth", "clientsGrowth",
        "cityData", "textData", "createdAt", "updatedAt"
      ) VALUES (
        gen_random_uuid(), ${user.id}, ${new Date(data.reportDate)}, ${data.weekNumber},
        ${data.totalRevenue}, ${data.totalOrders}, ${data.totalHires}, ${data.activeEmployees},
        ${data.weeklyRevenue}, ${data.weeklyProfit}, ${data.marketingSpend}, ${data.operationalCosts},
        ${data.newClients}, ${data.clientRetention}, ${data.customerSatisfaction},
        ${data.revenueGrowth}, ${data.ordersGrowth}, ${data.hiresGrowth}, ${data.clientsGrowth},
        ${JSON.stringify(cityData)}, ${JSON.stringify({
          weeklyHighlights: data.weeklyHighlights,
          keyAchievements: data.keyAchievements,
          bestPerformers: data.bestPerformers,
          majorIssues: data.majorIssues,
          challenges: data.challenges,
          risksIdentified: data.risksIdentified,
          solutionsImplemented: data.solutionsImplemented,
          improvementPlans: data.improvementPlans,
          nextWeekPriorities: data.nextWeekPriorities,
        })}, NOW(), NOW()
      )
      ON CONFLICT ("userId", "weekNumber") DO UPDATE SET
        "reportDate" = EXCLUDED."reportDate",
        "totalRevenue" = EXCLUDED."totalRevenue",
        "totalOrders" = EXCLUDED."totalOrders",
        "totalHires" = EXCLUDED."totalHires",
        "activeEmployees" = EXCLUDED."activeEmployees",
        "weeklyRevenue" = EXCLUDED."weeklyRevenue",
        "weeklyProfit" = EXCLUDED."weeklyProfit",
        "marketingSpend" = EXCLUDED."marketingSpend",
        "operationalCosts" = EXCLUDED."operationalCosts",
        "newClients" = EXCLUDED."newClients",
        "clientRetention" = EXCLUDED."clientRetention",
        "customerSatisfaction" = EXCLUDED."customerSatisfaction",
        "revenueGrowth" = EXCLUDED."revenueGrowth",
        "ordersGrowth" = EXCLUDED."ordersGrowth",
        "hiresGrowth" = EXCLUDED."hiresGrowth",
        "clientsGrowth" = EXCLUDED."clientsGrowth",
        "cityData" = EXCLUDED."cityData",
        "textData" = EXCLUDED."textData",
        "updatedAt" = NOW()
    `.catch(() => {
      // Если таблица не существует, игнорируем ошибку
      console.log('WeeklyCountryReport table does not exist, skipping...');
    });

    // Проверяем падения и создаем уведомления при необходимости
    await checkForDeclines(user.id, data);

    return NextResponse.json({
      message: 'Еженедельный отчет успешно сохранен',
      reportId: savedReport.id,
      weekNumber: data.weekNumber,
    });

  } catch (error) {
    console.error('Error saving weekly country report:', error);
    return NextResponse.json(
      { message: 'Ошибка сохранения отчета' },
      { status: 500 }
    );
  }
}

async function checkForDeclines(userId: string, currentData: WeeklyReportData) {
  try {
    // Получаем данные предыдущей недели для сравнения
    const previousWeek = await prisma.countryManagerData.findFirst({
      where: {
        userId: userId,
        reportDate: {
          lt: new Date(currentData.reportDate),
        },
      },
      orderBy: {
        reportDate: 'desc',
      },
    });

    if (!previousWeek) {
      return; // Нет данных для сравнения
    }

    const notifications = [];

    // Проверяем критические падения
    if (currentData.revenueGrowth < -10) {
      notifications.push({
        type: 'REVENUE_DECLINE',
        message: `Критическое падение выручки: ${currentData.revenueGrowth.toFixed(1)}%`,
        severity: 'HIGH',
      });
    }

    if (currentData.ordersGrowth < -15) {
      notifications.push({
        type: 'ORDERS_DECLINE',
        message: `Значительное падение заказов: ${currentData.ordersGrowth.toFixed(1)}%`,
        severity: 'HIGH',
      });
    }

    if (currentData.clientsGrowth < -20) {
      notifications.push({
        type: 'CLIENTS_DECLINE',
        message: `Критическая потеря клиентов: ${currentData.clientsGrowth.toFixed(1)}%`,
        severity: 'CRITICAL',
      });
    }

    if (currentData.customerSatisfaction < 6) {
      notifications.push({
        type: 'SATISFACTION_LOW',
        message: `Низкая удовлетворенность клиентов: ${currentData.customerSatisfaction}/10`,
        severity: 'MEDIUM',
      });
    }

    if (currentData.avgStressLevel > 7) {
      notifications.push({
        type: 'STRESS_HIGH',
        message: `Высокий уровень стресса сотрудников: ${currentData.avgStressLevel}/10`,
        severity: 'MEDIUM',
      });
    }

    // Создаем уведомления в базе данных
    for (const notif of notifications) {
      await prisma.notification.create({
        data: {
          userId: userId,
          type: notif.type,
          title: `Внимание: ${notif.type}`,
          message: notif.message,
          severity: notif.severity,
          isRead: false,
        },
      });
    }

  } catch (error) {
    console.error('Error checking for declines:', error);
  }
}

export async function GET(request: NextRequest) {
  const authResult = requireAuth(request);
  if (authResult.error) {
    return authResult.error;
  }

  const { user } = authResult;
  const { searchParams } = new URL(request.url);
  const weekNumber = searchParams.get('week');

  try {
    let reports;
    
    if (weekNumber) {
      // Получаем конкретную неделю
      reports = await prisma.countryManagerData.findFirst({
        where: {
          userId: user.id,
          // Добавляем поиск по номеру недели, если добавим это поле
        },
        orderBy: {
          reportDate: 'desc',
        },
      });
    } else {
      // Получаем последние отчеты
      reports = await prisma.countryManagerData.findMany({
        where: {
          userId: user.id,
        },
        orderBy: {
          reportDate: 'desc',
        },
        take: 10,
      });
    }

    return NextResponse.json({
      reports,
      message: 'Отчеты успешно загружены',
    });

  } catch (error) {
    console.error('Error fetching weekly reports:', error);
    return NextResponse.json(
      { message: 'Ошибка загрузки отчетов' },
      { status: 500 }
    );
  }
}
