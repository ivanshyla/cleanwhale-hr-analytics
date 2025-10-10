-- ============================================
-- Скрипт проверки статуса отчетов
-- ============================================
-- 
-- Показывает кто из менеджеров заполнил отчет
-- за указанную неделю
--
-- Как использовать:
-- psql $DATABASE_URL -f check-reports-status.sql
--
-- ============================================

-- Установите даты для проверки (обычно прошлая неделя)
-- Формат: YYYY-MM-DD (понедельник и воскресенье)
\set week_start '''2024-01-08'''::timestamp
\set week_end '''2024-01-14'''::timestamp

-- Или используйте автоматический расчет прошлой недели:
-- \set week_start (SELECT (CURRENT_DATE - INTERVAL '7 days')::date - EXTRACT(DOW FROM (CURRENT_DATE - INTERVAL '7 days'))::integer + 1)
-- \set week_end (SELECT (CURRENT_DATE - INTERVAL '7 days')::date - EXTRACT(DOW FROM (CURRENT_DATE - INTERVAL '7 days'))::integer + 7)

\echo '================================'
\echo 'СТАТУС ОТЧЕТОВ'
\echo '================================'
\echo ''
\echo 'Неделя:' :week_start 'по' :week_end
\echo ''

-- 1. Общая статистика
SELECT 
  '================================' as message
UNION ALL
SELECT 'ОБЩАЯ СТАТИСТИКА'
UNION ALL
SELECT '================================';

WITH report_stats AS (
  SELECT 
    COUNT(DISTINCT u.id) as total_managers,
    COUNT(DISTINCT wr."userId") as submitted_reports,
    COUNT(DISTINCT u.id) - COUNT(DISTINCT wr."userId") as missing_reports
  FROM "User" u
  LEFT JOIN "WeeklyReport" wr ON u.id = wr."userId" 
    AND wr."weekStartDate" = :week_start
    AND wr."weekEndDate" = :week_end
  WHERE u.role IN ('HIRING_MANAGER', 'OPS_MANAGER', 'MIXED_MANAGER')
    AND u."isActive" = true
)
SELECT 
  'Всего менеджеров: ' || total_managers || ' чел.' as stat
FROM report_stats
UNION ALL
SELECT 
  'Отчитались: ' || submitted_reports || ' чел. (' || 
  ROUND(submitted_reports * 100.0 / NULLIF(total_managers, 0), 0) || '%)'
FROM report_stats
UNION ALL
SELECT 
  'Не отчитались: ' || missing_reports || ' чел. (' || 
  ROUND(missing_reports * 100.0 / NULLIF(total_managers, 0), 0) || '%)'
FROM report_stats;

-- 2. Кто ЗАПОЛНИЛ отчет
\echo ''
\echo '================================'
\echo 'КТО ЗАПОЛНИЛ ОТЧЕТ ✓'
\echo '================================'

SELECT 
  u.name as "Менеджер",
  u.role as "Роль",
  u.city as "Город",
  TO_CHAR(wr."createdAt", 'DD.MM.YYYY HH24:MI') as "Дата отправки"
FROM "User" u
INNER JOIN "WeeklyReport" wr ON u.id = wr."userId"
WHERE wr."weekStartDate" = :week_start
  AND wr."weekEndDate" = :week_end
  AND u."isActive" = true
ORDER BY 
  u.city,
  u.name;

-- 3. Кто НЕ ЗАПОЛНИЛ отчет
\echo ''
\echo '================================'
\echo 'КТО НЕ ЗАПОЛНИЛ ОТЧЕТ ✗'
\echo '================================'

SELECT 
  u.name as "Менеджер",
  u.role as "Роль",
  u.city as "Город",
  u.username as "Логин"
FROM "User" u
LEFT JOIN "WeeklyReport" wr ON u.id = wr."userId" 
  AND wr."weekStartDate" = :week_start
  AND wr."weekEndDate" = :week_end
WHERE u.role IN ('HIRING_MANAGER', 'OPS_MANAGER', 'MIXED_MANAGER')
  AND u."isActive" = true
  AND wr.id IS NULL
ORDER BY 
  u.city,
  u.name;

-- 4. Статистика по городам
\echo ''
\echo '================================'
\echo 'СТАТИСТИКА ПО ГОРОДАМ'
\echo '================================'

