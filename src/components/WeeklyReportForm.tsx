'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Save, AlertCircle, CheckCircle } from 'lucide-react';
import { formatWeekForDisplay } from '@/lib/week';

interface WeeklyReportFormProps {
  role: 'hr' | 'ops' | 'mixed';
  userId: string;
  weekIso: string;
  onSave?: (data: any) => void;
}

interface HRData {
  interviews: number;
  jobPosts: number;
  registered: number;
  fullDays: number;
  difficult: string;
  stress?: number;
  overtime?: boolean;
}

interface OpsData {
  messages: number;
  tickets: number;
  orders: number;
  diffCleaners: string;
  diffClients: string;
  stress?: number;
  overtime?: boolean;
}

interface BaseData {
  workdays: number;
  stressLevel: number;
  overtime: boolean;
  overtimeHours: number;
  teamComment: string;
  notes: string;
}

export default function WeeklyReportForm({ role, userId, weekIso, onSave }: WeeklyReportFormProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [isReportLocked, setIsReportLocked] = useState(false);

  // Состояние формы
  const [baseData, setBaseData] = useState<BaseData>({
    workdays: 5,
    stressLevel: 5,
    overtime: false,
    overtimeHours: 0,
    teamComment: '',
    notes: ''
  });

  const [hrData, setHrData] = useState<HRData>({
    interviews: 0,
    jobPosts: 0,
    registered: 0,
    fullDays: 0,
    difficult: ''
  });

  const [opsData, setOpsData] = useState<OpsData>({
    messages: 0,
    tickets: 0,
    orders: 0,
    diffCleaners: '',
    diffClients: ''
  });

  // Загрузка существующих данных
  useEffect(() => {
    loadExistingData();
  }, [weekIso, role]);

  const loadExistingData = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/weekly-reports?week=${weekIso}`);
      
      if (response.ok) {
        const data = await response.json();
        
        // Проверяем, заблокирован ли отчет
        if (data.baseReport?.isCompleted) {
          setIsReportLocked(true);
        }
        
        // Загружаем базовые данные
        if (data.baseReport) {
          setBaseData({
            workdays: data.baseReport.workdays || 5,
            stressLevel: data.baseReport.stressLevel || 5,
            overtime: data.baseReport.overtime || false,
            overtimeHours: data.baseReport.overtimeHours || 0,
            teamComment: data.baseReport.teamComment || '',
            notes: data.baseReport.notes || ''
          });
        }

        // Загружаем HR данные если есть доступ
        if (data.hrData && (role === 'hr' || role === 'mixed')) {
          setHrData({
            interviews: data.hrData.interviews || 0,
            jobPosts: data.hrData.jobPosts || 0,
            registered: data.hrData.registered || 0,
            fullDays: data.hrData.fullDays || 0,
            difficult: data.hrData.difficult || ''
          });
        }

        // Загружаем Ops данные если есть доступ
        if (data.opsData && (role === 'ops' || role === 'mixed')) {
          setOpsData({
            messages: data.opsData.messages || 0,
            tickets: data.opsData.tickets || 0,
            orders: data.opsData.orders || 0,
            diffCleaners: data.opsData.diffCleaners || '',
            diffClients: data.opsData.diffClients || ''
          });
        }
      }
    } catch (error) {
      console.error('Error loading report data:', error);
    } finally {
      setIsLoading(false);
    }
  };

const handleSave = async (submitRole: 'hr' | 'ops' | 'mixed') => {
    try {
      setSaving(true);
      setSaveStatus('saving');

      // Формируем данные в правильном формате для API
      const requestBody: any = {
        weekIso,
        role: submitRole,
        base: baseData, // Добавляем базовые данные (workdays, stress, overtime, notes)
      };

      // Добавляем HR или Ops данные в соответствии с ролью
      if (submitRole === 'hr' || submitRole === 'mixed') {
        requestBody.hr = hrData;
      } else if (submitRole === 'ops') {
        requestBody.ops = opsData;
      }

      const response = await fetch('/api/weekly-reports', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      if (response.ok) {
        setSaveStatus('success');
        // Успешное сообщение остается постоянно
        if (onSave) {
          onSave({ 
            role: submitRole, 
            data: submitRole === 'hr' ? hrData : opsData 
          });
        }
        
        // Перенаправляем на дашборд через 1.5 секунды
        setTimeout(() => {
          router.push('/dashboard');
        }, 1500);
      } else {
        setSaveStatus('error');
        // Ошибка также остается видимой
      }
    } catch (error) {
      console.error('Error saving report:', error);
      setSaveStatus('error');
      // Ошибка остается видимой
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Загрузка формы...</span>
      </div>
    );
  }

  // Если отчет уже сохранен - показываем только информационную плашку
  if (isReportLocked) {
    return (
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Заголовок */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-2">
            Еженедельный отчет
          </h2>
          <p className="text-gray-600">
            {formatWeekForDisplay(weekIso)}
          </p>
        </div>

        {/* Плашка о сохраненном отчете */}
        <div className="bg-green-50 border border-green-200 rounded-lg p-8 flex flex-col items-center justify-center text-center">
          <CheckCircle className="h-16 w-16 text-green-600 mb-4" />
          <h3 className="text-2xl font-bold text-green-900 mb-2">
            Вы уже сохранили отчет
          </h3>
          <p className="text-green-700 mb-6 max-w-md">
            Отчет за {formatWeekForDisplay(weekIso)} успешно сохранен и заблокирован. 
            Вы сможете заполнить новый отчет в понедельник.
          </p>
          <button
            onClick={() => router.push('/dashboard')}
            className="bg-green-600 text-white px-6 py-3 rounded-md hover:bg-green-700 transition-colors font-medium"
          >
            Вернуться на главную
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Заголовок */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-2">
          Еженедельный отчет
        </h2>
        <p className="text-gray-600">
          {formatWeekForDisplay(weekIso)}
        </p>
        
        {saveStatus === 'success' && (
          <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-md flex items-center">
            <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
            <span className="text-green-800">Отчет успешно сохранен! Возвращаемся на дашборд...</span>
          </div>
        )}
        
        {saveStatus === 'error' && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md flex items-center">
            <AlertCircle className="h-5 w-5 text-red-600 mr-2" />
            <span className="text-red-800">Ошибка сохранения отчета</span>
          </div>
        )}
      </div>

      {/* Базовые поля */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Общая информация</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Отработанные дни (максимум 7)
            </label>
            <input
              type="number"
              min="0"
              max="7"
              step="0.5"
              value={baseData.workdays}
              onChange={(e) => {
                const value = parseFloat(e.target.value) || 0;
                // Ограничиваем значение от 0 до 7
                const clampedValue = Math.min(Math.max(value, 0), 7);
                setBaseData(prev => ({ ...prev, workdays: clampedValue }));
              }}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
              disabled={isReportLocked}
            />
            <p className="text-xs text-gray-500 mt-1">В неделе максимум 7 дней</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Уровень стресса (1-10)
            </label>
            <input
              type="range"
              min="1"
              max="10"
              value={baseData.stressLevel}
              onChange={(e) => setBaseData(prev => ({ ...prev, stressLevel: parseInt(e.target.value) }))}
              className="w-full disabled:opacity-50 disabled:cursor-not-allowed"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>Низкий (1)</span>
              <span className="font-medium">{baseData.stressLevel}</span>
              <span>Высокий (10)</span>
            </div>
          </div>

          <div className="md:col-span-2">
            <div className="flex items-center">
              <input
                type="checkbox"
                id="overtime"
                checked={baseData.overtime}
                onChange={(e) => setBaseData(prev => ({ ...prev, overtime: e.target.checked }))}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed"
              />
              <label htmlFor="overtime" className="ml-2 text-sm font-medium text-gray-700">
                Были переработки
              </label>
            </div>
            
            {baseData.overtime && (
              <div className="mt-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Часы переработок
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  value={baseData.overtimeHours}
                  onChange={(e) => setBaseData(prev => ({ ...prev, overtimeHours: parseFloat(e.target.value) || 0 }))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                />
              </div>
            )}
          </div>
        </div>


        <div className="mt-6">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Дополнительные заметки
          </label>
          <textarea
            value={baseData.notes}
            onChange={(e) => setBaseData(prev => ({ ...prev, notes: e.target.value }))}
            rows={3}
            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
            placeholder="Любые дополнительные комментарии..."
          />
        </div>
      </div>

      {/* HR секция */}
      {(role === 'hr' || role === 'mixed') && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">HR Метрики</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Количество собеседований
              </label>
              <input
                type="number"
                min="0"
                value={hrData.interviews}
                onChange={(e) => setHrData(prev => ({ ...prev, interviews: parseInt(e.target.value) || 0 }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Количество объявлений
              </label>
              <input
                type="number"
                min="0"
                value={hrData.jobPosts}
                onChange={(e) => setHrData(prev => ({ ...prev, jobPosts: parseInt(e.target.value) || 0 }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Количество регистраций
              </label>
              <input
                type="number"
                min="0"
                value={hrData.registered}
                onChange={(e) => setHrData(prev => ({ ...prev, registered: parseInt(e.target.value) || 0 }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
              />
            </div>

            {/* Убрали дублирование "Отработанные дни" — используем общее поле из базового блока */}
          </div>

          <div className="mt-6">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Сложные ситуации в HR
            </label>
            <textarea
              value={hrData.difficult}
              onChange={(e) => setHrData(prev => ({ ...prev, difficult: e.target.value }))}
              rows={4}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
              placeholder="Опишите сложные случаи в найме, проблемы с кандидатами..."
            />
          </div>

          {role !== 'mixed' && (
            <div className="mt-6">
              <button
                onClick={() => handleSave('hr')}
                disabled={isSaving}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                <Save className="h-4 w-4 mr-2" />
                {isSaving ? 'Сохранение...' : 'Сохранить HR отчет'}
              </button>
            </div>
          )}
        </div>
      )}


      {/* Ops секция */}
      {(role === 'ops' || role === 'mixed') && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Ops Метрики</h3>

          <div className="mt-6">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Сложности с клинерами
            </label>
            <textarea
              value={opsData.diffCleaners}
              onChange={(e) => setOpsData(prev => ({ ...prev, diffCleaners: e.target.value }))}
              rows={3}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
              placeholder="Опишите проблемы с клинерами..."
            />
          </div>

          <div className="mt-6">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Сложности с клиентами
            </label>
            <textarea
              value={opsData.diffClients}
              onChange={(e) => setOpsData(prev => ({ ...prev, diffClients: e.target.value }))}
              rows={3}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
              placeholder="Опишите проблемы с клиентами..."
            />
          </div>

          {role !== 'mixed' && (
            <div className="mt-6">
              <button
                onClick={() => handleSave('ops')}
                disabled={isSaving}
                className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                <Save className="h-4 w-4 mr-2" />
                {isSaving ? 'Сохранение...' : 'Сохранить Ops отчет'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Кнопка для mixed роли: одна кнопка сохраняет оба блока */}
      {role === 'mixed' && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Сохранить отчеты</h3>
          <button
            onClick={() => handleSave('mixed')}
            disabled={isSaving}
            className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
          >
            <Save className="h-4 w-4 mr-2" />
            {isSaving ? 'Сохранение...' : 'Сохранить HR + Ops'}
          </button>
        </div>
      )}
    </div>
  );
}