/**
 * Генератор еженедельных вопросов для AI анализа личности сотрудников
 */

import { openai } from './openai';

interface QuestionTemplate {
  question: string;
  type: 'PERSONAL' | 'WORK' | 'TEAM' | 'MOTIVATION' | 'FEEDBACK' | 'REFLECTION' | 'CREATIVE' | 'SCENARIO';
  category: string;
  difficulty: number; // 1-5
  expectedAnswerLength: number;
}

// Банк готовых вопросов разных категорий
const QUESTION_BANK: QuestionTemplate[] = [
  // Личность и мотивация
  {
    question: "Что тебя больше всего мотивирует в работе: достижение результатов, работа с людьми, или решение сложных задач? Расскажи о ситуации, когда ты чувствовал особенную мотивацию.",
    type: 'MOTIVATION',
    category: 'мотивация',
    difficulty: 3,
    expectedAnswerLength: 300
  },
  {
    question: "Представь, что у тебя выходной день и полная свобода выбора. Как бы ты его провел? Что это говорит о том, что тебе важно в жизни?",
    type: 'PERSONAL',
    category: 'личность',
    difficulty: 2,
    expectedAnswerLength: 250
  },
  {
    question: "Когда ты сталкиваешься с неожиданной проблемой на работе, какой у тебя первый инстинкт: обратиться за помощью, попытаться решить самостоятельно, или проанализировать ситуацию?",
    type: 'WORK',
    category: 'работа',
    difficulty: 3,
    expectedAnswerLength: 200
  },
  
  // Командная работа
  {
    question: "Опиши идеальную рабочую команду. Какими качествами должны обладать твои коллеги? А какую роль в такой команде предпочитаешь играть ты?",
    type: 'TEAM',
    category: 'команда',
    difficulty: 3,
    expectedAnswerLength: 350
  },
  {
    question: "Вспомни ситуацию, когда в команде возник конфликт мнений. Как ты действовал? Что, по-твоему, помогает команде найти компромисс?",
    type: 'TEAM',
    category: 'команда',
    difficulty: 4,
    expectedAnswerLength: 300
  },
  
  // Рефлексия и развитие
  {
    question: "За что ты себя хвалишь на этой неделе? А что бы хотел улучшить или сделать по-другому?",
    type: 'REFLECTION',
    category: 'рефлексия',
    difficulty: 2,
    expectedAnswerLength: 200
  },
  {
    question: "Какой навык или знание ты бы хотел развить в ближайшие полгода? Что тебя в этом привлекает?",
    type: 'MOTIVATION',
    category: 'развитие',
    difficulty: 3,
    expectedAnswerLength: 250
  },
  
  // Творческие и ситуационные
  {
    question: "Если бы ты был супергероем, какая была бы твоя суперсила и как бы ты ее использовал в работе?",
    type: 'CREATIVE',
    category: 'творчество',
    difficulty: 2,
    expectedAnswerLength: 150
  },
  {
    question: "Представь: твой коллега постоянно опаздывает на встречи, но при этом он очень талантливый специалист. Как бы ты решал эту ситуацию?",
    type: 'SCENARIO',
    category: 'ситуация',
    difficulty: 4,
    expectedAnswerLength: 300
  },
  
  // Работа и процессы
  {
    question: "В какое время дня ты чувствуешь себя наиболее продуктивным? Какие факторы влияют на твою эффективность?",
    type: 'WORK',
    category: 'продуктивность',
    difficulty: 2,
    expectedAnswerLength: 200
  },
  {
    question: "Что тебе больше нравится: планировать задачи заранее или действовать спонтанно? Приведи пример из работы.",
    type: 'WORK',
    category: 'планирование',
    difficulty: 3,
    expectedAnswerLength: 250
  },
  
  // Обратная связь
  {
    question: "Как ты предпочитаешь получать обратную связь о своей работе? Какой стиль общения помогает тебе лучше всего?",
    type: 'FEEDBACK',
    category: 'общение',
    difficulty: 3,
    expectedAnswerLength: 200
  },
  {
    question: "Если бы ты мог дать один совет новому сотруднику в нашей компании, что бы это было?",
    type: 'REFLECTION',
    category: 'опыт',
    difficulty: 3,
    expectedAnswerLength: 200
  },
  
  // Стресс и адаптация
  {
    question: "Как ты справляешься со стрессом на работе? Что помогает тебе восстановиться после сложного дня?",
    type: 'PERSONAL',
    category: 'стресс',
    difficulty: 3,
    expectedAnswerLength: 250
  },
  {
    question: "Опиши ситуацию, когда тебе пришлось быстро адаптироваться к изменениям. Как ты с этим справился?",
    type: 'SCENARIO',
    category: 'адаптация',
    difficulty: 4,
    expectedAnswerLength: 300
  }
];

export class WeeklyQuestionGenerator {
  
