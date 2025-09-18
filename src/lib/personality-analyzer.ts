/**
 * AI анализатор личности на основе ответов на еженедельные вопросы (MVP без OpenAI)
 */

// OpenAI отключен для MVP

interface AnalyzeAnswerInput {
  answer: string;
  questionType: string;
  questionText: string;
  userProfile: {
    name: string;
    role: string;
    city: string;
    previousAnswers?: string[];
    existingInsights?: any;
  };
}

interface PersonalityInsight {
  personalityType: string;
  confidence: number;
  bigFive?: {
    openness: number;
    conscientiousness: number;
    extraversion: number;
    agreeableness: number;
    neuroticism: number;
  };
  workPreferences?: {
    workStyle: string;
    communicationStyle: string;
    motivationType: string;
    stressResponse: string;
  };
  teamRecommendations?: {
    bestTeamRole: string;
    compatibleWith: string[];
    conflictsWith: string[];
  };
  developmentRecommendations?: {
    developmentAreas: string[];
    strengths: string[];
    careerPath: string;
  };
}

interface AnalysisResult {
  personalityTraits: any;
  emotionalState: string;
  keywords: string[];
  sentiment: number;
  mood: string;
  personalityInsight?: PersonalityInsight | null;
  prompt?: string;
  rawResponse?: any;
}

export class PersonalityAnalyzer {
  /**
   * Анализирует ответ пользователя (локальный эвристический анализ)
   */
  async analyzeAnswer(input: AnalyzeAnswerInput): Promise<AnalysisResult> {
    return this.generateFallbackAnalysis(input);
  }

  /**
   * Генерирует простой анализ на основе ключевых слов
   */
  private generateFallbackAnalysis(input: AnalyzeAnswerInput): AnalysisResult {
    const answer = input.answer.toLowerCase();
    const words = answer.split(/\s+/);

    const positiveWords = ['хорошо', 'отлично', 'люблю', 'нравится', 'успех', 'радость', 'мотивация'];
    const negativeWords = ['плохо', 'сложно', 'проблема', 'стресс', 'усталость', 'конфликт'];

    const positiveCount = positiveWords.filter(word => answer.includes(word)).length;
    const negativeCount = negativeWords.filter(word => answer.includes(word)).length;

    const sentiment = positiveCount > negativeCount ? 0.5 : negativeCount > positiveCount ? -0.5 : 0;

    const keywords = words
      .filter(word => word.length > 3)
      .filter(word => !['этот', 'быть', 'мочь', 'сказать', 'который'].includes(word))
      .slice(0, 5);

    return {
      personalityTraits: {
        dominantTraits: ['адаптивный'],
        communicationStyle: 'нейтральный',
        decisionMaking: 'обдуманный',
      },
      emotionalState: sentiment > 0 ? 'позитивное' : sentiment < 0 ? 'напряженное' : 'нейтральное',
      keywords,
      sentiment,
      mood: 'спокойный',
      personalityInsight: {
        personalityType: 'Исполнитель',
        confidence: 0.3,
        bigFive: {
          openness: 0.5,
          conscientiousness: 0.6,
          extraversion: 0.5,
          agreeableness: 0.6,
          neuroticism: 0.4,
        },
        workPreferences: {
          workStyle: 'смешанный стиль',
          communicationStyle: 'дипломатичный',
          motivationType: 'стабильность',
          stressResponse: 'анализ',
        },
        teamRecommendations: {
          bestTeamRole: 'исполнитель',
          compatibleWith: ['Лидер', 'Аналитик'],
          conflictsWith: [],
        },
        developmentRecommendations: {
          developmentAreas: ['коммуникация'],
          strengths: ['стабильность'],
          careerPath: 'специалист',
        },
      },
    };
  }

  /**
   * Агрегирует инсайты о личности из базы (без AI)
   */
  async aggregatePersonalityInsights(userId: string): Promise<{
    overallPersonality: PersonalityInsight;
    confidence: number;
    dataPoints: number;
    lastUpdated: Date;
  }> {
    // Для MVP оставляем реализацию, основанную на данных в БД
    const insights = await prisma.personalityInsight.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: {
        question: { select: { questionType: true, category: true } },
      },
    });

    if (insights.length === 0) {
      throw new Error('No personality insights found');
    }

    const avg = (vals: number[]) => (vals.length ? vals.reduce((s, v) => s + v, 0) / vals.length : 0.5);
    const pickMost = (arr: string[]) => {
      if (arr.length === 0) return '';
      const f: Record<string, number> = {};
      arr.forEach(x => (f[x] = (f[x] || 0) + 1));
      return Object.keys(f).reduce((a, b) => (f[a] > f[b] ? a : b));
    };

    const parseArr = (s: string | null) => {
      if (!s) return [] as string[];
      try { const j = JSON.parse(s); return Array.isArray(j) ? j : []; } catch { return []; }
    };

    const avgBigFive = {
      openness: avg(insights.map(i => i.openness!).filter(Boolean) as number[]),
      conscientiousness: avg(insights.map(i => i.conscientiousness!).filter(Boolean) as number[]),
      extraversion: avg(insights.map(i => i.extraversion!).filter(Boolean) as number[]),
      agreeableness: avg(insights.map(i => i.agreeableness!).filter(Boolean) as number[]),
      neuroticism: avg(insights.map(i => i.neuroticism!).filter(Boolean) as number[]),
    };

    return {
      overallPersonality: {
        personalityType: pickMost(insights.map(i => i.personalityType)),
        confidence: avg(insights.map(i => i.confidence)),
        bigFive: avgBigFive,
        workPreferences: {
          workStyle: pickMost(insights.map(i => i.workStyle!).filter(Boolean) as string[]),
          communicationStyle: pickMost(insights.map(i => i.communicationStyle!).filter(Boolean) as string[]),
          motivationType: pickMost(insights.map(i => i.motivationType!).filter(Boolean) as string[]),
          stressResponse: pickMost(insights.map(i => i.stressResponse!).filter(Boolean) as string[]),
        },
        teamRecommendations: {
          bestTeamRole: pickMost(insights.map(i => i.bestTeamRole!).filter(Boolean) as string[]),
          compatibleWith: pickMost(parseArr(insights.map(i => i.compatibleWith).join(','))),
          conflictsWith: pickMost(parseArr(insights.map(i => i.conflictsWith).join(','))),
        } as any,
        developmentRecommendations: {
          developmentAreas: parseArr(insights.map(i => i.developmentAreas).join(',')),
          strengths: parseArr(insights.map(i => i.strengths).join(',')),
          careerPath: pickMost(insights.map(i => i.careerPath!).filter(Boolean) as string[]),
        },
      },
      confidence: avg(insights.map(i => i.confidence)),
      dataPoints: insights.length,
      lastUpdated: insights[0].createdAt,
    };
  }
}

import { prisma } from './prisma';
