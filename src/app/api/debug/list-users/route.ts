import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { Client } = require('pg');
    const client = new Client({
      connectionString: process.env.DATABASE_URL,
    });

    await client.connect();

    // Получаем всех пользователей
    const result = await client.query(`
      SELECT login, name, role, city, "isActive", "createdAt"
      FROM "users" 
      ORDER BY city, role, login;
    `);
    
    await client.end();

    return NextResponse.json({
      success: true,
      users: result.rows,
      total: result.rows.length
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
