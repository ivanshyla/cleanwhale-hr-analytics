'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Star, Trophy, AlertTriangle, Users, Calendar, TrendingUp, Award, UserCheck, UserX, Eye, X } from 'lucide-react';
import RatingBreakdown from '@/components/RatingBreakdown';

interface EmployeeRating {
  user: {
    id: string;
    name: string;
    city: string;
    role: string;
  };
  rating: number;
  ratingLabel: string;
  ratingColor: string;
  components: {
    productivity: number;
    communication: number;
    quality: number;
    wellbeing: number;
  };
  breakdown: Array<{
    metric: string;
    value: number;
    weight: number;
    contribution: number;
    isNegative: boolean;
  }>;
  recommendations: string[];
  metricsCount: number;
  aggregatedMetrics: any;
  bestEmployeeWeek?: string;
  worstEmployeeWeek?: string;
}

interface EmployeeStats {
  name: string;
  bestCount: number;
  worstCount: number;
  score: number;
  lastMentioned: Date;
  cities: string[];
}

export default function EmployeeRatingsPage() {
  const [user, setUser] = useState<any>(null);
  const [ratings, setRatings] = useState<EmployeeRating[]>([]);
  const [employeeStats, setEmployeeStats] = useState<EmployeeStats[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState('month'); // month, quarter, year
  const [selectedRating, setSelectedRating] = useState<EmployeeRating | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // Проверяем токен и права доступа
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      
      // Проверяем права доступа (только менеджеры и админы)
      if (!['COUNTRY_MANAGER', 'ADMIN'].includes(payload.role)) {
        alert('Доступ запрещен. Только для менеджеров по стране и администраторов.');
        router.push('/dashboard');
        return;
      }
      
      setUser({
        id: payload.userId,
        email: payload.email,
        role: payload.role,
        city: payload.city,
      });

      loadEmployeeRatings();
    } catch (error) {
      console.error('Invalid token:', error);
      router.push('/login');
    }
  }, [router, selectedPeriod]);

  const loadEmployeeRatings = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      // Вычисляем период
      const endDate = new Date();
      const startDate = new Date();
      
      switch (selectedPeriod) {
        case 'month':
          startDate.setMonth(endDate.getMonth() - 1);
          break;
        case 'quarter':
          startDate.setMonth(endDate.getMonth() - 3);
          break;
        case 'year':
          startDate.setFullYear(endDate.getFullYear() - 1);
          break;
      }

      const response = await fetch(`/api/employee-ratings?since=${startDate.toISOString()}&until=${endDate.toISOString()}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setRatings(data.ratings || []);
        calculateEmployeeStats(data.ratings || []);
      } else {
        console.error('Failed to load employee ratings');
        // Fallback к моковым данным для демонстрации
        const mockData = generateMockRatings();
        setRatings(mockData);
        calculateEmployeeStats(mockData);
      }
    } catch (error) {
      console.error('Error loading employee ratings:', error);
      // Fallback к моковым данным
      const mockData = generateMockRatings();
      setRatings(mockData);
      calculateEmployeeStats(mockData);
    } finally {
      setIsLoading(false);
    }
  };

  const generateMockRatings = (): EmployeeRating[] => {
    return [
      {
        id: '1',
        reportDate: new Date('2025-01-10'),
        weekStartDate: new Date('2025-01-06'),
        weekEndDate: new Date('2025-01-12'),
        bestEmployeeWeek: 'Анна Ковальская',
        bestEmployeeReason: 'Отлично справилась с новыми кандидатами, провела 8 собеседований',
        worstEmployeeWeek: 'Петр Новак',
        worstEmployeeReason: 'Опоздания, нужна помощь с планированием времени',
        teamFeedback: 'Команда работает слаженно, хорошая атмосфера',
        user: { name: 'Магдалена Вишневская', city: 'WARSAW', role: 'HR' }
      },
      {
        id: '2',
        reportDate: new Date('2025-01-03'),
        weekStartDate: new Date('2024-12-30'),
        weekEndDate: new Date('2025-01-05'),
        bestEmployeeWeek: 'Томаш Левандовски',
        bestEmployeeReason: 'Быстро решил проблемы с клиентами, отличный сервис',
        worstEmployeeWeek: 'Марта Козловска',
        worstEmployeeReason: 'Проблемы с качеством уборки, нужно дополнительное обучение',
        teamFeedback: 'После праздников команда быстро вошла в ритм',
        user: { name: 'Лукаш Войцик', city: 'KRAKOW', role: 'OPERATIONS' }
      }
    ];
  };

  const calculateEmployeeStats = (ratingsData: EmployeeRating[]) => {
    const stats: { [key: string]: EmployeeStats } = {};

    ratingsData.forEach(rating => {
      const userName = rating.user.name;
      if (!stats[userName]) {
        stats[userName] = {
          name: userName,
          bestCount: 0,
          worstCount: 0,
          score: rating.rating,
          lastMentioned: new Date(),
          cities: [rating.user.city]
        };
      } else {
        // Берем максимальный рейтинг
        stats[userName].score = Math.max(stats[userName].score, rating.rating);
        if (!stats[userName].cities.includes(rating.user.city)) {
          stats[userName].cities.push(rating.user.city);
        }
      }

      // Дополнительно обрабатываем старые поля bestEmployeeWeek/worstEmployeeWeek если есть
      if (rating.bestEmployeeWeek) {
        if (!stats[rating.bestEmployeeWeek]) {
          stats[rating.bestEmployeeWeek] = {
            name: rating.bestEmployeeWeek,
            bestCount: 0,
            worstCount: 0,
            score: 50, // средний рейтинг
            lastMentioned: new Date(),
            cities: []
          };
        }
        stats[rating.bestEmployeeWeek].bestCount++;
        stats[rating.bestEmployeeWeek].score += 10; // бонус за упоминание как лучший
      }

      if (rating.worstEmployeeWeek) {
        if (!stats[rating.worstEmployeeWeek]) {
          stats[rating.worstEmployeeWeek] = {
            name: rating.worstEmployeeWeek,
            bestCount: 0,
            worstCount: 0,
            score: 50,
            lastMentioned: new Date(),
            cities: []
          };
        }
        stats[rating.worstEmployeeWeek].worstCount++;
        stats[rating.worstEmployeeWeek].score -= 5; // штраф за упоминание как худший
      }
    });

    const sortedStats = Object.values(stats).sort((a, b) => b.score - a.score);
    setEmployeeStats(sortedStats);
  };

  const getCityLabel = (city: string) => {
    const labels: Record<string, string> = {
      WARSAW: 'Варшава', KRAKOW: 'Краков', GDANSK: 'Гданьск',
      WROCLAW: 'Вроцлав', POZNAN: 'Познань', LODZ: 'Лодзь'
    };
    return labels[city] || city;
  };

  const getScoreColor = (score: number) => {
    if (score >= 3) return 'text-green-600 bg-green-100';
    if (score >= 1) return 'text-blue-600 bg-blue-100';
    if (score === 0) return 'text-gray-600 bg-gray-100';
    return 'text-red-600 bg-red-100';
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Trophy className="h-8 w-8 text-yellow-600" />
              <span className="ml-2 text-xl font-bold text-gray-900">
                Рейтинги сотрудников
              </span>
            </div>
            <div className="text-sm text-gray-600">
              {user.role === 'COUNTRY_MANAGER' ? 'Менеджер по стране' : 'Администратор'}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Фильтры */}
        <div className="mb-6 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Рейтинги сотрудников</h1>
            <p className="text-sm text-gray-600 mt-1">
              Оценки от менеджеров по лучшим и худшим сотрудникам недели
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <label className="text-sm font-medium text-gray-700">Период:</label>
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="month">Последний месяц</option>
              <option value="quarter">Последние 3 месяца</option>
              <option value="year">Последний год</option>
            </select>
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Общий рейтинг */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                <Award className="h-5 w-5 mr-2 text-yellow-600" />
                Общий рейтинг сотрудников
              </h3>
              
              {employeeStats.length === 0 ? (
                <p className="text-gray-500 text-center py-8">
                  Нет данных по оценкам сотрудников за выбранный период
                </p>
              ) : (
                <div className="space-y-3">
                  {employeeStats.slice(0, 10).map((employee, index) => (
                    <div key={employee.name} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center">
                          {index === 0 && <Trophy className="h-5 w-5 text-yellow-500" />}
                          {index === 1 && <Award className="h-5 w-5 text-gray-400" />}
                          {index === 2 && <Award className="h-5 w-5 text-orange-600" />}
                          {index > 2 && <span className="text-sm font-medium text-gray-500">#{index + 1}</span>}
                        </div>
                        <div className="ml-3">
                          <p className="text-sm font-medium text-gray-900">{employee.name}</p>
                          <p className="text-xs text-gray-500">
                            {employee.cities.map(city => getCityLabel(city)).join(', ')}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <div className="flex items-center space-x-2 text-xs">
                          <span className="flex items-center text-green-600">
                            <UserCheck className="h-3 w-3 mr-1" />
                            {employee.bestCount}
                          </span>
                          <span className="flex items-center text-red-600">
                            <UserX className="h-3 w-3 mr-1" />
                            {employee.worstCount}
                          </span>
                        </div>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getScoreColor(employee.score)}`}>
                          {employee.score > 0 ? '+' : ''}{employee.score}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Последние оценки */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                <Star className="h-5 w-5 mr-2 text-blue-600" />
                Детальные рейтинги
              </h3>
              
              {ratings.length === 0 ? (
                <p className="text-gray-500 text-center py-8">
                  Нет оценок за выбранный период
                </p>
              ) : (
                <div className="space-y-4">
                  {ratings.slice(0, 5).map((rating, index) => (
                    <div key={rating.user.id} className="border rounded-lg p-4" style={{ borderColor: rating.ratingColor }}>
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {rating.user.name} • {getCityLabel(rating.user.city)}
                          </p>
                          <p className="text-xs text-gray-500">
                            {rating.user.role} • {rating.metricsCount} отчет(ов)
                          </p>
                        </div>
                        <div className="text-right">
                          <div 
                            className="text-lg font-bold" 
                            style={{ color: rating.ratingColor }}
                          >
                            {rating.rating}/100
                          </div>
                          <div className="text-xs" style={{ color: rating.ratingColor }}>
                            {rating.ratingLabel}
                          </div>
                        </div>
                      </div>
                      
                      {/* Компоненты рейтинга */}
                      <div className="grid grid-cols-2 gap-2 mb-3">
                        <div className="text-xs">
                          <span className="text-gray-600">Продуктивность:</span>
                          <span className="ml-1 font-medium">{rating.components.productivity}</span>
                        </div>
                        <div className="text-xs">
                          <span className="text-gray-600">Коммуникация:</span>
                          <span className="ml-1 font-medium">{rating.components.communication}</span>
                        </div>
                        <div className="text-xs">
                          <span className="text-gray-600">Качество:</span>
                          <span className="ml-1 font-medium">{rating.components.quality}</span>
                        </div>
                        <div className="text-xs">
                          <span className="text-gray-600">Благополучие:</span>
                          <span className="ml-1 font-medium">{rating.components.wellbeing}</span>
                        </div>
                      </div>

                      {/* Рекомендации */}
                      {rating.recommendations && rating.recommendations.length > 0 && (
                        <div className="mt-2">
                          <p className="text-xs font-medium text-gray-700 mb-1">Рекомендации:</p>
                          {rating.recommendations.slice(0, 2).map((rec, i) => (
                            <p key={i} className="text-xs text-gray-600 mb-1">{rec}</p>
                          ))}
                        </div>
                      )}

                      {/* Кнопка подробнее */}
                      <div className="mt-3 flex justify-end">
                        <button
                          onClick={() => {
                            setSelectedRating(rating);
                            setShowDetailModal(true);
                          }}
                          className="text-xs text-blue-600 hover:text-blue-800 flex items-center font-medium"
                        >
                          <Eye className="h-3 w-3 mr-1" />
                          Подробнее
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Статистика */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center">
              <Users className="h-8 w-8 text-blue-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Всего оценок</p>
                <p className="text-2xl font-bold text-gray-900">{ratings.length}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center">
              <Trophy className="h-8 w-8 text-green-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Уникальных лучших</p>
                <p className="text-2xl font-bold text-gray-900">
                  {new Set(ratings.filter(r => r.bestEmployeeWeek).map(r => r.bestEmployeeWeek)).size}
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center">
              <AlertTriangle className="h-8 w-8 text-red-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Требуют внимания</p>
                <p className="text-2xl font-bold text-gray-900">
                  {new Set(ratings.filter(r => r.worstEmployeeWeek).map(r => r.worstEmployeeWeek)).size}
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center">
              <TrendingUp className="h-8 w-8 text-purple-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Активных менеджеров</p>
                <p className="text-2xl font-bold text-gray-900">
                  {new Set(ratings.map(r => r.user.name)).size}
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Модальное окно детального анализа */}
      {showDetailModal && selectedRating && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl max-h-[90vh] overflow-y-auto w-full mx-4">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
              <div>
                <h3 className="text-lg font-bold text-gray-900">
                  Детальный анализ рейтинга
                </h3>
                <p className="text-sm text-gray-600">
                  {selectedRating.user.name} • {getCityLabel(selectedRating.user.city)}
                </p>
              </div>
              <button
                onClick={() => setShowDetailModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            
            <div className="p-6">
              {/* Основной рейтинг */}
              <div className="mb-6 text-center">
                <div 
                  className="text-6xl font-bold mb-2" 
                  style={{ color: selectedRating.ratingColor }}
                >
                  {selectedRating.rating}/100
                </div>
                <div 
                  className="text-xl font-medium" 
                  style={{ color: selectedRating.ratingColor }}
                >
                  {selectedRating.ratingLabel}
                </div>
                <p className="text-sm text-gray-600 mt-2">
                  На основе {selectedRating.metricsCount} отчет(ов)
                </p>
              </div>

              {/* Компонент разбора рейтинга */}
              <RatingBreakdown 
                breakdown={selectedRating.breakdown}
                components={selectedRating.components}
              />

              {/* Все рекомендации */}
              {selectedRating.recommendations && selectedRating.recommendations.length > 0 && (
                <div className="mt-6">
                  <h4 className="text-md font-semibold text-gray-900 mb-4">
                    Рекомендации по улучшению
                  </h4>
                  <div className="space-y-2">
                    {selectedRating.recommendations.map((rec, i) => (
                      <div key={i} className="flex items-start p-3 bg-blue-50 rounded-lg border border-blue-200">
                        <div className="flex-shrink-0 w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center mr-3 mt-0.5">
                          <span className="text-xs font-bold text-blue-700">{i + 1}</span>
                        </div>
                        <p className="text-sm text-blue-800">{rec}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Агрегированные метрики */}
              <div className="mt-6">
                <h4 className="text-md font-semibold text-gray-900 mb-4">
                  Агрегированные метрики
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-xs text-gray-600">Рабочие дни</p>
                    <p className="text-lg font-bold text-gray-900">
                      {selectedRating.aggregatedMetrics.workingDays || 0}
                    </p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-xs text-gray-600">Собеседования</p>
                    <p className="text-lg font-bold text-gray-900">
                      {selectedRating.aggregatedMetrics.interviews || 0}
                    </p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-xs text-gray-600">Заказы</p>
                    <p className="text-lg font-bold text-gray-900">
                      {selectedRating.aggregatedMetrics.ordersProcessed || 0}
                    </p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-xs text-gray-600">Стресс-уровень</p>
                    <p className="text-lg font-bold text-gray-900">
                      {selectedRating.aggregatedMetrics.stressLevel || 0}/10
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
