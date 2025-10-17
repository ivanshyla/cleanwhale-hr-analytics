import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  try {
    console.log('📊 === ФИНАЛЬНЫЙ АУДИТ ПОСЛЕ ИСПРАВЛЕНИЙ ===\n');
    
    const cities = await prisma.cityInfo.count();
    const users = await prisma.user.count();
    const agg = await prisma.countryAggregate.count();
    const cui = await prisma.countryUserInput.count();
    const tm = await prisma.teamMeeting.count();
    const wr = await prisma.weeklyReport.count();
    
    console.log('📍 CityInfo:', cities);
    console.log('👥 User:', users);
    console.log('📊 CountryAggregate:', agg);
    console.log('📋 CountryUserInput:', cui);
    console.log('🤝 TeamMeeting:', tm);
    console.log('📄 WeeklyReport:', wr);
    
    console.log('\n✅ Статус готовности:');
    console.log(`  ${agg > 0 ? '✅' : '⚠️ '} Country aggregates (графики менеджеров) - ${agg > 0 ? 'ОК' : 'ПУСТО'}`);
    console.log(`  ${tm > 0 ? '✅' : '⚠️ '} Team meetings (встречи) - ${tm > 0 ? 'ОК' : 'ПУСТО'}`);
    console.log(`  ${cui > 0 ? '✅' : '⚠️ '} Country user inputs (ввод менеджеров) - ${cui > 0 ? 'ОК' : 'ПУСТО'}`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
