export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getOpenAIClient } from '@/lib/openai';
import { prisma } from '@/lib/prisma';
import { isoWeekOf, getPreviousWeek, formatWeekForDisplay } from '@/lib/week';
import { sendTelegramMessage, isTelegramConfigured } from '@/lib/telegram';

/**
 * Cron Job для автоматической отправки еженедельного отчета
 * Вызывается каждый понедельник в 12:00
 */
export async function GET(request: NextRequest) {
  try {
    // Проверяем секретный ключ для безопасности
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET || 'your-secret-key-here';
    
    if (authHeader !== `Bearer ${cronSecret}`) {
      console.error('❌ Unauthorized cron request');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('⏰ Cron job started: Weekly report generation');

    // Проверяем конфигурацию Telegram
    if (!isTelegramConfigured()) {
      console.error('❌ Telegram not configured');
      return NextResponse.json({ 
        success: false, 
        error: 'Telegram not configured' 
      }, { status: 500 });
    }

    // Получаем текущую неделю (завершенная неделя = прошлая)
    const currentWeek = isoWeekOf(new Date());
    const targetWeek = getPreviousWeek(currentWeek);
    console.log('📅 Generating report for week:', targetWeek);

    // Загружаем данные за последние 4 недели для анализа динамики
    const weeks = [targetWeek];
    for (let i = 1; i <= 3; i++) {
      weeks.push(getPreviousWeek(weeks[weeks.length - 1]));
    }

    const reports = await prisma.weeklyReport.findMany({
      where: {
        weekIso: { in: weeks }
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            role: true,
            city: true
          }
        },
        hrMetrics: true,
        opsMetrics: true
      },
      orderBy: {
        weekIso: 'desc'
      }
    });

    console.log(`📊 Found ${reports.length} reports for analysis`);

    if (reports.length === 0) {
      const message = `⚠️ *Отчет не сгенерирован*\n\nНет данных за неделю ${formatWeekForDisplay(targetWeek)}\n\nВозможные причины:\n- Менеджеры не заполнили еженедельные отчеты\n- Данные еще не внесены\n\n_CleanWhale Analytics_`;
      await sendTelegramMessage(message);
      
      return NextResponse.json({
        success: true,
        message: 'No data available, notification sent',
        weekIso: targetWeek
      });
    }

    // Агрегируем данные
    const currentWeekData = reports.filter(r => r.weekIso === targetWeek);
    const byCity = aggregateByCity(currentWeekData);
    const byType = aggregateByType(currentWeekData);

    // Генерируем AI отчет с помощью OpenAI
    const openai = getOpenAIClient();
    
    const prompt = `Ты - бизнес-аналитик CleanWhale, компании по клининговым услугам в Польше.

Напиши краткий executive summary для правления на основе данных за неделю ${formatWeekForDisplay(targetWeek)}.

ДАННЫЕ:

**По городам:**
${JSON.stringify(byCity, null, 2)}

**По типам менеджеров:**
${JSON.stringify(byType, null, 2)}

**Исторические данные (${weeks.length} недель):**
${JSON.stringify(aggregateHistorical(reports, weeks), null, 2)}

ТРЕБОВАНИЯ К ОТЧЕТУ:

1. **Executive Summary** (2-3 предложения) - главные выводы
2. **Ключевые метрики** с динамикой (↑↓) и процентами изменения
3. **Проблемные зоны** - что требует внимания
4. **Достижения** - что работает хорошо
5. **Прогноз на следующую неделю** - краткие ожидания

Пиши кратко, по делу, профессионально. Используй эмодзи для наглядности.
Формат: Markdown для Telegram.`;

    console.log('🤖 Calling OpenAI API...');
    
    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: 'Ты - опытный бизнес-аналитик, специализирующийся на HR и операционной аналитике. Пишешь краткие, информативные отчеты для топ-менеджмента.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 1500
    });

    const aiReport = completion.choices[0]?.message?.content || 'Отчет не сгенерирован';
    console.log('✅ AI report generated');

    // Формируем финальное сообщение
    const fullReport = `# 📊 ЕЖЕНЕДЕЛЬНЫЙ ОТЧЕТ

**Неделя:** ${formatWeekForDisplay(targetWeek)}
**Дата:** ${new Date().toLocaleDateString('ru-RU')}

---

${aiReport}

---

_Автоматический отчет от CleanWhale Analytics_
_Следующий отчет: ${formatWeekForDisplay(isoWeekOf(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)))}_`;

    // Отправляем в Telegram
    console.log('📱 Sending to Telegram...');
    const sent = await sendTelegramMessage(fullReport);

    if (!sent) {
      throw new Error('Failed to send Telegram message');
    }

    console.log('✅ Weekly report sent successfully');

    return NextResponse.json({
      success: true,
      message: 'Weekly report generated and sent',
      weekIso: targetWeek,
      sentToTelegram: true,
      reportLength: fullReport.length,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('❌ Error in cron job:', error);
    
    // Отправляем уведомление об ошибке в Telegram
    if (isTelegramConfigured()) {
      try {
        await sendTelegramMessage(
          `⚠️ *Ошибка генерации отчета*\n\n${error.message}\n\n_CleanWhale Analytics Cron Job_`
        );
      } catch (telegramError) {
        console.error('Failed to send error notification:', telegramError);
      }
    }

    return NextResponse.json(
      { 
        success: false,
        error: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}

// Вспомогательные функции
function aggregateByCity(reports: any[]) {
  const cities = new Map();
  
  reports.forEach(r => {
    const city = r.user.city;
    if (!cities.has(city)) {
      cities.set(city, {
        city,
        employees: 0,
        workdays: 0,
        registered: 0,
        orders: 0,
        avgStress: 0,
        stressSum: 0
      });
    }
    
    const data = cities.get(city);
    data.employees++;
    data.workdays += r.workdays || 0;
    data.registered += r.hrMetrics?.registrations || 0;
    data.orders += r.opsMetrics?.orders || 0;
    data.stressSum += r.stressLevel || 0;
  });

  cities.forEach(data => {
    data.avgStress = data.employees > 0 ? (data.stressSum / data.employees).toFixed(1) : 0;
    delete data.stressSum;
  });

  return Array.from(cities.values());
}

function aggregateByType(reports: any[]) {
  const types = new Map();
  
  reports.forEach(r => {
    const type = r.user.role;
    if (!types.has(type)) {
      types.set(type, {
        type,
        employees: 0,
        workdays: 0,
        registered: 0,
        orders: 0
      });
    }
    
    const data = types.get(type);
    data.employees++;
    data.workdays += r.workdays || 0;
    data.registered += r.hrMetrics?.registrations || 0;
    data.orders += r.opsMetrics?.orders || 0;
  });

  return Array.from(types.values());
}

function aggregateHistorical(reports: any[], weeks: string[]) {
  return weeks.map(week => {
    const weekReports = reports.filter(r => r.weekIso === week);
    return {
      week,
      totalEmployees: weekReports.length,
      totalWorkdays: weekReports.reduce((sum, r) => sum + (r.workdays || 0), 0),
      totalRegistered: weekReports.reduce((sum, r) => sum + (r.hrMetrics?.registrations || 0), 0),
      totalOrders: weekReports.reduce((sum, r) => sum + (r.opsMetrics?.orders || 0), 0),
      avgStress: weekReports.length > 0 
        ? (weekReports.reduce((sum, r) => sum + (r.stressLevel || 0), 0) / weekReports.length).toFixed(1)
        : 0
    };
  });
}

