import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { generateReportSummary, detectAnomalies, generateTeamRecommendations } from '@/lib/openai';

// GET - получить AI анализ
export async function GET(request: NextRequest) {
  const authResult = requireAuth(request);
  if (authResult.error) return authResult.error;

  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type') || 'summary';
  const weekIso = searchParams.get('weekIso');
  const userId = searchParams.get('userId');

  try {
    if (type === 'summary') {
      // Получаем данные для резюме
      const whereClause: any = {};
      if (weekIso) whereClause.weekIso = weekIso;
      if (userId) whereClause.userId = userId;

      const reports = await prisma.weeklyReport.findMany({
        where: whereClause,
        include: {
          user: {
            select: {
              name: true,
              role: true,
              city: true,
            },
          },
          hrMetrics: true,
          opsMetrics: true,
        },
        orderBy: {
          weekStartDate: 'desc',
        },
        take: 10,
      });

      if (reports.length === 0) {
        return NextResponse.json({
          type: 'summary',
          title: 'Нет данных для анализа',
          description: 'Недостаточно данных для создания AI резюме',
          insights: {},
          recommendations: 'Заполните еженедельные отчеты для получения AI анализа',
        });
      }

      // Генерируем AI резюме
      const summary = await generateReportSummary(reports);

      // Сохраняем анализ в базу данных
      const analysis = await prisma.aiAnalysis.create({
        data: {
          type: 'summary',
          title: 'AI Резюме недели',
          description: summary,
          severity: 'info',
          weekIso: weekIso || reports[0].weekIso,
          insights: { reports: reports.length, summary },
        },
      });

      return NextResponse.json(analysis);
    }

    if (type === 'anomalies') {
      // Анализ аномалий
      const currentWeekReports = await prisma.weeklyReport.findMany({
        where: { weekIso },
        include: {
          user: true,
          hrMetrics: true,
          opsMetrics: true,
        },
      });

      const historicalReports = await prisma.weeklyReport.findMany({
        where: {
          weekIso: { not: weekIso },
        },
        include: {
          hrMetrics: true,
          opsMetrics: true,
        },
        orderBy: {
          weekStartDate: 'desc',
        },
        take: 20,
      });

      const anomalyResult = await detectAnomalies(currentWeekReports, historicalReports);

      if (anomalyResult.hasAnomalies) {
        const analysis = await prisma.aiAnalysis.create({
          data: {
            type: 'anomaly',
            title: 'Обнаружены аномалии',
            description: anomalyResult.anomalies.join('; '),
            severity: anomalyResult.severity === 'high' ? 'critical' : 
                     anomalyResult.severity === 'medium' ? 'warning' : 'info',
            weekIso: weekIso || 'unknown',
            insights: anomalyResult,
          },
        });

        return NextResponse.json(analysis);
      }

      return NextResponse.json({
        type: 'anomalies',
        title: 'Аномалий не обнаружено',
        description: 'Все показатели в норме',
        severity: 'info',
        insights: anomalyResult,
      });
    }

    if (type === 'recommendations') {
      // Генерация рекомендаций
      const teamReports = await prisma.weeklyReport.findMany({
        where: weekIso ? { weekIso } : {},
        include: {
          user: {
            select: {
              name: true,
              role: true,
              city: true,
            },
          },
          hrMetrics: true,
          opsMetrics: true,
        },
        orderBy: {
          weekStartDate: 'desc',
        },
        take: 50,
      });

      const recommendations = await generateTeamRecommendations(teamReports);

      const analysis = await prisma.aiAnalysis.create({
        data: {
          type: 'recommendation',
          title: 'AI Рекомендации для команды',
          description: recommendations.join('; '),
          severity: 'info',
          weekIso: weekIso || 'general',
          insights: { recommendations },
        },
      });

      return NextResponse.json(analysis);
    }

    return NextResponse.json(
      { message: 'Неизвестный тип анализа' },
      { status: 400 }
    );

  } catch (error) {
    console.error('Error in AI analysis:', error);
    return NextResponse.json(
      { message: 'Ошибка при выполнении AI анализа' },
      { status: 500 }
    );
  }
}

// POST - запросить новый AI анализ
export async function POST(request: NextRequest) {
  const authResult = requireAuth(request);
  if (authResult.error) return authResult.error;

  try {
    const { type, weekIso, targetUserId } = await request.json();

    // Перенаправляем на GET с параметрами
    const searchParams = new URLSearchParams();
    searchParams.set('type', type);
    if (weekIso) searchParams.set('weekIso', weekIso);
    if (targetUserId) searchParams.set('userId', targetUserId);

    const url = new URL(request.url);
    url.search = searchParams.toString();

    return GET(new NextRequest(url.toString(), {
      method: 'GET',
      headers: request.headers,
    }));

  } catch (error) {
    console.error('Error processing AI analysis request:', error);
    return NextResponse.json(
      { message: 'Ошибка при обработке запроса' },
      { status: 500 }
    );
  }
}