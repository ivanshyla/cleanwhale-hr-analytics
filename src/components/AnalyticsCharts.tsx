'use client';

import { 
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  ScatterChart, Scatter, PieChart, Pie, Cell, ComposedChart, Area, AreaChart
} from 'recharts';

interface ChartData {
  date: string;
  city: string;
  найм: number;
  заказы: number;
  жалобы: number;
  коммуникации: number;
  рейтинг: number;
  удовлетворенность: number;
}

interface AnalyticsChartsProps {
  data: ChartData[];
}

export default function AnalyticsCharts({ data }: AnalyticsChartsProps) {
  if (!data || data.length === 0) return null;

  return (
    <div className="space-y-8" suppressHydrationWarning>
      {/* Основные показатели */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Динамика основных показателей</h2>
        <div style={{ width: '100%', height: 400 }}>
          <ResponsiveContainer>
            <ComposedChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="найм" fill="#8884d8" name="Новые наймы" />
              <Line type="monotone" dataKey="заказы" stroke="#82ca9d" name="Заказы" strokeWidth={3} />
              <Line type="monotone" dataKey="жалобы" stroke="#ff7300" name="Жалобы" strokeWidth={2} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Корреляционный анализ */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">HR vs Операционные показатели</h2>
        <div style={{ width: '100%', height: 400 }}>
          <ResponsiveContainer>
            <ScatterChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="коммуникации" name="Коммуникации" />
              <YAxis dataKey="заказы" name="Заказы" />
              <Tooltip cursor={{ strokeDasharray: '3 3' }} />
              <Scatter dataKey="заказы" fill="#8884d8" />
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Удовлетворенность */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Динамика удовлетворенности</h2>
        <div style={{ width: '100%', height: 300 }}>
          <ResponsiveContainer>
            <AreaChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis domain={[1, 10]} />
              <Tooltip />
              <Legend />
              <Area type="monotone" dataKey="удовлетворенность" stackId="1" stroke="#8884d8" fill="#8884d8" name="Сотрудники" />
              <Area type="monotone" dataKey="рейтинг" stackId="2" stroke="#82ca9d" fill="#82ca9d" name="Клиенты" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
