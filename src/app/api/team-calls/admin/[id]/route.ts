export const revalidate = 60; // кэш на 60 секунд

import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { prisma } from '@/lib/prisma';
import { canAccessCountryFeatures } from '@/lib/permissions';

// DELETE /api/team-calls/admin/[id]
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    // Проверяем токен
    const token = request.cookies.get('token')?.value;
    if (!token) {
      return NextResponse.json({ message: 'Не авторизован' }, { status: 401 });
    }

    const { getJwtSecret } = require('@/lib/env');
    const decoded = jwt.verify(token, getJwtSecret()) as any;

    // Проверяем доступ к Country Manager функциям
    if (!canAccessCountryFeatures(decoded)) {
      return NextResponse.json({ message: 'Нет доступа к удалению звонков' }, { status: 403 });
    }

    const slotId = parseInt(params.id);
    if (!slotId) {
      return NextResponse.json({ message: 'Некорректный ID слота' }, { status: 400 });
    }

    // Проверяем существование слота
    const existingSlot = await prisma.teamCallSlot.findUnique({
      where: { id: slotId }
    });

    if (!existingSlot) {
      return NextResponse.json({ message: 'Слот звонка не найден' }, { status: 404 });
    }

    // Удаляем слот (attendees удалятся каскадно благодаря onDelete: Cascade)
    await prisma.teamCallSlot.delete({
      where: { id: slotId }
    });

    return NextResponse.json({
      message: 'Слот звонка удален',
      deletedId: slotId
    });

  } catch (error) {
    console.error('Error deleting team call slot:', error);
    return NextResponse.json(
      { message: 'Ошибка удаления звонка' },
      { status: 500 }
    );
  }
}
