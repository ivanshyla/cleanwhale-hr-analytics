import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { PersonalityAnalyzer } from '@/lib/personality-analyzer';

const personalityAnalyzer = new PersonalityAnalyzer();

// Получение ответов на вопросы
export async function GET(request: NextRequest) {
  const authResult = requireAuth(request);
  if (authResult.error) {
    return authResult.error;
  }

  const { user } = authResult;
  const { searchParams } = new URL(request.url);
  const questionId = searchParams.get('questionId');
  const userId = searchParams.get('userId');

  try {
    let whereClause: any = {};

    if (questionId) {
      whereClause.questionId = questionId;
    }

    if (userId) {
      whereClause.userId = userId;
    } else {
      // Если не указан конкретный пользователь, показываем только свои ответы (если не админ)
      if (!['COUNTRY_MANAGER', 'ADMIN'].includes(user.role)) {
        whereClause.userId = user.userId;
      }
    }

    const answers = await prisma.weeklyQuestionAnswer.findMany({
      where: whereClause,
      include: {
        question: {
          select: {
            id: true,
            question: true,
            questionType: true,
            category: true,
            weekStartDate: true,
          }
        },
        user: {
          select: {
            id: true,
            name: true,
            role: true,
            city: true,
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return NextResponse.json({
      answers,
      total: answers.length,
    });

  } catch (error) {
    console.error('Error fetching answers:', error);
    return NextResponse.json(
      { message: 'Ошибка получения ответов' },
      { status: 500 }
    );
  }
}

// Создание ответа на вопрос
export async function POST(request: NextRequest) {
  const authResult = requireAuth(request);
  if (authResult.error) {
    return authResult.error;
  }

  const { user } = authResult;

  try {
    const body = await request.json();
    const {
      questionId,
      answer,
      confidence = 5,
      responseTime,
    } = body;

    if (!questionId || !answer) {
      return NextResponse.json(
        { message: 'questionId и answer обязательны' },
        { status: 400 }
      );
    }

    // Проверяем, существует ли вопрос и не истек ли срок ответа
    const question = await prisma.weeklyQuestion.findUnique({
      where: { id: questionId }
    });

    if (!question) {
      return NextResponse.json(
        { message: 'Вопрос не найден' },
        { status: 404 }
      );
    }

    if (!question.isActive || question.expiresAt < new Date()) {
      return NextResponse.json(
        { message: 'Срок ответа на вопрос истек' },
        { status: 400 }
      );
    }

    // Проверяем, не отвечал ли пользователь уже на этот вопрос
    const existingAnswer = await prisma.weeklyQuestionAnswer.findUnique({
      where: {
        questionId_userId: {
          questionId,
          userId: user.userId
        }
      }
    });

    if (existingAnswer) {
      return NextResponse.json(
        { message: 'Вы уже отвечали на этот вопрос' },
        { status: 400 }
      );
    }

    // Анализируем ответ
    const answerLength = answer.length;
    const answerWords = answer.split(/\s+/).filter(word => word.length > 0).length;

    // Сохраняем ответ
    const savedAnswer = await prisma.weeklyQuestionAnswer.create({
      data: {
        questionId,
        userId: user.userId,
        answer,
        answerLength,
        answerWords,
        confidence,
        responseTime: responseTime || null,
      },
      include: {
        question: {
          select: {
            question: true,
            questionType: true,
            category: true,
            weekStartDate: true,
          }
        },
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

    // Запускаем AI анализ в фоне (без ожидания)
    analyzeAnswerAsync(savedAnswer.id);

    return NextResponse.json({
      message: 'Ответ сохранен',
      answer: savedAnswer,
    });

  } catch (error) {
    console.error('Error creating answer:', error);
    return NextResponse.json(
      { message: 'Ошибка сохранения ответа', error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

// Фоновый анализ ответа
async function analyzeAnswerAsync(answerId: string) {
  try {
    const answer = await prisma.weeklyQuestionAnswer.findUnique({
      where: { id: answerId },
      include: {
        question: true,
        user: {
          include: {
            weeklyQuestionAnswers: {
              where: { aiAnalyzed: true },
              take: 10,
              orderBy: { createdAt: 'desc' }
            },
            personalityInsights: {
              take: 1,
              orderBy: { createdAt: 'desc' }
            }
          }
        }
      }
    });

    if (!answer) return;

    // Анализируем ответ через AI
    const analysis = await personalityAnalyzer.analyzeAnswer({
      answer: answer.answer,
      questionType: answer.question.questionType,
      questionText: answer.question.question,
      userProfile: {
        name: answer.user.name,
        role: answer.user.role,
        city: answer.user.city,
        previousAnswers: answer.user.weeklyQuestionAnswers.map(a => a.answer),
        existingInsights: answer.user.personalityInsights[0] || null,
      }
    });

    // Обновляем ответ с результатами анализа
    await prisma.weeklyQuestionAnswer.update({
      where: { id: answerId },
      data: {
        aiAnalyzed: true,
        personalityTraits: analysis.personalityTraits,
        emotionalState: analysis.emotionalState,
        keywords: JSON.stringify(analysis.keywords),
        sentiment: analysis.sentiment,
        mood: analysis.mood,
      }
    });

    // Если есть инсайты о личности, сохраняем их
    if (analysis.personalityInsight) {
      await prisma.personalityInsight.create({
        data: {
          userId: answer.userId,
          questionId: answer.questionId,
          answerId: answer.id,
          personalityType: analysis.personalityInsight.personalityType,
          confidence: analysis.personalityInsight.confidence,
          openness: analysis.personalityInsight.bigFive?.openness,
          conscientiousness: analysis.personalityInsight.bigFive?.conscientiousness,
          extraversion: analysis.personalityInsight.bigFive?.extraversion,
          agreeableness: analysis.personalityInsight.bigFive?.agreeableness,
          neuroticism: analysis.personalityInsight.bigFive?.neuroticism,
          workStyle: analysis.personalityInsight.workPreferences?.workStyle,
          communicationStyle: analysis.personalityInsight.workPreferences?.communicationStyle,
          motivationType: analysis.personalityInsight.workPreferences?.motivationType,
          stressResponse: analysis.personalityInsight.workPreferences?.stressResponse,
          bestTeamRole: analysis.personalityInsight.teamRecommendations?.bestTeamRole,
          compatibleWith: JSON.stringify(analysis.personalityInsight.teamRecommendations?.compatibleWith || []),
          conflictsWith: JSON.stringify(analysis.personalityInsight.teamRecommendations?.conflictsWith || []),
          developmentAreas: JSON.stringify(analysis.personalityInsight.developmentRecommendations?.developmentAreas || []),
          strengths: JSON.stringify(analysis.personalityInsight.developmentRecommendations?.strengths || []),
          careerPath: analysis.personalityInsight.developmentRecommendations?.careerPath,
          model: 'gpt-4o',
          prompt: analysis.prompt || null,
          rawResponse: analysis.rawResponse || null,
          weekStartDate: answer.question.weekStartDate,
        }
      });
    }

    console.log(`AI analysis completed for answer ${answerId}`);

  } catch (error) {
    console.error('Error in background AI analysis:', error);
  }
}
