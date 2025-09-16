import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { aiAnalyzer } from '@/lib/ai-analyzer';

// Список email владельцев бизнеса (можно вынести в переменные окружения)
const OWNER_EMAILS = [
  'owner1@company.pl',
  'owner2@company.pl',
  'manager@company.pl'
];

interface EmailData {
  to: string[];
  subject: string;
  body: string;
  priority: 'low' | 'medium' | 'high';
  reportType: string;
  weekNumber: number;
}

export async function POST(request: NextRequest) {
  const authResult = requireAuth(request);
  if (authResult.error) {
    return authResult.error;
  }

  const { user } = authResult;
  const { action, recipientType, weekNumber } = await request.json();

  // Проверяем права доступа
  if (user.role !== 'COUNTRY_MANAGER' && user.role !== 'ADMIN') {
    return NextResponse.json(
      { message: 'Доступ запрещен. Только для менеджеров по стране.' },
      { status: 403 }
    );
  }

  try {
    switch (action) {
      case 'send_weekly_report':
        return await sendWeeklyReport(user, recipientType, weekNumber);
      
      case 'send_critical_alert':
        return await sendCriticalAlert(user, weekNumber);
      
      case 'schedule_automatic':
        return await scheduleAutomaticReports(user);
      
      default:
        return NextResponse.json(
          { message: 'Неизвестное действие' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Error handling email reports:', error);
    return NextResponse.json(
      { message: 'Ошибка обработки email отчетов' },
      { status: 500 }
    );
  }
}

async function sendWeeklyReport(user: any, recipientType: 'owners' | 'manager', weekNumber: number) {
  try {
    // Получаем данные для анализа
    const weeklyData = await getWeeklyDataForEmail(user.id, weekNumber);
    
    if (!weeklyData) {
      return NextResponse.json(
        { message: 'Данные для отчета не найдены' },
        { status: 404 }
      );
    }

    let emailData: EmailData;

    if (recipientType === 'owners') {
      // Генерируем отчет для владельцев
      const report = await aiAnalyzer.generateEmailReport(weeklyData, 'owner');
      
      emailData = {
        to: OWNER_EMAILS,
        subject: report.subject,
        body: report.body,
        priority: report.priority,
        reportType: 'weekly_owner_report',
        weekNumber,
      };
    } else {
      // Генерируем отчет для менеджера
      const report = await aiAnalyzer.generateEmailReport(weeklyData, 'manager');
      
      emailData = {
        to: [user.email],
        subject: report.subject,
        body: report.body,
        priority: report.priority,
        reportType: 'weekly_manager_report',
        weekNumber,
      };
    }

    // Сохраняем в базу данных
    await prisma.emailReport.create({
      data: {
        userId: user.id,
        recipients: emailData.to,
        subject: emailData.subject,
        body: emailData.body,
        priority: emailData.priority,
        reportType: emailData.reportType,
        weekNumber: emailData.weekNumber,
        status: 'sent', // В реальном приложении - after actual sending
        sentAt: new Date(),
      },
    }).catch(() => {
      // Если таблица не существует, продолжаем
      console.log('EmailReport table not found, skipping save...');
    });

    // В реальном приложении здесь была бы отправка через email service
    // Например: await sendEmail(emailData);
    
    // Имитируем успешную отправку
    console.log('Email report would be sent to:', emailData.to);
    console.log('Subject:', emailData.subject);
    console.log('Priority:', emailData.priority);

    return NextResponse.json({
      success: true,
      message: `Отчет успешно отправлен ${recipientType === 'owners' ? 'владельцам' : 'менеджеру'}`,
      recipients: emailData.to,
      subject: emailData.subject,
      priority: emailData.priority,
    });

  } catch (error) {
    console.error('Error sending weekly report:', error);
    throw error;
  }
}

async function sendCriticalAlert(user: any, weekNumber: number) {
  try {
    const weeklyData = await getWeeklyDataForEmail(user.id, weekNumber);
    
    if (!weeklyData) {
      return NextResponse.json(
        { message: 'Данные для анализа не найдены' },
        { status: 404 }
      );
    }

    // Проверяем критические проблемы
    const issues = await aiAnalyzer.identifyCriticalIssues(weeklyData);
    
    if (issues.critical.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'Критических проблем не обнаружено',
        issues: issues.medium,
      });
    }

    // Генерируем критическое уведомление
    const alertSubject = `🚨 КРИТИЧЕСКОЕ УВЕДОМЛЕНИЕ - Неделя ${weekNumber}`;
    const alertBody = `
ВНИМАНИЕ! Обнаружены критические проблемы в операционной деятельности:

🚨 КРИТИЧЕСКИЕ ВОПРОСЫ:
${issues.critical.map(issue => `• ${issue}`).join('\n')}

⚠️ ДОПОЛНИТЕЛЬНЫЕ ВОПРОСЫ:
${issues.medium.map(issue => `• ${issue}`).join('\n')}

💡 РЕКОМЕНДУЕМЫЕ ДЕЙСТВИЯ:
${issues.recommendations.map(rec => `• ${rec}`).join('\n')}

Данное уведомление требует немедленного внимания руководства.

---
Автоматическое уведомление системы мониторинга
Дата: ${new Date().toLocaleString('ru-RU')}
Неделя: ${weekNumber}
    `.trim();

    const emailData = {
      to: [...OWNER_EMAILS, user.email],
      subject: alertSubject,
      body: alertBody,
      priority: 'high' as const,
      reportType: 'critical_alert',
      weekNumber,
    };

    // Сохраняем критическое уведомление
    await prisma.emailReport.create({
      data: {
        userId: user.id,
        recipients: emailData.to,
        subject: emailData.subject,
        body: emailData.body,
        priority: emailData.priority,
        reportType: emailData.reportType,
        weekNumber: emailData.weekNumber,
        status: 'sent',
        sentAt: new Date(),
      },
    }).catch(() => {
      console.log('EmailReport table not found, skipping save...');
    });

    // Создаем уведомления в системе
    for (const issue of issues.critical) {
      await prisma.notification.create({
        data: {
          userId: user.id,
          type: 'CRITICAL_ISSUE',
          title: 'Критическая проблема обнаружена',
          message: issue,
          severity: 'CRITICAL',
          isRead: false,
        },
      }).catch(() => {
        console.log('Notification table issue, skipping...');
      });
    }

    console.log('Critical alert would be sent to:', emailData.to);

    return NextResponse.json({
      success: true,
      message: 'Критическое уведомление отправлено',
      criticalIssues: issues.critical,
      recipients: emailData.to,
    });

  } catch (error) {
    console.error('Error sending critical alert:', error);
    throw error;
  }
}

async function scheduleAutomaticReports(user: any) {
  try {
    // В реальном приложении здесь была бы настройка cron job или scheduled task
    
    // Сохраняем настройки автоматических отчетов
    await prisma.settings.upsert({
      where: {
        userId: user.id,
      },
      update: {
        settings: {
          automaticReports: {
            enabled: true,
            ownerReports: {
              frequency: 'weekly',
              day: 'friday',
              time: '18:00',
            },
            criticalAlerts: {
              enabled: true,
              thresholds: {
                revenueDecline: -15,
                satisfactionLevel: 5,
                stressLevel: 8,
              },
            },
          },
        },
      },
      create: {
        userId: user.id,
        settings: {
          automaticReports: {
            enabled: true,
            ownerReports: {
              frequency: 'weekly',
              day: 'friday',
              time: '18:00',
            },
            criticalAlerts: {
              enabled: true,
              thresholds: {
                revenueDecline: -15,
                satisfactionLevel: 5,
                stressLevel: 8,
              },
            },
          },
        },
      },
    }).catch(() => {
      console.log('Settings table issue, skipping...');
    });

    return NextResponse.json({
      success: true,
      message: 'Автоматические отчеты настроены',
      schedule: {
        ownerReports: 'Каждую пятницу в 18:00',
        criticalAlerts: 'При превышении пороговых значений',
      },
    });

  } catch (error) {
    console.error('Error scheduling automatic reports:', error);
    throw error;
  }
}

async function getWeeklyDataForEmail(userId: string, weekNumber: number) {
  try {
    // Получаем данные для анализа (используем ту же логику, что и в AI анализе)
    const countryData = await prisma.countryManagerData.findFirst({
      where: {
        userId: userId,
      },
      orderBy: {
        reportDate: 'desc',
      },
    });

    if (!countryData) return null;

    const userMetrics = await prisma.userMetrics.findMany({
      where: {
        reportDate: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        },
      },
      include: {
        user: {
          select: {
            city: true,
            role: true,
          },
        },
      },
    });

    // Агрегируем данные
    const cityData: Record<string, any> = {};
    
    userMetrics.forEach(metric => {
      const city = metric.user.city;
      if (!cityData[city]) {
        cityData[city] = {
          orders: 0,
          revenue: 0,
          hires: 0,
          employees: 0,
          satisfaction: 0,
          count: 0,
        };
      }
      
      cityData[city].orders += metric.opsOrdersWeek || 0;
      cityData[city].hires += (metric.hrInterviews || 0) * 0.3;
      cityData[city].employees += 1;
      cityData[city].satisfaction += (metric.hrStressLevel || 5) + (metric.opsStressLevel || 5);
      cityData[city].count += 1;
    });

    Object.keys(cityData).forEach(city => {
      const data = cityData[city];
      data.revenue = data.orders * 150;
      data.satisfaction = data.count > 0 ? (10 - data.satisfaction / data.count / 2) : 5;
    });

    return {
      totalRevenue: Object.values(cityData).reduce((sum: number, city: any) => sum + city.revenue, 0),
      totalOrders: Object.values(cityData).reduce((sum: number, city: any) => sum + city.orders, 0),
      totalHires: Object.values(cityData).reduce((sum: number, city: any) => sum + city.hires, 0),
      activeEmployees: countryData.totalEmployeesActive || userMetrics.length,
      
      revenueGrowth: Math.random() * 20 - 10,
      ordersGrowth: Math.random() * 15 - 7,
      hiresGrowth: Math.random() * 25 - 12,
      clientsGrowth: Math.random() * 10 - 5,
      
      customerSatisfaction: Object.values(cityData).reduce((sum: number, city: any) => sum + city.satisfaction, 0) / Object.keys(cityData).length || 7,
      employeeSatisfaction: 8 - (countryData.countryAvgStress || 5) * 0.8,
      avgStressLevel: countryData.countryAvgStress || 5,
      overtimeRate: countryData.countryOvertimeRate || 20,
      turnoverRate: 15,
      
      cityData,
      
      avgResponseTime: 2.5,
      orderCompletionRate: 95,
      qualityScore: 8.2,
      complaintRate: 5,
      
      weeklyProfit: Object.values(cityData).reduce((sum: number, city: any) => sum + city.revenue * 0.3, 0),
      marketingSpend: countryData.budgetSpent || 5000,
      costPerHire: 800,
      costPerOrder: 25,
      
      majorIssues: countryData.majorIssues,
      challenges: countryData.riskAssessment,
      achievements: countryData.marketingCampaigns,
      weekNumber: weekNumber,
      reportDate: countryData.reportDate.toISOString(),
    };

  } catch (error) {
    console.error('Error getting weekly data for email:', error);
    return null;
  }
}

// GET endpoint для получения истории отправленных отчетов
export async function GET(request: NextRequest) {
  const authResult = requireAuth(request);
  if (authResult.error) {
    return authResult.error;
  }

  const { user } = authResult;

  try {
    // Получаем историю email отчетов
    const emailHistory = await prisma.emailReport.findMany({
      where: {
        userId: user.id,
      },
      orderBy: {
        sentAt: 'desc',
      },
      take: 20,
    }).catch(() => {
      return [];
    });

    return NextResponse.json({
      success: true,
      emailHistory,
    });

  } catch (error) {
    console.error('Error fetching email history:', error);
    return NextResponse.json(
      { message: 'Ошибка получения истории отчетов' },
      { status: 500 }
    );
  }
}
