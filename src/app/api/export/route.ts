export const revalidate = 60; // кэш на 60 секунд

import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { prisma } from '@/lib/prisma';
import { canAccessCountryFeatures } from '@/lib/permissions';

// GET /api/export?type=city_week&weekIso=... 
// GET /api/export?type=users_week&weekIso=...
// GET /api/export?type=raw_hr&weekIso=...
// GET /api/export?type=raw_ops&weekIso=...
export async function GET(request: NextRequest) {
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
      return NextResponse.json({ message: 'Нет доступа к экспорту данных' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const weekIso = searchParams.get('weekIso');
    
    if (!type || !weekIso) {
      return NextResponse.json({ message: 'Параметры type и weekIso обязательны' }, { status: 400 });
    }

    const { blob, filename } = await generateExport(type, weekIso);

    return new NextResponse(blob as any, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${filename}"`
      }
    });

  } catch (error) {
    console.error('Error generating export:', error);
    return NextResponse.json(
      { message: 'Ошибка создания экспорта' },
      { status: 500 }
    );
  }
}

async function generateExport(type: string, weekIso: string): Promise<{ blob: Buffer; filename: string }> {
  switch (type) {
    case 'city_week':
      return await exportCityWeek(weekIso);
    case 'users_week':
      return await exportUsersWeek(weekIso);
    case 'raw_hr':
      return await exportRawHR(weekIso);
    case 'raw_ops':
      return await exportRawOps(weekIso);
    default:
      throw new Error(`Неизвестный тип экспорта: ${type}`);
  }
}

async function exportCityWeek(weekIso: string): Promise<{ blob: Buffer; filename: string }> {
  // Получаем данные по городам
  const aggregates = await prisma.countryAggregate.findMany({
    where: { weekIso },
    include: {
      city: true
    }
  });

  // Преобразуем в CSV
  const csvHeader = 'City,CityCode,WeekIso,TrengoResponses,CrmComplaintsClosed,TrengoTickets,HiredPeople,CityOrders,TrengoMessages,HiredHR,HiredOps,HiredMixed,Notes,UpdatedAt,Source\n';
  
  const csvRows = aggregates.map(agg => {
    const row = [
      `"${agg.city.name}"`,
      `"${agg.city.code}"`,
      `"${weekIso}"`,
      agg.trengoResponses,
      agg.crmComplaintsClosed,
      agg.trengoTickets,
      agg.hiredPeople,
      agg.cityOrders,
      agg.trengoMessages,
      agg.hiredHR,
      agg.hiredOps,
      agg.hiredMixed,
      `"${agg.notes || ''}"`,
      `"${agg.updatedAt.toISOString()}"`,
      'COUNTRY'
    ].join(',');
    return row;
  });

  const csvContent = csvHeader + csvRows.join('\n');
  const blob = Buffer.from(csvContent, 'utf-8');

  return {
    blob,
    filename: `city_week_${weekIso}.csv`
  };
}

async function exportUsersWeek(weekIso: string): Promise<{ blob: Buffer; filename: string }> {
  // Получаем пользователей с их вводами и самоотчетами
  const users = await prisma.user.findMany({
    where: {
      isActive: true,
      role: { in: ['HIRING_MANAGER', 'OPS_MANAGER', 'MIXED_MANAGER'] }
    }
  });

  const userIds = users.map(u => u.id);

  // Получаем country user inputs
  const countryInputs = await prisma.countryUserInput.findMany({
    where: { weekIso, userId: { in: userIds } }
  });

  // Получаем self reports
  const selfReports = await prisma.weeklyReport.findMany({
    where: { weekIso, userId: { in: userIds } },
    include: {
      hrMetrics: true,
      opsMetrics: true
    }
  });

  // CSV для экспорта пользователей
  const csvHeader = 'Name,Email,City,Role,WeekIso,TrengoResponses_Final,TrengoTickets_Final,CrmComplaints_Final,Orders_Final,HR_Interviews_Final,HR_Registrations_Final,Source,UpdatedAt\n';
  
  const csvRows = users.map(user => {
    const countryInput = countryInputs.find(ci => ci.userId === user.id);
    const selfReport = selfReports.find(sr => sr.userId === user.id);
    
    const finalResport = countryInput || (selfReport && selfReport.opsMetrics);
    
    const row = [
      `"${user.name}"`,
      `"${user.email}"`,
      `"${user.city}"`,
      `"${user.role}"`,
      `"${weekIso}"`,
      countryInput?.trengoResponses || selfReport?.opsMetrics?.messages || 0,
      countryInput?.trengoTickets || selfReport?.opsMetrics?.tickets || 0,
      countryInput?.crmComplaintsClosed || 0, // Используем только country input
      countryInput?.ordersHandled || selfReport?.opsMetrics?.orders || 0,
      selfReport?.hrMetrics?.registrations || 0,
      selfReport?.hrMetrics?.registrations || 0, // Дублируем для совместимости
      countryInput ? 'COUNTRY' : (selfReport ? 'SELF' : 'NONE'),
      finalResport ? finalResport.updatedAt.toISOString() : ''
    ].join(',');
    
    return row;
  });

  const csvContent = csvHeader + csvRows.join('\n');
  const blob = Buffer.from(csvContent, 'utf-8');

  return {
    blob,
    filename: `users_week_${weekIso}.csv`
  };
}

