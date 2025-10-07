export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { Client } from 'pg';
import { guardDebugEndpoint, logDebugAccess } from '@/lib/debug-guard';

export async function POST(request: NextRequest) {
  const guardError = guardDebugEndpoint();
  if (guardError) return guardError;
  logDebugAccess('/api/debug/create-weekly-tables', 'POST');
  
  try {
    console.log('🏗️ Создаем таблицы для weekly reports...');

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

    // Создаем таблицу weekly_reports
    console.log('📋 Создаем таблицу weekly_reports...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS "weekly_reports" (
        "id" TEXT NOT NULL,
        "userId" TEXT NOT NULL,
        "weekIso" TEXT NOT NULL,
        "weekStartDate" TIMESTAMP(3) NOT NULL,
        "weekEndDate" TIMESTAMP(3) NOT NULL,
        "workdays" DOUBLE PRECISION NOT NULL DEFAULT 0,
        "stressLevel" INTEGER NOT NULL DEFAULT 0,
        "overtime" BOOLEAN NOT NULL DEFAULT false,
        "overtimeHours" DOUBLE PRECISION,
        "nextWeekSchedule" JSONB,
        "goodWorkWith" TEXT,
        "badWorkWith" TEXT,
        "teamComment" TEXT,
        "notes" TEXT,
        "isCompleted" BOOLEAN NOT NULL DEFAULT false,
        "submittedAt" TIMESTAMP(3),
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

        CONSTRAINT "weekly_reports_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "weekly_reports_userId_weekIso_key" UNIQUE ("userId", "weekIso"),
        CONSTRAINT "weekly_reports_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
      );
    `);

    // Создаем таблицу hr_metrics
    console.log('👥 Создаем таблицу hr_metrics...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS "hr_metrics" (
        "id" TEXT NOT NULL,
        "userId" TEXT NOT NULL,
        "reportId" TEXT NOT NULL,
        "weekIso" TEXT NOT NULL,
        "interviews" INTEGER NOT NULL DEFAULT 0,
        "jobPosts" INTEGER NOT NULL DEFAULT 0,
        "registrations" INTEGER NOT NULL DEFAULT 0,
        "difficultCases" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

        CONSTRAINT "hr_metrics_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "hr_metrics_reportId_key" UNIQUE ("reportId"),
        CONSTRAINT "hr_metrics_userId_weekIso_key" UNIQUE ("userId", "weekIso"),
        CONSTRAINT "hr_metrics_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT "hr_metrics_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "weekly_reports"("id") ON DELETE CASCADE ON UPDATE CASCADE
      );
    `);

    // Создаем таблицу ops_metrics  
    console.log('⚙️ Создаем таблицу ops_metrics...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS "ops_metrics" (
        "id" TEXT NOT NULL,
        "userId" TEXT NOT NULL,
        "reportId" TEXT NOT NULL,
        "weekIso" TEXT NOT NULL,
        "trengoMessages" INTEGER NOT NULL DEFAULT 0,
        "trengoTicketsResolved" INTEGER NOT NULL DEFAULT 0,
        "crmTicketsResolved" INTEGER NOT NULL DEFAULT 0,
        "crmOrdersCity" INTEGER NOT NULL DEFAULT 0,
        "difficultCleanerCases" TEXT,
        "difficultClientCases" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

        CONSTRAINT "ops_metrics_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "ops_metrics_reportId_key" UNIQUE ("reportId"),
        CONSTRAINT "ops_metrics_userId_weekIso_key" UNIQUE ("userId", "weekIso"),
        CONSTRAINT "ops_metrics_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT "ops_metrics_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "weekly_reports"("id") ON DELETE CASCADE ON UPDATE CASCADE
      );
    `);

    // Проверяем созданные таблицы
    console.log('✅ Проверяем созданные таблицы...');
    
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('weekly_reports', 'hr_metrics', 'ops_metrics')
      ORDER BY table_name;
    `);

    const weeklyReportsColumns = await client.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'weekly_reports' 
      ORDER BY ordinal_position;
    `);

    const hrMetricsColumns = await client.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'hr_metrics' 
      ORDER BY ordinal_position;
    `);

    const opsMetricsColumns = await client.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'ops_metrics' 
      ORDER BY ordinal_position;
    `);

    // Проверяем индексы
    const indexesResult = await client.query(`
      SELECT tablename, indexname, indexdef 
      FROM pg_indexes 
      WHERE tablename IN ('weekly_reports', 'hr_metrics', 'ops_metrics')
      AND indexdef LIKE '%UNIQUE%'
      ORDER BY tablename, indexname;
    `);

    await client.end();

    return NextResponse.json({
      success: true,
      message: 'Таблицы для weekly reports созданы успешно!',
      tables_created: tablesResult.rows.map(row => row.table_name),
      details: {
        weekly_reports_columns: weeklyReportsColumns.rows,
        hr_metrics_columns: hrMetricsColumns.rows,
        ops_metrics_columns: opsMetricsColumns.rows,
        unique_indexes: indexesResult.rows,
      },
      steps_completed: [
        '✅ Создана таблица weekly_reports с полями weekIso, workdays, stressLevel и др.',
        '✅ Создана таблица hr_metrics с уникальным индексом (userId, weekIso)',
        '✅ Создана таблица ops_metrics с уникальным индексом (userId, weekIso)',
        '✅ Настроены foreign key ограничения',
        '✅ Все уникальные индексы созданы корректно',
      ],
      next_steps: [
        'Теперь можно тестировать еженедельные отчеты',
        'HR менеджеры могут заполнять HR формы',
        'Ops менеджеры могут заполнять Ops формы',
        'Mixed менеджеры могут заполнять обе формы',
      ]
    });

  } catch (error) {
    console.error('❌ Ошибка создания таблиц:', error);
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
