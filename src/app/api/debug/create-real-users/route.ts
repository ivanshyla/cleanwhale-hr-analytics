export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { guardDebugEndpoint, logDebugAccess } from '@/lib/debug-guard';

export async function POST(request: NextRequest) {
  // Защита от доступа в production
  const guardError = guardDebugEndpoint();
  if (guardError) return guardError;
  
  logDebugAccess('/api/debug/create-real-users', 'POST');
  
  try {
    const { Client } = require('pg');
    const client = new Client({
      connectionString: process.env.DATABASE_URL,
    });

    await client.connect();

    // Генерируем хеш пароля
    const hashedPassword = await bcrypt.hash('password123', 10);

    // Реальные пользователи по городам и ролям
    const realUsers = [
      // Гданьск
      { login: 'gdansk_hr1', name: 'Анна Гданьская', role: 'HIRING_MANAGER', city: 'GDANSK' },
      
      // Лодзь  
      { login: 'lodz_mixed1', name: 'Петр Лодзинский', role: 'MIXED_MANAGER', city: 'LODZ' },
      
      // Краков
      { login: 'krakow_hr1', name: 'Мария Краковская', role: 'HIRING_MANAGER', city: 'KRAKOW' },
      { login: 'krakow_ops1', name: 'Томаш Краковский', role: 'OPS_MANAGER', city: 'KRAKOW' },
      { login: 'krakow_ops2', name: 'Ева Краковская', role: 'OPS_MANAGER', city: 'KRAKOW' },
      
      // Варшава
      { login: 'warsaw_ops1', name: 'Павел Варшавский', role: 'OPS_MANAGER', city: 'WARSAW' },
      { login: 'warsaw_ops2', name: 'Моника Варшавская', role: 'OPS_MANAGER', city: 'WARSAW' },
      { login: 'warsaw_hr1', name: 'Катаржина Варшавская', role: 'HIRING_MANAGER', city: 'WARSAW' },
      { login: 'warsaw_hr2', name: 'Марек Варшавский', role: 'HIRING_MANAGER', city: 'WARSAW' },
      
      // Познань
      { login: 'poznan_mixed1', name: 'Агнешка Познанская', role: 'MIXED_MANAGER', city: 'POZNAN' },
      { login: 'poznan_mixed2', name: 'Рафал Познанский', role: 'MIXED_MANAGER', city: 'POZNAN' },
      
      // Вроцлав
      { login: 'wroclaw_mixed1', name: 'Дорота Вроцлавская', role: 'MIXED_MANAGER', city: 'WROCLAW' },
      { login: 'wroclaw_mixed2', name: 'Михал Вроцлавский', role: 'MIXED_MANAGER', city: 'WROCLAW' },
      
      // Катовице
      { login: 'katowice_mixed1', name: 'Барбара Катовицкая', role: 'MIXED_MANAGER', city: 'KATOWICE' },
      
      // Люблин
      { login: 'lublin_mixed1', name: 'Камиль Люблинский', role: 'MIXED_MANAGER', city: 'LUBLIN' },
      
      // Белосток
      { login: 'bialystok_mixed1', name: 'Магдалена Белостокская', role: 'MIXED_MANAGER', city: 'BIALYSTOK' },
      
      // Менеджер по стране
      { login: 'country_manager', name: 'Анна Ковальская', role: 'COUNTRY_MANAGER', city: 'WARSAW' },
    ];

    // Создаем пользователей
    for (const user of realUsers) {
      await client.query(`
        INSERT INTO "users" (id, login, password, name, role, city, "isActive", "createdAt", "updatedAt")
        VALUES ($1, $2, $3, $4, $5, $6, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        ON CONFLICT (login) DO UPDATE SET 
          name = EXCLUDED.name,
          role = EXCLUDED.role,
          city = EXCLUDED.city,
          "updatedAt" = CURRENT_TIMESTAMP;
      `, [crypto.randomUUID(), user.login, hashedPassword, user.name, user.role, user.city]);
    }
    
    await client.end();

    return NextResponse.json({
      success: true,
      message: 'Реальные пользователи созданы!',
      users_count: realUsers.length,
      credentials: 'Все пользователи: password123',
      users: realUsers.map(u => ({
        login: u.login,
        name: u.name,
        role: u.role,
        city: u.city
      }))
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
