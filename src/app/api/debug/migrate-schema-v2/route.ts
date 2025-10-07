export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { Client } from 'pg';
import { guardDebugEndpoint, logDebugAccess } from '@/lib/debug-guard';

export async function POST(request: NextRequest) {
  const guardError = guardDebugEndpoint();
  if (guardError) return guardError;
  logDebugAccess('/api/debug/migrate-schema-v2', 'POST');
  
  try {
    console.log('🔄 Мигрируем схему к версии 2 (добавляем индексы и поля)...');

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

    // 1. Создаем таблицу weeks
    console.log('📅 Создаем таблицу weeks...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS "weeks" (
        "id" SERIAL PRIMARY KEY,
        "iso" TEXT UNIQUE NOT NULL,
        "startDate" TIMESTAMP(3) NOT NULL,
        "endDate" TIMESTAMP(3) NOT NULL,
        "year" INTEGER NOT NULL,
        "weekNum" INTEGER NOT NULL,
        "isActive" BOOLEAN NOT NULL DEFAULT true,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 2. Добавляем индексы для weeks
    console.log('🔍 Создаем индексы для weeks...');
    await client.query(`CREATE INDEX IF NOT EXISTS "weeks_year_weekNum_idx" ON "weeks"("year", "weekNum");`);
    await client.query(`CREATE INDEX IF NOT EXISTS "weeks_startDate_endDate_idx" ON "weeks"("startDate", "endDate");`);

    // 3. Добавляем новые поля в hr_metrics
    console.log('👥 Добавляем поля в hr_metrics...');
    await client.query(`ALTER TABLE "hr_metrics" ADD COLUMN IF NOT EXISTS "fullDays" INTEGER DEFAULT 0;`);
    await client.query(`ALTER TABLE "hr_metrics" ADD COLUMN IF NOT EXISTS "stress" INTEGER;`);
    await client.query(`ALTER TABLE "hr_metrics" ADD COLUMN IF NOT EXISTS "overtime" BOOLEAN DEFAULT false;`);

    // 4. Добавляем новые поля в ops_metrics
    console.log('⚙️ Добавляем поля в ops_metrics...');
    await client.query(`ALTER TABLE "ops_metrics" ADD COLUMN IF NOT EXISTS "messages" INTEGER DEFAULT 0;`);
    await client.query(`ALTER TABLE "ops_metrics" ADD COLUMN IF NOT EXISTS "tickets" INTEGER DEFAULT 0;`);
    await client.query(`ALTER TABLE "ops_metrics" ADD COLUMN IF NOT EXISTS "orders" INTEGER DEFAULT 0;`);
    await client.query(`ALTER TABLE "ops_metrics" ADD COLUMN IF NOT EXISTS "fullDays" INTEGER DEFAULT 0;`);
    await client.query(`ALTER TABLE "ops_metrics" ADD COLUMN IF NOT EXISTS "diffCleaners" TEXT;`);
    await client.query(`ALTER TABLE "ops_metrics" ADD COLUMN IF NOT EXISTS "diffClients" TEXT;`);
    await client.query(`ALTER TABLE "ops_metrics" ADD COLUMN IF NOT EXISTS "stress" INTEGER;`);
    await client.query(`ALTER TABLE "ops_metrics" ADD COLUMN IF NOT EXISTS "overtime" BOOLEAN DEFAULT false;`);
    await client.query(`ALTER TABLE "ops_metrics" ADD COLUMN IF NOT EXISTS "sourceMsg" TEXT;`);
    await client.query(`ALTER TABLE "ops_metrics" ADD COLUMN IF NOT EXISTS "sourceTkt" TEXT;`);
    await client.query(`ALTER TABLE "ops_metrics" ADD COLUMN IF NOT EXISTS "sourceOrd" TEXT;`);

    // 5. Создаем индексы для быстрых запросов
    console.log('🚀 Создаем индексы для производительности...');
    
    // Индексы для hr_metrics
    await client.query(`CREATE INDEX IF NOT EXISTS "hr_metrics_weekIso_idx" ON "hr_metrics"("weekIso");`);
    await client.query(`CREATE INDEX IF NOT EXISTS "hr_metrics_userId_idx" ON "hr_metrics"("userId");`);
    
    // Индексы для ops_metrics
    await client.query(`CREATE INDEX IF NOT EXISTS "ops_metrics_weekIso_idx" ON "ops_metrics"("weekIso");`);
    await client.query(`CREATE INDEX IF NOT EXISTS "ops_metrics_userId_idx" ON "ops_metrics"("userId");`);
    
    // Индексы для weekly_reports
    await client.query(`CREATE INDEX IF NOT EXISTS "weekly_reports_weekIso_idx" ON "weekly_reports"("weekIso");`);
    await client.query(`CREATE INDEX IF NOT EXISTS "weekly_reports_userId_idx" ON "weekly_reports"("userId");`);

    // 6. Заполняем новые поля данными из связанных таблиц
    console.log('🔄 Мигрируем данные в новые поля...');
    
    // Копируем данные из trengoMessages в messages для ops_metrics
    await client.query(`
      UPDATE "ops_metrics" 
      SET "messages" = COALESCE("trengoMessages", 0),
          "tickets" = COALESCE("trengoTicketsResolved", 0) + COALESCE("crmTicketsResolved", 0),
          "orders" = COALESCE("crmOrdersCity", 0),
          "diffCleaners" = "difficultCleanerCases",
          "diffClients" = "difficultClientCases"
      WHERE "messages" IS NULL OR "messages" = 0;
    `);

    // Копируем workdays в fullDays для hr_metrics из weekly_reports
    await client.query(`
      UPDATE "hr_metrics" 
      SET "fullDays" = wr."workdays",
          "stress" = wr."stressLevel",
          "overtime" = wr."overtime"
      FROM "weekly_reports" wr 
      WHERE "hr_metrics"."reportId" = wr.id 
      AND ("hr_metrics"."fullDays" IS NULL OR "hr_metrics"."fullDays" = 0);
    `);

    // Копируем workdays в fullDays для ops_metrics из weekly_reports
    await client.query(`
      UPDATE "ops_metrics" 
      SET "fullDays" = wr."workdays",
          "stress" = wr."stressLevel", 
          "overtime" = wr."overtime"
      FROM "weekly_reports" wr 
      WHERE "ops_metrics"."reportId" = wr.id 
      AND ("ops_metrics"."fullDays" IS NULL OR "ops_metrics"."fullDays" = 0);
    `);

    // 7. Заполняем таблицу weeks для текущего года
    console.log('📅 Заполняем таблицу weeks...');
    
    // Функция для расчета ISO недель (упрощенная версия)
    const currentYear = new Date().getFullYear();
    for (let week = 1; week <= 53; week++) {
      const weekIso = `${currentYear}-W${String(week).padStart(2, '0')}`;
      
      // Примерный расчет дат (для точности лучше использовать библиотеку)
      const yearStart = new Date(currentYear, 0, 1);
      const weekStart = new Date(yearStart);
      weekStart.setDate(yearStart.getDate() + (week - 1) * 7);
      
      // Находим понедельник
      const dayOfWeek = weekStart.getDay();
      const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      weekStart.setDate(weekStart.getDate() + mondayOffset);
      
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      
      await client.query(`
        INSERT INTO "weeks" ("iso", "startDate", "endDate", "year", "weekNum")
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT ("iso") DO NOTHING;
      `, [weekIso, weekStart.toISOString(), weekEnd.toISOString(), currentYear, week]);
    }

    // 8. Проверяем результаты
    console.log('✅ Проверяем результаты миграции...');
    
    const hrColumns = await client.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'hr_metrics' AND column_name IN ('fullDays', 'stress', 'overtime')
      ORDER BY column_name;
    `);

    const opsColumns = await client.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'ops_metrics' AND column_name IN ('messages', 'tickets', 'orders', 'fullDays', 'stress', 'overtime')
      ORDER BY column_name;
    `);

    const indexes = await client.query(`
      SELECT tablename, indexname FROM pg_indexes 
      WHERE tablename IN ('hr_metrics', 'ops_metrics', 'weekly_reports', 'weeks')
      AND indexname LIKE '%_idx'
      ORDER BY tablename, indexname;
    `);

    const weeksCount = await client.query(`SELECT COUNT(*) as count FROM "weeks" WHERE "year" = $1;`, [currentYear]);

    await client.end();

    return NextResponse.json({
      success: true,
      message: 'Миграция схемы v2 выполнена успешно!',
      details: {
        hr_new_columns: hrColumns.rows,
        ops_new_columns: opsColumns.rows,
        new_indexes: indexes.rows,
        weeks_created: weeksCount.rows[0].count,
      },
      steps_completed: [
        '✅ Создана таблица weeks с индексами',
        '✅ Добавлены поля fullDays, stress, overtime в hr_metrics',
        '✅ Добавлены упрощенные поля в ops_metrics',
        '✅ Созданы индексы для быстрых запросов по weekIso и userId',
        '✅ Данные мигрированы из старых полей в новые',
        `✅ Заполнена таблица weeks на ${currentYear} год`,
      ],
      performance_improvements: [
        '🚀 Запросы по неделям будут выполняться быстрее',
        '🚀 Запросы по пользователям ускорены',
        '🚀 Аналитика по временным периодам оптимизирована',
      ]
    });

  } catch (error) {
    console.error('❌ Ошибка миграции v2:', error);
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
