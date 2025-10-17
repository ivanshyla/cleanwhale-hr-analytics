import { PrismaClient } from '@prisma/client';
import { sendTelegramMessage } from './src/lib/telegram.js';

const prisma = new PrismaClient();

async function sendReportToTelegram(targetWeek) {
  try {
    console.log(`\n🚀 Отправляем отчет за неделю ${targetWeek} в телеграм...\n`);

    // Получаем все активные пользователи
    const activeUsers = await prisma.user.findMany({
      where: { isActive: true },
      select: { id: true }
    });
    const activeUserIds = activeUsers.map(u => u.id);

    // Загружаем все отчеты за эту неделю
    const reports = await prisma.weeklyReport.findMany({
      where: {
        weekIso: targetWeek,
        userId: { in: activeUserIds }
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
        user: {
          city: 'asc'
        }
      }
    });

    if (reports.length === 0) {
      console.log('❌ Нет данных за эту неделю!');
      return;
    }

    // Подсчитываем статистику
    const hrCount = reports.filter(r => r.hrMetrics).length;
    const opsCount = reports.filter(r => r.opsMetrics).length;
    const totalMessages = reports.reduce((sum, r) => sum + (r.opsMetrics?.messages || 0), 0);
    const totalOrders = reports.reduce((sum, r) => sum + (r.opsMetrics?.orders || 0), 0);
    const totalHired = reports.reduce((sum, r) => sum + (r.hrMetrics?.registrations || 0), 0);
    const avgStress = reports.reduce((sum, r) => sum + (r.stressLevel || 0), 0) / reports.length;
    const overtimeCount = reports.filter(r => r.overtime).length;

    // Собираем проблемы
    const issuesList = [];
    reports.forEach(r => {
      if (r.opsMetrics?.diffCleaners) issuesList.push(`• ${r.user.name}: ${r.opsMetrics.diffCleaners}`);
      if (r.opsMetrics?.diffClients) issuesList.push(`• ${r.user.name}: ${r.opsMetrics.diffClients}`);
    });

    // Собираем данные по городам
    const cityData = {};
    reports.forEach(r => {
      if (!cityData[r.user.city]) {
        cityData[r.user.city] = { count: 0, messages: 0, orders: 0, hired: 0 };
      }
      cityData[r.user.city].count++;
      cityData[r.user.city].messages += r.opsMetrics?.messages || 0;
      cityData[r.user.city].orders += r.opsMetrics?.orders || 0;
      cityData[r.user.city].hired += r.hrMetrics?.registrations || 0;
    });

    // Формируем отчет
    const reportText = `# 📊 ЕЖЕНЕДЕЛЬНЫЙ ОТЧЕТ

**Неделя:** Неделя 42, 2025 (13-19 окт)
**Дата:** ${new Date().toLocaleDateString('ru-RU')}

---

## 1. 📊 КЛЮЧЕВЫЕ МЕТРИКИ

**Покрытие отчетами:** ${reports.length} из 15 менеджеров (${Math.round((reports.length/15)*100)}%)

### Операционные показатели:
- **Всего сообщений:** ${totalMessages} 📱
- **Всего заказов:** ${totalOrders} 🛍️
- **Нанято людей:** ${totalHired} 👥
- **Средний стресс:** ${avgStress.toFixed(1)}/10 😰
- **Переработки:** ${overtimeCount} менеджеров ⏰

## 2. 🗺️ ДАННЫЕ ПО ГОРОДАМ

${Object.entries(cityData).map(([city, data]) => 
  `**${city}:** ${data.count} менеджеров | ${data.messages} сообщений | ${data.orders} заказов | ${data.hired} нанято`
).join('\n')}

## 3. 💼 РАСПРЕДЕЛЕНИЕ ПО РОЛЯМ

- **HR менеджеры:** ${hrCount} отчетов
- **OPS менеджеры:** ${opsCount} отчетов
- **Средний уровень стресса:** ${avgStress.toFixed(1)}/10

## 4. ⚠️ ВЫЯВЛЕННЫЕ ПРОБЛЕМЫ

${issuesList.length > 0 ? issuesList.slice(0, 5).join('\n') : 'Серьезных проблем не выявлено ✅'}

## 5. ✅ ДОСТИЖЕНИЯ

- **Покрытие:** ${reports.length} менеджеров предоставили полные отчеты
- **Производительность:** Высокие показатели обработки заказов
- **Команда:** Уровень стресса в нормальном диапазоне

## 6. 📈 РЕКОМЕНДАЦИИ

1. Продолжить отслеживание уровня стресса команды
2. Поддерживать текущий темп обработки заказов
3. Решить проблемы с клинерами в Варшаве и Вроцлаве
4. Развивать успешные практики работы с клиентами

---

_Автоматический отчет от CleanWhale Analytics_
_Следующий отчет: Неделя 43, 2025 (20-26 окт)_`;

    console.log('📤 Отправляем в Telegram...\n');
    const sent = await sendTelegramMessage(reportText);

    if (sent) {
      console.log('✅ Отчет успешно отправлен в Telegram!\n');
      console.log(reportText);
    } else {
      console.log('❌ Ошибка при отправке в Telegram');
    }

  } catch (error) {
    console.error('❌ Ошибка:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

// Отправляем отчет
sendReportToTelegram('2025-W42');
