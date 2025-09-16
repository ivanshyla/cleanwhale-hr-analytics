import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

// Обновление звонка
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authResult = requireAuth(request);
  if (authResult.error) {
    return authResult.error;
  }

  const { user } = authResult;
  const callId = params.id;

  try {
    // Только country manager и admin могут обновлять звонки
    if (!['COUNTRY_MANAGER', 'ADMIN'].includes(user.role)) {
      return NextResponse.json(
        { message: 'Недостаточно прав для обновления звонков' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      callDate,
      callTime,
      duration,
      city,
      participantIds,
      participantNames,
      topic,
      agenda,
      callType,
      priority,
      status,
      actualDuration,
      notes,
      outcome,
      nextActions,
    } = body;

    // Проверяем, что звонок существует и принадлежит текущему пользователю (если не админ)
    const existingCall = await prisma.callSchedule.findUnique({
      where: { id: callId }
    });

    if (!existingCall) {
      return NextResponse.json(
        { message: 'Звонок не найден' },
        { status: 404 }
      );
    }

    if (user.role !== 'ADMIN' && existingCall.scheduledById !== user.userId) {
      return NextResponse.json(
        { message: 'Недостаточно прав для обновления этого звонка' },
        { status: 403 }
      );
    }

    // Если обновляются участники, проверяем их
    if (participantIds && city) {
      const participants = await prisma.user.findMany({
        where: {
          id: { in: participantIds },
          city: city,
          active: true,
          role: { in: ['HR', 'OPERATIONS', 'MIXED'] }
        },
        select: {
          id: true,
          name: true,
          city: true,
          role: true,
        }
      });

      if (participants.length !== participantIds.length) {
        return NextResponse.json(
          { message: 'Некоторые участники не найдены или не относятся к указанному городу' },
          { status: 400 }
        );
      }
    }

    const updatedCall = await prisma.callSchedule.update({
      where: { id: callId },
      data: {
        ...(callDate && { callDate: new Date(callDate) }),
        ...(callTime && { callTime }),
        ...(duration !== undefined && { duration: duration ? parseInt(duration) : null }),
        ...(city && { city }),
        ...(participantIds && { participantIds: JSON.stringify(participantIds) }),
        ...(participantNames && { participantNames: JSON.stringify(participantNames) }),
        ...(topic !== undefined && { topic: topic || null }),
        ...(agenda !== undefined && { agenda: agenda || null }),
        ...(callType && { callType }),
        ...(priority && { priority }),
        ...(status && { status }),
        ...(actualDuration !== undefined && { actualDuration: actualDuration ? parseInt(actualDuration) : null }),
        ...(notes !== undefined && { notes: notes || null }),
        ...(outcome !== undefined && { outcome: outcome || null }),
        ...(nextActions !== undefined && { nextActions: nextActions || null }),
        updatedAt: new Date(),
      },
      include: {
        scheduledBy: {
          select: {
            id: true,
            name: true,
            role: true,
          }
        }
      }
    });

    return NextResponse.json({
      message: 'Звонок обновлен',
      call: updatedCall,
    });

  } catch (error) {
    console.error('Error updating call schedule:', error);
    return NextResponse.json(
      { message: 'Ошибка обновления звонка', error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

// Удаление звонка
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authResult = requireAuth(request);
  if (authResult.error) {
    return authResult.error;
  }

  const { user } = authResult;
  const callId = params.id;

  try {
    // Только country manager и admin могут удалять звонки
    if (!['COUNTRY_MANAGER', 'ADMIN'].includes(user.role)) {
      return NextResponse.json(
        { message: 'Недостаточно прав для удаления звонков' },
        { status: 403 }
      );
    }

    // Проверяем, что звонок существует и принадлежит текущему пользователю (если не админ)
    const existingCall = await prisma.callSchedule.findUnique({
      where: { id: callId }
    });

    if (!existingCall) {
      return NextResponse.json(
        { message: 'Звонок не найден' },
        { status: 404 }
      );
    }

    if (user.role !== 'ADMIN' && existingCall.scheduledById !== user.userId) {
      return NextResponse.json(
        { message: 'Недостаточно прав для удаления этого звонка' },
        { status: 403 }
      );
    }

    await prisma.callSchedule.delete({
      where: { id: callId }
    });

    return NextResponse.json({
      message: 'Звонок удален',
    });

  } catch (error) {
    console.error('Error deleting call schedule:', error);
    return NextResponse.json(
      { message: 'Ошибка удаления звонка', error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
