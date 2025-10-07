-- Индексы для оптимизации производительности
-- Запустить через Supabase SQL Editor или psql

-- 1. WeeklyReports - наиболее частые запросы
CREATE INDEX IF NOT EXISTS idx_weekly_reports_weekiso 
  ON weekly_reports(week_iso);

CREATE INDEX IF NOT EXISTS idx_weekly_reports_userid 
  ON weekly_reports(user_id);

CREATE INDEX IF NOT EXISTS idx_weekly_reports_weekiso_userid 
  ON weekly_reports(week_iso, user_id);

-- 2. HR и Ops Metrics - связь с reports
CREATE INDEX IF NOT EXISTS idx_hr_metrics_reportid 
  ON hr_metrics(report_id);

CREATE INDEX IF NOT EXISTS idx_ops_metrics_reportid 
  ON ops_metrics(report_id);

-- 3. Country Aggregates - фильтр по неделям
CREATE INDEX IF NOT EXISTS idx_country_aggregates_weekiso 
  ON country_aggregates(week_iso);

CREATE INDEX IF NOT EXISTS idx_country_aggregates_citycode 
  ON country_aggregates(city_code);

-- 4. Country User Inputs - фильтр по неделям
CREATE INDEX IF NOT EXISTS idx_country_user_inputs_weekiso 
  ON country_user_inputs(week_iso);

CREATE INDEX IF NOT EXISTS idx_country_user_inputs_userid 
  ON country_user_inputs(user_id);

-- 5. Users - фильтры по ролям и городам
CREATE INDEX IF NOT EXISTS idx_users_role 
  ON users(role);

CREATE INDEX IF NOT EXISTS idx_users_city 
  ON users(city);

CREATE INDEX IF NOT EXISTS idx_users_active 
  ON users(active);

-- 6. Cities - lookup по коду
CREATE INDEX IF NOT EXISTS idx_cities_code 
  ON cities(code);

-- Анализ таблиц после создания индексов
ANALYZE weekly_reports;
ANALYZE hr_metrics;
ANALYZE ops_metrics;
ANALYZE country_aggregates;
ANALYZE country_user_inputs;
ANALYZE users;
ANALYZE cities;

-- Проверить, что индексы созданы
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;

