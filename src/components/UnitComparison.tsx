'use client';

import { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';
import { ArrowUpDown, TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface ComparisonUnit {
  city: string;
  cityLabel: string;
  department: 'HR' | 'OPERATIONS' | 'MIXED';
  departmentLabel: string;
  value: number;
  change?: number; // изменение в % по сравнению с предыдущим периодом
  trend?: 'up' | 'down' | 'stable';
}

interface UnitComparisonProps {
  title: string;
  metric: string;
  units: ComparisonUnit[];
  timeData?: Array<{
    period: string;
    [key: string]: any;
  }>;
  showTrend?: boolean;
}

export default function UnitComparison({ 
  title, 
  metric, 
  units, 
  timeData, 
  showTrend = false 
}: UnitComparisonProps) {
  const [viewMode, setViewMode] = useState<'bar' | 'trend'>('bar');

  const getTrendIcon = (trend?: string, change?: number) => {
    if (!trend || !change) return null;
    
    if (trend === 'up') {
      return <TrendingUp className="h-4 w-4 text-green-500" />;
    } else if (trend === 'down') {
      return <TrendingDown className="h-4 w-4 text-red-500" />;
    }
    return <Minus className="h-4 w-4 text-gray-500" />;
  };

  const getTrendColor = (trend?: string) => {
    switch (trend) {
      case 'up': return 'text-green-600';
      case 'down': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getUnitLabel = (unit: ComparisonUnit) => {
    return `${unit.departmentLabel} - ${unit.cityLabel}`;
  };

  const chartData = units.map(unit => ({
    ...unit,
    name: getUnitLabel(unit),
    change: unit.change || 0,
  }));

  const maxValue = Math.max(...units.map(u => u.value));
  const minValue = Math.min(...units.map(u => u.value));
  const avgValue = units.reduce((sum, u) => sum + u.value, 0) / units.length;

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-medium text-gray-900">
          <ArrowUpDown className="inline h-5 w-5 mr-2" />
          {title}
        </h3>
        {showTrend && timeData && (
          <div className="flex space-x-2">
            <button
              onClick={() => setViewMode('bar')}
              className={`px-3 py-1 text-sm rounded ${
                viewMode === 'bar' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Сравнение
            </button>
            <button
              onClick={() => setViewMode('trend')}
              className={`px-3 py-1 text-sm rounded ${
                viewMode === 'trend' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Тренд
            </button>
          </div>
        )}
      </div>

      {/* Статистика */}
      <div className="grid grid-cols-3 gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
        <div className="text-center">
          <p className="text-xs text-gray-600">Максимум</p>
          <p className="text-lg font-bold text-green-600">{maxValue.toFixed(1)}</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-gray-600">Среднее</p>
          <p className="text-lg font-bold text-blue-600">{avgValue.toFixed(1)}</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-gray-600">Минимум</p>
          <p className="text-lg font-bold text-red-600">{minValue.toFixed(1)}</p>
        </div>
      </div>

      {/* График */}
      <ResponsiveContainer width="100%" height={300}>
        {viewMode === 'bar' ? (
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="name" 
              tick={{ fontSize: 11 }}
              angle={-45}
              textAnchor="end"
              height={80}
            />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip 
              formatter={(value: number) => [value.toFixed(1), metric]}
              labelFormatter={(label) => `Юнит: ${label}`}
            />
            <Bar 
              dataKey="value" 
              fill="#3B82F6"
              name={metric}
            />
          </BarChart>
        ) : (
          <LineChart data={timeData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="period" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip />
            <Legend />
            {units.map((unit, index) => (
              <Line 
                key={unit.city + unit.department}
                type="monotone" 
                dataKey={`${unit.city}_${unit.department}`}
                stroke={`hsl(${index * 60}, 70%, 50%)`}
                strokeWidth={2}
                name={getUnitLabel(unit)}
              />
            ))}
          </LineChart>
        )}
      </ResponsiveContainer>

      {/* Детальная таблица */}
      <div className="mt-6">
        <h4 className="text-sm font-medium text-gray-900 mb-3">Детальное сравнение</h4>
        <div className="space-y-2">
          {units
            .sort((a, b) => b.value - a.value)
            .map((unit, index) => (
              <div 
                key={unit.city + unit.department}
                className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50"
                style={{
                  backgroundColor: index === 0 ? '#f0fdf4' : index === units.length - 1 ? '#fef2f2' : '#f9fafb'
                }}
              >
                <div className="flex items-center space-x-3">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium text-white ${
                    index === 0 ? 'bg-green-500' : 
                    index === units.length - 1 ? 'bg-red-500' : 'bg-gray-400'
                  }`}>
                    {index + 1}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{getUnitLabel(unit)}</p>
                    <p className="text-xs text-gray-500">
                      {unit.value.toFixed(1)} {metric}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  {unit.change !== undefined && (
                    <div className={`flex items-center space-x-1 ${getTrendColor(unit.trend)}`}>
                      {getTrendIcon(unit.trend, unit.change)}
                      <span className="text-sm font-medium">
                        {unit.change > 0 ? '+' : ''}{unit.change.toFixed(1)}%
                      </span>
                    </div>
                  )}
                  <div className="text-right">
                    <p className="text-lg font-bold text-gray-900">{unit.value.toFixed(1)}</p>
                  </div>
                </div>
              </div>
            ))}
        </div>
      </div>

      {/* Выводы и рекомендации */}
      <div className="mt-6 p-4 bg-blue-50 rounded-lg">
        <h4 className="text-sm font-medium text-blue-900 mb-2">💡 Выводы</h4>
        <div className="text-sm text-blue-800 space-y-1">
          <p>
            • Лучший результат: <strong>{units.find(u => u.value === maxValue)?.cityLabel} 
            ({units.find(u => u.value === maxValue)?.departmentLabel})</strong> - {maxValue.toFixed(1)}
          </p>
          <p>
            • Требует внимания: <strong>{units.find(u => u.value === minValue)?.cityLabel} 
            ({units.find(u => u.value === minValue)?.departmentLabel})</strong> - {minValue.toFixed(1)}
          </p>
          <p>
            • Разрыв между лучшим и худшим: <strong>{((maxValue - minValue) / minValue * 100).toFixed(1)}%</strong>
          </p>
          {avgValue > 0 && (
            <p>
              • Юниты выше среднего: <strong>
                {units.filter(u => u.value > avgValue).length} из {units.length}
              </strong>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
