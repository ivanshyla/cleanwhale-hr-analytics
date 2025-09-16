import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { hasPermission, Permission } from '@/lib/permissions';
import { weeklyQuestionGenerator } from '@/lib/weekly-question-generator';

// Получение активных вопросов
export async function GET(request: NextRequest) {
  const authResult = requireAuth(request);
  if (authResult.error) {
    return authResult.error;
  }

  const { user } = authResult;
  const { searchParams } = new URL(request.url);
  const onlyActive = searchParams.get('active') === 'true';
  const forUser = searchParams.get('forUser');

  try {
    let whereClause: any = {};

    if (onlyActive) {
      whereClause.isActive = true;
      whereClause.expiresAt = {
        gte: new Date()
      };
    }

    // Если запрашиваются вопросы для конкретного пользователя
    if (forUser) {
      whereClause.OR = [
        { targetUserId: forUser },
        { targetUserId: null } // Вопросы для всех
      ];
    }

    const questions = await prisma.weeklyQuestion.findMany({
      where: whereClause,
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            role: true,
          }
        },
        targetUser: {
          select: {
            id: true,
            name: true,
            role: true,
          }
        },
        answers: {
          where: forUser ? { userId: forUser } : undefined,
          include: {
            user: {
              select: {
                id: true,
                name: true,
              }
            }
          }
        },
        _count: {
          select: {
            answers: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return NextResponse.json({
      questions,
      total: questions.length,
    });

  } catch (error) {
    console.error('Error fetching weekly questions:', error);
    return NextResponse.json(
      { message: 'Ошибка получения вопросов' },
      { status: 500 }
    );
  }
}

// Создание нового вопроса
export async function POST(request: NextRequest) {
  const authResult = requireAuth(request);
  if (authResult.error) {
    return authResult.error;
  }

  const { user } = authResult;
  
  // Проверяем права создания вопросов (менеджеры и админы)
  if (!['COUNTRY_MANAGER', 'ADMIN', 'HR', 'OPERATIONS', 'MIXED'].includes(user.role)) {
    return NextResponse.json(
      { message: 'Недостаточно прав для создания вопросов' },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();
    const {
      question,
      questionType = 'PERSONAL',
      category,
      targetUserId,
      difficulty = 3,
      expectedAnswerLength = 250,
      expiresInDays = 7,
      generatePersonalized = false,
    } = body;

    let finalQuestion = question;
    let finalType = questionType;
    let finalCategory = category;
    let finalDifficulty = difficulty;
    let finalExpectedLength = expectedAnswerLength;

    // Если запрошена генерация персонализированного вопроса
    if (generatePersonalized && targetUserId) {
      const targetUser = await prisma.user.findUnique({
        where: { id: targetUserId },
        include: {
          weeklyQuestionAnswers: {
            take: 3,
            orderBy: { createdAt: 'desc' },
            select: { answer: true }
          },
          personalityInsights: {
            take: 1,
            orderBy: { createdAt: 'desc' }
          }
        }
      });

      if (targetUser) {
        const generatedQuestion = await weeklyQuestionGenerator.generatePersonalizedQuestion({
          name: targetUser.name,
          role: targetUser.role,
          city: targetUser.city,
          recentAnswers: targetUser.weeklyQuestionAnswers.map(a => a.answer),
          personalityTraits: targetUser.personalityInsights[0] || null,
        });

        finalQuestion = generatedQuestion.question;
        finalType = generatedQuestion.type as any;
        finalCategory = generatedQuestion.category;
        finalDifficulty = generatedQuestion.difficulty;
        finalExpectedLength = generatedQuestion.expectedAnswerLength;
      }
    }

    // Если вопрос не предоставлен, генерируем случайный
    if (!finalQuestion) {
      const randomQuestion = weeklyQuestionGenerator.generateRandomQuestion();
      finalQuestion = randomQuestion.question;
      finalType = randomQuestion.type as any;
      finalCategory = randomQuestion.category;
      finalDifficulty = randomQuestion.difficulty;
      finalExpectedLength = randomQuestion.expectedAnswerLength;
    }

    // Вычисляем даты недели
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay() + 1); // Понедельник
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6); // Воскресенье

    const expiresAt = new Date(now);
    expiresAt.setDate(now.getDate() + expiresInDays);

    const savedQuestion = await prisma.weeklyQuestion.create({
      data: {
        createdById: user.userId,
        targetUserId: targetUserId || null,
        question: finalQuestion,
        questionType: finalType,
        category: finalCategory || 'общий',
        weekStartDate: weekStart,
        weekEndDate: weekEnd,
        expiresAt,
        difficulty: finalDifficulty,
        expectedAnswerLength: finalExpectedLength,
        isRandomGenerated: !question || generatePersonalized,
      },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            role: true,
          }
        },
        targetUser: {
          select: {
            id: true,
            name: true,
            role: true,
          }
        }
      }
    });

    return NextResponse.json({
      message: 'Вопрос создан',
      question: savedQuestion,
    });

  } catch (error) {
    console.error('Error creating weekly question:', error);
    return NextResponse.json(
      { message: 'Ошибка создания вопроса', error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
