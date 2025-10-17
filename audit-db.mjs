import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  try {
    console.log('🔍 === АУДИТ БД ===\n');
    
    // 1. Города
    const cities = await prisma.cityInfo.findMany();
    console.log('📍 Города (CityInfo):');
    cities.forEach(c => console.log(`   ${c.id}: ${c.code}`));
    
    // 2. Пользователи с городами
    const users = await prisma.user.findMany({
      select: { id: true, name: true, city: true, role: true }
    });
    console.log(`\n👥 Пользователей: ${users.length}`);
    const uniqueCities = new Set(users.map(u => u.city));
    console.log(`   Уникальные города из User: ${Array.from(uniqueCities).join(', ')}`);
    
    // 3. CountryAggregate
    const agg = await prisma.countryAggregate.findMany({
      select: { weekIso: true, cityId: true, trengoMessages: true }
    });
    console.log(`\n📊 CountryAggregate записей: ${agg.length}`);
    if (agg.length > 0) {
      console.log('   Первые 3:', agg.slice(0, 3));
    }
    
    // 4. CountryUserInput
    const cui = await prisma.countryUserInput.findMany({
      select: { weekIso: true, userId: true, trengoResponses: true }
    });
    console.log(`\n📋 CountryUserInput записей: ${cui.length}`);
    if (cui.length > 0) {
      console.log('   Первые 3:', cui.slice(0, 3));
    }
    
    // 5. TeamMeeting
    const tm = await prisma.teamMeeting.findMany({
      select: { id: true, userId: true, weekIso: true, createdAt: true }
    });
    console.log(`\n🤝 TeamMeeting записей: ${tm.length}`);
    if (tm.length > 0) {
      console.log('   Первые 3:', tm.slice(0, 3));
    }
    
    // 6. WeeklyReport за текущую неделю
    const wr = await prisma.weeklyReport.findMany({
      select: { id: true, userId: true, weekIso: true },
      orderBy: { createdAt: 'desc' },
      take: 5
    });
    console.log(`\n📄 Последние 5 WeeklyReport:`, wr);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