async function exportRawHR(weekIso: string): Promise<{ blob: Buffer; filename: string }> {
  // Получаем все HR metrics за неделю
  const hrMetrics = await prisma.hrMetrics.findMany({
    where: { weekIso },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          city: true,
          role: true
        }
      }
    }
  });

  const csvHeader = 'UserId,UserName,UserEmail,UserCity,UserRole,WeekIso,Interviews,JobPosts,Registrations,FullDays,DifficultCases,Stress,Overtime,CreatedAt,UpdatedAt\n';
  
  const csvRows = hrMetrics.map(hr => {
    const row = [
      `"${hr.user.id}"`,
      `"${hr.user.name}"`,
      `"${hr.user.email}"`,
      `"${hr.user.city}"`,
      `"${hr.user.role}"`,
      `"${weekIso}"`,
      hr.interviews,
      hr.jobPosts,
      hr.registrations,
      hr.fullDays,
      `"${hr.difficultCases || ''}"`,
      hr.stress || '',
      hr.overtime ? 1 : 0,
      hr.createdAt.toISOString(),
      hr.updatedAt.toISOString()
    ].join(',');
    return row;
  });

  const csvContent = csvHeader + csvRows.join('\n');
  const blob = Buffer.from(csvContent, 'utf-8');

  return {
    blob,
    filename: `raw_hr_${weekIso}.csv`
  };
}

async function exportRawOps(weekIso: string): Promise<{ blob: Buffer; filename: string }> {
  // Получаем все Ops metrics за неделю
  const opsMetrics = await prisma.opsMetrics.findMany({
    where: { weekIso },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          city: true,
          role: true
        }
      }
    }
  });

  const csvHeader = 'UserId,UserName,UserEmail,UserCity,UserRole,WeekIso,Messages,Tickets,Orders,FullDays,DiffCleaners,DiffClients,Stress,Overtime,SourceMsg,SourceTkt,SourceOrd,CreatedAt,UpdatedAt\n';
  
  const csvRows = opsMetrics.map(ops => {
    const row = [
      `"${ops.user.id}"`,
      `"${ops.user.name}"`,
      `"${ops.user.email}"`,
      `"${ops.user.city}"`,
      `"${ops.user.role}"`,
      `"${weekIso}"`,
      ops.messages,
      ops.tickets,
      ops.orders,
      ops.fullDays,
      `"${ops.diffCleaners || ''}"`,
      `"${ops.diffClients || ''}"`,
      ops.stress || '',
      ops.overtime ? 1 : 0,
      ops.sourceMsg || '',
      ops.sourceTkt || '',
      ops.sourceOrd || '',
      ops.createdAt.toISOString(),
      ops.updatedAt.toISOString()
    ].join(',');
    return row;
  });

  const csvContent = csvHeader + csvRows.join('\n');
  const blob = Buffer.from(csvContent, 'utf-8');

  return {
    blob,
    filename: `raw_ops_${weekIso}.csv`
  };
}
