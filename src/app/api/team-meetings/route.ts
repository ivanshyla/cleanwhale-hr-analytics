export const revalidate = 60; // кэш на 60 секунд

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

export async function POST(request: NextRequest) {
  const authResult = requireAuth(request);
  if (authResult.error) return authResult.error;
  const { user } = authResult;

  // Только Country Manager и Admin могут создавать встречи
  if (!['COUNTRY_MANAGER', 'ADMIN'].includes(user.role)) {
    return NextResponse.json({ message: 'Недостаточно прав' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const {
      meetingName,
      meetingDate,
      category,
      attendees, // string[]
      attendeeNames, // string[]
      summary,
    } = body;

    if (!meetingName || !meetingDate || !category || !attendees || !summary) {
      return NextResponse.json(
        { message: 'Обязательные поля: meetingName, meetingDate, category, attendees, summary' },
        { status: 400 }
      );
    }

    // Используем userId из JWT payload
    const meeting = await prisma.teamMeeting.create({
      data: {
        userId: user.userId,  // userId из JWT токена
        meetingName,
        meetingDate: new Date(meetingDate),
        category,
        attendees: JSON.stringify(attendees),
        attendeeNames: JSON.stringify(attendeeNames || []),
        summary,
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
      message: 'Встреча создана',
      meeting: {
        ...meeting,
        attendees: JSON.parse(meeting.attendees),
        attendeeNames: JSON.parse(meeting.attendeeNames),
      }
    });
  } catch (error: any) {
    console.error('❌ team-meetings POST error:', {
      message: error.message,
      code: error.code,
      meta: error.meta
    });
    
    // Более детальная ошибка для разработки
    if (error.code === 'P2003') {
      return NextResponse.json({ 
        message: 'Ошибка: пользователь не найден',
        error: 'Invalid user reference'
      }, { status: 400 });
    }

    return NextResponse.json({ 
      message: 'Внутренняя ошибка сервера',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const authResult = requireAuth(request);
  if (authResult.error) return authResult.error;
  const { user } = authResult;

  // Только Country Manager и Admin могут просматривать встречи
  if (!['COUNTRY_MANAGER', 'ADMIN'].includes(user.role)) {
    return NextResponse.json({ message: 'Недостаточно прав' }, { status: 403 });
  }

  try {
    const meetings = await prisma.teamMeeting.findMany({
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          }
        }
      },
      orderBy: {
        meetingDate: 'desc'
      }
    });

    const formattedMeetings = meetings.map(meeting => ({
      ...meeting,
      attendees: JSON.parse(meeting.attendees),
      attendeeNames: JSON.parse(meeting.attendeeNames),
    }));

    return NextResponse.json({ meetings: formattedMeetings, total: formattedMeetings.length });
  } catch (error: any) {
    console.error('❌ team-meetings GET error:', {
      message: error.message,
      code: error.code
    });
    
    return NextResponse.json({ 
      message: 'Внутренняя ошибка сервера',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    }, { status: 500 });
  }
}
