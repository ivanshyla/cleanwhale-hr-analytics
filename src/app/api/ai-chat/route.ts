export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getOpenAIClient } from '@/lib/openai';
import { prisma } from '@/lib/prisma';
import { isoWeekOf, getPreviousWeek } from '@/lib/week';

export async function POST(request: NextRequest) {
  const authResult = requireAuth(request);
  if (authResult.error) return authResult.error;

  const { user } = authResult;

  // AI аналитика доступна только для ADMIN и COUNTRY_MANAGER
  if (user.role !== 'ADMIN' && user.role !== 'COUNTRY_MANAGER') {
    return NextResponse.json(
      { message: 'Доступ запрещен. AI аналитика доступна только для администраторов и менеджеров по стране.' },
      { status: 403 }
    );
  }

  try {
    const { question, period = 'week' } = await request.json();

    if (!question) {
      return NextResponse.json(
        { message: 'Вопрос не может быть пустым' },
        { status: 400 }
      );
    }

    const client = getOpenAIClient();
    if (!client) {
      return NextResponse.json(
        { message: 'AI анализ недоступен - не настроен OpenAI API ключ' },
        { status: 503 }
      );
    }

    // Определяем период для анализа
    let weekIsos: string[] = [];
    const currentWeek = isoWeekOf();
    
    if (period === 'week') {
      weekIsos = [currentWeek];
    } else if (period === 'month') {
      // Последние 4 недели
      weekIsos = [currentWeek];
      let week = currentWeek;
      for (let i = 0; i < 3; i++) {
        week = getPreviousWeek(week);
        weekIsos.push(week);
      }
    }

    // Загружаем данные за выбранный период
    const isCountryManager = ['ADMIN', 'COUNTRY_MANAGER'].includes(user.role);

    const whereClause: any = {
      weekIso: { in: weekIsos }
    };

    // Если обычный менеджер - показываем только его данные
    if (!isCountryManager) {
      whereClause.userId = user.userId;
    }

    const allReports = await prisma.weeklyReport.findMany({
      where: whereClause,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            role: true,
            city: true,
          }
        },
        hrMetrics: true,
        opsMetrics: true,
      },
      orderBy: {
        weekIso: 'desc'
      }
    });

    // Фильтруем отчеты с существующими пользователями
    const weeklyReports = allReports.filter(r => r.user !== null);

    // Получаем агрегированные данные по стране (если доступно)
    let countryData = null;
    if (isCountryManager) {
      // Преобразуем weekIso в weekNumber для запроса
      const weekNumbers = weekIsos.map(w => parseInt(w.split('-W')[1]));
      countryData = await prisma.countryManagerData.findMany({
        where: {
          weekNumber: { in: weekNumbers }
        },
        orderBy: {
          weekNumber: 'desc'
        }
      });
    }

    // Подготавливаем контекст для AI
    const context = {
      period: period === 'week' ? 'за текущую неделю' : 'за последний месяц',
      weekIsos,
      user: {
        login: user.login,  // JWT содержит login, не name
        role: user.role,
        city: user.city,
      },
      reports: weeklyReports.map(r => ({
        week: r.weekIso,
        manager: r.user.name,
        city: r.user.city,
        role: r.user.role,
        workdays: r.workdays,
        stressLevel: r.stressLevel,
        overtime: r.overtime,
        overtimeHours: r.overtimeHours,
        hr: r.hrMetrics ? {
          interviews: r.hrMetrics.interviews,
          jobPosts: r.hrMetrics.jobPosts,
          registrations: r.hrMetrics.registrations,  // Правильное имя поля из схемы
          fullDays: r.hrMetrics.fullDays,
          difficultCases: r.hrMetrics.difficultCases,  // Правильное имя поля из схемы
          stress: r.hrMetrics.stress,
          overtime: r.hrMetrics.overtime,
        } : null,
        ops: r.opsMetrics ? {
          messages: r.opsMetrics.messages,
          orders: r.opsMetrics.orders,
          fullDays: r.opsMetrics.fullDays,
          diffCleaners: r.opsMetrics.diffCleaners,
          diffClients: r.opsMetrics.diffClients,
          stress: r.opsMetrics.stress,
          overtime: r.opsMetrics.overtime,
        } : null,
      })),
      countryData: countryData?.map(cd => ({
        week: cd.weekNumber,
        totalWorkingDays: cd.totalWorkingDaysCountry,
        totalEmployees: cd.totalEmployeesActive,
        totalOrders: cd.countryTotalOrders,
        totalHires: cd.countryTotalHires,
        avgStress: cd.countryAvgStress,
        overtimeRate: cd.countryOvertimeRate,
      })) || null,
    };

    // Считаем общую статистику
    const stats = {
      totalReports: weeklyReports.length,
      totalHired: weeklyReports.reduce((sum, r) => sum + (r.hrMetrics?.registrations || 0), 0),
      totalMessages: weeklyReports.reduce((sum, r) => sum + (r.opsMetrics?.messages || 0), 0),
      totalOrders: weeklyReports.reduce((sum, r) => sum + (r.opsMetrics?.orders || 0), 0),
      avgStress: weeklyReports.length > 0 
        ? (weeklyReports.reduce((sum, r) => sum + (r.stressLevel || 0), 0) / weeklyReports.length).toFixed(1)
        : 0,
      overtimeCount: weeklyReports.filter(r => r.overtime).length,
    };

    // Формируем промпт для AI
    const systemPrompt = `Ты - аналитический ассистент для CleanWhale HR CRM. 
Твоя задача - анализировать данные команды и отвечать на вопросы менеджеров на русском языке.

Данные включают:
- Еженедельные отчеты менеджеров (HR и Operations)
- Метрики найма (интервью, вакансии, нанятые сотрудники)
- Метрики операций (сообщения, заказы, тикеты)
- Уровень стресса (1-10), переработки, рабочие дни

Отвечай:
- Кратко и по делу (2-4 предложения)
- С конкретными цифрами из данных
- С практическими выводами и рекомендациями
- На русском языке

Если данных недостаточно для ответа - так и скажи.`;

    const userPrompt = `Вопрос пользователя: ${question}

Контекст данных ${context.period}:

Общая статистика:
- Отчетов: ${stats.totalReports}
- Нанято: ${stats.totalHired} чел.
- Сообщений: ${stats.totalMessages}
- Заказов: ${stats.totalOrders}
- Средний стресс: ${stats.avgStress}/10
- Переработки: ${stats.overtimeCount} менеджеров

Детальные данные:
${JSON.stringify(context, null, 2)}

Проанализируй данные и ответь на вопрос конкретно и полезно.`;

    // Отправляем запрос в OpenAI
    const response = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: systemPrompt
        },
        {
          role: 'user',
          content: userPrompt
        }
      ],
      max_tokens: 500,
      temperature: 0.7,
    });

    const answer = response.choices[0]?.message?.content || 'Не удалось сгенерировать ответ';

    return NextResponse.json({
      answer,
      context: {
        period,
        weekIsos,
        stats,
        dataPointsCount: weeklyReports.length,
      }
    });

  } catch (error: any) {
    console.error('❌ Error in AI chat:');
    console.error('Error name:', error?.name);
    console.error('Error message:', error?.message);
    console.error('Error stack:', error?.stack);
    console.error('Full error:', error);
    
    return NextResponse.json(
      { 
        message: 'Ошибка при обработке запроса к AI',
        error: error?.message || 'Unknown error',
        details: process.env.NODE_ENV === 'development' ? error?.stack : undefined
      },
      { status: 500 }
    );
  }
}

