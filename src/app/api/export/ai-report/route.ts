export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getOpenAIClient } from '@/lib/openai';
import { prisma } from '@/lib/prisma';
import { isoWeekOf, getPreviousWeek, formatWeekForDisplay } from '@/lib/week';

export async function POST(request: NextRequest) {
  const authResult = requireAuth(request);
  if (authResult.error) return authResult.error;

  const { user } = authResult;

  // Доступ только для ADMIN и COUNTRY_MANAGER
  if (user.role !== 'ADMIN' && user.role !== 'COUNTRY_MANAGER') {
    return NextResponse.json(
      { message: 'Доступ запрещен' },
      { status: 403 }
    );
  }

  try {
    const { weekIso } = await request.json();
    const targetWeek = weekIso || isoWeekOf();

    const client = getOpenAIClient();
    if (!client) {
      return NextResponse.json(
        { message: 'AI анализ недоступен - не настроен OpenAI API ключ' },
        { status: 503 }
      );
    }

    // Получаем данные за последние 4 недели для анализа динамики
    const weeks = [targetWeek];
    let week = targetWeek;
    for (let i = 0; i < 3; i++) {
      week = getPreviousWeek(week);
      weeks.push(week);
    }

    // Загружаем все данные
    const reports = await prisma.weeklyReport.findMany({
      where: {
        weekIso: {
          in: weeks
        }
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            role: true,
            city: true,
            login: true
          }
        },
        hrMetrics: true,
        opsMetrics: true
      },
      orderBy: {
        weekIso: 'desc'
      }
    });

    // Группируем по неделям
    const weeklyData = weeks.map(w => {
      const weekReports = reports.filter(r => r.weekIso === w);
      
      return {
        weekIso: w,
        weekDisplay: formatWeekForDisplay(w),
        totalEmployees: weekReports.length,
        totalWorkdays: weekReports.reduce((sum, r) => sum + (r.workdays || 0), 0),
        avgStress: weekReports.length > 0 
          ? (weekReports.reduce((sum, r) => sum + (r.stressLevel || 0), 0) / weekReports.length).toFixed(1)
          : '0',
        totalOvertime: weekReports.filter(r => r.overtime).length,
        
        // HR метрики
        totalInterviews: weekReports.reduce((sum, r) => 
          sum + (r.hrMetrics?.interviews || 0), 0),
        totalJobPosts: weekReports.reduce((sum, r) => 
          sum + (r.hrMetrics?.jobPosts || 0), 0),
        totalRegistered: weekReports.reduce((sum, r) => 
          sum + (r.hrMetrics?.registered || 0), 0),
        
        // Ops метрики
        totalMessages: weekReports.reduce((sum, r) => 
          sum + (r.opsMetrics?.messages || 0), 0),
        totalOrders: weekReports.reduce((sum, r) => 
          sum + (r.opsMetrics?.orders || 0), 0),
        
        // По городам
        byCity: aggregateByCity(weekReports),
        
        // По типам менеджеров
        byType: aggregateByType(weekReports),
        
        // Детали по сотрудникам
        employees: weekReports.map(r => ({
          name: r.user.name,
          role: r.user.role,
          city: r.user.city,
          workdays: r.workdays,
          stress: r.stressLevel,
          overtime: r.overtime,
          registered: r.hrMetrics?.registered || 0,
          interviews: r.hrMetrics?.interviews || 0,
          messages: r.opsMetrics?.messages || 0,
          orders: r.opsMetrics?.orders || 0
        }))
      };
    });

    // Формируем промпт для OpenAI
    const prompt = `Ты - аналитик HR/Operations данных для CleanWhale Poland. 

Создай исчерпывающий отчет для правления компании на основе данных за последние 4 недели.

ДАННЫЕ ЗА 4 НЕДЕЛИ:
${JSON.stringify(weeklyData, null, 2)}

ТРЕБОВАНИЯ К ОТЧЕТУ:

1. **EXECUTIVE SUMMARY** (2-3 абзаца)
   - Ключевые достижения текущей недели
   - Критические проблемы требующие внимания
   - Главные рекомендации

2. **ДИНАМИКА КЛЮЧЕВЫХ МЕТРИК**
   Для каждой метрики покажи тренд за 4 недели:
   - Количество регистраций (найм)
   - Обработано заказов
   - Количество собеседований
   - Средний уровень стресса команды
   - Количество переработок
   - Используй символы: ↑ (рост), ↓ (падение), → (стабильно)
   - Укажи % изменения

3. **АНАЛИЗ ПО ГОРОДАМ**
   - Производительность каждого города
   - Сравнение городов между собой
   - Выявление лучших и проблемных локаций

4. **АНАЛИЗ КОМАНДЫ**
   - Распределение нагрузки
   - Выявление перегруженных сотрудников
   - Рекомендации по распределению задач

5. **ПРОГНОЗ НА СЛЕДУЮЩУЮ НЕДЕЛЮ**
   На основе трендов спрогнозируй:
   - Ожидаемое количество регистраций
   - Ожидаемое количество заказов
   - Потенциальные риски (переработки, высокий стресс)
   - Необходимые действия для предотвращения проблем

6. **СТРАТЕГИЧЕСКИЕ РЕКОМЕНДАЦИИ**
   - Топ-3 действия для улучшения показателей
   - Долгосрочные предложения

ФОРМАТ:
- Пиши на русском языке
- Используй markdown для форматирования
- Будь конкретным, используй цифры и проценты
- Выделяй важное жирным шрифтом
- Используй эмодзи для наглядности (📊 📈 📉 ⚠️ ✅ 🎯 💡)
- Общий объем: 800-1200 слов

Создай профессиональный отчет, который руководство сможет использовать для принятия управленческих решений.`;

    // Генерируем отчет через OpenAI
    const completion = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'Ты - опытный HR/Operations аналитик, специализирующийся на анализе данных и создании executive reports.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 3000
    });

    const report = completion.choices[0]?.message?.content || 'Не удалось сгенерировать отчет';

    // Добавляем заголовок с метаданными
    const fullReport = `# 📊 Аналитический отчет CleanWhale Poland

**Период:** ${formatWeekForDisplay(targetWeek)}  
**Дата создания:** ${new Date().toLocaleString('ru-RU')}  
**Подготовил:** ${user.name} (${user.role})

---

${report}

---

*Отчет сгенерирован AI-ассистентом CleanWhale Analytics*
`;

    return NextResponse.json({
      success: true,
      report: fullReport,
      weekIso: targetWeek,
      generatedAt: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('Error generating AI report:', error);
    return NextResponse.json(
      { 
        success: false,
        message: 'Ошибка генерации отчета',
        error: error.message 
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
    data.registered += r.hrMetrics?.registered || 0;
    data.orders += r.opsMetrics?.orders || 0;
    data.stressSum += r.stressLevel || 0;
  });
  
  return Array.from(cities.values()).map(d => ({
    ...d,
    avgStress: d.employees > 0 ? (d.stressSum / d.employees).toFixed(1) : '0'
  }));
}

function aggregateByType(reports: any[]) {
  const types = new Map();
  
  reports.forEach(r => {
    const type = r.user.role;
    if (!types.has(type)) {
      types.set(type, {
        type,
        count: 0,
        workdays: 0,
        registered: 0,
        orders: 0,
        avgStress: 0,
        stressSum: 0
      });
    }
    
    const data = types.get(type);
    data.count++;
    data.workdays += r.workdays || 0;
    data.registered += r.hrMetrics?.registered || 0;
    data.orders += r.opsMetrics?.orders || 0;
    data.stressSum += r.stressLevel || 0;
  });
  
  return Array.from(types.values()).map(d => ({
    ...d,
    avgStress: d.count > 0 ? (d.stressSum / d.count).toFixed(1) : '0'
  }));
}

