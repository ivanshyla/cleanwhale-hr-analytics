import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { hasPermission, Permission } from '@/lib/permissions';
import { PersonalityAnalyzer } from '@/lib/personality-analyzer';

const personalityAnalyzer = new PersonalityAnalyzer();

// Получение инсайтов о личности
export async function GET(request: NextRequest) {
  const authResult = requireAuth(request);
  if (authResult.error) {
    return authResult.error;
  }

  const { user } = authResult;
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');
  const aggregated = searchParams.get('aggregated') === 'true';

  try {
    let targetUserId = userId;
    
    // Если не указан пользователь, используем текущего
    if (!targetUserId) {
      targetUserId = user.userId;
    }

    // Проверяем права доступа к данным других пользователей
    if (targetUserId !== user.userId && !['COUNTRY_MANAGER', 'ADMIN'].includes(user.role)) {
      return NextResponse.json(
        { message: 'Недостаточно прав для просмотра данных других пользователей' },
        { status: 403 }
      );
    }

    if (aggregated) {
      // Возвращаем агрегированный анализ личности
      try {
        const aggregatedInsights = await personalityAnalyzer.aggregatePersonalityInsights(targetUserId);
        return NextResponse.json({
          success: true,
          insights: aggregatedInsights,
          type: 'aggregated'
        });
      } catch (error) {
        return NextResponse.json({
          success: false,
          message: 'Недостаточно данных для анализа личности',
          insights: null
        });
      }
    } else {
      // Возвращаем все инсайты
      const insights = await prisma.personalityInsight.findMany({
        where: { userId: targetUserId },
        include: {
          question: {
            select: {
              question: true,
              questionType: true,
              category: true,
              weekStartDate: true,
            }
          },
          answer: {
            select: {
              answer: true,
              answerLength: true,
              confidence: true,
              sentiment: true,
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        },
        take: 20 // Последние 20 инсайтов
      });

      return NextResponse.json({
        success: true,
        insights,
        total: insights.length,
        type: 'detailed'
      });
    }

  } catch (error) {
    console.error('Error fetching personality insights:', error);
    return NextResponse.json(
      { message: 'Ошибка получения анализа личности' },
      { status: 500 }
    );
  }
}

// Создание нового инсайта (для ручного анализа)
export async function POST(request: NextRequest) {
  const authResult = requireAuth(request);
  if (authResult.error) {
    return authResult.error;
  }

  const { user } = authResult;
  
  // Только админы и менеджеры могут создавать ручные инсайты
  if (!['COUNTRY_MANAGER', 'ADMIN'].includes(user.role)) {
    return NextResponse.json(
      { message: 'Недостаточно прав для создания инсайтов' },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();
    const {
      userId: targetUserId,
      personalityType,
      confidence,
      bigFive,
      workPreferences,
      teamRecommendations,
      developmentRecommendations,
      notes,
    } = body;

    if (!targetUserId || !personalityType) {
      return NextResponse.json(
        { message: 'userId и personalityType обязательны' },
        { status: 400 }
      );
    }

    // Проверяем, существует ли пользователь
    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId }
    });

    if (!targetUser) {
      return NextResponse.json(
        { message: 'Пользователь не найден' },
        { status: 404 }
      );
    }

    // Вычисляем даты недели
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay() + 1); // Понедельник

    const savedInsight = await prisma.personalityInsight.create({
      data: {
        userId: targetUserId,
        personalityType,
        confidence: confidence || 0.8,
        openness: bigFive?.openness,
        conscientiousness: bigFive?.conscientiousness,
        extraversion: bigFive?.extraversion,
        agreeableness: bigFive?.agreeableness,
        neuroticism: bigFive?.neuroticism,
        workStyle: workPreferences?.workStyle,
        communicationStyle: workPreferences?.communicationStyle,
        motivationType: workPreferences?.motivationType,
        stressResponse: workPreferences?.stressResponse,
        bestTeamRole: teamRecommendations?.bestTeamRole,
        compatibleWith: JSON.stringify(teamRecommendations?.compatibleWith || []),
        conflictsWith: JSON.stringify(teamRecommendations?.conflictsWith || []),
        developmentAreas: JSON.stringify(developmentRecommendations?.developmentAreas || []),
        strengths: JSON.stringify(developmentRecommendations?.strengths || []),
        careerPath: developmentRecommendations?.careerPath,
        model: 'manual',
        prompt: notes || 'Ручной ввод от менеджера',
        weekStartDate: weekStart,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            role: true,
            city: true,
          }
        }
      }
    });

    return NextResponse.json({
      message: 'Инсайт создан',
      insight: savedInsight,
    });

  } catch (error) {
    console.error('Error creating personality insight:', error);
    return NextResponse.json(
      { message: 'Ошибка создания инсайта', error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
