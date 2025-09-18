/**
 * Генератор еженедельных вопросов для анализа (MVP без OpenAI)
 */

// OpenAI отключен для MVP

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
    const availableQuestions = QUESTION_BANK.filter((_, index) => 
      !excludeQuestionIds.includes(`bank_${index}`)
    );
    if (availableQuestions.length === 0) {
      const randomIndex = Math.floor(Math.random() * QUESTION_BANK.length);
      return QUESTION_BANK[randomIndex];
    }
    const randomIndex = Math.floor(Math.random() * availableQuestions.length);
    return availableQuestions[randomIndex];
  }

  /**
   * Персонализированный вопрос (MVP: берём из банка)
   */
  async generatePersonalizedQuestion(userProfile: {
    name: string;
    role: string;
    city: string;
    recentAnswers?: string[];
    personalityTraits?: any;
    workHistory?: string;
  }): Promise<QuestionTemplate> {
    return this.generateRandomQuestion();
  }

  getQuestionByCategory(category: string): QuestionTemplate | null {
    const questions = QUESTION_BANK.filter(q => q.category.includes(category));
    if (questions.length === 0) return null;
    const randomIndex = Math.floor(Math.random() * questions.length);
    return questions[randomIndex];
  }

  getQuestionByType(type: string): QuestionTemplate | null {
    const questions = QUESTION_BANK.filter(q => q.type === type);
    if (questions.length === 0) return null;
    const randomIndex = Math.floor(Math.random() * questions.length);
    return questions[randomIndex];
  }

  getQuestionByDifficulty(difficulty: number): QuestionTemplate | null {
    const questions = QUESTION_BANK.filter(q => q.difficulty === difficulty);
    if (questions.length === 0) return null;
    const randomIndex = Math.floor(Math.random() * questions.length);
    return questions[randomIndex];
  }

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
