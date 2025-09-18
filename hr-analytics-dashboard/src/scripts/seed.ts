import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Начинаем заполнение базы данных...');

  // Очистка существующих данных
  await prisma.workSchedule.deleteMany();
  await prisma.user.deleteMany();
  await prisma.cityInfo.deleteMany();

  // Создание информации о городах
  const cities = [
    { code: 'WARSAW', name: 'Варшава' },
    { code: 'KRAKOW', name: 'Краков' },
    { code: 'GDANSK', name: 'Гданьск' },
    { code: 'WROCLAW', name: 'Вроцлав' },
    { code: 'POZNAN', name: 'Познань' },
    { code: 'LODZ', name: 'Лодзь' },
    { code: 'LUBLIN', name: 'Люблин' },
    { code: 'KATOWICE', name: 'Катовице' },
    { code: 'BYDGOSZCZ', name: 'Быдгощ' },
    { code: 'SZCZECIN', name: 'Щецин' },
    { code: 'TORUN', name: 'Торунь' },
    { code: 'RADOM', name: 'Радом' },
    { code: 'RZESZOW', name: 'Жешув' },
    { code: 'OLSZTYN', name: 'Ольштын' },
    { code: 'BIALYSTOK', name: 'Белосток' },
  ] as const;

  for (const city of cities) {
    await prisma.cityInfo.create({
      data: {
        code: city.code,
        name: city.name,
      },
    });
  }

  console.log('✅ Создано городов:', cities.length);

  // Хешируем пароль для всех пользователей (123456)
  const hashedPassword = await bcrypt.hash('123456', 10);

  // Создание реальных пользователей CleanWhale
  const users = [
    // Системный администратор
    {
      login: 'admin',
      name: 'Системный администратор',
      email: 'admin@cleanwhale.pl',
      role: 'ADMIN',
      city: 'WARSAW',
      salaryGross: 12000.0,
      salaryNet: 9000.0,
    },
    // Менеджер по стране (для совместимости со старым интерфейсом)
    {
      login: 'country_manager',
      name: 'Менеджер по стране',
      email: 'country.manager@cleanwhale.pl',
      role: 'COUNTRY_MANAGER',
      city: 'WARSAW',
      salaryGross: 15000.0,
      salaryNet: 11250.0,
    },
    
    // ВАРШАВА
    {
      login: 'artem.warsaw',
      name: 'Артем',
      email: 'artem@cleanwhale.pl',
      role: 'OPS_MANAGER', // коммуникация
      city: 'WARSAW',
      salaryGross: 5400.0, // с августа
      salaryNet: 4050.0,
    },
    {
      login: 'yuliya',
      name: 'Юлия',
      email: 'yuliya@cleanwhale.pl',
      role: 'HIRING_MANAGER', // найм
      city: 'WARSAW',
      salaryGross: 5500.0,
      salaryNet: 4125.0,
    },
    {
      login: 'maryana',
      name: 'Марьяна',
      email: 'maryana@cleanwhale.pl',
      role: 'HIRING_MANAGER', // найм
      city: 'WARSAW',
      salaryGross: 4000.0,
      salaryNet: 3000.0,
    },
    {
      login: 'viktoriya',
      name: 'Виктория',
      email: 'viktoriya@cleanwhale.pl',
      role: 'OPS_MANAGER', // коммуникация
      city: 'WARSAW', // удаленно
      salaryGross: 5900.0,
      salaryNet: 4425.0,
    },
    
    // ЛОДЗЬ
    {
      login: 'menedzher.lodz',
      name: 'Менеджер Лодзь',
      email: 'menedzher@cleanwhale.pl',
      role: 'MIXED_MANAGER', // смешанный
      city: 'LODZ',
      salaryGross: 4500.0,
      salaryNet: 3375.0,
    },
    
    // КРАКОВ
    {
      login: 'bogdana',
      name: 'Богдана',
      email: 'bogdana@cleanwhale.pl',
      role: 'OPS_MANAGER', // коммуникация
      city: 'KRAKOW', // удаленно
      salaryGross: 4400.0,
      salaryNet: 3300.0,
    },
    {
      login: 'mariya',
      name: 'Мария',
      email: 'mariya@cleanwhale.pl',
      role: 'OPS_MANAGER', // коммуникация
      city: 'KRAKOW', // удаленно
      salaryGross: 4400.0,
      salaryNet: 3300.0,
    },
    {
      login: 'anastasiya.krakow',
      name: 'Анастасия',
      email: 'anastasiya@cleanwhale.pl',
      role: 'HIRING_MANAGER', // найм
      city: 'KRAKOW',
      salaryGross: 4000.0,
      salaryNet: 3000.0,
    },
    
    // ВРОЦЛАВ
    {
      login: 'artem.wroclaw',
      name: 'Артем',
      email: 'artem.wroclaw@cleanwhale.pl', // другой email для избежания дублирования
      role: 'OPS_MANAGER', // коммуникация
      city: 'WROCLAW',
      salaryGross: null, // ЗП не указана
      salaryNet: null,
    },
    {
      login: 'anastasiya.wroclaw',
      name: 'Анастасия',
      email: 'anastasiya.wroclaw@cleanwhale.pl', // другой email для избежания дублирования
      role: 'OPS_MANAGER', // тип не указан, но работает в паре с Артемом по коммуникации
      city: 'WROCLAW',
      salaryGross: 4600.0,
      salaryNet: 3450.0,
    },
    
    // ПОЗНАНЬ
    {
      login: 'pavel',
      name: 'Павел',
      email: 'pavel@cleanwhale.pl',
      role: 'OPS_MANAGER', // коммуникация
      city: 'POZNAN',
      salaryGross: 4300.0,
      salaryNet: 3225.0,
    },
  ] as const;

  for (const userData of users) {
    await prisma.user.create({
      data: {
        ...userData,
        password: hashedPassword,
      },
    });
  }

  console.log('✅ Создано пользователей:', users.length);

  // Создание тестовых графиков работы для демонстрации
  console.log('📅 Создание тестовых графиков работы...');
  
  // Получаем понедельник текущей недели (16.09.2024)
  const currentMonday = new Date('2024-09-16T00:00:00.000Z');
  const currentSunday = new Date('2024-09-22T23:59:59.999Z');
  
  // Создаем графики для каждого пользователя
  const createdUsers = await prisma.user.findMany({
    select: { id: true, login: true, name: true }
  });

  const scheduleTemplates = [
    // Менеджер по стране - стандартный офисный график
    {
      login: 'country_manager',
      schedule: {
        mondayStart: '09:00', mondayEnd: '18:00', mondayNote: 'Управление страной',
        tuesdayStart: '09:00', tuesdayEnd: '18:00', tuesdayNote: 'Управление страной',
        wednesdayStart: '09:00', wednesdayEnd: '18:00', wednesdayNote: 'Управление страной',
        thursdayStart: '09:00', thursdayEnd: '18:00', thursdayNote: 'Управление страной',
        fridayStart: '09:00', fridayEnd: '18:00', fridayNote: 'Управление страной',
        weeklyNotes: 'Стандартный график менеджера по стране'
      }
    },
    // Артем Варшава - пн-пт 8:00-18:00 чаты (офис 10:30-16:00) + выходные сб-вс 1/2 удаленно 8:00-18:00
    {
      login: 'artem.warsaw',
      schedule: {
        mondayStart: '08:00', mondayEnd: '18:00', mondayNote: 'Чаты, офис 10:30-16:00',
        tuesdayStart: '08:00', tuesdayEnd: '18:00', tuesdayNote: 'Чаты, офис 10:30-16:00',
        wednesdayStart: '08:00', wednesdayEnd: '18:00', wednesdayNote: 'Чаты, офис 10:30-16:00',
        thursdayStart: '08:00', thursdayEnd: '18:00', thursdayNote: 'Чаты, офис 10:30-16:00',
        fridayStart: '08:00', fridayEnd: '18:00', fridayNote: 'Чаты, офис 10:30-16:00',
        saturdayStart: '08:00', saturdayEnd: '18:00', saturdayNote: '1/2 удаленно',
        sundayStart: '08:00', sundayEnd: '18:00', sundayNote: '1/2 удаленно',
        weeklyNotes: 'График: пн-пт чаты (в офисе 10:30-16:00), выходные 1/2 удаленно'
      }
    },
    // Юлия - пн-пт 10:30-15:30, сб 10:00-15:00 найм + сб-вс 1/2 чаты и заказы 08:00-18:00
    {
      login: 'yuliya',
      schedule: {
        mondayStart: '10:30', mondayEnd: '15:30', mondayNote: 'Найм',
        tuesdayStart: '10:30', tuesdayEnd: '15:30', tuesdayNote: 'Найм',
        wednesdayStart: '10:30', wednesdayEnd: '15:30', wednesdayNote: 'Найм',
        thursdayStart: '10:30', thursdayEnd: '15:30', thursdayNote: 'Найм',
        fridayStart: '10:30', fridayEnd: '15:30', fridayNote: 'Найм',
        saturdayStart: '08:00', saturdayEnd: '18:00', saturdayNote: '10:00-15:00 найм + 1/2 чаты и заказы',
        sundayStart: '08:00', sundayEnd: '18:00', sundayNote: '1/2 чаты и заказы',
        weeklyNotes: 'Основной график найма + дополнительные чаты и заказы в выходные'
      }
    },
    // Марьяна - пн-пт 12:30-17:30
    {
      login: 'maryana',
      schedule: {
        mondayStart: '12:30', mondayEnd: '17:30', mondayNote: 'Найм, офис',
        tuesdayStart: '12:30', tuesdayEnd: '17:30', tuesdayNote: 'Найм, офис',
        wednesdayStart: '12:30', wednesdayEnd: '17:30', wednesdayNote: 'Найм, офис',
        thursdayStart: '12:30', thursdayEnd: '17:30', thursdayNote: 'Найм, офис',
        fridayStart: '12:30', fridayEnd: '17:30', fridayNote: 'Найм, офис',
        weeklyNotes: 'Стандартный график найма в офисе'
      }
    },
    // Виктория - пн-пт 08:00-18:00, сб-вс 1/2 08:00-18:00
    {
      login: 'viktoriya',
      schedule: {
        mondayStart: '08:00', mondayEnd: '18:00', mondayNote: 'Коммуникация, удаленно',
        tuesdayStart: '08:00', tuesdayEnd: '18:00', tuesdayNote: 'Коммуникация, удаленно',
        wednesdayStart: '08:00', mondayEnd: '18:00', wednesdayNote: 'Коммуникация, удаленно',
        thursdayStart: '08:00', thursdayEnd: '18:00', thursdayNote: 'Коммуникация, удаленно',
        fridayStart: '08:00', fridayEnd: '18:00', fridayNote: 'Коммуникация, удаленно',
        saturdayStart: '08:00', saturdayEnd: '18:00', saturdayNote: '1/2 удаленно',
        sundayStart: '08:00', sundayEnd: '18:00', sundayNote: '1/2 удаленно',
        weeklyNotes: 'Полная удаленка, работа в выходные через день'
      }
    },
    // Менеджер Лодзь - ненормированный
    {
      login: 'menedzher.lodz',
      schedule: {
        mondayStart: '09:00', mondayEnd: '18:00', mondayNote: 'Смешанная роль, гибкий график',
        tuesdayStart: '09:00', tuesdayEnd: '18:00', tuesdayNote: 'Смешанная роль, гибкий график',
        wednesdayStart: '09:00', wednesdayEnd: '18:00', wednesdayNote: 'Смешанная роль, гибкий график',
        thursdayStart: '09:00', thursdayEnd: '18:00', thursdayNote: 'Смешанная роль, гибкий график',
        fridayStart: '09:00', fridayEnd: '18:00', fridayNote: 'Смешанная роль, гибкий график',
        saturdayStart: '10:00', saturdayEnd: '16:00', saturdayNote: 'По необходимости',
        sundayStart: '10:00', sundayEnd: '16:00', sundayNote: 'По необходимости',
        isFlexible: true,
        weeklyNotes: 'Ненормированный график, офис/удаленно'
      }
    },
    // Богдана - 2 через 2, 8:00-18:00
    {
      login: 'bogdana',
      schedule: {
        mondayStart: '08:00', mondayEnd: '18:00', mondayNote: 'График 2/2, удаленно',
        tuesdayStart: '08:00', tuesdayEnd: '18:00', tuesdayNote: 'График 2/2, удаленно',
        wednesdayNote: 'Выходной (график 2/2)',
        thursdayNote: 'Выходной (график 2/2)',
        fridayStart: '08:00', fridayEnd: '18:00', fridayNote: 'График 2/2, удаленно',
        saturdayStart: '08:00', saturdayEnd: '18:00', saturdayNote: 'График 2/2, удаленно',
        sundayNote: 'Выходной (график 2/2)',
        weeklyNotes: 'График 2 через 2, коммуникация, удаленно из Кракова'
      }
    },
    // Мария - 2 через 2, 8:00-18:00
    {
      login: 'mariya',
      schedule: {
        mondayNote: 'Выходной (график 2/2)',
        tuesdayNote: 'Выходной (график 2/2)',
        wednesdayStart: '08:00', wednesdayEnd: '18:00', wednesdayNote: 'График 2/2, удаленно',
        thursdayStart: '08:00', thursdayEnd: '18:00', thursdayNote: 'График 2/2, удаленно',
        fridayNote: 'Выходной (график 2/2)',
        saturdayNote: 'Выходной (график 2/2)',
        sundayStart: '08:00', sundayEnd: '18:00', sundayNote: 'График 2/2, удаленно',
        weeklyNotes: 'График 2 через 2, коммуникация, удаленно из Кракова'
      }
    },
    // Анастасия Краков - пн-пт 10:00-16:00
    {
      login: 'anastasiya.krakow',
      schedule: {
        mondayStart: '10:00', mondayEnd: '16:00', mondayNote: 'Найм, офис',
        tuesdayStart: '10:00', tuesdayEnd: '16:00', tuesdayNote: 'Найм, офис',
        wednesdayStart: '10:00', wednesdayEnd: '16:00', wednesdayNote: 'Найм, офис',
        thursdayStart: '10:00', thursdayEnd: '16:00', thursdayNote: 'Найм, офис',
        fridayStart: '10:00', fridayEnd: '16:00', fridayNote: 'Найм, офис',
        weeklyNotes: 'Стандартный график найма в офисе Кракова'
      }
    },
    // Артем Вроцлав - работа на 2 смены, чередуется с Анастасией
    {
      login: 'artem.wroclaw',
      schedule: {
        mondayStart: '08:00', mondayEnd: '16:00', mondayNote: 'Первая смена (неделя 1)',
        tuesdayStart: '08:00', tuesdayEnd: '16:00', tuesdayNote: 'Первая смена (неделя 1)',
        wednesdayStart: '08:00', wednesdayEnd: '16:00', wednesdayNote: 'Первая смена (неделя 1)',
        thursdayStart: '08:00', thursdayEnd: '16:00', thursdayNote: 'Первая смена (неделя 1)',
        fridayStart: '08:00', fridayEnd: '16:00', fridayNote: 'Первая смена (неделя 1)',
        weeklyNotes: 'График 2 смены, чередуется с Анастасией каждую неделю'
      }
    },
    // Анастасия Вроцлав - работа на 2 смены, чередуется с Артемом
    {
      login: 'anastasiya.wroclaw',
      schedule: {
        mondayStart: '16:00', mondayEnd: '00:00', mondayNote: 'Вторая смена (неделя 1)',
        tuesdayStart: '16:00', tuesdayEnd: '00:00', tuesdayNote: 'Вторая смена (неделя 1)',
        wednesdayStart: '16:00', wednesdayEnd: '00:00', wednesdayNote: 'Вторая смена (неделя 1)',
        thursdayStart: '16:00', thursdayEnd: '00:00', thursdayNote: 'Вторая смена (неделя 1)',
        fridayStart: '16:00', fridayEnd: '00:00', fridayNote: 'Вторая смена (неделя 1)',
        weeklyNotes: 'График 2 смены, чередуется с Артемом каждую неделю'
      }
    },
    // Павел - ненормированный, чередует первую/вторую половину дня
    {
      login: 'pavel',
      schedule: {
        mondayStart: '09:00', mondayEnd: '15:00', mondayNote: 'Первая половина дня, собесы',
        tuesdayStart: '13:00', tuesdayEnd: '19:00', tuesdayNote: 'Вторая половина дня, собесы',
        wednesdayStart: '09:00', wednesdayEnd: '15:00', wednesdayNote: 'Первая половина дня, собесы',
        thursdayStart: '13:00', thursdayEnd: '19:00', thursdayNote: 'Вторая половина дня, собесы',
        fridayStart: '09:00', fridayEnd: '15:00', fridayNote: 'Первая половина дня, собесы',
        saturdayStart: '10:00', saturdayEnd: '14:00', saturdayNote: 'Иногда по собесам',
        isFlexible: true,
        weeklyNotes: 'Ненормированный график, чередует время работы, офис/удаленно'
      }
    }
  ];

  for (const template of scheduleTemplates) {
    const user = createdUsers.find(u => u.login === template.login);
    if (user) {
      await prisma.workSchedule.create({
        data: {
          userId: user.id,
          weekStartDate: currentMonday,
          weekEndDate: currentSunday,
          ...template.schedule
        }
      });
    }
  }

  console.log('✅ Создано тестовых графиков работы:', scheduleTemplates.length);

  // Создание демо настроек
  const settings = [
    { key: 'system_name', value: 'CleanWhale Analytics', category: 'general' },
    { key: 'default_timezone', value: 'Europe/Warsaw', category: 'general' },
    { key: 'working_days_per_week', value: '5', category: 'business' },
    { key: 'default_working_hours', value: '8', category: 'business' },
    { key: 'stress_threshold_warning', value: '7', category: 'alerts' },
    { key: 'stress_threshold_critical', value: '9', category: 'alerts' },
    { key: 'overtime_threshold_hours', value: '10', category: 'alerts' },
    { key: 'openai_enabled', value: 'true', category: 'integrations' },
    { key: 'trengo_sync_frequency', value: '24', category: 'integrations' },
    { key: 'crm_sync_frequency', value: '24', category: 'integrations' },
  ];

  for (const setting of settings) {
    await prisma.settings.upsert({
      where: { key: setting.key },
      update: setting,
      create: setting,
    });
  }

  console.log('✅ Создано настроек:', settings.length);

  console.log('🎉 Заполнение базы данных завершено!');
  console.log('');
  console.log('📋 Пользователи CleanWhale:');
  console.log('   admin / 123456 (Админ)');
  console.log('   country_manager / 123456 (Менеджер по стране)');
  console.log('   artem.warsaw / 123456 (Артем - Варшава, Операции)');
  console.log('   yuliya / 123456 (Юлия - Варшава, HR)');
  console.log('   maryana / 123456 (Марьяна - Варшава, HR)');
  console.log('   viktoriya / 123456 (Виктория - Варшава, Операции)');
  console.log('   menedzher.lodz / 123456 (Менеджер Лодзь - Лодзь, Смешанный)');
  console.log('   bogdana / 123456 (Богдана - Краков, Операции)');
  console.log('   mariya / 123456 (Мария - Краков, Операции)');
  console.log('   anastasiya.krakow / 123456 (Анастасия - Краков, HR)');
  console.log('   artem.wroclaw / 123456 (Артем - Вроцлав, Операции)');
  console.log('   anastasiya.wroclaw / 123456 (Анастасия - Вроцлав, Операции)');
  console.log('   pavel / 123456 (Павел - Познань, Операции)');
}

main()
  .catch((e) => {
    console.error('❌ Ошибка при заполнении базы данных:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
