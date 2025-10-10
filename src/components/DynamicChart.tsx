/**
 * Динамически загружаемые графики для оптимизации бандла
 * Используй вместо прямого импорта recharts
 */

'use client';

import dynamic from 'next/dynamic';
import { ComponentType } from 'react';

// ✅ Динамический импорт recharts с отключенным SSR
// Это уменьшает размер начального бандла и ускоряет загрузку

export const DynamicLineChart = dynamic(
  () => import('recharts').then((mod) => mod.LineChart as any),
  { ssr: false, loading: () => <div className="h-64 animate-pulse bg-gray-100 rounded" /> }
) as ComponentType<any>;

export const DynamicBarChart = dynamic(
  () => import('recharts').then((mod) => mod.BarChart as any),
  { ssr: false, loading: () => <div className="h-64 animate-pulse bg-gray-100 rounded" /> }
) as ComponentType<any>;

export const DynamicAreaChart = dynamic(
  () => import('recharts').then((mod) => mod.AreaChart as any),
  { ssr: false, loading: () => <div className="h-64 animate-pulse bg-gray-100 rounded" /> }
) as ComponentType<any>;

export const DynamicPieChart = dynamic(
  () => import('recharts').then((mod) => mod.PieChart as any),
  { ssr: false, loading: () => <div className="h-64 animate-pulse bg-gray-100 rounded" /> }
) as ComponentType<any>;

export const DynamicRadarChart = dynamic(
  () => import('recharts').then((mod) => mod.RadarChart as any),
  { ssr: false, loading: () => <div className="h-64 animate-pulse bg-gray-100 rounded" /> }
) as ComponentType<any>;

export const DynamicComposedChart = dynamic(
  () => import('recharts').then((mod) => mod.ComposedChart as any),
  { ssr: false, loading: () => <div className="h-64 animate-pulse bg-gray-100 rounded" /> }
) as ComponentType<any>;

export const DynamicScatterChart = dynamic(
  () => import('recharts').then((mod) => mod.ScatterChart as any),
  { ssr: false, loading: () => <div className="h-64 animate-pulse bg-gray-100 rounded" /> }
) as ComponentType<any>;

// Компоненты recharts
export const Line = dynamic(
  () => import('recharts').then((mod) => mod.Line as any),
  { ssr: false }
) as ComponentType<any>;

export const Bar = dynamic(
  () => import('recharts').then((mod) => mod.Bar as any),
  { ssr: false }
) as ComponentType<any>;

export const Area = dynamic(
  () => import('recharts').then((mod) => mod.Area as any),
  { ssr: false }
) as ComponentType<any>;

export const Pie = dynamic(
  () => import('recharts').then((mod) => mod.Pie as any),
  { ssr: false }
) as ComponentType<any>;

export const Radar = dynamic(
  () => import('recharts').then((mod) => mod.Radar as any),
  { ssr: false }
) as ComponentType<any>;

export const XAxis = dynamic(
  () => import('recharts').then((mod) => mod.XAxis as any),
  { ssr: false }
) as ComponentType<any>;

export const YAxis = dynamic(
  () => import('recharts').then((mod) => mod.YAxis as any),
  { ssr: false }
) as ComponentType<any>;

export const CartesianGrid = dynamic(
  () => import('recharts').then((mod) => mod.CartesianGrid as any),
  { ssr: false }
) as ComponentType<any>;

export const Tooltip = dynamic(
  () => import('recharts').then((mod) => mod.Tooltip as any),
  { ssr: false }
) as ComponentType<any>;

export const Legend = dynamic(
  () => import('recharts').then((mod) => mod.Legend as any),
  { ssr: false }
) as ComponentType<any>;

export const ResponsiveContainer = dynamic(
  () => import('recharts').then((mod) => mod.ResponsiveContainer as any),
  { ssr: false }
) as ComponentType<any>;

export const Cell = dynamic(
  () => import('recharts').then((mod) => mod.Cell as any),
  { ssr: false }
) as ComponentType<any>;

export const PolarGrid = dynamic(
  () => import('recharts').then((mod) => mod.PolarGrid as any),
  { ssr: false }
) as ComponentType<any>;

export const PolarAngleAxis = dynamic(
  () => import('recharts').then((mod) => mod.PolarAngleAxis as any),
  { ssr: false }
) as ComponentType<any>;

export const PolarRadiusAxis = dynamic(
  () => import('recharts').then((mod) => mod.PolarRadiusAxis as any),
  { ssr: false }
) as ComponentType<any>;

export const Scatter = dynamic(
  () => import('recharts').then((mod) => mod.Scatter as any),
  { ssr: false }
) as ComponentType<any>;

/**
 * Использование:
 * 
 * import { DynamicLineChart, Line, XAxis, YAxis, Tooltip } from '@/components/DynamicChart';
 * 
 * <DynamicLineChart data={data}>
 *   <XAxis dataKey="name" />
 *   <YAxis />
 *   <Tooltip />
 *   <Line dataKey="value" />
 * </DynamicLineChart>
 */

