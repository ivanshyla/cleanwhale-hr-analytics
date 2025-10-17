export const revalidate = 60; // кэш на 60 секунд

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authResult = requireAuth(request);
  if (authResult.error) return authResult.error;
  const { user } = authResult;

  // Только Country Manager и Admin
  if (!['COUNTRY_MANAGER', 'ADMIN'].includes(user.role)) {
    return NextResponse.json({ message: 'Недостаточно прав' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const {
      meetingName,
      meetingDate,
      category,
      attendees,
      attendeeNames,
      summary,
    } = body;

    const meeting = await prisma.teamMeeting.update({
      where: { id: params.id },
      data: {
        ...(meetingName && { meetingName }),
        ...(meetingDate && { meetingDate: new Date(meetingDate) }),
        ...(category && { category }),
        ...(attendees && { attendees: JSON.stringify(attendees) }),
        ...(attendeeNames && { attendeeNames: JSON.stringify(attendeeNames) }),
        ...(summary && { summary }),
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          }
        }
      }
    });

    return NextResponse.json({
      message: 'Встреча обновлена',
      meeting: {
        ...meeting,
        attendees: JSON.parse(meeting.attendees),
        attendeeNames: JSON.parse(meeting.attendeeNames),
      }
    });
  } catch (error: any) {
    console.error('❌ team-meetings PUT error:', {
      message: error.message,
      code: error.code
    });

    if (error.code === 'P2025') {
      return NextResponse.json({ message: 'Встреча не найдена' }, { status: 404 });
    }

    return NextResponse.json({ 
      message: 'Внутренняя ошибка сервера',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authResult = requireAuth(request);
  if (authResult.error) return authResult.error;
  const { user } = authResult;

  // Только Country Manager и Admin
  if (!['COUNTRY_MANAGER', 'ADMIN'].includes(user.role)) {
    return NextResponse.json({ message: 'Недостаточно прав' }, { status: 403 });
  }

  try {
    await prisma.teamMeeting.delete({
      where: { id: params.id }
    });

    return NextResponse.json({ message: 'Встреча удалена' });
  } catch (error: any) {
    console.error('❌ team-meetings DELETE error:', {
      message: error.message,
      code: error.code
    });

    if (error.code === 'P2025') {
      return NextResponse.json({ message: 'Встреча не найдена' }, { status: 404 });
    }

    return NextResponse.json({ 
      message: 'Внутренняя ошибка сервера',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    }, { status: 500 });
  }
}

