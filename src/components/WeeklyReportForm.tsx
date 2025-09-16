'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { 
  WeeklyReportFormData, 
  HrMetricsFormData, 
  OpsMetricsFormData,
  getWeekISO,
  ROLE_LABELS 
} from '@/types';
import { Calendar, Clock, Users, AlertTriangle, FileText } from 'lucide-react';

// Схемы валидации
const weeklyReportSchema = z.object({
  weekIso: z.string().min(1, 'Выберите неделю'),
  workdays: z.number().min(0).max(7, 'Максимум 7 дней'),
  stressLevel: z.number().min(0).max(10, 'Уровень стресса от 0 до 10'),
  overtime: z.boolean(),
  overtimeHours: z.number().optional(),
  goodWorkWith: z.string().optional(),
  badWorkWith: z.string().optional(),
  teamComment: z.string().optional(),
  notes: z.string().optional(),
});

const hrMetricsSchema = z.object({
  interviews: z.number().min(0, 'Не может быть отрицательным'),
  jobPosts: z.number().min(0, 'Не может быть отрицательным'),
  registrations: z.number().min(0, 'Не может быть отрицательным'),
  difficultCases: z.string().optional(),
});

const opsMetricsSchema = z.object({
  trengoMessages: z.number().min(0, 'Не может быть отрицательным'),
  trengoTicketsResolved: z.number().min(0, 'Не может быть отрицательным'),
  crmTicketsResolved: z.number().min(0, 'Не может быть отрицательным'),
  crmOrdersCity: z.number().min(0, 'Не может быть отрицательным'),
  difficultCleanerCases: z.string().optional(),
  difficultClientCases: z.string().optional(),
});

interface WeeklyReportFormProps {
  userRole: string;
  onSubmit: (data: any) => Promise<void>;
  initialData?: any;
  isLoading?: boolean;
}

