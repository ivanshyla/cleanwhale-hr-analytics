export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

// Simple protected endpoint to upsert baseline users in production.
// Protection: Authorization: Bearer <SETUP_SECRET>

export async function POST(request: NextRequest) {
  const setupSecret = process.env.SETUP_SECRET;
  if (!setupSecret) {
    return NextResponse.json({ error: 'SETUP_SECRET not configured' }, { status: 500 });
  }

  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${setupSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const users = [
    { login: 'admin', password: 'admin123', name: 'Системный администратор', role: 'ADMIN', city: 'WARSAW' },
    { login: 'country_manager', password: 'country123', name: 'Country Manager', role: 'COUNTRY_MANAGER', city: 'WARSAW' },
  ];

  const results: any[] = [];

  for (const u of users) {
    const existing = await prisma.user.findUnique({ where: { login: u.login } });
    const hashed = await bcrypt.hash(u.password, 10);
    if (existing) {
      const updated = await prisma.user.update({
        where: { login: u.login },
        data: { password: hashed, isActive: true },
        select: { id: true, login: true, isActive: true },
      });
      results.push({ action: 'updated', user: updated });
    } else {
      const created = await prisma.user.create({
        data: {
          login: u.login,
          password: hashed,
          name: u.name,
          role: u.role as any,
          city: u.city as any,
          isActive: true,
        },
        select: { id: true, login: true, isActive: true },
      });
      results.push({ action: 'created', user: created });
    }
  }

  return NextResponse.json({ success: true, results });
}


