export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { guardDebugEndpoint, logDebugAccess } from '@/lib/debug-guard';

export async function POST(request: NextRequest) {
  // Защита от доступа в production
  const guardError = guardDebugEndpoint();
  if (guardError) return guardError;
  
  logDebugAccess('/api/debug/fix-passwords', 'POST');
  
  try {
    const { Client } = require('pg');
    const client = new Client({
      connectionString: process.env.DATABASE_URL,
    });

    await client.connect();

    // Генерируем новый хеш с помощью того же bcrypt что используется в логине
    const hashedPassword = await bcrypt.hash('password123', 10);
    console.log('Generated hash:', hashedPassword);

    // Обновляем пароли для всех пользователей
    const updateSQL = `
      UPDATE "users" 
      SET password = $1, "updatedAt" = NOW()
      WHERE login IN ('admin', 'hr_manager', 'ops_manager', 'country_manager', 'mixed_manager');
    `;

    const result = await client.query(updateSQL, [hashedPassword]);
    
    await client.end();

    return NextResponse.json({
      success: true,
      message: 'Пароли обновлены!',
      updated_count: result.rowCount,
      new_hash: hashedPassword.substring(0, 20) + '...',
      credentials: 'Все пользователи: password123'
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
