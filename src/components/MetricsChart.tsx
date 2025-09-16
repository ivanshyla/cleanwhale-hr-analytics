'use client';

import { 
  LineChart, 
  Line, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';

interface MetricsData {
  reportDate: string;
  hiredPeople?: number;
  interviews?: number;
  applications?: number;
  ordersProcessed?: number;
  customerCalls?: number;
  trengoMessages?: number;
  trengoTicketsResolved?: number;
  crmTicketsResolved?: number;
  overtimeHours?: number;
  teamMeetings?: number;
  trainingHours?: number;
  user?: {
    name: string;
    role: string;
    city: string;
  };
}

interface MetricsChartProps {
  data: MetricsData[];
  chartType: 'line' | 'bar' | 'pie';
  metric: string;
  title: string;
  color?: string;
  height?: number;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

export default function MetricsChart({ 
  data, 
  chartType, 
  metric, 
  title, 
  color = '#8884d8',
  height = 300 
}: MetricsChartProps) {
  
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU', { 
      day: '2-digit', 
      month: '2-digit' 
    });
  };

  const getMetricLabel = (metric: string): string => {
    const labels: Record<string, string> = {
      hiredPeople: 'Нанято человек',
      interviews: 'Интервью',
      applications: 'Заявки',
      ordersProcessed: 'Заказы',
      customerCalls: 'Звонки',
      trengoMessages: 'Сообщения Trengo',
      trengoTicketsResolved: 'Решено тикетов Trengo',
      crmTicketsResolved: 'Решено тикетов CRM',
      overtimeHours: 'Переработки (ч)',
      teamMeetings: 'Встречи',
      trainingHours: 'Обучение (ч)',
    };
    return labels[metric] || metric;
  };

  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 bg-gray-50 rounded-lg">
        <p className="text-gray-500">Нет данных для отображения</p>
      </div>
    );
  }

  // Фильтруем и подготавливаем данные
  const chartData = data
    .filter(item => item[metric as keyof MetricsData] !== null && item[metric as keyof MetricsData] !== undefined)
    .map(item => ({
      date: formatDate(item.reportDate),
      fullDate: item.reportDate,
      value: item[metric as keyof MetricsData] as number,
      user: item.user?.name || '',
      city: item.user?.city || '',
    }))
    .sort((a, b) => new Date(a.fullDate).getTime() - new Date(b.fullDate).getTime());

  if (chartData.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 bg-gray-50 rounded-lg">
        <p className="text-gray-500">Нет данных для метрики "{getMetricLabel(metric)}"</p>
      </div>
    );
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-medium">{`Дата: ${label}`}</p>
          <p className="text-blue-600">{`${getMetricLabel(metric)}: ${payload[0].value}`}</p>
          {data.user && <p className="text-gray-600">{`Пользователь: ${data.user}`}</p>}
          {data.city && <p className="text-gray-600">{`Город: ${data.city}`}</p>}
        </div>
      );
    }
    return null;
  };

  const renderChart = () => {
    switch (chartType) {
      case 'line':
        return (
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="date" 
              tick={{ fontSize: 12 }}
              angle={-45}
              textAnchor="end"
              height={60}
            />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Line 
              type="monotone" 
              dataKey="value" 
              stroke={color} 
              strokeWidth={2}
              dot={{ fill: color, strokeWidth: 2, r: 4 }}
              name={getMetricLabel(metric)}
            />
          </LineChart>
        );

      case 'bar':
        return (
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="date" 
              tick={{ fontSize: 12 }}
              angle={-45}
              textAnchor="end"
              height={60}
            />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Bar 
              dataKey="value" 
              fill={color}
              name={getMetricLabel(metric)}
            />
          </BarChart>
        );

      case 'pie':
        // Для круговой диаграммы группируем данные по городам или пользователям
        const pieData = chartData.reduce((acc, item) => {
          const key = item.city || item.user || 'Неизвестно';
          const existing = acc.find(a => a.name === key);
          if (existing) {
            existing.value += item.value;
          } else {
            acc.push({ name: key, value: item.value });
          }
          return acc;
        }, [] as Array<{ name: string; value: number }>);

        return (
          <PieChart>
            <Pie
              data={pieData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              outerRadius={80}
              fill="#8884d8"
              dataKey="value"
            >
              {pieData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        );

      default:
        return null;
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h3 className="text-lg font-medium text-gray-900 mb-4">{title}</h3>
      <ResponsiveContainer width="100%" height={height}>
        {renderChart()}
      </ResponsiveContainer>
      
      {/* Статистика под графиком */}
      <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
        <div className="text-center">
          <p className="text-gray-600">Всего записей</p>
          <p className="font-semibold text-lg">{chartData.length}</p>
        </div>
        <div className="text-center">
          <p className="text-gray-600">Максимум</p>
          <p className="font-semibold text-lg">{Math.max(...chartData.map(d => d.value))}</p>
        </div>
        <div className="text-center">
          <p className="text-gray-600">Минимум</p>
          <p className="font-semibold text-lg">{Math.min(...chartData.map(d => d.value))}</p>
        </div>
        <div className="text-center">
          <p className="text-gray-600">Среднее</p>
          <p className="font-semibold text-lg">
            {(chartData.reduce((acc, d) => acc + d.value, 0) / chartData.length).toFixed(1)}
          </p>
        </div>
      </div>
    </div>
  );
}
