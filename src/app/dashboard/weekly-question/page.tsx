'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { MessageCircle, Clock, User, Brain, Send, Lightbulb, CheckCircle, ArrowLeft } from 'lucide-react';
import { useAuth, withAuth } from '@/contexts/AuthContext';

interface WeeklyQuestion {
  id: string;
  question: string;
  questionType: string;
  category: string;
  difficulty: number;
  expectedAnswerLength: number;
  expiresAt: string;
  weekStartDate: string;
  createdBy: {
    name: string;
    role: string;
  };
  answers: any[];
}

interface AnswerFormData {
  answer: string;
  confidence: number;
}

function WeeklyQuestionPage() {
  const { user } = useAuth();
  const [questions, setQuestions] = useState<WeeklyQuestion[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState<WeeklyQuestion | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [answerStartTime, setAnswerStartTime] = useState<Date | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const router = useRouter();

  const { register, handleSubmit, watch, reset, formState: { errors } } = useForm<AnswerFormData>({
    defaultValues: {
      confidence: 5
    }
  });

  const answerText = watch('answer') || '';

  useEffect(() => {
    if (user) {
      loadActiveQuestions(user.id);
    }
  }, [user]);

  const loadActiveQuestions = async (userId: string) => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/weekly-questions?active=true&forUser=${userId}`, {
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        const unansweredQuestions = data.questions.filter((q: WeeklyQuestion) => 
          q.answers.length === 0
        );
        setQuestions(unansweredQuestions);
        
        if (unansweredQuestions.length > 0) {
          setCurrentQuestion(unansweredQuestions[0]);
          setAnswerStartTime(new Date());
        }
      } else {
        console.error('Failed to load questions');
      }
    } catch (error) {
      console.error('Error loading questions:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const onSubmit = async (data: AnswerFormData) => {
    if (!currentQuestion || !user) return;

    setIsSubmitting(true);
    try {
      const responseTime = answerStartTime ? 
        Math.round((new Date().getTime() - answerStartTime.getTime()) / 60000) : null; // в минутах

      const response = await fetch('/api/weekly-questions/answers', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          questionId: currentQuestion.id,
          answer: data.answer,
          confidence: data.confidence,
          responseTime,
        }),
      });

      if (response.ok) {
        setShowSuccess(true);
        reset();
        
        // Показываем успех и обновляем список вопросов
        setTimeout(() => {
          setShowSuccess(false);
          loadActiveQuestions(user.id);
        }, 2000);
      } else {
        const error = await response.json();
        alert(`Ошибка: ${error.message}`);
      }
    } catch (error) {
      console.error('Error submitting answer:', error);
      alert('Ошибка отправки ответа');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getQuestionTypeIcon = (type: string) => {
    switch (type) {
      case 'PERSONAL': return <User className="h-5 w-5" />;
      case 'TEAM': return <MessageCircle className="h-5 w-5" />;
      case 'CREATIVE': return <Lightbulb className="h-5 w-5" />;
      default: return <Brain className="h-5 w-5" />;
    }
  };

  const getQuestionTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      PERSONAL: 'Личностный',
      WORK: 'Рабочий процесс',
      TEAM: 'Командная работа',
      MOTIVATION: 'Мотивация',
      FEEDBACK: 'Обратная связь',
      REFLECTION: 'Рефлексия',
      CREATIVE: 'Творческий',
      SCENARIO: 'Ситуационный',
    };
    return labels[type] || type;
  };

  const getDifficultyColor = (difficulty: number) => {
    if (difficulty <= 2) return 'bg-green-100 text-green-800';
    if (difficulty === 3) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  const getDifficultyLabel = (difficulty: number) => {
    if (difficulty <= 2) return 'Легкий';
    if (difficulty === 3) return 'Средний';
    return 'Сложный';
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Загружаем ваши вопросы...</p>
        </div>
      </div>
    );
  }

  if (showSuccess) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md mx-auto text-center">
          <div className="bg-white rounded-xl shadow-lg p-8">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Спасибо за ответ!</h2>
            <p className="text-gray-600 mb-4">
              Ваш ответ сохранен и будет проанализирован нашим AI для лучшего понимания ваших предпочтений.
            </p>
            <div className="animate-pulse text-sm text-gray-500">
              AI анализирует ваш ответ...
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white shadow-sm border-b">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <button 
                onClick={() => router.push('/dashboard')}
                className="flex items-center hover:opacity-80 transition-opacity cursor-pointer"
              >
                <img 
                  src="/cleanwhale-logo.png" 
                  alt="CleanWhale" 
                  className="h-10 w-10 rounded-lg mr-3"
                />
                <div className="text-left">
                  <span className="text-xl font-bold cw-text-primary">
                    CleanWhale Analytics
                  </span>
                  <p className="text-xs text-gray-600">Еженедельные вопросы</p>
                </div>
              </button>
              <button
                onClick={() => router.push('/dashboard')}
                className="flex items-center text-gray-600 hover:text-gray-900"
              >
                <ArrowLeft className="h-5 w-5 mr-2" />
                Назад к панели
              </button>
            </div>
          </div>
        </header>

        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center">
            <MessageCircle className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Нет активных вопросов</h2>
            <p className="text-gray-600 mb-8">
              В данный момент для вас нет новых еженедельных вопросов. 
              Новые вопросы появляются каждую неделю.
            </p>
            <button
              onClick={() => router.push('/dashboard')}
              className="cw-button"
            >
              Вернуться к панели
            </button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <button 
              onClick={() => router.push('/dashboard')}
              className="flex items-center hover:opacity-80 transition-opacity cursor-pointer"
            >
              <img 
                src="/cleanwhale-logo.png" 
                alt="CleanWhale" 
                className="h-10 w-10 rounded-lg mr-3"
              />
              <div className="text-left">
                <span className="text-xl font-bold cw-text-primary">
                  CleanWhale Analytics
                </span>
                <p className="text-xs text-gray-600">Еженедельные вопросы</p>
              </div>
            </button>
            <div className="text-sm text-gray-600">
              {questions.length} вопрос(ов) ожидает ответа
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {currentQuestion && (
          <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            {/* Заголовок вопроса */}
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center text-white">
                  {getQuestionTypeIcon(currentQuestion.questionType)}
                  <span className="ml-2 font-medium">
                    {getQuestionTypeLabel(currentQuestion.questionType)}
                  </span>
                </div>
                <div className="flex items-center space-x-3 text-white">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getDifficultyColor(currentQuestion.difficulty)}`}>
                    {getDifficultyLabel(currentQuestion.difficulty)}
                  </span>
                  <div className="flex items-center text-sm">
                    <Clock className="h-4 w-4 mr-1" />
                    {Math.ceil(new Date(currentQuestion.expiresAt).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)} дней
                  </div>
                </div>
              </div>
            </div>

            {/* Контент */}
            <div className="p-6">
              {/* Информация о вопросе */}
              <div className="mb-6">
                <p className="text-sm text-gray-600 mb-2">
                  Вопрос от {currentQuestion.createdBy.name} • Категория: {currentQuestion.category}
                </p>
                <p className="text-sm text-gray-500">
                  Неделя {new Date(currentQuestion.weekStartDate).toLocaleDateString('ru-RU')} - {new Date(currentQuestion.weekStartDate).toLocaleDateString('ru-RU')}
                </p>
              </div>

              {/* Вопрос */}
              <div className="mb-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-4 leading-relaxed">
                  {currentQuestion.question}
                </h2>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-start">
                    <Brain className="h-5 w-5 text-blue-600 mt-1 mr-3 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-blue-800 mb-1">
                        Этот вопрос поможет нам лучше понять вас
                      </p>
                      <p className="text-xs text-blue-700">
                        Ваш ответ будет проанализирован AI для определения ваших предпочтений, стиля работы и совместимости с командой.
                        Рекомендуемая длина ответа: {currentQuestion.expectedAnswerLength} символов.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Форма ответа */}
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Ваш ответ
                  </label>
                  <textarea
                    {...register('answer', { 
                      required: 'Ответ обязателен',
                      minLength: { value: 50, message: 'Минимум 50 символов' },
                      maxLength: { value: 2000, message: 'Максимум 2000 символов' }
                    })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                    rows={8}
                    placeholder="Поделитесь своими мыслями и чувствами по этому вопросу..."
                  />
                  <div className="mt-2 flex justify-between items-center">
                    <div>
                      {errors.answer && (
                        <p className="text-sm text-red-600">{errors.answer.message}</p>
                      )}
                    </div>
                    <div className="text-sm text-gray-500">
                      {answerText.length}/{currentQuestion.expectedAnswerLength} символов
                      {answerText.length >= currentQuestion.expectedAnswerLength && (
                        <CheckCircle className="inline h-4 w-4 text-green-500 ml-1" />
                      )}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Насколько уверены в своем ответе? (1-10)
                  </label>
                  <div className="flex items-center space-x-4">
                    <span className="text-sm text-gray-500">Не уверен</span>
                    <input
                      {...register('confidence', { min: 1, max: 10 })}
                      type="range"
                      min="1"
                      max="10"
                      className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                      style={{
                        background: `linear-gradient(to right, #ef4444 0%, #f59e0b 50%, #10b981 100%)`
                      }}
                    />
                    <span className="text-sm text-gray-500">Очень уверен</span>
                    <span className="text-sm font-medium text-gray-900 min-w-[20px]">
                      {watch('confidence')}
                    </span>
                  </div>
                </div>

                <div className="flex justify-end space-x-4 pt-4">
                  <button
                    type="button"
                    onClick={() => router.push('/dashboard')}
                    className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium"
                  >
                    Отложить
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-6 py-3 cw-button flex items-center"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Отправляется...
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4 mr-2" />
                        Отправить ответ
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default withAuth(WeeklyQuestionPage, ['HIRING_MANAGER', 'OPS_MANAGER', 'MIXED_MANAGER', 'COUNTRY_MANAGER', 'ADMIN']);
