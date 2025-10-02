'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { Calendar, Save, TrendingUp, Users, MessageSquare, Clock, Upload, Download, Star, Brain, AlertTriangle, CheckCircle, Info, RefreshCw, ArrowLeft } from 'lucide-react';

interface NewMetricsFormData {
  reportDate: string;
  
  // HR метрики (для HR + MIXED)
  hrInterviews?: number;
  hrJobPostings?: number;
  hrRegistrations?: number;
  hrWorkingDays?: number;
  hrDifficultSituations?: string;
  hrStressLevel?: number;
  hrOvertime?: boolean;
  
  // Операционные метрики (для OPERATIONS + MIXED)
  opsWorkingDays?: number;
  opsOrdersWeek?: number;
  opsCleanerIssues?: string;
  opsClientIssues?: string;
  opsStressLevel?: number;
  opsOvertime?: boolean;
  
  // Оценки сотрудников
  bestEmployeeWeek?: string;
  bestEmployeeReason?: string;
  worstEmployeeWeek?: string;
  worstEmployeeReason?: string;
  teamFeedback?: string;
  
  notes?: string;
}

interface AIInsight {
  type: 'positive' | 'warning' | 'critical' | 'neutral';
  category: string;
  title: string;
  message: string;
  recommendation?: string;
}

