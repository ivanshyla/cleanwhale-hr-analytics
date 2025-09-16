import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { hasPermission, Permission } from '@/lib/permissions';

export async function GET(request: NextRequest) {
  const authResult = requireAuth(request);
  if (authResult.error) return authResult.error;
  const { user } = authResult;

  // Доступ только для директора по стране/админа (или у кого есть право создавать отчеты по стране)
  if (!hasPermission(user, Permission.CREATE_COUNTRY_REPORTS) && !hasPermission(user, Permission.VIEW_ALL_USERS_DATA)) {
    return NextResponse.json({ message: 'Недостаточно прав' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const city = searchParams.get('city') || undefined;

  const where: any = {
    role: { in: ['HR', 'OPERATIONS', 'MIXED'] },
    isActive: true,
  };
  if (city) where.city = city as any;

  const users = await prisma.user.findMany({
    where,
    select: { id: true, name: true, email: true, city: true, role: true },
    orderBy: [{ city: 'asc' }, { name: 'asc' }],
  });

  return NextResponse.json({ managers: users });
}
