import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  try {
    console.log('🔍 === АУДИТ БД (ИСПРАВЛЕНО) ===\n');
    
    // 1. Города
    const cities = await prisma.cityInfo.findMany();
    console.log('📍 Города (CityInfo):');
    cities.forEach(c => console.log(`   ID=${c.id}: ${c.code}`));
    
    // 2. Пользователи с городами
    const users = await prisma.user.findMany({
      select: { id: true, name: true, city: true, role: true }
    });
    console.log(`\n👥 Пользователей: ${users.length}`);
    console.log('   User city values:', users.map(u => `"${u.city}"`).slice(0, 3));
    
    // 3. CountryAggregate
    const agg = await prisma.countryAggregate.findMany();
    console.log(`\n📊 CountryAggregate записей: ${agg.length}`);
    if (agg.length > 0) {
      console.log('   Образец:', JSON.stringify(agg[0], null, 2));
    }
    
    // 4. CountryUserInput
    const cui = await prisma.countryUserInput.findMany({ take: 3 });
    console.log(`\n📋 CountryUserInput (всего в БД, показываю 3):`, cui.length);
    
    // 5. TeamMeeting
    const tm = await prisma.teamMeeting.findMany();
    console.log(`\n🤝 TeamMeeting записей: ${tm.length}`);
    if (tm.length > 0) {
      const first = tm[0];
      console.log('   Первый запись:');
      console.log(`   - id: ${first.id}`);
      console.log(`   - userId: ${first.userId}`);
      console.log(`   - meetingName: ${first.meetingName}`);
      console.log(`   - attendees: ${first.attendees}`);
      console.log(`   - attendeeNames: ${first.attendeeNames}`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
