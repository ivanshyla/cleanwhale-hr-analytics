import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  try {
    // Проверяем все города
    const cities = await prisma.cityInfo.findMany();
    console.log('✅ Города в БД:');
    cities.forEach(c => console.log(`   ${c.id}: ${c.code}`));
    
    // Проверяем структуру countryAggregate
    const sample = await prisma.countryAggregate.findFirst();
    if (sample) {
      console.log('\n✅ Sample CountryAggregate:');
      console.log(JSON.stringify(sample, null, 2));
    } else {
      console.log('\n⚠️  Нет данных в countryAggregate');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
