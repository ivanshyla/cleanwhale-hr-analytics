/**
 * AI анализатор личности на основе ответов на еженедельные вопросы
 */

import { openai } from './openai';

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
  personalityInsight?: PersonalityInsight;
  prompt?: string;
  rawResponse?: any;
}

export class PersonalityAnalyzer {
  
  /**
   * Анализирует ответ пользователя и определяет черты личности
   */
  async analyzeAnswer(input: AnalyzeAnswerInput): Promise<AnalysisResult> {
    const prompt = `
Ты - эксперт психолог и HR консультант. Проанализируй ответ сотрудника на еженедельный вопрос и определи его личностные особенности.

ПРОФИЛЬ СОТРУДНИКА:
- Имя: ${input.userProfile.name}
- Роль: ${input.userProfile.role}
- Город: ${input.userProfile.city}

ВОПРОС (тип: ${input.questionType}):
${input.questionText}

ОТВЕТ СОТРУДНИКА:
"${input.answer}"

КОНТЕКСТ (предыдущие ответы):
${input.userProfile.previousAnswers?.slice(0, 3).join('\n\n') || 'Нет предыдущих ответов'}

СУЩЕСТВУЮЩИЕ ИНСАЙТЫ:
${input.userProfile.existingInsights ? JSON.stringify(input.userProfile.existingInsights, null, 2) : 'Нет данных'}

ЗАДАЧИ АНАЛИЗА:
1. Определи основные черты личности (Big Five модель)
2. Выяви стиль работы и коммуникации
3. Определи мотивацию и предпочтения
4. Проанализируй эмоциональное состояние
5. Дай рекомендации по командной работе
6. Предложи направления развития

Ответь в JSON формате:
{
  "personalityTraits": {
    "dominantTraits": ["черта1", "черта2", "черта3"],
    "secondaryTraits": ["черта4", "черта5"],
    "emotionalIntelligence": 1-10,
    "communicationStyle": "прямой|дипломатичный|эмоциональный|аналитический",
    "decisionMaking": "быстрый|обдуманный|коллективный|интуитивный"
  },
  "emotionalState": "позитивное|нейтральное|напряженное|воодушевленное|задумчивое",
  "keywords": ["ключевое_слово1", "ключевое_слово2", "ключевое_слово3"],
  "sentiment": -1.0 до 1.0,
  "mood": "энергичный|спокойный|задумчивый|мотивированный|усталый",
  "personalityInsight": {
    "personalityType": "Лидер|Аналитик|Коммуникатор|Исполнитель|Новатор|Стабилизатор",
    "confidence": 0.0-1.0,
    "bigFive": {
      "openness": 0.0-1.0,
      "conscientiousness": 0.0-1.0,
      "extraversion": 0.0-1.0,
      "agreeableness": 0.0-1.0,
      "neuroticism": 0.0-1.0
    },
    "workPreferences": {
      "workStyle": "самостоятельная работа|командная работа|смешанный стиль",
      "communicationStyle": "прямой|дипломатичный|эмоциональный",
      "motivationType": "достижения|признание|стабильность|рост|помощь другим",
      "stressResponse": "активное решение|поиск поддержки|избегание|анализ"
    },
    "teamRecommendations": {
      "bestTeamRole": "лидер|исполнитель|креативщик|аналитик|медиатор",
      "compatibleWith": ["тип1", "тип2"],
      "conflictsWith": ["тип3", "тип4"]
    },
    "developmentRecommendations": {
      "developmentAreas": ["область1", "область2"],
      "strengths": ["сильная_сторона1", "сильная_сторона2"],
      "careerPath": "карьерное_направление"
    }
  }
}

ВАЖНО:
- Базируй анализ на реальном содержании ответа
- Учитывай культурные особенности (работа в Польше)
- Будь объективным, но деликатным
- Выявляй скрытые мотивы и предпочтения
- Обращай внимание на стиль изложения, эмоции, приоритеты
`;

    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "Ты - профессиональный психолог и HR эксперт, специализирующийся на анализе личности через текстовые ответы. Твой анализ должен быть глубоким, но тактичным и конструктивным."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        max_tokens: 2000,
        temperature: 0.3,
        response_format: { type: "json_object" }
      });

      const result = JSON.parse(completion.choices[0]?.message?.content || '{}');
      
      return {
        personalityTraits: result.personalityTraits || {},
        emotionalState: result.emotionalState || 'нейтральное',
        keywords: result.keywords || [],
        sentiment: result.sentiment || 0,
        mood: result.mood || 'спокойный',
        personalityInsight: result.personalityInsight || null,
        prompt,
        rawResponse: result,
      };
    } catch (error) {
      console.error('Error analyzing answer:', error);
      
      // Fallback анализ
      return this.generateFallbackAnalysis(input);
    }
  }

  /**
   * Генерирует простой анализ на основе ключевых слов
   */
  private generateFallbackAnalysis(input: AnalyzeAnswerInput): AnalysisResult {
    const answer = input.answer.toLowerCase();
    const words = answer.split(/\s+/);
    
    // Простой анализ тональности
    const positiveWords = ['хорошо', 'отлично', 'люблю', 'нравится', 'успех', 'радость', 'мотивация'];
    const negativeWords = ['плохо', 'сложно', 'проблема', 'стресс', 'усталость', 'конфликт'];
    
    const positiveCount = positiveWords.filter(word => answer.includes(word)).length;
    const negativeCount = negativeWords.filter(word => answer.includes(word)).length;
    
    const sentiment = positiveCount > negativeCount ? 0.5 : 
                     negativeCount > positiveCount ? -0.5 : 0;

    // Ключевые слова (первые значимые слова)
    const keywords = words
      .filter(word => word.length > 3)
      .filter(word => !['этот', 'быть', 'мочь', 'сказать', 'который'].includes(word))
      .slice(0, 5);

    return {
      personalityTraits: {
        dominantTraits: ['адаптивный'],
        communicationStyle: 'нейтральный',
        decisionMaking: 'обдуманный'
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
          neuroticism: 0.4
        },
        workPreferences: {
          workStyle: 'смешанный стиль',
          communicationStyle: 'дипломатичный',
          motivationType: 'стабильность',
          stressResponse: 'анализ'
        },
        teamRecommendations: {
          bestTeamRole: 'исполнитель',
          compatibleWith: ['Лидер', 'Аналитик'],
          conflictsWith: []
        },
        developmentRecommendations: {
          developmentAreas: ['коммуникация'],
          strengths: ['стабильность'],
          careerPath: 'специалист'
        }
      }
    };
  }

  /**
   * Агрегирует инсайты о личности из нескольких ответов
   */
  async aggregatePersonalityInsights(userId: string): Promise<{
    overallPersonality: PersonalityInsight;
    confidence: number;
    dataPoints: number;
    lastUpdated: Date;
  }> {
    try {
      const insights = await prisma.personalityInsight.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 10, // Последние 10 инсайтов
        include: {
          question: {
            select: {
              questionType: true,
              category: true
            }
          }
        }
      });

      if (insights.length === 0) {
        throw new Error('No personality insights found');
      }

      // Вычисляем средние значения Big Five
      const avgBigFive = {
        openness: this.calculateAverage(insights.map(i => i.openness).filter(Boolean)),
        conscientiousness: this.calculateAverage(insights.map(i => i.conscientiousness).filter(Boolean)),
        extraversion: this.calculateAverage(insights.map(i => i.extraversion).filter(Boolean)),
        agreeableness: this.calculateAverage(insights.map(i => i.agreeableness).filter(Boolean)),
        neuroticism: this.calculateAverage(insights.map(i => i.neuroticism).filter(Boolean)),
      };

      // Определяем доминирующий тип личности
      const personalityTypes = insights.map(i => i.personalityType);
      const dominantType = this.getMostFrequent(personalityTypes);

      // Средняя уверенность
      const avgConfidence = this.calculateAverage(insights.map(i => i.confidence));

      return {
        overallPersonality: {
          personalityType: dominantType,
          confidence: avgConfidence,
          bigFive: avgBigFive,
          workPreferences: {
            workStyle: this.getMostFrequent(insights.map(i => i.workStyle).filter(Boolean)),
            communicationStyle: this.getMostFrequent(insights.map(i => i.communicationStyle).filter(Boolean)),
            motivationType: this.getMostFrequent(insights.map(i => i.motivationType).filter(Boolean)),
            stressResponse: this.getMostFrequent(insights.map(i => i.stressResponse).filter(Boolean)),
          },
          teamRecommendations: {
            bestTeamRole: this.getMostFrequent(insights.map(i => i.bestTeamRole).filter(Boolean)),
            compatibleWith: this.getMostFrequentArray(insights.map(i => this.parseJsonArray(i.compatibleWith)).flat()),
            conflictsWith: this.getMostFrequentArray(insights.map(i => this.parseJsonArray(i.conflictsWith)).flat()),
          },
          developmentRecommendations: {
            developmentAreas: this.getMostFrequentArray(insights.map(i => this.parseJsonArray(i.developmentAreas)).flat()),
            strengths: this.getMostFrequentArray(insights.map(i => this.parseJsonArray(i.strengths)).flat()),
            careerPath: this.getMostFrequent(insights.map(i => i.careerPath).filter(Boolean)),
          }
        },
        confidence: avgConfidence,
        dataPoints: insights.length,
        lastUpdated: insights[0].createdAt,
      };

    } catch (error) {
      console.error('Error aggregating personality insights:', error);
      throw error;
    }
  }

  private calculateAverage(values: number[]): number {
    if (values.length === 0) return 0.5;
    return values.reduce((sum, val) => sum + val, 0) / values.length;
  }

  private getMostFrequent(array: string[]): string {
    if (array.length === 0) return '';
    const frequency = array.reduce((acc, item) => {
      acc[item] = (acc[item] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    return Object.keys(frequency).reduce((a, b) => frequency[a] > frequency[b] ? a : b);
  }

  private getMostFrequentArray(array: string[]): string[] {
    const frequency = array.reduce((acc, item) => {
      acc[item] = (acc[item] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    return Object.entries(frequency)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([item]) => item);
  }

  private parseJsonArray(jsonString: string | null): string[] {
    if (!jsonString) return [];
    try {
      const parsed = JSON.parse(jsonString);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
}

// Импорт для использования в других файлах
import { prisma } from './prisma';
