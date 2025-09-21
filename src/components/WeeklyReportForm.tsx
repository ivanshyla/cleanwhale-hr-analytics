'use client';

import { useState, useEffect } from 'react';
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
  registrations: number;
  difficultCases: string;
}

interface OpsData {
  trengoMessages: number;
  trengoTicketsResolved: number;
  crmTicketsResolved: number;
  crmOrdersCity: number;
  difficultCleanerCases: string;
  difficultClientCases: string;
}

interface BaseData {
  workdays: number;
  stressLevel: number;
  overtime: boolean;
  overtimeHours: number;
  goodWorkWith: string;
  badWorkWith: string;
  teamComment: string;
  notes: string;
}

export default function WeeklyReportForm({ role, userId, weekIso, onSave }: WeeklyReportFormProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');

  // Состояние формы
  const [baseData, setBaseData] = useState<BaseData>({
    workdays: 5,
    stressLevel: 5,
    overtime: false,
    overtimeHours: 0,
    goodWorkWith: '',
    badWorkWith: '',
    teamComment: '',
    notes: ''
  });

  const [hrData, setHrData] = useState<HRData>({
    interviews: 0,
    jobPosts: 0,
    registrations: 0,
    difficultCases: ''
  });

  const [opsData, setOpsData] = useState<OpsData>({
    trengoMessages: 0,
    trengoTicketsResolved: 0,
    crmTicketsResolved: 0,
    crmOrdersCity: 0,
    difficultCleanerCases: '',
    difficultClientCases: ''
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
        
        // Загружаем базовые данные
        if (data.baseReport) {
          setBaseData({
            workdays: data.baseReport.workdays || 5,
            stressLevel: data.baseReport.stressLevel || 5,
            overtime: data.baseReport.overtime || false,
            overtimeHours: data.baseReport.overtimeHours || 0,
            goodWorkWith: data.baseReport.goodWorkWith || '',
            badWorkWith: data.baseReport.badWorkWith || '',
            teamComment: data.baseReport.teamComment || '',
            notes: data.baseReport.notes || ''
          });
        }

        // Загружаем HR данные если есть доступ
        if (data.hrData && (role === 'hr' || role === 'mixed')) {
          setHrData({
            interviews: data.hrData.interviews || 0,
            jobPosts: data.hrData.jobPosts || 0,
            registrations: data.hrData.registrations || 0,
            difficultCases: data.hrData.difficultCases || ''
          });
        }

        // Загружаем Ops данные если есть доступ
        if (data.opsData && (role === 'ops' || role === 'mixed')) {
          setOpsData({
            trengoMessages: data.opsData.trengoMessages || 0,
            trengoTicketsResolved: data.opsData.trengoTicketsResolved || 0,
            crmTicketsResolved: data.opsData.crmTicketsResolved || 0,
            crmOrdersCity: data.opsData.crmOrdersCity || 0,
            difficultCleanerCases: data.opsData.difficultCleanerCases || '',
            difficultClientCases: data.opsData.difficultClientCases || ''
          });
        }
      }
    } catch (error) {
      console.error('Error loading report data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async (submitRole: 'hr' | 'ops') => {
    try {
      setSaving(true);
      setSaveStatus('saving');

      const payload = {
        ...baseData,
        ...(submitRole === 'hr' ? hrData : opsData),
        isCompleted: true
      };

      const response = await fetch('/api/weekly-reports', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          weekIso,
          role: submitRole,
          payload
        })
      });

      if (response.ok) {
        setSaveStatus('success');
        setTimeout(() => setSaveStatus('idle'), 3000);
        if (onSave) {
          onSave({ role: submitRole, data: payload });
        }
      } else {
        setSaveStatus('error');
        setTimeout(() => setSaveStatus('idle'), 3000);
      }
    } catch (error) {
      console.error('Error saving report:', error);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
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
            <span className="text-green-800">Отчет успешно сохранен!</span>
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
              Отработанные дни
            </label>
            <input
              type="number"
              min="0"
              max="7"
              step="0.5"
              value={baseData.workdays}
              onChange={(e) => setBaseData(prev => ({ ...prev, workdays: parseFloat(e.target.value) || 0 }))}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
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
              className="w-full"
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
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
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
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              С кем хорошо работалось
            </label>
            <textarea
              value={baseData.goodWorkWith}
              onChange={(e) => setBaseData(prev => ({ ...prev, goodWorkWith: e.target.value }))}
              rows={3}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Укажите коллег и что было хорошо..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              С кем были проблемы
            </label>
            <textarea
              value={baseData.badWorkWith}
              onChange={(e) => setBaseData(prev => ({ ...prev, badWorkWith: e.target.value }))}
              rows={3}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Укажите проблемы в работе с командой..."
            />
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
            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Количество регистраций
              </label>
              <input
                type="number"
                min="0"
                value={hrData.registrations}
                onChange={(e) => setHrData(prev => ({ ...prev, registrations: parseInt(e.target.value) || 0 }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="mt-6">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Сложные ситуации в HR
            </label>
            <textarea
              value={hrData.difficultCases}
              onChange={(e) => setHrData(prev => ({ ...prev, difficultCases: e.target.value }))}
              rows={4}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Опишите сложные случаи в найме, проблемы с кандидатами..."
            />
          </div>

          {role !== 'mixed' && (
            <div className="mt-6">
              <button
                onClick={() => handleSave('hr')}
                disabled={isSaving}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center"
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
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Operations Метрики</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Сообщения в Trengo
              </label>
              <input
                type="number"
                min="0"
                value={opsData.trengoMessages}
                onChange={(e) => setOpsData(prev => ({ ...prev, trengoMessages: parseInt(e.target.value) || 0 }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Решенные тикеты Trengo
              </label>
              <input
                type="number"
                min="0"
                value={opsData.trengoTicketsResolved}
                onChange={(e) => setOpsData(prev => ({ ...prev, trengoTicketsResolved: parseInt(e.target.value) || 0 }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Решенные тикеты CRM
              </label>
              <input
                type="number"
                min="0"
                value={opsData.crmTicketsResolved}
                onChange={(e) => setOpsData(prev => ({ ...prev, crmTicketsResolved: parseInt(e.target.value) || 0 }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Заказы города в CRM
              </label>
              <input
                type="number"
                min="0"
                value={opsData.crmOrdersCity}
                onChange={(e) => setOpsData(prev => ({ ...prev, crmOrdersCity: parseInt(e.target.value) || 0 }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Сложные ситуации с клинерами
              </label>
              <textarea
                value={opsData.difficultCleanerCases}
                onChange={(e) => setOpsData(prev => ({ ...prev, difficultCleanerCases: e.target.value }))}
                rows={4}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Опишите проблемы с клинерами..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Сложные ситуации с клиентами
              </label>
              <textarea
                value={opsData.difficultClientCases}
                onChange={(e) => setOpsData(prev => ({ ...prev, difficultClientCases: e.target.value }))}
                rows={4}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Опишите проблемы с клиентами..."
              />
            </div>
          </div>

          {role !== 'mixed' && (
            <div className="mt-6">
              <button
                onClick={() => handleSave('ops')}
                disabled={isSaving}
                className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 disabled:opacity-50 flex items-center"
              >
                <Save className="h-4 w-4 mr-2" />
                {isSaving ? 'Сохранение...' : 'Сохранить Ops отчет'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Кнопки для mixed роли */}
      {role === 'mixed' && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Сохранить отчеты</h3>
          <div className="flex space-x-4">
            <button
              onClick={() => handleSave('hr')}
              disabled={isSaving}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center"
            >
              <Save className="h-4 w-4 mr-2" />
              {isSaving ? 'Сохранение...' : 'Сохранить HR отчет'}
            </button>
            
            <button
              onClick={() => handleSave('ops')}
              disabled={isSaving}
              className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 disabled:opacity-50 flex items-center"
            >
              <Save className="h-4 w-4 mr-2" />
              {isSaving ? 'Сохранение...' : 'Сохранить Ops отчет'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}