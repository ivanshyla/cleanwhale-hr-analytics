/**
 * ВРЕМЕННЫЙ DEBUG ENDPOINT - проверить почему user not found
 * УДАЛИТЬ после диагностики!
 */

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    // Проверяем DATABASE_URL (первые 50 символов для безопасности)
    const dbUrl = process.env.DATABASE_URL || 'NOT SET';
    const dbUrlPreview = dbUrl.substring(0, 80) + '...';
    
    // Проверяем есть ли statement_cache_size
    const hasStatementCache = dbUrl.includes('statement_cache_size=0');
    
    // Считаем всех пользователей
    const totalUsers = await prisma.user.count();
    
    // Ищем country_manager
    const cm = await prisma.user.findUnique({
      where: { login: 'country_manager' },
      select: {
        id: true,
        login: true,
        name: true,
        isActive: true,
        role: true,
      }
    });
    
    // Список всех логинов
    const allUsers = await prisma.user.findMany({
      select: {
        login: true,
        isActive: true,
      },
      orderBy: { login: 'asc' }
    });
    
    return NextResponse.json({
      timestamp: new Date().toISOString(),
      database: {
        url_preview: dbUrlPreview,
        has_statement_cache_fix: hasStatementCache,
      },
      users: {
        total: totalUsers,
        country_manager_found: !!cm,
        country_manager_details: cm || 'NOT FOUND',
        all_logins: allUsers,
      }
    });
    
  } catch (error: any) {
    return NextResponse.json({
      error: error.message,
      stack: error.stack,
    }, { status: 500 });
  }
}

