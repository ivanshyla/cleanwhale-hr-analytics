'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Brain, 
  AlertTriangle, 
  CheckCircle, 
  RefreshCw, 
  TrendingUp,
  Users,
  Calendar,
  Lightbulb
} from 'lucide-react';
import { getWeekISO } from '@/types';

interface AiAnalysis {
  id: string;
  type: string;
  title: string;
  description: string;
  severity: string;
  insights: any;
  recommendations?: string;
  createdAt: string;
}

export default function AiInsightsPage() {
  const [user, setUser] = useState<any>(null);
  const [analyses, setAnalyses] = useState<AiAnalysis[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedWeek, setSelectedWeek] = useState(getWeekISO(new Date()));
  const router = useRouter();

  useEffect(() => {
    loadUserData();
    loadAnalyses();
  }, []);

  const loadUserData = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        router.push('/login');
        return;
      }

      const response = await fetch('/api/users/me', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
      } else {
        router.push('/login');
      }
    } catch (error) {
      console.error('Error loading user data:', error);
      router.push('/login');
    }
  };

  const loadAnalyses = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/ai-analysis', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setAnalyses(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error('Error loading analyses:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const generateAnalysis = async (type: string) => {
    setIsGenerating(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/ai-analysis', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          type,
          weekIso: selectedWeek,
        }),
      });

      if (response.ok) {
        const newAnalysis = await response.json();
        setAnalyses(prev => [newAnalysis, ...prev]);
      }
    } catch (error) {
      console.error('Error generating analysis:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-50 border-red-200 text-red-800';
      case 'warning': return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      default: return 'bg-blue-50 border-blue-200 text-blue-800';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical': return <AlertTriangle className="w-5 h-5 text-red-500" />;
      case 'warning': return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      default: return <CheckCircle className="w-5 h-5 text-blue-500" />;
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Заголовок */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <Brain className="w-8 h-8 mr-3 text-purple-600" />
            ИИ Аналитика
          </h1>
          <p className="mt-2 text-gray-600">
            Автоматический анализ данных команды с помощью OpenAI GPT-4
          </p>
        </div>

        {/* Панель управления */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
            <div className="flex items-center space-x-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Неделя для анализа
                </label>
                <input
                  type="text"
                  value={selectedWeek}
                  onChange={(e) => setSelectedWeek(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="2024-W15"
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => generateAnalysis('summary')}
                disabled={isGenerating}
                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {isGenerating ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Brain className="w-4 h-4 mr-2" />}
                Создать резюме
              </button>

              <button
                onClick={() => generateAnalysis('anomalies')}
                disabled={isGenerating}
                className="flex items-center px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 disabled:opacity-50"
              >
                <AlertTriangle className="w-4 h-4 mr-2" />
                Найти аномалии
              </button>

              <button
                onClick={() => generateAnalysis('recommendations')}
                disabled={isGenerating}
                className="flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
              >
                <Lightbulb className="w-4 h-4 mr-2" />
                Рекомендации
              </button>
            </div>
          </div>
        </div>

        {/* Результаты анализа */}
        <div className="space-y-6">
          {isLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Загружаем анализы...</p>
            </div>
          ) : analyses.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-lg shadow-sm border border-gray-200">
              <Brain className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Пока нет AI анализов
              </h3>
              <p className="text-gray-600 mb-6">
                Создайте первый анализ с помощью кнопок выше
              </p>
            </div>
          ) : (
            analyses.map((analysis) => (
              <div
                key={analysis.id}
                className={`bg-white rounded-lg shadow-sm border p-6 ${getSeverityColor(analysis.severity)}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    {getSeverityIcon(analysis.severity)}
                    <div>
                      <h3 className="text-lg font-semibold">
                        {analysis.title}
                      </h3>
                      <p className="text-sm opacity-75">
                        {analysis.type} • {new Date(analysis.createdAt).toLocaleDateString('ru-RU')}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      analysis.severity === 'critical' 
                        ? 'bg-red-100 text-red-800'
                        : analysis.severity === 'warning'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-blue-100 text-blue-800'
                    }`}>
                      {analysis.severity === 'critical' ? 'Критично' :
                       analysis.severity === 'warning' ? 'Внимание' : 'Информация'}
                    </span>
                  </div>
                </div>

                <div className="mt-4">
                  <p className="text-gray-700 leading-relaxed">
                    {analysis.description}
                  </p>
                </div>

                {analysis.recommendations && (
                  <div className="mt-4 p-4 bg-gray-50 rounded-md">
                    <h4 className="font-medium text-gray-900 mb-2 flex items-center">
                      <Lightbulb className="w-4 h-4 mr-2" />
                      Рекомендации
                    </h4>
                    <p className="text-gray-700 text-sm">
                      {analysis.recommendations}
                    </p>
                  </div>
                )}

                {analysis.insights && typeof analysis.insights === 'object' && (
                  <div className="mt-4 p-4 bg-white bg-opacity-50 rounded-md">
                    <h4 className="font-medium text-gray-900 mb-2">
                      Детали анализа
                    </h4>
                    <pre className="text-xs text-gray-600 overflow-x-auto">
                      {JSON.stringify(analysis.insights, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Быстрые действия */}
        <div className="mt-8 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Быстрые действия
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button
              onClick={() => router.push('/dashboard/weekly-report')}
              className="flex items-center px-4 py-3 border border-gray-200 rounded-md hover:bg-gray-50"
            >
              <Calendar className="w-5 h-5 mr-3 text-blue-600" />
              <span>Заполнить отчет</span>
            </button>

            <button
              onClick={() => router.push('/dashboard/analytics')}
              className="flex items-center px-4 py-3 border border-gray-200 rounded-md hover:bg-gray-50"
            >
              <TrendingUp className="w-5 h-5 mr-3 text-green-600" />
              <span>Посмотреть графики</span>
            </button>

            <button
              onClick={() => router.push('/dashboard/users')}
              className="flex items-center px-4 py-3 border border-gray-200 rounded-md hover:bg-gray-50"
            >
              <Users className="w-5 h-5 mr-3 text-purple-600" />
              <span>Список сотрудников</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}