import { NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Разрешаем доступ к публичным страницам
  if (
    pathname === '/login' ||
    pathname === '/' ||
    pathname.startsWith('/api/auth/login') ||
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/public/') ||
    pathname.includes('.') // статические файлы
  ) {
    return NextResponse.next();
  }

  // ❌ КРИТИЧНО: Debug endpoints полностью заблокированы в production
  if (pathname.startsWith('/api/debug/')) {
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json(
        { error: 'Debug endpoints disabled in production' },
        { status: 404 }
      );
    }
    // В dev требуем авторизацию и ADMIN роль
    const token = request.cookies.get('token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    try {
      const jwt = require('jsonwebtoken');
      const { getJwtSecret } = require('@/lib/env');
      const decoded = jwt.verify(token, getJwtSecret()) as any;
      if (decoded.role !== 'ADMIN') {
        return NextResponse.json({ error: 'Admin only' }, { status: 403 });
      }
      return NextResponse.next();
    } catch {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }
  }

  // Для всех страниц /dashboard/** требуем авторизацию
  if (pathname.startsWith('/dashboard')) {
    const token = request.cookies.get('token')?.value || 
                  request.headers.get('authorization')?.replace('Bearer ', '');

    if (!token) {
      // Нет токена - редирект на логин
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }

    // КРИТИЧНО: Проверяем валидность токена!
    try {
      const jwt = require('jsonwebtoken');
      const { getJwtSecret } = require('@/lib/env');
      jwt.verify(token, getJwtSecret());
      // Токен валиден - разрешаем доступ
      return NextResponse.next();
    } catch (error: any) {
      // Токен невалиден или истёк - редирект на логин
      console.warn('🔐 Invalid/expired token in middleware:', error.name);
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      loginUrl.searchParams.set('reason', 'expired');
      
      // Удаляем невалидный токен
      const response = NextResponse.redirect(loginUrl);
      response.cookies.delete('token');
      return response;
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}
