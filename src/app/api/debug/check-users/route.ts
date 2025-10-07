import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    console.log('=== CHECK USERS DEBUG ===');
    console.log('DATABASE_URL exists:', !!process.env.DATABASE_URL);
    console.log('DATABASE_URL prefix:', process.env.DATABASE_URL?.substring(0, 40));
    
    // Получаем всех пользователей
    const allUsers = await prisma.user.findMany({
      select: {
        id: true,
        login: true,
        name: true,
        role: true,
        isActive: true,
        createdAt: true
      },
      orderBy: {
        createdAt: 'asc'
      }
    });
    
    console.log('Total users:', allUsers.length);
    console.log('Users:', allUsers.map(u => `${u.login} (${u.role}, active: ${u.isActive})`).join(', '));
    
    // Проверяем country_manager
    const countryManager = await prisma.user.findUnique({
      where: { login: 'country_manager' },
      select: {
        id: true,
        login: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        password: true,
        createdAt: true,
        updatedAt: true
      }
    });
    
    console.log('Country manager found:', !!countryManager);
    if (countryManager) {
      console.log('Country manager details:', {
        id: countryManager.id,
        login: countryManager.login,
        isActive: countryManager.isActive,
        passwordLength: countryManager.password?.length,
        passwordStart: countryManager.password?.substring(0, 10)
      });
    }
    
    return NextResponse.json({
      success: true,
      databaseConnected: true,
      databaseUrlPrefix: process.env.DATABASE_URL?.substring(0, 40),
      totalUsers: allUsers.length,
      users: allUsers.map(u => ({
        login: u.login,
        name: u.name,
        role: u.role,
        isActive: u.isActive
      })),
      countryManager: countryManager ? {
        id: countryManager.id,
        login: countryManager.login,
        name: countryManager.name,
        email: countryManager.email,
        role: countryManager.role,
        isActive: countryManager.isActive,
        passwordLength: countryManager.password?.length,
        passwordHash: countryManager.password?.substring(0, 20) + '...',
        created: countryManager.createdAt,
        updated: countryManager.updatedAt
      } : null
    });
    
  } catch (error: any) {
    console.error('Error in check-users:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
      stack: error.stack
    }, { status: 500 });
  }
}