export default function WeeklyReportForm({ 
  userRole, 
  onSubmit, 
  initialData,
  isLoading = false 
}: WeeklyReportFormProps) {
  const [activeTab, setActiveTab] = useState<'general' | 'hr' | 'ops'>('general');

  const showHrTab = userRole === 'HR' || userRole === 'MIXED';
  const showOpsTab = userRole === 'OPERATIONS' || userRole === 'MIXED';

  // Основная форма
  const mainForm = useForm<WeeklyReportFormData>({
    resolver: zodResolver(weeklyReportSchema),
    defaultValues: {
      weekIso: initialData?.weekIso || getWeekISO(new Date()),
      workdays: initialData?.workdays || 5,
      stressLevel: initialData?.stressLevel || 3,
      overtime: initialData?.overtime || false,
      overtimeHours: initialData?.overtimeHours || 0,
      goodWorkWith: initialData?.goodWorkWith || '',
      badWorkWith: initialData?.badWorkWith || '',
      teamComment: initialData?.teamComment || '',
      notes: initialData?.notes || '',
    },
  });

  // HR форма
  const hrForm = useForm<HrMetricsFormData>({
    resolver: zodResolver(hrMetricsSchema),
    defaultValues: {
      interviews: initialData?.hrMetrics?.interviews || 0,
      jobPosts: initialData?.hrMetrics?.jobPosts || 0,
      registrations: initialData?.hrMetrics?.registrations || 0,
      difficultCases: initialData?.hrMetrics?.difficultCases || '',
    },
  });

  // Операционная форма
  const opsForm = useForm<OpsMetricsFormData>({
    resolver: zodResolver(opsMetricsSchema),
    defaultValues: {
      trengoMessages: initialData?.opsMetrics?.trengoMessages || 0,
      trengoTicketsResolved: initialData?.opsMetrics?.trengoTicketsResolved || 0,
      crmTicketsResolved: initialData?.opsMetrics?.crmTicketsResolved || 0,
      crmOrdersCity: initialData?.opsMetrics?.crmOrdersCity || 0,
      difficultCleanerCases: initialData?.opsMetrics?.difficultCleanerCases || '',
      difficultClientCases: initialData?.opsMetrics?.difficultClientCases || '',
    },
  });

  const handleSubmit = async () => {
    try {
      const mainData = mainForm.getValues();
      const hrData = showHrTab ? hrForm.getValues() : undefined;
      const opsData = showOpsTab ? opsForm.getValues() : undefined;

      // Валидируем все формы
      await mainForm.trigger();
      if (showHrTab) await hrForm.trigger();
      if (showOpsTab) await opsForm.trigger();

      const hasMainErrors = Object.keys(mainForm.formState.errors).length > 0;
      const hasHrErrors = showHrTab && Object.keys(hrForm.formState.errors).length > 0;
      const hasOpsErrors = showOpsTab && Object.keys(opsForm.formState.errors).length > 0;

      if (hasMainErrors || hasHrErrors || hasOpsErrors) {
        return;
      }

      await onSubmit({
        ...mainData,
        hrMetrics: hrData,
        opsMetrics: opsData,
      });
    } catch (error) {
      console.error('Form submission error:', error);
    }
  };

  const tabs = [
    { key: 'general', label: 'Общее', icon: Calendar },
    ...(showHrTab ? [{ key: 'hr' as const, label: 'Найм', icon: Users }] : []),
    ...(showOpsTab ? [{ key: 'ops' as const, label: 'Операции', icon: FileText }] : []),
  ];

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              Еженедельный отчет
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Роль: {ROLE_LABELS[userRole as keyof typeof ROLE_LABELS]}
            </p>
          </div>
        </div>

        {/* Табы */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="-mb-px flex space-x-8">
            {tabs.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                  activeTab === key
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{label}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* Содержимое табов */}
        {activeTab === 'general' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Неделя (ISO формат)
                </label>
                <input
                  type="text"
                  {...mainForm.register('weekIso')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="2024-W15"
                />
                {mainForm.formState.errors.weekIso && (
                  <p className="mt-1 text-sm text-red-600">
                    {mainForm.formState.errors.weekIso.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Отработанные дни (0-7)
                </label>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  max="7"
                  {...mainForm.register('workdays', { valueAsNumber: true })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {mainForm.formState.errors.workdays && (
                  <p className="mt-1 text-sm text-red-600">
                    {mainForm.formState.errors.workdays.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Уровень стресса (0-10)
                </label>
                <input
                  type="range"
                  min="0"
                  max="10"
                  {...mainForm.register('stressLevel', { valueAsNumber: true })}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>0 - Спокойно</span>
                  <span className="font-medium">
                    {mainForm.watch('stressLevel')}
                  </span>
                  <span>10 - Критично</span>
                </div>
              </div>

              <div>
                <div className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    {...mainForm.register('overtime')}
                    className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                  />
                  <label className="text-sm font-medium text-gray-700">
                    Были переработки
                  </label>
                </div>
                {mainForm.watch('overtime') && (
                  <div className="mt-2">
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      {...mainForm.register('overtimeHours', { valueAsNumber: true })}
                      placeholder="Часы переработки"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  С кем хорошо работалось
                </label>
                <textarea
                  {...mainForm.register('goodWorkWith')}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Опишите положительный опыт работы с коллегами..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  С кем были сложности
                </label>
                <textarea
                  {...mainForm.register('badWorkWith')}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Опишите сложности в работе с коллегами..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Комментарий по командной работе
                </label>
                <textarea
                  {...mainForm.register('teamComment')}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Общий комментарий по работе в команде..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Дополнительные заметки
                </label>
                <textarea
                  {...mainForm.register('notes')}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Любые дополнительные заметки и комментарии..."
                />
              </div>
            </div>
          </div>
        )}

        {activeTab === 'hr' && showHrTab && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Количество собеседований
                </label>
                <input
                  type="number"
                  min="0"
                  {...hrForm.register('interviews', { valueAsNumber: true })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {hrForm.formState.errors.interviews && (
                  <p className="mt-1 text-sm text-red-600">
                    {hrForm.formState.errors.interviews.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Количество объявлений
                </label>
                <input
                  type="number"
                  min="0"
                  {...hrForm.register('jobPosts', { valueAsNumber: true })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {hrForm.formState.errors.jobPosts && (
                  <p className="mt-1 text-sm text-red-600">
                    {hrForm.formState.errors.jobPosts.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Количество регистраций
                </label>
                <input
                  type="number"
                  min="0"
                  {...hrForm.register('registrations', { valueAsNumber: true })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {hrForm.formState.errors.registrations && (
                  <p className="mt-1 text-sm text-red-600">
                    {hrForm.formState.errors.registrations.message}
                  </p>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Сложные ситуации
              </label>
              <textarea
                {...hrForm.register('difficultCases')}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Опишите сложные ситуации, которые возникали при найме..."
              />
            </div>
          </div>
        )}

        {activeTab === 'ops' && showOpsTab && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Сообщения Trengo
                </label>
                <input
                  type="number"
                  min="0"
                  {...opsForm.register('trengoMessages', { valueAsNumber: true })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {opsForm.formState.errors.trengoMessages && (
                  <p className="mt-1 text-sm text-red-600">
                    {opsForm.formState.errors.trengoMessages.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Решенные тикеты Trengo
                </label>
                <input
                  type="number"
                  min="0"
                  {...opsForm.register('trengoTicketsResolved', { valueAsNumber: true })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {opsForm.formState.errors.trengoTicketsResolved && (
                  <p className="mt-1 text-sm text-red-600">
                    {opsForm.formState.errors.trengoTicketsResolved.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Решенные тикеты CRM
                </label>
                <input
                  type="number"
                  min="0"
                  {...opsForm.register('crmTicketsResolved', { valueAsNumber: true })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {opsForm.formState.errors.crmTicketsResolved && (
                  <p className="mt-1 text-sm text-red-600">
                    {opsForm.formState.errors.crmTicketsResolved.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Заказы города
                </label>
                <input
                  type="number"
                  min="0"
                  {...opsForm.register('crmOrdersCity', { valueAsNumber: true })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {opsForm.formState.errors.crmOrdersCity && (
                  <p className="mt-1 text-sm text-red-600">
                    {opsForm.formState.errors.crmOrdersCity.message}
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Сложные ситуации с клинерами
                </label>
                <textarea
                  {...opsForm.register('difficultCleanerCases')}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Опишите сложные ситуации с клинерами..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Сложные ситуации с клиентами
                </label>
                <textarea
                  {...opsForm.register('difficultClientCases')}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Опишите сложные ситуации с клиентами..."
                />
              </div>
            </div>
          </div>
        )}

        {/* Кнопки действий */}
        <div className="flex justify-end space-x-4 mt-8 pt-6 border-t border-gray-200">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isLoading}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Сохранение...' : 'Сохранить отчет'}
          </button>
        </div>
      </div>
    </div>
  );
}
