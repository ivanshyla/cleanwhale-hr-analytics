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
    // ✅ КРИТИЧНО: CRON_SECRET обязателен, без дефолта
    const cronSecret = process.env.CRON_SECRET;
    if (!cronSecret) {
      console.error('❌ CRON_SECRET not configured');
      return NextResponse.json({ 
        error: 'Server misconfiguration' 
      }, { status: 500 });
    }
    
    // Проверяем секретный ключ для безопасности
    const authHeader = request.headers.get('authorization');
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

    const allReports = await prisma.weeklyReport.findMany({
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

    // Фильтруем отчеты с существующими пользователями
    const reports = allReports.filter(r => r.user !== null);

    console.log(`📊 Found ${reports.length} reports for analysis (filtered from ${allReports.length} total)`);

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
    
    // Собираем заметки и сложные ситуации для анализа
    const qualitativeData = extractQualitativeData(currentWeekData);

    const prompt = `Ты - бизнес-аналитик CleanWhale, компании по клининговым услугам в Польше.

Напиши краткий executive summary для правления на основе данных за неделю ${formatWeekForDisplay(targetWeek)}.

ДАННЫЕ:

**По городам:**
${JSON.stringify(byCity, null, 2)}

**По типам менеджеров:**
${JSON.stringify(byType, null, 2)}

**Исторические данные (${weeks.length} недель):**
${JSON.stringify(aggregateHistorical(reports, weeks), null, 2)}

**Заметки и комментарии менеджеров:**
${qualitativeData.notes.length > 0 ? qualitativeData.notes.map(n => `- ${n.manager} (${n.city}): ${n.text}`).join('\n') : 'Нет заметок'}

**Работа с командой:**
${qualitativeData.teamComments.length > 0 ? qualitativeData.teamComments.map(c => `- ${c.manager} (${c.city}): ${c.text}`).join('\n') : 'Нет комментариев'}

**Сложные ситуации (HR):**
${qualitativeData.hrDifficulties.length > 0 ? qualitativeData.hrDifficulties.map(d => `- ${d.manager} (${d.city}): ${d.text}`).join('\n') : 'Нет сложных ситуаций'}

**Проблемы с клинерами (Ops):**
${qualitativeData.cleanerIssues.length > 0 ? qualitativeData.cleanerIssues.map(i => `- ${i.manager} (${i.city}): ${i.text}`).join('\n') : 'Нет проблем'}

**Проблемы с клиентами (Ops):**
${qualitativeData.clientIssues.length > 0 ? qualitativeData.clientIssues.map(i => `- ${i.manager} (${i.city}): ${i.text}`).join('\n') : 'Нет проблем'}

ТРЕБОВАНИЯ К ОТЧЕТУ:

1. **Executive Summary** (2-3 предложения) - главные выводы
2. **Ключевые метрики** с динамикой (↑↓) и процентами изменения
3. **Проблемные зоны** - что требует внимания (учитывай заметки и сложные ситуации!)
4. **Достижения** - что работает хорошо
5. **Прогноз на следующую неделю** - краткие ожидания

Пиши кратко, по делу, профессионально. Используй эмодзи для наглядности.
Формат: Markdown для Telegram.`;

    console.log('🤖 Calling OpenAI API...');
    
    if (!openai) {
      throw new Error('OpenAI client is not initialized');
    }
    
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

function extractQualitativeData(reports: any[]) {
  const notes: Array<{manager: string, city: string, text: string}> = [];
  const hrDifficulties: Array<{manager: string, city: string, text: string}> = [];
  const cleanerIssues: Array<{manager: string, city: string, text: string}> = [];
  const clientIssues: Array<{manager: string, city: string, text: string}> = [];
  const teamComments: Array<{manager: string, city: string, text: string}> = [];

  reports.forEach(r => {
    const manager = r.user.name;
    const city = r.user.city;

    // Собираем заметки
    if (r.notes && r.notes.trim()) {
      notes.push({ manager, city, text: r.notes.trim() });
    }

    // Собираем комментарии о работе с командой
    if (r.teamComment && r.teamComment.trim()) {
      teamComments.push({ manager, city, text: r.teamComment.trim() });
    }

    // Собираем сложные ситуации в HR
    if (r.hrMetrics?.difficultCases && r.hrMetrics.difficultCases.trim()) {
      hrDifficulties.push({ manager, city, text: r.hrMetrics.difficultCases.trim() });
    }

    // Собираем проблемы с клинерами
    if (r.opsMetrics?.diffCleaners && r.opsMetrics.diffCleaners.trim()) {
      cleanerIssues.push({ manager, city, text: r.opsMetrics.diffCleaners.trim() });
    }

    // Собираем проблемы с клиентами
    if (r.opsMetrics?.diffClients && r.opsMetrics.diffClients.trim()) {
      clientIssues.push({ manager, city, text: r.opsMetrics.diffClients.trim() });
    }
  });

  return { notes, teamComments, hrDifficulties, cleanerIssues, clientIssues };
}

