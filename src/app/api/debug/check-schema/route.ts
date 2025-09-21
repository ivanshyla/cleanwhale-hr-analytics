import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { Client } = require('pg');
    const client = new Client({
      connectionString: process.env.DATABASE_URL,
    });

    await client.connect();

    // Проверяем структуру таблицы users
    const tableStructure = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'users' AND table_schema = 'public'
      ORDER BY ordinal_position;
    `);

    // Проверяем enum типы
    const enumTypes = await client.query(`
      SELECT t.typname, e.enumlabel 
      FROM pg_type t 
      JOIN pg_enum e ON t.oid = e.enumtypid 
      WHERE t.typname IN ('Role', 'City')
      ORDER BY t.typname, e.enumsortorder;
    `);

    // Проверяем конкретного пользователя
    const userCheck = await client.query(`
      SELECT login, name, role, city, "isActive", length(password) as password_length
      FROM "users" 
      WHERE login = 'warsaw_hr1';
    `);

    await client.end();

    return NextResponse.json({
      success: true,
      table_structure: tableStructure.rows,
      enum_types: enumTypes.rows,
      user_check: userCheck.rows,
      database_info: {
        url_start: process.env.DATABASE_URL?.substring(0, 50) + '...',
        connection_type: 'Supabase PostgreSQL'
      }
    });

  } catch (error) {
    console.error('❌ Ошибка:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Неизвестная ошибка'
      },
      { status: 500 }
    );
  }
}
