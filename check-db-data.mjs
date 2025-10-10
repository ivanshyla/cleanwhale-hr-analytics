import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkData() {
  console.log('🔍 Проверка данных в базе...\n');
  
  try {
    // Проверяем пользователей
    const users = await prisma.user.count();
    console.log(`👥 Пользователей в системе: ${users}`);
    
    // Проверяем еженедельные отчеты
    const reports = await prisma.weeklyReport.count();
    console.log(`📊 Еженедельных отчетов: ${reports}`);
    
    if (reports > 0) {
      // Показываем последние отчеты
      const latestReports = await prisma.weeklyReport.findMany({
        take: 5,
        orderBy: { weekIso: 'desc' },
        include: {
          user: { select: { name: true, login: true } }
        }
      });
      
      console.log('\n📋 Последние отчеты:');
      latestReports.forEach(r => {
        console.log(`  - ${r.user.name} (${r.user.login}): неделя ${r.weekIso}`);
      });
      
      console.log('\n✅ Данные есть - отчет должен генерироваться!');
    } else {
      console.log('\n❌ ПРОБЛЕМА: Нет еженедельных отчетов в базе!');
      console.log('\n💡 Решение:');
      console.log('1. Зайдите в раздел "Еженедельный отчет"');
      console.log('2. Заполните отчет за текущую неделю');
      console.log('3. После этого генерация отчета будет работать');
    }
  } catch (error) {
    console.log('❌ Ошибка подключения к БД:', error.message);
    console.log('\n💡 Проверьте что PostgreSQL запущен:');
    console.log('   docker ps | grep postgres');
  } finally {
    await prisma.$disconnect();
  }
}

checkData();



