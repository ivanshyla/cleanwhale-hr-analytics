export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { guardDebugEndpoint, logDebugAccess } from '@/lib/debug-guard';

export async function POST(request: NextRequest) {
  const guardError = guardDebugEndpoint();
  if (guardError) return guardError;
  logDebugAccess('/api/debug/simple-init', 'POST');
  
  try {
    // Используем прямое подключение к PostgreSQL
    const { Client } = require('pg');
    const client = new Client({
      connectionString: process.env.DATABASE_URL,
    });

    await client.connect();

    // Простое создание пользователей
    const hashedPassword = '$2a$10$N9qo8uLOickgx2ZMRZoMye.YjmhVKMFvxXQUj7dOKEKYgRmHQpgKa'; // password123

    const createUserSQL = `
      INSERT INTO "users" (id, login, password, name, role, city, "isActive", "createdAt", "updatedAt")
      VALUES 
        ('user-admin-1', 'admin', $1, 'Системный администратор', 'ADMIN', 'WARSAW', true, NOW(), NOW()),
        ('user-hr-1', 'hr_manager', $1, 'Петр Новак', 'HIRING_MANAGER', 'WARSAW', true, NOW(), NOW()),
        ('user-ops-1', 'ops_manager', $1, 'Мария Вишневская', 'OPS_MANAGER', 'WARSAW', true, NOW(), NOW()),
        ('user-country-1', 'country_manager', $1, 'Анна Ковальская', 'COUNTRY_MANAGER', 'WARSAW', true, NOW(), NOW()),
        ('user-mixed-1', 'mixed_manager', $1, 'Томаш Лесняк', 'MIXED_MANAGER', 'KRAKOW', true, NOW(), NOW())
      ON CONFLICT (login) DO NOTHING;
    `;

    const result = await client.query(createUserSQL, [hashedPassword]);
    
    await client.end();

    return NextResponse.json({
      success: true,
      message: 'Пользователи созданы!',
      credentials: {
        admin: 'admin / password123',
        hr: 'hr_manager / password123',
        ops: 'ops_manager / password123',
        country: 'country_manager / password123',
        mixed: 'mixed_manager / password123'
      }
    });

  } catch (error) {
    console.error('❌ Ошибка:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Неизвестная ошибка',
        debug: process.env.DATABASE_URL?.substring(0, 50) + '...'
      },
      { status: 500 }
    );
  }
}
