import ComprehensiveAnalyticsClient from './ComprehensiveAnalyticsClient';

// Отключаем пререндеринг полностью
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default function ComprehensiveAnalyticsPage() {
  return <ComprehensiveAnalyticsClient />;
}
