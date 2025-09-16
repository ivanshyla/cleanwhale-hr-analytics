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
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret') as JWTPayload;
    return decoded;
  } catch (error) {
    return null;
  }
}

export function getTokenFromRequest(request: NextRequest): string | null {
  const authHeader = request.headers.get('authorization');
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
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
