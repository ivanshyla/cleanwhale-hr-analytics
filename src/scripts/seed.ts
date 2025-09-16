import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Начинаем заполнение базы данных...');

  // Очистка существующих данных
  await prisma.hrMetrics.deleteMany();
  await prisma.opsMetrics.deleteMany();
  await prisma.weeklyReport.deleteMany();
  await prisma.countryAggregates.deleteMany();
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

  // Хешируем пароль для всех пользователей
  const hashedPassword = await bcrypt.hash('password123', 10);

  // Создание демо пользователей
  const users = [
    {
      login: 'admin',
      name: 'Системный администратор',
      email: 'admin@cleanwhale.com',
      role: 'ADMIN',
      city: 'WARSAW',
      salary: 12000.0, // PLN
    },
    {
      login: 'country_manager',
      name: 'Анна Ковальская',
      email: 'anna.kowalska@cleanwhale.com',
      role: 'COUNTRY_MANAGER',
      city: 'WARSAW',
      salary: 15000.0, // PLN
    },
    {
      login: 'hr_manager',
      name: 'Петр Новак',
      email: 'petr.novak@cleanwhale.com',
      role: 'HR',
      city: 'WARSAW',
      salary: 8500.0, // PLN
    },
    {
      login: 'ops_manager',
      name: 'Мария Вишневская',
      email: 'maria.wisz@cleanwhale.com',
      role: 'OPERATIONS',
      city: 'WARSAW',
      salary: 7800.0, // PLN
    },
    {
      login: 'mixed_manager',
      name: 'Томаш Лесняк',
      email: 'tomasz.lesny@cleanwhale.com',
      role: 'MIXED',
      city: 'KRAKOW',
      salary: 9200.0, // PLN
    },
    {
      login: 'hr_krakow',
      name: 'Агнешка Козловская',
      email: 'agnieszka.kozl@cleanwhale.com',
      role: 'HR',
      city: 'KRAKOW',
      salary: 8000.0, // PLN
    },
    {
      login: 'ops_gdansk',
      name: 'Марцин Каминский',
      email: 'marcin.kam@cleanwhale.com',
      role: 'OPERATIONS',
      city: 'GDANSK',
      salary: 7500.0, // PLN
    },
    {
      login: 'mixed_wroclaw',
      name: 'Катажина Дуда',
      email: 'katarzyna.duda@cleanwhale.com',
      role: 'MIXED',
      city: 'WROCLAW',
      salary: 8800.0, // PLN
    },
    {
      login: 'hr_poznan',
      name: 'Павел Войцеховский',
      email: 'pawel.wojc@cleanwhale.com',
      role: 'HR',
      city: 'POZNAN',
      salary: 7700.0, // PLN
    },
    {
      login: 'ops_lodz',
      name: 'Моника Янковская',
      email: 'monika.jank@cleanwhale.com',
      role: 'OPERATIONS',
      city: 'LODZ',
      salary: 7300.0, // PLN
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

  console.log('✅ Созданы демо интеграции (пропущены - модель не включена в упрощенную схему)');

  console.log('🎉 Заполнение базы данных завершено!');
  console.log('');
  console.log('📋 Демо пользователи:');
  console.log('   admin / password123 (Админ)');
  console.log('   country_manager / password123 (Менеджер по стране)');
  console.log('   hr_manager / password123 (HR - Варшава)');
  console.log('   ops_manager / password123 (Операции - Варшава)');
  console.log('   mixed_manager / password123 (Смешанный - Краков)');
  console.log('   hr_krakow / password123 (HR - Краков)');
  console.log('   ops_gdansk / password123 (Операции - Гданьск)');
  console.log('   mixed_wroclaw / password123 (Смешанный - Вроцлав)');
  console.log('   hr_poznan / password123 (HR - Познань)');
  console.log('   ops_lodz / password123 (Операции - Лодзь)');
}

main()
  .catch((e) => {
    console.error('❌ Ошибка при заполнении базы данных:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });