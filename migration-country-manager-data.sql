-- Создание таблицы для отчетов Country Manager
CREATE TABLE IF NOT EXISTS "country_manager_data" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "reportDate" TIMESTAMP(3) NOT NULL,
  "weekNumber" INTEGER NOT NULL,
  
  -- Основные метрики
  "totalWorkingDaysCountry" INTEGER NOT NULL DEFAULT 0,
  "totalEmployeesActive" INTEGER NOT NULL DEFAULT 0,
  "countryTotalOrders" INTEGER NOT NULL DEFAULT 0,
  "countryTotalHires" INTEGER NOT NULL DEFAULT 0,
  "countryAvgStress" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "countryOvertimeRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
  
  -- JSON данные по городам
  "cityWorkingDays" JSONB,
  "cityEmployeeCounts" JSONB,
  "citySpecialNotes" JSONB,
  
  -- Стратегические данные
  "marketingCampaigns" TEXT,
  "competitorAnalysis" TEXT,
  "strategicGoals" TEXT,
  "budgetSpent" DOUBLE PRECISION NOT NULL DEFAULT 0,
  
  -- Проблемы и решения
  "majorIssues" TEXT,
  "solutionsImplemented" TEXT,
  
  -- HR данные
  "trainingNeeds" TEXT,
  "resourceRequests" TEXT,
  
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  -- Уникальное ограничение
  CONSTRAINT "country_manager_data_userId_weekNumber_key" UNIQUE("userId", "weekNumber")
);

-- Создание индексов для быстрого поиска
CREATE INDEX IF NOT EXISTS "country_manager_data_weekNumber_idx" ON "country_manager_data"("weekNumber");
CREATE INDEX IF NOT EXISTS "country_manager_data_reportDate_idx" ON "country_manager_data"("reportDate");

-- Комментарий к таблице
COMMENT ON TABLE "country_manager_data" IS 'Еженедельные отчеты менеджера по стране с агрегированными данными по всем городам';

