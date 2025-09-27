const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function createCleanwhaleUsers() {
  try {
    // Генерируем хеш пароля
    const hashedPassword = await bcrypt.hash('123456', 10);

    // Реальные сотрудники CleanWhale
    const cleanwhaleUsers = [
      {
        login: 'artem.communication',
        email: 'artem@cleanwhale.pl',
        name: 'Артем (Коммуникация)',
        role: 'OPS_MANAGER',
        city: 'WARSAW',
        salaryGross: 5400,
        salaryNet: null
      },
      {
        login: 'yuliya.hr',
        email: 'yuliya@cleanwhale.pl', 
        name: 'Юлия (Найм)',
        role: 'HIRING_MANAGER',
        city: 'WARSAW',
        salaryGross: 5500,
        salaryNet: null
      },
      {
        login: 'maryana.hr',
        email: 'maryana@cleanwhale.pl',
        name: 'Марьяна (Найм)', 
        role: 'HIRING_MANAGER',
        city: 'WARSAW',
        salaryGross: 4000,
        salaryNet: null
      },
      {
        login: 'viktoriya.communication',
        email: 'viktoriya@cleanwhale.pl',
        name: 'Виктория (Коммуникация)',
        role: 'OPS_MANAGER', 
        city: 'WARSAW',
        salaryGross: 5900,
        salaryNet: null
      },
      {
        login: 'menedzher.lodz',
        email: 'menedzher@cleanwhale.pl',
        name: 'Менеджер Лодзь',
        role: 'MIXED_MANAGER',
        city: 'LODZ',
        salaryGross: 4500,
        salaryNet: null
      },
      {
        login: 'bogdana.krakow',
        email: 'bogdana@cleanwhale.pl',
        name: 'Богдана (Коммуникация)',
        role: 'OPS_MANAGER',
        city: 'KRAKOW',
        salaryGross: 4400,
        salaryNet: null
      },
      {
        login: 'mariya.krakow',
        email: 'mariya@cleanwhale.pl',
        name: 'Мария (Коммуникация)',
        role: 'OPS_MANAGER',
        city: 'KRAKOW', 
        salaryGross: 4400,
        salaryNet: null
      },
      {
        login: 'anastasiya.krakow',
        email: 'anastasiya@cleanwhale.pl',
        name: 'Анастасия (Найм)',
        role: 'HIRING_MANAGER',
        city: 'KRAKOW',
        salaryGross: 4000,
        salaryNet: null
      },
      {
        login: 'artem.wroclaw',
        email: 'artem.wroclaw@cleanwhale.pl',
        name: 'Артем Вроцлав (Коммуникация)',
        role: 'OPS_MANAGER',
        city: 'WROCLAW',
        salaryGross: null,
        salaryNet: null
      },
      {
        login: 'anastasiya.wroclaw',
        email: 'anastasiya.wroclaw@cleanwhale.pl',
        name: 'Анастасия Вроцлав',
        role: 'MIXED_MANAGER',
        city: 'WROCLAW',
        salaryGross: 4600,
        salaryNet: null
      },
      {
        login: 'pavel.poznan',
        email: 'pavel@cleanwhale.pl',
        name: 'Павел (Коммуникация)',
        role: 'OPS_MANAGER',
        city: 'POZNAN',
        salaryGross: 4300,
        salaryNet: null
      }
    ];

    console.log('🚀 Создание реальных пользователей CleanWhale...');

    for (const user of cleanwhaleUsers) {
      try {
        const created = await prisma.user.upsert({
          where: { login: user.login },
          update: {
            email: user.email,
            name: user.name,
            role: user.role,
            city: user.city,
            salaryGross: user.salaryGross,
            salaryNet: user.salaryNet,
            currency: 'PLN',
            updatedAt: new Date()
          },
          create: {
            login: user.login,
            password: hashedPassword,
            email: user.email,
            name: user.name,
            role: user.role,
            city: user.city,
            salaryGross: user.salaryGross,
            salaryNet: user.salaryNet,
            currency: 'PLN',
            isActive: true
          }
        });
        
        console.log(`✅ ${user.name} (${user.login}) - ${user.role} @ ${user.city}`);
      } catch (error) {
        console.error(`❌ Ошибка создания ${user.name}:`, error.message);
      }
    }

    console.log('\n🎉 Готово! Все пользователи созданы.');
    console.log('📧 Данные для входа:');
    console.log('   Логины: указанные выше');
    console.log('   Пароль: 123456');
    
  } catch (error) {
    console.error('❌ Общая ошибка:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createCleanwhaleUsers();