  /**
   * Генерирует случайный вопрос из банка
   */
  generateRandomQuestion(excludeQuestionIds: string[] = []): QuestionTemplate {
    // Фильтруем вопросы, исключая уже использованные
    const availableQuestions = QUESTION_BANK.filter((_, index) => 
      !excludeQuestionIds.includes(`bank_${index}`)
    );
    
    if (availableQuestions.length === 0) {
      // Если все вопросы использованы, возвращаем случайный
      const randomIndex = Math.floor(Math.random() * QUESTION_BANK.length);
      return QUESTION_BANK[randomIndex];
    }
    
    const randomIndex = Math.floor(Math.random() * availableQuestions.length);
    return availableQuestions[randomIndex];
  }

  /**
   * Генерирует персонализированный вопрос через AI на основе профиля сотрудника
   */
  async generatePersonalizedQuestion(userProfile: {
    name: string;
    role: string;
    city: string;
    recentAnswers?: string[];
    personalityTraits?: any;
    workHistory?: string;
  }): Promise<QuestionTemplate> {
    const prompt = `
Ты - эксперт по HR и психологии. Создай один персонализированный вопрос для еженедельного опроса сотрудника.

ПРОФИЛЬ СОТРУДНИКА:
- Имя: ${userProfile.name}
- Роль: ${userProfile.role}
- Город: ${userProfile.city}
- Предыдущие ответы: ${userProfile.recentAnswers?.join('; ') || 'Нет данных'}
- Черты личности: ${JSON.stringify(userProfile.personalityTraits) || 'Не определены'}

ТРЕБОВАНИЯ К ВОПРОСУ:
1. Вопрос должен быть на русском языке
2. Должен помочь лучше понять личность, мотивацию и предпочтения сотрудника
3. Не должен повторять темы предыдущих ответов
4. Должен быть интересным и не навязчивым
5. Ответ должен раскрывать, как человек думает и принимает решения

ТИПЫ ВОПРОСОВ (выбери один):
- PERSONAL: личностные особенности
- WORK: рабочие процессы и предпочтения
- TEAM: командная работа
- MOTIVATION: мотивация и цели
- SCENARIO: ситуационные вопросы
- REFLECTION: рефлексия и самоанализ

Ответь в JSON формате:
{
  "question": "Текст вопроса",
  "type": "PERSONAL|WORK|TEAM|MOTIVATION|SCENARIO|REFLECTION",
  "category": "краткая категория",
  "difficulty": 1-5,
  "expectedAnswerLength": 150-400
}
`;

    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "Ты создаешь персонализированные вопросы для лучшего понимания сотрудников. Вопросы должны быть деликатными, интересными и помогать выявить особенности личности."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        max_tokens: 500,
        temperature: 0.8,
        response_format: { type: "json_object" }
      });

      const result = JSON.parse(completion.choices[0]?.message?.content || '{}');
      
      return {
        question: result.question || this.generateRandomQuestion().question,
        type: result.type || 'PERSONAL',
        category: result.category || 'личность',
        difficulty: result.difficulty || 3,
        expectedAnswerLength: result.expectedAnswerLength || 250,
      };
    } catch (error) {
      console.error('Error generating personalized question:', error);
      // Fallback к случайному вопросу
      return this.generateRandomQuestion();
    }
  }

  /**
   * Получает вопрос по категории
   */
  getQuestionByCategory(category: string): QuestionTemplate | null {
    const questions = QUESTION_BANK.filter(q => q.category.includes(category));
    if (questions.length === 0) return null;
    
    const randomIndex = Math.floor(Math.random() * questions.length);
    return questions[randomIndex];
  }

  /**
   * Получает вопрос по типу
   */
  getQuestionByType(type: string): QuestionTemplate | null {
    const questions = QUESTION_BANK.filter(q => q.type === type);
    if (questions.length === 0) return null;
    
    const randomIndex = Math.floor(Math.random() * questions.length);
    return questions[randomIndex];
  }

  /**
   * Получает вопрос по уровню сложности
   */
  getQuestionByDifficulty(difficulty: number): QuestionTemplate | null {
    const questions = QUESTION_BANK.filter(q => q.difficulty === difficulty);
    if (questions.length === 0) return null;
    
    const randomIndex = Math.floor(Math.random() * questions.length);
    return questions[randomIndex];
  }

  /**
   * Получает общую статистику банка вопросов
   */
  getQuestionBankStats() {
    const types = [...new Set(QUESTION_BANK.map(q => q.type))];
    const categories = [...new Set(QUESTION_BANK.map(q => q.category))];
    const avgDifficulty = QUESTION_BANK.reduce((sum, q) => sum + q.difficulty, 0) / QUESTION_BANK.length;
    
    return {
      totalQuestions: QUESTION_BANK.length,
      types,
      categories,
      avgDifficulty: Math.round(avgDifficulty * 10) / 10,
      difficultyDistribution: {
        easy: QUESTION_BANK.filter(q => q.difficulty <= 2).length,
        medium: QUESTION_BANK.filter(q => q.difficulty === 3).length,
        hard: QUESTION_BANK.filter(q => q.difficulty >= 4).length,
      }
    };
  }
}

export const weeklyQuestionGenerator = new WeeklyQuestionGenerator();
