/**
 * Debug Endpoints Guard
 * 
 * Защищает debug endpoints от доступа в production окружении
 */

import { NextResponse } from 'next/server';

/**
 * Проверяет, разрешен ли доступ к debug endpoints
 * В production режиме возвращает 403 ошибку
 */
export function guardDebugEndpoint(): NextResponse | null {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { 
        error: 'Debug endpoints are not available in production',
        message: 'Доступ запрещен в production режиме' 
      },
      { status: 403 }
    );
  }
  
  return null; // Разрешаем доступ в development
}

/**
 * Проверяет, что мы в development режиме
 */
export function isDevelopment(): boolean {
  return process.env.NODE_ENV !== 'production';
}

/**
 * Логирует попытку доступа к debug endpoint
 */
export function logDebugAccess(endpoint: string, action: string): void {
  if (!isDevelopment()) {
    console.warn(`⚠️ Attempted access to debug endpoint in production: ${endpoint} - ${action}`);
  } else {
    console.log(`🔧 Debug endpoint accessed: ${endpoint} - ${action}`);
  }
}