SELECT 
  u.city as "Город",
  COUNT(DISTINCT u.id) as "Всего менедж.",
  COUNT(DISTINCT wr."userId") as "Отчитались",
  COUNT(DISTINCT u.id) - COUNT(DISTINCT wr."userId") as "Не отчитались",
  ROUND(
    COUNT(DISTINCT wr."userId") * 100.0 / 
    NULLIF(COUNT(DISTINCT u.id), 0), 
    0
  ) || '%' as "% выполнения"
FROM "User" u
LEFT JOIN "WeeklyReport" wr ON u.id = wr."userId" 
  AND wr."weekStartDate" = :week_start
  AND wr."weekEndDate" = :week_end
WHERE u.role IN ('HIRING_MANAGER', 'OPS_MANAGER', 'MIXED_MANAGER')
  AND u."isActive" = true
GROUP BY u.city
ORDER BY 
  ROUND(
    COUNT(DISTINCT wr."userId") * 100.0 / 
    NULLIF(COUNT(DISTINCT u.id), 0), 
    0
  ) DESC,
  u.city;

-- 5. Статистика по ролям
\echo ''
\echo '================================'
\echo 'СТАТИСТИКА ПО РОЛЯМ'
\echo '================================'

SELECT 
  CASE u.role
    WHEN 'HIRING_MANAGER' THEN 'HR Менеджер'
    WHEN 'OPS_MANAGER' THEN 'Ops Менеджер'
    WHEN 'MIXED_MANAGER' THEN 'Mixed Менеджер'
  END as "Роль",
  COUNT(DISTINCT u.id) as "Всего",
  COUNT(DISTINCT wr."userId") as "Отчитались",
  ROUND(
    COUNT(DISTINCT wr."userId") * 100.0 / 
    NULLIF(COUNT(DISTINCT u.id), 0), 
    0
  ) || '%' as "% выполнения"
FROM "User" u
LEFT JOIN "WeeklyReport" wr ON u.id = wr."userId" 
  AND wr."weekStartDate" = :week_start
  AND wr."weekEndDate" = :week_end
WHERE u.role IN ('HIRING_MANAGER', 'OPS_MANAGER', 'MIXED_MANAGER')
  AND u."isActive" = true
GROUP BY u.role
ORDER BY 
  CASE u.role
    WHEN 'HIRING_MANAGER' THEN 1
    WHEN 'OPS_MANAGER' THEN 2
    WHEN 'MIXED_MANAGER' THEN 3
  END;

-- 6. Проверка данных Country Manager
\echo ''
\echo '================================'
\echo 'ДАННЫЕ COUNTRY MANAGER'
\echo '================================'

WITH cm_data AS (
  SELECT 
    COUNT(DISTINCT ca.id) as cities_filled,
    COUNT(DISTINCT cui.id) as managers_filled
  FROM "country_aggregates" ca
  FULL OUTER JOIN "country_user_inputs" cui 
    ON ca."weekIso" = cui."weekIso"
  WHERE ca."weekIso" = (
    SELECT CONCAT(EXTRACT(YEAR FROM :week_start), '-W', 
                  LPAD(EXTRACT(WEEK FROM :week_start)::text, 2, '0'))
  )
     OR cui."weekIso" = (
    SELECT CONCAT(EXTRACT(YEAR FROM :week_start), '-W', 
                  LPAD(EXTRACT(WEEK FROM :week_start)::text, 2, '0'))
  )
)
SELECT 
  CASE 
    WHEN cities_filled > 0 
    THEN '✓ Данные по городам заполнены (' || cities_filled || ' записей)'
    ELSE '✗ Данные по городам НЕ заполнены'
  END as "Статус (города)"
FROM cm_data
UNION ALL
SELECT 
  CASE 
    WHEN managers_filled > 0 
    THEN '✓ Данные по менеджерам заполнены (' || managers_filled || ' записей)'
    ELSE '- Данные по менеджерам не заполнены (опционально)'
  END
FROM cm_data;

\echo ''
\echo '================================'
\echo 'ПРОВЕРКА ЗАВЕРШЕНА'
\echo '================================'

-- ============================================
-- Скрипт завершен
-- ============================================


