import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';

export async function POST(request: NextRequest) {
  try {
    const { Client } = require('pg');
    const client = new Client({
      connectionString: process.env.DATABASE_URL,
    });

    await client.connect();

    // Сначала удаляем всех пользователей (кроме админа)
    await client.query(`DELETE FROM "users" WHERE login != 'admin';`);

    // Генерируем хеш пароля
    const hashedPassword = await bcrypt.hash('password123', 10);

    // Создаем простую таблицу без enum'ов если нужно
    await client.query(`
      CREATE TABLE IF NOT EXISTS "simple_users" (
        id TEXT PRIMARY KEY,
        login TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        name TEXT NOT NULL,
        role TEXT NOT NULL,
        city TEXT NOT NULL,
        "isActive" BOOLEAN DEFAULT true,
        "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Тестовые пользователи без enum'ов
    const users = [
      { login: 'admin', name: 'Администратор', role: 'ADMIN', city: 'WARSAW' },
      { login: 'country_manager', name: 'Менеджер по стране', role: 'COUNTRY_MANAGER', city: 'WARSAW' },
      { login: 'warsaw_hr1', name: 'HR Варшава 1', role: 'HIRING_MANAGER', city: 'WARSAW' },
      { login: 'warsaw_ops1', name: 'Ops Варшава 1', role: 'OPS_MANAGER', city: 'WARSAW' },
      { login: 'krakow_mixed1', name: 'Mixed Краков 1', role: 'MIXED_MANAGER', city: 'KRAKOW' },
      { login: 'poznan_mixed1', name: 'Mixed Познань 1', role: 'MIXED_MANAGER', city: 'POZNAN' },
    ];

    // Вставляем в обычную таблицу users (пробуем без enum validation)
    for (const user of users) {
      try {
        await client.query(`
          INSERT INTO "users" (id, login, password, name, role, city, "isActive", "createdAt", "updatedAt")
          VALUES ($1, $2, $3, $4, $5, $6, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
          ON CONFLICT (login) DO UPDATE SET 
            password = EXCLUDED.password,
            name = EXCLUDED.name,
            role = EXCLUDED.role,
            city = EXCLUDED.city,
            "updatedAt" = CURRENT_TIMESTAMP;
        `, [
          crypto.randomUUID(),
          user.login,
          hashedPassword,
          user.name,
          user.role,
          user.city
        ]);
      } catch (userError) {
        console.log(`Error inserting ${user.login}:`, userError);
      }
    }

    await client.end();

    return NextResponse.json({
      success: true,
      message: 'Пользователи пересозданы простым способом!',
      users: users.map(u => ({ login: u.login, role: u.role, city: u.city })),
      hash_sample: hashedPassword.substring(0, 20) + '...'
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
