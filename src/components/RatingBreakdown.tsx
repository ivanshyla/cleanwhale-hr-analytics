'use client';

// ✅ Оптимизация: динамический импорт recharts для уменьшения бандла (-100KB)
import { 
  DynamicBarChart as BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from '@/components/DynamicChart';

interface RatingBreakdownProps {
  breakdown: Array<{
    metric: string;
    value: number;
    weight: number;
    contribution: number;
    isNegative: boolean;
  }>;
  components: {
    productivity: number;
    communication: number;
    quality: number;
    wellbeing: number;
  };
}

export default function RatingBreakdown({ breakdown, components }: RatingBreakdownProps) {
  // Данные для диаграммы компонентов
  const componentData = [
    { name: 'Продуктивность', value: components.productivity, color: '#10B981' },
    { name: 'Коммуникация', value: components.communication, color: '#3B82F6' },
    { name: 'Качество', value: components.quality, color: '#8B5CF6' },
    { name: 'Благополучие', value: components.wellbeing, color: '#F59E0B' },
  ];

  // Данные для детального разбора
  const breakdownData = breakdown.map(item => ({
    ...item,
    color: item.isNegative ? '#EF4444' : '#10B981',
    displayContribution: Math.abs(item.contribution),
  }));

  return (
    <div className="space-y-6">
      {/* Компоненты рейтинга */}
      <div>
        <h4 className="text-md font-semibold text-gray-900 mb-4">Компоненты рейтинга</h4>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={componentData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="name" 
                fontSize={12}
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis domain={[0, 100]} />
              <Tooltip 
                formatter={(value: any) => [`${value}/100`, 'Баллы']}
                labelFormatter={(label: any) => `Компонент: ${label}`}
              />
              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                {componentData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Детальный разбор */}
      <div>
        <h4 className="text-md font-semibold text-gray-900 mb-4">Детальный разбор метрик</h4>
        <div className="space-y-2 max-h-80 overflow-y-auto">
          {breakdownData.map((item, index) => (
            <div 
              key={index} 
              className={`flex justify-between items-center p-3 rounded-lg ${
                item.isNegative ? 'bg-red-50 border border-red-100' : 'bg-green-50 border border-green-100'
              }`}
            >
              <div className="flex-1">
                <p className={`text-sm font-medium ${item.isNegative ? 'text-red-800' : 'text-green-800'}`}>
                  {item.metric}
                </p>
                <p className="text-xs text-gray-600">
                  Значение: {item.value} • Вес: {Math.abs(item.weight)}
                </p>
              </div>
              <div className="text-right">
                <p className={`text-sm font-bold ${item.isNegative ? 'text-red-600' : 'text-green-600'}`}>
                  {item.isNegative ? '-' : '+'}{item.displayContribution.toFixed(1)}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Сводка по категориям */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-green-50 p-4 rounded-lg border border-green-200">
          <h5 className="text-sm font-semibold text-green-800 mb-2">Позитивные факторы</h5>
          <p className="text-lg font-bold text-green-600">
            +{breakdown
              .filter(item => !item.isNegative)
              .reduce((sum, item) => sum + item.contribution, 0)
              .toFixed(1)}
          </p>
          <p className="text-xs text-green-700">
            {breakdown.filter(item => !item.isNegative).length} метрик
          </p>
        </div>

        <div className="bg-red-50 p-4 rounded-lg border border-red-200">
          <h5 className="text-sm font-semibold text-red-800 mb-2">Проблемные области</h5>
          <p className="text-lg font-bold text-red-600">
            {breakdown
              .filter(item => item.isNegative)
              .reduce((sum, item) => sum + item.contribution, 0)
              .toFixed(1)}
          </p>
          <p className="text-xs text-red-700">
            {breakdown.filter(item => item.isNegative).length} метрик
          </p>
        </div>
      </div>
    </div>
  );
}
