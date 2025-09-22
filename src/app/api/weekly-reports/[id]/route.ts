import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { prisma } from '@/lib/prisma';
import type { WeeklyReportGetResponse } from '@/types/api';

// GET /api/weekly-reports/:id?role=hr|ops (where id is weekIso)
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Проверяем токен
    const token = request.cookies.get('token')?.value;
    if (!token) {
      return NextResponse.json({ message: 'Не авторизован' }, { status: 401 });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret') as any;
    const userId = decoded.userId;

    const { searchParams } = new URL(request.url);
    const role = searchParams.get('role') as 'hr' | 'ops' | null;
    const weekIso = params.id; // id parameter contains weekIso

    // Получаем данные пользователя для проверки роли
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true }
    });

    if (!user) {
      return NextResponse.json({ message: 'Пользователь не найден' }, { status: 404 });
    }

    // Получаем отчет и связанные метрики
    const weeklyReport = await prisma.weeklyReport.findUnique({
      where: {
        userId_weekIso: { userId, weekIso }
      },
      include: {
        hrMetrics: true,
        opsMetrics: true
      }
    });

    const response: WeeklyReportGetResponse = {
      weekIso,
      hr: null,
      ops: null
    };

    // Проверяем доступ и добавляем данные
    const userRole = user.role;
    const hasHRAccess = ['HIRING_MANAGER', 'MIXED_MANAGER'].includes(userRole);
    const hasOpsAccess = ['OPS_MANAGER', 'MIXED_MANAGER'].includes(userRole);

    if ((role === 'hr' && !hasHRAccess) || (role === 'ops' && !hasOpsAccess)) {
      return NextResponse.json({ message: 'Нет доступа к данной роли' }, { status: 403 });
    }

    // Если указана конкретная роль, возвращаем только её данные
    if (role === 'hr' && hasHRAccess && weeklyReport?.hrMetrics) {
      const hr = weeklyReport.hrMetrics;
      response.hr = {
        interviews: hr.interviews,
        jobPosts: hr.jobPosts,
        registered: hr.registrations, // mapping
        fullDays: hr.fullDays || 0,
        difficult: hr.difficultCases || '', // mapping
        stress: hr.stress || 0,
        overtime: hr.overtime
      };
    }

    if (role === 'ops' && hasOpsAccess && weeklyReport?.opsMetrics) {
      const ops = weeklyReport.opsMetrics;
      response.ops = {
        messages: ops.messages || 0,
        tickets: ops.tickets || 0,
        orders: ops.orders || 0,
        fullDays: ops.fullDays || 0,
        diffCleaners: ops.diffCleaners || '',
        diffClients: ops.diffClients || '',
        stress: ops.stress || 0,
        overtime: ops.overtime
      };
    }

    // Если роль не указана, возвращаем все доступные данные
    if (!role) {
      if (hasHRAccess && weeklyReport?.hrMetrics) {
        const hr = weeklyReport.hrMetrics;
        response.hr = {
          interviews: hr.interviews,
          jobPosts: hr.jobPosts,
          registered: hr.registrations,
          fullDays: hr.fullDays || 0,
          difficult: hr.difficultCases || '',
          stress: hr.stress || 0,
          overtime: hr.overtime
        };
      }

      if (hasOpsAccess && weeklyReport?.opsMetrics) {
        const ops = weeklyReport.opsMetrics;
        response.ops = {
          messages: ops.messages || 0,
          tickets: ops.tickets || 0,
          orders: ops.orders || 0,
          fullDays: ops.fullDays || 0,
          diffCleaners: ops.diffCleaners || '',
          diffClients: ops.diffClients || '',
          stress: ops.stress || 0,
          overtime: ops.overtime
        };
      }
    }

    return NextResponse.json(response);

  } catch (error) {
    console.error('Error fetching weekly report:', error);
    return NextResponse.json(
      { message: 'Ошибка получения отчета' },
      { status: 500 }
    );
  }
}
