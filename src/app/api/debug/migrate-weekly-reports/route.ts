import { NextRequest, NextResponse } from 'next/server';
import { Client } from 'pg';

export async function POST(request: NextRequest) {
  try {
    console.log('🔄 Начинаем миграцию схемы для weekly reports...');

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

    // Добавляем поле weekIso в hr_metrics если его нет
    console.log('📝 Добавляем weekIso в hr_metrics...');
    await client.query(`
      ALTER TABLE "hr_metrics" 
      ADD COLUMN IF NOT EXISTS "weekIso" TEXT;
    `);

    // Добавляем поле weekIso в ops_metrics если его нет
    console.log('📝 Добавляем weekIso в ops_metrics...');
    await client.query(`
      ALTER TABLE "ops_metrics" 
      ADD COLUMN IF NOT EXISTS "weekIso" TEXT;
    `);

    // Заполняем weekIso из связанного report'а для существующих записей
    console.log('🔗 Заполняем weekIso из связанных отчетов...');
    
    // Для hr_metrics
    await client.query(`
      UPDATE "hr_metrics" 
      SET "weekIso" = wr."weekIso"
      FROM "weekly_reports" wr 
      WHERE "hr_metrics"."reportId" = wr.id 
      AND "hr_metrics"."weekIso" IS NULL;
    `);

    // Для ops_metrics
    await client.query(`
      UPDATE "ops_metrics" 
      SET "weekIso" = wr."weekIso"
      FROM "weekly_reports" wr 
      WHERE "ops_metrics"."reportId" = wr.id 
      AND "ops_metrics"."weekIso" IS NULL;
    `);

    // Удаляем старые индексы если они существуют
    console.log('🗑️ Удаляем старые уникальные индексы...');
    try {
      await client.query(`DROP INDEX IF EXISTS "hr_metrics_userId_reportId_key";`);
      await client.query(`DROP INDEX IF EXISTS "ops_metrics_userId_reportId_key";`);
    } catch (error) {
      console.log('Старые индексы не найдены или уже удалены');
    }

    // Создаем новые уникальные индексы
    console.log('🔧 Создаем новые уникальные индексы...');
    
    // Для hr_metrics (userId, weekIso)
    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "hr_metrics_userId_weekIso_key" 
      ON "hr_metrics"("userId", "weekIso");
    `);

    // Для ops_metrics (userId, weekIso)
    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "ops_metrics_userId_weekIso_key" 
      ON "ops_metrics"("userId", "weekIso");
    `);

    // Проверяем результат
    console.log('✅ Проверяем структуру таблиц...');
    
    const hrColumnsResult = await client.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'hr_metrics' 
      ORDER BY ordinal_position;
    `);

    const opsColumnsResult = await client.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'ops_metrics' 
      ORDER BY ordinal_position;
    `);

    const hrIndexesResult = await client.query(`
      SELECT indexname, indexdef 
      FROM pg_indexes 
      WHERE tablename = 'hr_metrics' 
      AND indexdef LIKE '%weekIso%';
    `);

    const opsIndexesResult = await client.query(`
      SELECT indexname, indexdef 
      FROM pg_indexes 
      WHERE tablename = 'ops_metrics' 
      AND indexdef LIKE '%weekIso%';
    `);

    await client.end();

    return NextResponse.json({
      success: true,
      message: 'Миграция схемы weekly reports выполнена успешно!',
      details: {
        hr_metrics_columns: hrColumnsResult.rows,
        ops_metrics_columns: opsColumnsResult.rows,
        hr_indexes: hrIndexesResult.rows,
        ops_indexes: opsIndexesResult.rows,
      },
      steps_completed: [
        '✅ Добавлено поле weekIso в hr_metrics',
        '✅ Добавлено поле weekIso в ops_metrics', 
        '✅ Заполнены weekIso из связанных отчетов',
        '✅ Удалены старые уникальные индексы',
        '✅ Созданы новые уникальные индексы (userId, weekIso)',
      ]
    });

  } catch (error) {
    console.error('❌ Ошибка миграции:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        debug: {
          DATABASE_URL: process.env.DATABASE_URL ? 'Set' : 'Not set',
          error_details: error
        }
      },
      { status: 500 }
    );
  }
}