export default function NewMetricsPage() {
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [autoData, setAutoData] = useState<any>(null);
  const [aiInsights, setAiInsights] = useState<AIInsight[]>([]);
  const [isLoadingAI, setIsLoadingAI] = useState(false);
  const [showAIPanel, setShowAIPanel] = useState(false);
  const [aiSummary, setAiSummary] = useState<string>('');
  const router = useRouter();
  
  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<NewMetricsFormData>({
    defaultValues: {
      reportDate: new Date().toISOString().split('T')[0],
    }
  });

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch('/api/auth/me', { credentials: 'include' });
        if (!res.ok) {
          router.push('/login');
          return;
        }
        const userData = await res.json();
        setUser(userData);
        
        // Загружаем автоматические данные
        loadAutoData();
        
        // Загружаем AI инсайты
        loadAIInsights();
      } catch (error) {
        console.error('Auth error:', error);
        router.push('/login');
      }
    };
    checkAuth();
  }, [router]);

  const loadAutoData = async () => {
    // Моковые данные для демонстрации
    setAutoData({
      trengoMessages: 156,
      trengoTicketsResolved: 18,
      trengoLastSync: new Date('2024-01-15T10:30:00'),
      crmTicketsResolved: 42,
      crmOrdersWeek: 125,
      crmLastSync: new Date('2024-01-15T11:15:00'),
    });
  };

  const onSubmit = async (data: NewMetricsFormData) => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/metrics', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (response.ok) {
        alert('Метрики успешно сохранены!');
        router.push('/dashboard');
      } else {
        alert(`Ошибка сохранения: ${result.message}`);
      }
    } catch (error) {
      console.error('Error saving metrics:', error);
      alert('Ошибка сохранения метрик');
    } finally {
      setIsLoading(false);
    }
  };

  const loadAIInsights = async () => {
    setIsLoadingAI(true);
    try {
      const response = await fetch('/api/personal-insights', {
        credentials: 'include',
      });

      if (response.ok) {
        const result = await response.json();
        
        if (result.success) {
          setAiInsights(result.analysis.insights || []);
          setAiSummary(result.analysis.weekSummary || '');
          
          // Автоматически показываем панель, если есть важные инсайты
          const hasImportantInsights = result.analysis.insights?.some(
            (insight: AIInsight) => insight.type === 'warning' || insight.type === 'critical'
          );
          
          if (hasImportantInsights) {
            setShowAIPanel(true);
          }
        }
      }
    } catch (error) {
      console.error('Error loading AI insights:', error);
    } finally {
      setIsLoadingAI(false);
    }
  };

  const getRoleLabel = (role: string) => {
    const labels: Record<string, string> = {
      HR: 'Менеджер по найму',
      OPERATIONS: 'Операционный менеджер',
      MIXED: 'Смешанная роль (найм + операции)',
      COUNTRY_MANAGER: 'Менеджер по стране',
      ADMIN: 'Администратор',
    };
    return labels[role] || role;
  };

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'positive':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case 'critical':
        return <AlertTriangle className="h-5 w-5 text-red-500" />;
      default:
        return <Info className="h-5 w-5 text-blue-500" />;
    }
  };

  const getInsightColor = (type: string) => {
    switch (type) {
      case 'positive':
        return 'bg-green-50 border-green-200 text-green-800';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      case 'critical':
        return 'bg-red-50 border-red-200 text-red-800';
      default:
        return 'bg-blue-50 border-blue-200 text-blue-800';
    }
  };

  const getCityLabel = (city: string) => {
    const labels: Record<string, string> = {
      WARSAW: 'Варшава',
      KRAKOW: 'Краков',
      GDANSK: 'Гданьск',
      WROCLAW: 'Вроцлав',
      POZNAN: 'Познань',
      LODZ: 'Лодзь',
    };
    return labels[city] || city;
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const isHR = user.role === 'HR';
  const isOps = user.role === 'OPERATIONS';
  const isMixed = user.role === 'MIXED';
  const showHRSection = isHR || isMixed;
  const showOpsSection = isOps || isMixed;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <TrendingUp className="h-8 w-8 text-blue-600" />
              <span className="ml-2 text-xl font-bold text-gray-900">
                Еженедельный отчет
              </span>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-600">
                {getRoleLabel(user.role)} • {getCityLabel(user.city)}
              </div>
              <button
                onClick={() => router.push('/dashboard')}
                className="flex items-center text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
              >
                <ArrowLeft className="h-4 w-4 mr-1" />
                Назад
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* AI Помощник */}
        <div className="mb-6">
          <button
            onClick={() => setShowAIPanel(!showAIPanel)}
            className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg border border-purple-200 hover:from-purple-100 hover:to-blue-100 transition-colors"
          >
            <div className="flex items-center">
              <Brain className="h-6 w-6 text-purple-600 mr-3" />
              <div className="text-left">
                <h3 className="text-lg font-semibold text-purple-900">
                  AI Помощник
                  {isLoadingAI && (
                    <RefreshCw className="inline h-4 w-4 ml-2 animate-spin" />
                  )}
                </h3>
                <p className="text-sm text-purple-700">
                  Персональные инсайты перед заполнением формы
                </p>
              </div>
            </div>
            <div className="flex items-center">
              {aiInsights.filter(insight => insight.type === 'critical').length > 0 && (
                <span className="mr-2 px-2 py-1 bg-red-100 text-red-800 text-xs rounded-full">
                  {aiInsights.filter(insight => insight.type === 'critical').length} критических
                </span>
              )}
              {aiInsights.filter(insight => insight.type === 'warning').length > 0 && (
                <span className="mr-2 px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full">
                  {aiInsights.filter(insight => insight.type === 'warning').length} предупреждений
                </span>
              )}
              <span className="text-purple-600">
                {showAIPanel ? '▲' : '▼'}
              </span>
            </div>
          </button>

          {showAIPanel && (
            <div className="mt-4 p-6 bg-white rounded-lg border shadow-sm">
              {isLoadingAI ? (
                <div className="text-center py-8">
                  <RefreshCw className="h-8 w-8 text-purple-600 animate-spin mx-auto mb-2" />
                  <p className="text-gray-600">AI анализирует ваши показатели...</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {aiSummary && (
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <h4 className="font-medium text-gray-900 mb-2">📊 Резюме недели:</h4>
                      <p className="text-gray-700">{aiSummary}</p>
                    </div>
                  )}

                  {aiInsights.length > 0 ? (
                    <div className="space-y-3">
                      <h4 className="font-medium text-gray-900">🔍 Персональные инсайты:</h4>
                      {aiInsights.map((insight, index) => (
                        <div
                          key={index}
                          className={`p-4 rounded-lg border ${getInsightColor(insight.type)}`}
                        >
                          <div className="flex items-start">
                            <div className="mr-3">
                              {getInsightIcon(insight.type)}
                            </div>
                            <div className="flex-1">
                              <h5 className="font-medium mb-1">{insight.title}</h5>
                              <p className="text-sm mb-2">{insight.message}</p>
                              {insight.recommendation && (
                                <p className="text-sm font-medium">
                                  💡 Рекомендация: {insight.recommendation}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-4">
                      <Brain className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                      <p className="text-gray-600">
                        Недостаточно данных для анализа. После нескольких недель AI предоставит персональные рекомендации.
                      </p>
                    </div>
                  )}

                  <div className="flex justify-between pt-4 border-t">
                    <button
                      onClick={loadAIInsights}
                      className="flex items-center px-4 py-2 text-purple-600 border border-purple-200 rounded-md hover:bg-purple-50"
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Обновить анализ
                    </button>
                    <button
                      onClick={() => setShowAIPanel(false)}
                      className="px-4 py-2 text-gray-600 hover:text-gray-800"
                    >
                      Скрыть панель
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Еженедельные метрики</h1>
            <p className="mt-1 text-sm text-gray-600">
              Заполните отчет за прошедшую неделю. Автоматические данные подгружаются из Trengo и CRM.
            </p>
          </div>

          {/* Автоматические данные */}
          {autoData && (
            <div className="mb-8 p-4 bg-blue-50 rounded-lg">
              <h3 className="text-lg font-medium text-blue-900 mb-4">
                📊 Автоматически собранные данные
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <h4 className="font-medium text-blue-800">Trengo</h4>
                  <div className="text-sm space-y-1">
                    <p>Сообщения: <span className="font-semibold">{autoData.trengoMessages}</span></p>
                    <p>Решено тикетов: <span className="font-semibold">{autoData.trengoTicketsResolved}</span></p>
                    <p className="text-xs text-gray-600">
                      Обновлено: {autoData.trengoLastSync.toLocaleString('ru-RU')}
                    </p>
                  </div>
                </div>
                <div className="space-y-2">
                  <h4 className="font-medium text-blue-800">CRM</h4>
                  <div className="text-sm space-y-1">
                    <p>Решено тикетов: <span className="font-semibold">{autoData.crmTicketsResolved}</span></p>
                    <p>Заказов за неделю: <span className="font-semibold">{autoData.crmOrdersWeek}</span></p>
                    <p className="text-xs text-gray-600">
                      Обновлено: {autoData.crmLastSync.toLocaleString('ru-RU')}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Форма */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Дата отчета */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Calendar className="inline h-4 w-4 mr-1" />
                Дата отчета
              </label>
              <input
                type="date"
                {...register('reportDate', { required: 'Дата обязательна' })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
              {errors.reportDate && (
                <p className="mt-1 text-sm text-red-600">{errors.reportDate.message}</p>
              )}
            </div>

            {/* HR метрики */}
            {showHRSection && (
              <div className="p-4 bg-green-50 rounded-lg">
                <h3 className="text-lg font-medium text-green-900 mb-4">
                  <Users className="inline h-5 w-5 mr-2" />
                  Метрики по найму
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Количество собеседований
                    </label>
                    <input
                      type="number"
                      min="0"
                      {...register('hrInterviews', { min: 0 })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-green-500 focus:border-green-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Размещено объявлений
                    </label>
                    <input
                      type="number"
                      min="0"
                      {...register('hrJobPostings', { min: 0 })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-green-500 focus:border-green-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Зарегистрировано людей
                    </label>
                    <input
                      type="number"
                      min="0"
                      {...register('hrRegistrations', { min: 0 })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-green-500 focus:border-green-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Полных рабочих дней
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      max="7"
                      {...register('hrWorkingDays', { min: 0, max: 7 })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-green-500 focus:border-green-500"
                    />
                  </div>
                </div>
                
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Сложные ситуации на собеседованиях
                  </label>
                  <textarea
                    rows={3}
                    {...register('hrDifficultSituations')}
                    placeholder="Опишите сложные ситуации, если были..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-green-500 focus:border-green-500"
                  />
                </div>

                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <Star className="inline h-4 w-4 mr-1" />
                      Уровень стресса (1-10)
                    </label>
                    <input
                      type="range"
                      min="1"
                      max="10"
                      {...register('hrStressLevel')}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span>1 (спокойно)</span>
                      <span>10 (очень стрессово)</span>
                    </div>
                  </div>
                  <div className="flex items-center">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        {...register('hrOvertime')}
                        className="rounded border-gray-300 text-green-600"
                      />
                      <span className="ml-2 text-sm text-gray-700">
                        Работал(а) сверхурочно
                      </span>
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* Операционные метрики */}
            {showOpsSection && (
              <div className="p-4 bg-purple-50 rounded-lg">
                <h3 className="text-lg font-medium text-purple-900 mb-4">
                  <MessageSquare className="inline h-5 w-5 mr-2" />
                  Операционные метрики
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Полных рабочих дней
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      max="7"
                      {...register('opsWorkingDays', { min: 0, max: 7 })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-purple-500 focus:border-purple-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Заказов за неделю в городе
                      <span className="text-xs text-gray-500 ml-1">(если не подгружается из CRM)</span>
                    </label>
                    <input
                      type="number"
                      min="0"
                      {...register('opsOrdersWeek', { min: 0 })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-purple-500 focus:border-purple-500"
                    />
                  </div>
                </div>
                
                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Сложные ситуации с клинерами
                    </label>
                    <textarea
                      rows={2}
                      {...register('opsCleanerIssues')}
                      placeholder="Опишите проблемы с клинерами..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-purple-500 focus:border-purple-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Сложные ситуации с клиентами
                    </label>
                    <textarea
                      rows={2}
                      {...register('opsClientIssues')}
                      placeholder="Опишите проблемы с клиентами..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-purple-500 focus:border-purple-500"
                    />
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <Star className="inline h-4 w-4 mr-1" />
                      Уровень стресса (1-10)
                    </label>
                    <input
                      type="range"
                      min="1"
                      max="10"
                      {...register('opsStressLevel')}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span>1 (спокойно)</span>
                      <span>10 (очень стрессово)</span>
                    </div>
                  </div>
                  <div className="flex items-center">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        {...register('opsOvertime')}
                        className="rounded border-gray-300 text-purple-600"
                      />
                      <span className="ml-2 text-sm text-gray-700">
                        Работал(а) сверхурочно
                      </span>
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* Оценка сотрудников */}
            <div className="p-4 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg">
              <h3 className="text-lg font-medium text-orange-900 mb-4">
                <Star className="inline h-5 w-5 mr-2" />
                Оценка сотрудников недели
              </h3>
              <p className="text-sm text-orange-700 mb-4">
                Выберите лучшего и худшего сотрудника с которым работали на этой неделе. 
                Это поможет руководству понимать динамику команды.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Лучший сотрудник */}
                <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                  <h4 className="font-medium text-green-800 mb-3 flex items-center">
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Лучший сотрудник недели
                  </h4>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Имя сотрудника
                      </label>
                      <input
                        type="text"
                        {...register('bestEmployeeWeek')}
                        placeholder="Введите имя и фамилию..."
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-green-500 focus:border-green-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Причина выбора
                      </label>
                      <textarea
                        rows={3}
                        {...register('bestEmployeeReason')}
                        placeholder="За что хвалите? Конкретные достижения..."
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-green-500 focus:border-green-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Худший сотрудник */}
                <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                  <h4 className="font-medium text-red-800 mb-3 flex items-center">
                    <AlertTriangle className="h-4 w-4 mr-2" />
                    Сотрудник, требующий внимания
                  </h4>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Имя сотрудника
                      </label>
                      <input
                        type="text"
                        {...register('worstEmployeeWeek')}
                        placeholder="Введите имя и фамилию..."
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-red-500 focus:border-red-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Проблемы и предложения
                      </label>
                      <textarea
                        rows={3}
                        {...register('worstEmployeeReason')}
                        placeholder="Какие проблемы? Как можно помочь?"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-red-500 focus:border-red-500"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Общий отзыв о команде */}
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Users className="inline h-4 w-4 mr-1" />
                  Общий отзыв о команде
                </label>
                <textarea
                  rows={2}
                  {...register('teamFeedback')}
                  placeholder="Как работала команда в целом? Атмосфера, взаимодействие..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-orange-500 focus:border-orange-500"
                />
              </div>
            </div>

            {/* Дополнительные заметки */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Дополнительные заметки
              </label>
              <textarea
                rows={3}
                {...register('notes')}
                placeholder="Особенности недели, важные события, комментарии..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Кнопки */}
            <div className="flex justify-between">
              <button
                type="button"
                onClick={() => router.push('/dashboard')}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Отмена
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="flex items-center px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                <Save className="h-4 w-4 mr-2" />
                {isLoading ? 'Сохранение...' : 'Сохранить отчет'}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
