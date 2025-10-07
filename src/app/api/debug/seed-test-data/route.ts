export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { guardDebugEndpoint, logDebugAccess } from '@/lib/debug-guard';
import { isoWeekOf, getPreviousWeek } from '@/lib/week';

export async function POST(request: NextRequest) {
  const guardError = guardDebugEndpoint();
  if (guardError) return guardError;
  logDebugAccess('/api/debug/seed-test-data', 'POST');
  
  try {
    console.log('🌱 Создаем тестовые данные...');

    const currentWeek = isoWeekOf();
    const lastWeek = getPreviousWeek(currentWeek);

    // Получаем пользователей для создания отчетов
    const users = await prisma.user.findMany({
      where: {
        role: {
          in: ['HIRING_MANAGER', 'OPS_MANAGER', 'MIXED_MANAGER']
        }
      }
    });

    console.log(`Найдено ${users.length} пользователей для создания отчетов`);

    let createdReports = 0;

    // Создаем отчеты за текущую и прошлую неделю
    for (const user of users) {
      for (const weekIso of [currentWeek, lastWeek]) {
        const [yearStr, weekStr] = weekIso.split('-W');
        const year = parseInt(yearStr);
        const weekNum = parseInt(weekStr);
        const weekStart = new Date(year, 0, 1 + (weekNum - 1) * 7);
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);

        // Проверяем, есть ли уже отчет
        const existing = await prisma.weeklyReport.findUnique({
          where: {
            userId_weekIso: {
              userId: user.id,
              weekIso
            }
          }
        });

        if (existing) {
          console.log(`Отчет уже существует: ${user.login} ${weekIso}`);
          continue;
        }

        // Создаем еженедельный отчет
        const report = await prisma.weeklyReport.create({
          data: {
            userId: user.id,
            weekIso,
            weekStartDate: weekStart,
            weekEndDate: weekEnd,
            workdays: 5,
            stressLevel: Math.floor(Math.random() * 5) + 3, // 3-7
            overtime: Math.random() > 0.5,
            overtimeHours: Math.random() > 0.5 ? Math.floor(Math.random() * 8) + 2 : 0,
            isCompleted: true,
            submittedAt: new Date()
          }
        });

        // Создаем HR метрики для HR и Mixed менеджеров
        if (user.role === 'HIRING_MANAGER' || user.role === 'MIXED_MANAGER') {
          await prisma.hrMetrics.create({
            data: {
              userId: user.id,
              reportId: report.id,
              weekIso,
              interviews: Math.floor(Math.random() * 10) + 5,
              jobPosts: Math.floor(Math.random() * 5) + 2,
              registrations: Math.floor(Math.random() * 15) + 8,
              fullDays: 5,
              stress: Math.floor(Math.random() * 5) + 3,
              overtime: Math.random() > 0.5
            }
          });
        }

        // Создаем Ops метрики для Ops и Mixed менеджеров
        if (user.role === 'OPS_MANAGER' || user.role === 'MIXED_MANAGER') {
          await prisma.opsMetrics.create({
            data: {
              userId: user.id,
              reportId: report.id,
              weekIso,
              messages: Math.floor(Math.random() * 100) + 50,
              tickets: Math.floor(Math.random() * 30) + 10,
              orders: Math.floor(Math.random() * 200) + 100,
              fullDays: 5,
              stress: Math.floor(Math.random() * 5) + 3,
              overtime: Math.random() > 0.5
            }
          });
        }

        createdReports++;
        console.log(`✅ Создан отчет: ${user.login} (${user.role}) за ${weekIso}`);
      }
    }

    // Создаем несколько встреч команды
    const countryManager = await prisma.user.findFirst({
      where: { role: 'COUNTRY_MANAGER' }
    });

    if (countryManager) {
      const meetingDates = [
        new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Неделю назад
        new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 дня назад
        new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // Вчера
      ];

      for (const date of meetingDates) {
        await prisma.teamMeeting.create({
          data: {
            userId: countryManager.id,
            meetingName: `Еженедельное совещание ${date.toLocaleDateString('ru-RU')}`,
            meetingDate: date,
            category: 'TEAM_STANDUP',
            attendees: JSON.stringify(users.slice(0, 5).map(u => u.id)),
            attendeeNames: JSON.stringify(users.slice(0, 5).map(u => u.name)),
            summary: `Обсуждение результатов недели, планы на следующую неделю. Присутствовали ${users.slice(0, 5).map(u => u.name).join(', ')}.`
          }
        });
      }
      console.log('✅ Создано 3 встречи команды');
    }

    return NextResponse.json({
      success: true,
      message: 'Тестовые данные созданы!',
      stats: {
        createdReports,
        weeks: [currentWeek, lastWeek],
        users: users.length
      }
    });

  } catch (error) {
    console.error('❌ Ошибка создания тестовых данных:', error);
    return NextResponse.json(
      { 
        success: false,
        message: 'Ошибка создания тестовых данных',
        error: String(error),
      },
      { status: 500 }
    );
  }
}

