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
      // Простая проверка JWT без crypto модуля (Edge Runtime compatible)
      const parts = token.split('.');
      if (parts.length !== 3) {
        throw new Error('Invalid token format');
      }
      
      const payload = JSON.parse(atob(parts[1]));
      if (payload.role !== 'ADMIN') {
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
      // Простая проверка JWT без crypto модуля (Edge Runtime compatible)
      const parts = token.split('.');
      if (parts.length !== 3) {
        throw new Error('Invalid token format');
      }
      
      const payload = JSON.parse(atob(parts[1]));
      const now = Math.floor(Date.now() / 1000);
      
      // Проверяем срок действия
      if (payload.exp && payload.exp < now) {
        throw new Error('Token expired');
      }
      
      console.log('✅ Middleware: токен валиден, пользователь:', payload.login);
      // Токен валиден - разрешаем доступ
      return NextResponse.next();
    } catch (error: any) {
      // Токен невалиден или истёк - редирект на логин
      console.warn('🔐 Invalid/expired token in middleware:', error.message, 'Token length:', token?.length);
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
