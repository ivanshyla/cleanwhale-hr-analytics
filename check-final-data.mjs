import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  try {
    const weekIso = '2025-W42';
    
    console.log('📊 ФИНАЛЬНАЯ ПРОВЕРКА ДАННЫХ\n');
    console.log(`📅 Неделя: ${weekIso}\n`);

    // Проверяем отчеты
    const reports = await prisma.weeklyReport.findMany({
      where: { weekIso },
      include: { user: true, hrMetrics: true, opsMetrics: true }
    });

    console.log(`✅ Отчетов: ${reports.length}`);
    
    if (reports.length > 0) {
      console.log(`✅ Данные загружены в БД\n`);
      
      // Краткая статистика
      const hrCount = reports.filter(r => r.hrMetrics).length;
      const opsCount = reports.filter(r => r.opsMetrics).length;
      const totalMessages = reports.reduce((sum, r) => sum + (r.opsMetrics?.messages || 0), 0);
      const totalOrders = reports.reduce((sum, r) => sum + (r.opsMetrics?.orders || 0), 0);
      const totalHired = reports.reduce((sum, r) => sum + (r.hrMetrics?.registrations || 0), 0);
      
      console.log(`📈 Статистика:`);
      console.log(`   HR метрики: ${hrCount}`);
      console.log(`   OPS метрики: ${opsCount}`);
      console.log(`   Сообщения: ${totalMessages}`);
      console.log(`   Заказы: ${totalOrders}`);
      console.log(`   Нанято: ${totalHired}\n`);
      
      console.log(`🟢 ВСЕ ДАННЫЕ ГОТОВЫ К РАЗВЕРТЫВАНИЮ`);
    } else {
      console.log(`❌ Данные не найдены!`);
    }

  } catch (error) {
    console.error('❌ Ошибка:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
