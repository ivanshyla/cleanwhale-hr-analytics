export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { guardDebugEndpoint, logDebugAccess } from '@/lib/debug-guard';

export async function POST(request: NextRequest) {
  const guardError = guardDebugEndpoint();
  if (guardError) return guardError;
  logDebugAccess('/api/debug/test-login', 'POST');
  
  try {
    const { login, password } = await request.json();
    const normalizedLogin = typeof login === 'string' ? login.trim().toLowerCase() : '';

    console.log('🔍 Testing login for:', normalizedLogin);

    // Поиск пользователя (регистронезависимый)
    const user = await prisma.user.findFirst({
      where: {
        login: { equals: normalizedLogin, mode: 'insensitive' },
      },
    });
    
    if (!user) {
      console.log('❌ User not found:', login);
      return NextResponse.json({
        success: false,
        message: 'User not found',
        login
      });
    }
    
    console.log('✅ User found:', {
      id: user.id,
      login: user.login,
      role: user.role,
      city: user.city,
      isActive: user.isActive,
      passwordHashStart: user.password.substring(0, 20) + '...'
    });
    
    // Проверка пароля
    const isPasswordValid = await bcrypt.compare(password, user.password);
    
    console.log('🔐 Password check:', isPasswordValid ? '✅ VALID' : '❌ INVALID');
    
    return NextResponse.json({
      success: true,
      userFound: true,
      isActive: user.isActive,
      passwordValid: isPasswordValid,
      user: {
        id: user.id,
        login: user.login,
        name: user.name,
        role: user.role,
        city: user.city,
      }
    });
    
  } catch (error) {
    console.error('❌ Test login error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: String(error)
      },
      { status: 500 }
    );
  }
}

