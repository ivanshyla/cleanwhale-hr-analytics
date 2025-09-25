import { NextRequest, NextResponse } from 'next/server';
import { Client } from 'pg';

export async function POST(request: NextRequest) {
  try {
    console.log('🚀 Создаем таблицы для P2 (CountryAggregate, CountryUserInput)...');

    const DATABASE_URL = process.env.DATABASE_URL;
    if (!DATABASE_URL) {
      throw new Error('DATABASE_URL is not set');
    }

    const client = new Client({
      connectionString: DATABASE_URL,
      ssl: {
        rejectUnauthorized: false,
      },
    });

    await client.connect();

    // 1. Обновляем cities table - меняем id на int
    console.log('🏙️ Обновляем таблицу cities...');
    
    // Сначала создаем новую таблицу cities с int id
    await client.query(`
      CREATE TABLE IF NOT EXISTS "cities_new" (
        "id" SERIAL PRIMARY KEY,
        "code" TEXT UNIQUE NOT NULL,
        "name" TEXT NOT NULL,
        "timezone" TEXT NOT NULL DEFAULT 'Europe/Warsaw',
        "isActive" BOOLEAN NOT NULL DEFAULT true,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Копируем данные из старой таблицы в новую
    await client.query(`
      INSERT INTO "cities_new" ("code", "name", "timezone", "isActive", "createdAt")
      SELECT "code", "name", "timezone", "isActive", "createdAt" 
      FROM "cities"
      ON CONFLICT ("code") DO NOTHING;
    `);

    // 2. Создаем таблицу country_aggregates
    console.log('📊 Создаем таблицу country_aggregates...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS "country_aggregates" (
        "id" SERIAL PRIMARY KEY,
        "weekIso" TEXT NOT NULL,
        "cityId" INTEGER NOT NULL,
        "trengoResponses" INTEGER NOT NULL DEFAULT 0,
        "crmComplaintsClosed" INTEGER NOT NULL DEFAULT 0,
        "trengoTickets" INTEGER NOT NULL DEFAULT 0,
        "hiredPeople" INTEGER NOT NULL DEFAULT 0,
        "cityOrders" INTEGER NOT NULL DEFAULT 0,
        "notes" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

        CONSTRAINT "country_aggregates_weekIso_cityId_key" UNIQUE ("weekIso", "cityId"),
        CONSTRAINT "country_aggregates_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "cities_new"("id") ON DELETE RESTRICT ON UPDATE CASCADE
      );
    `);

    // 3. Создаем индексы для country_aggregates
    await client.query(`CREATE INDEX IF NOT EXISTS "country_aggregates_weekIso_idx" ON "country_aggregates"("weekIso");`);

    // 4. Создаем таблицу country_user_inputs
    console.log('👥 Создаем таблицу country_user_inputs...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS "country_user_inputs" (
        "id" SERIAL PRIMARY KEY,
        "weekIso" TEXT NOT NULL,
        "userId" TEXT NOT NULL,
        "trengoResponses" INTEGER NOT NULL DEFAULT 0,
        "trengoTickets" INTEGER NOT NULL DEFAULT 0,
        "crmComplaintsClosed" INTEGER NOT NULL DEFAULT 0,
        "ordersHandled" INTEGER NOT NULL DEFAULT 0,
        "notes" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

        CONSTRAINT "country_user_inputs_weekIso_userId_key" UNIQUE ("weekIso", "userId"),
        CONSTRAINT "country_user_inputs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE
      );
    `);

    // 5. Создаем индексы для country_user_inputs
    await client.query(`CREATE INDEX IF NOT EXISTS "country_user_inputs_weekIso_idx" ON "country_user_inputs"("weekIso");`);

    // 6. Проверяем созданные таблицы
    console.log('✅ Проверяем созданные таблицы...');
    
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('cities_new', 'country_aggregates', 'country_user_inputs')
      ORDER BY table_name;
    `);

    const cityCount = await client.query(`SELECT COUNT(*) as count FROM "cities_new";`);
    
    const indexesResult = await client.query(`
      SELECT tablename, indexname FROM pg_indexes 
      WHERE tablename IN ('country_aggregates', 'country_user_inputs')
      AND indexname LIKE '%_idx'
      ORDER BY tablename, indexname;
    `);

    await client.end();

    return NextResponse.json({
      success: true,
      message: 'Таблицы P2 созданы успешно!',
      tables_created: tablesResult.rows.map(row => row.table_name),
      cities_migrated: cityCount.rows[0].count,
      indexes_created: indexesResult.rows,
      steps_completed: [
        '✅ Создана новая таблица cities_new с int id',
        '✅ Данные городов мигрированы в cities_new',
        '✅ Создана таблица country_aggregates с foreign key на cities_new',
        '✅ Создана таблица country_user_inputs с foreign key на users',
        '✅ Созданы индексы для быстрых запросов по weekIso',
        '✅ Настроены unique constraints для предотвращения дублей',
      ],
      next_steps: [
        'Теперь можно тестировать Country страницу',
        'COUNTRY_MANAGER может вводить данные по городам и менеджерам',
        'Данные от country manager имеют приоритет над самоотчетами',
      ]
    });

  } catch (error) {
    console.error('❌ Ошибка создания таблиц P2:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        debug: error
      },
      { status: 500 }
    );
  }
}
