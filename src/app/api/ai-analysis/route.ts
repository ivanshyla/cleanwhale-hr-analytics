export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

// NOTE: OpenAI is temporarily disabled for MVP. Endpoints return stubbed data.

// GET - получить AI анализ (заглушки)
export async function GET(request: NextRequest) {
  const authResult = requireAuth(request);
  if (authResult.error) return authResult.error;

  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type') || 'summary';
  const weekIso = searchParams.get('weekIso');
  const userId = searchParams.get('userId');

  try {
    if (type === 'summary') {
      // Можно при желании получать отчеты, но без AI
      const whereClause: any = {};
      if (weekIso) whereClause.weekIso = weekIso;
      if (userId) whereClause.userId = userId;

      const count = await prisma.weeklyReport.count({ where: whereClause });

      return NextResponse.json({
        type: 'summary',
        title: 'AI отключен (MVP режим)',
        description: 'Сбор данных активен. Аналитика будет подключена позже.',
        insights: { reports: count },
      });
    }

    if (type === 'anomalies') {
      return NextResponse.json({
        type: 'anomalies',
        title: 'AI отключен (MVP режим)',
        description: 'Выявление аномалий будет доступно позже.',
        severity: 'info',
        insights: { weekIso: weekIso || 'latest' },
      });
    }

    if (type === 'recommendations') {
      return NextResponse.json({
        type: 'recommendations',
        title: 'AI отключен (MVP режим)',
        description: 'Рекомендации будут доступны позже.',
        severity: 'info',
        insights: { weekIso: weekIso || 'general' },
      });
    }

    return NextResponse.json(
      { message: 'Неизвестный тип анализа' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Error in AI analysis (stub):', error);
    return NextResponse.json(
      { message: 'Ошибка при выполнении запроса' },
      { status: 500 }
    );
  }
}

// POST - запросить новый AI анализ (проксируем на GET)
export async function POST(request: NextRequest) {
  const authResult = requireAuth(request);
  if (authResult.error) return authResult.error;

  try {
    const { type, weekIso, targetUserId } = await request.json();

    const searchParams = new URLSearchParams();
    if (type) searchParams.set('type', type);
    if (weekIso) searchParams.set('weekIso', weekIso);
    if (targetUserId) searchParams.set('userId', targetUserId);

    const url = new URL(request.url);
    url.search = searchParams.toString();

    return GET(new NextRequest(url.toString(), {
      method: 'GET',
      headers: request.headers,
    }));
  } catch (error) {
    console.error('Error processing AI analysis request (stub):', error);
    return NextResponse.json(
      { message: 'Ошибка при обработке запроса' },
      { status: 500 }
    );
  }
}