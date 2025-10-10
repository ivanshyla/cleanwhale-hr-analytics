import jwt from 'jsonwebtoken';
import { NextRequest } from 'next/server';
import { User } from '@/types';

export interface JWTPayload {
  userId: string;
  login: string;
  role: string;
  city: string;
  iat: number;
  exp: number;
}

export function verifyToken(token: string): JWTPayload | null {
  try {
    const { getJwtSecret } = require('./env');
    const decoded = jwt.verify(token, getJwtSecret()) as JWTPayload;
    return decoded;
  } catch (error: any) {
    // Логируем причину ошибки для отладки
    if (error.name === 'TokenExpiredError') {
      console.warn('🔐 Token expired:', { expiredAt: error.expiredAt });
    } else if (error.name === 'JsonWebTokenError') {
      console.warn('🔐 Invalid token:', error.message);
    } else if (error.name === 'NotBeforeError') {
      console.warn('🔐 Token not active yet');
    } else {
      console.error('🔐 Token verification error:', error);
    }
    return null;
  }
}

export function getTokenFromRequest(request: NextRequest): string | null {
  // Сначала проверяем Authorization header
  const authHeader = request.headers.get('authorization');
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  
  // Если нет в header, проверяем cookies
  const cookieToken = request.cookies.get('token')?.value;
  if (cookieToken) {
    return cookieToken;
  }
  
  return null;
}

export function requireAuth(request: NextRequest): { user: JWTPayload; error?: never } | { user?: never; error: Response } {
  const token = getTokenFromRequest(request);
  
  if (!token) {
    return {
      error: new Response(
        JSON.stringify({ message: 'Токен не предоставлен' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      )
    };
  }

  const user = verifyToken(token);
  
  if (!user) {
    return {
      error: new Response(
        JSON.stringify({ message: 'Недействительный токен' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      )
    };
  }

  return { user };
}

export function requireRole(allowedRoles: string[]) {
  return (request: NextRequest): { user: JWTPayload; error?: never } | { user?: never; error: Response } => {
    const authResult = requireAuth(request);
    
    if (authResult.error) {
      return authResult;
    }

    if (!allowedRoles.includes(authResult.user.role)) {
      return {
        error: new Response(
          JSON.stringify({ message: 'Недостаточно прав доступа' }),
          { status: 403, headers: { 'Content-Type': 'application/json' } }
        )
      };
    }

    return authResult;
  };
}
