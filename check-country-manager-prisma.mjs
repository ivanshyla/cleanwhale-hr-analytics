import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  log: ['error', 'warn']
});

async function checkCountryManager() {
  try {
    console.log('🔍 Проверяем country_manager...\n');

    // 1. Все пользователи с 'country' в login
    console.log('=== 1. Все записи с country в login ===');
    const allCountry = await prisma.user.findMany({
      where: {
        login: {
          contains: 'country',
          mode: 'insensitive'
        }
      },
      select: {
        id: true,
        login: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        password: true,
        createdAt: true,
        updatedAt: true
      }
    });
    
    console.log(`Найдено записей: ${allCountry.length}\n`);
    
    allCountry.forEach((user, i) => {
      console.log(`--- Запись ${i + 1} ---`);
      console.log(`ID: ${user.id}`);
      console.log(`Login: "${user.login}" (длина: ${user.login.length})`);
      console.log(`Name: "${user.name}"`);
      console.log(`Email: "${user.email}"`);
      console.log(`Role: ${user.role}`);
      console.log(`isActive: ${user.isActive}`);
      console.log(`Password hash: ${user.password}`);
      console.log(`Password length: ${user.password?.length}`);
      console.log(`Password starts with: ${user.password?.substring(0, 10)}`);
      console.log(`Created: ${user.createdAt}`);
      console.log(`Updated: ${user.updatedAt}`);
      
      // Проверяем на скрытые символы
      const loginBytes = Buffer.from(user.login).toString('hex');
      console.log(`Login (hex): ${loginBytes}`);
      console.log('');
    });

    // 2. Точный поиск
    console.log('=== 2. Точный поиск country_manager ===');
    const exact = await prisma.user.findUnique({
      where: {
        login: 'country_manager'
      }
    });
    console.log(`Найдено: ${exact ? 'ДА' : 'НЕТ'}\n`);
    if (exact) {
      console.log('Детали:');
      console.log(`ID: ${exact.id}`);
      console.log(`Login: "${exact.login}"`);
      console.log(`isActive: ${exact.isActive}`);
    }

    // 3. Все пользователи для сравнения
    console.log('\n=== 3. Все пользователи ===');
    const allUsers = await prisma.user.findMany({
      select: {
        id: true,
        login: true,
        name: true,
        email: true,
        role: true,
        isActive: true
      },
      orderBy: {
        id: 'asc'
      }
    });
    
    console.log(`Всего пользователей: ${allUsers.length}\n`);
    allUsers.forEach(user => {
      console.log(`${user.id} | ${user.login} | ${user.name} | ${user.email} | ${user.role} | Active: ${user.isActive}`);
    });

    // 4. Проверяем дубликаты
    console.log('\n=== 4. Проверка на дубликаты login ===');
    const duplicates = await prisma.user.groupBy({
      by: ['login'],
      _count: {
        login: true
      },
      having: {
        login: {
          _count: {
            gt: 1
          }
        }
      }
    });
    
    if (duplicates.length > 0) {
      console.log('⚠️ Найдены дубликаты:');
      console.table(duplicates);
    } else {
      console.log('✅ Дубликатов не найдено');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

checkCountryManager();

