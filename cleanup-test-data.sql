-- ============================================
-- Скрипт очистки тестовых данных
-- ============================================
-- 
-- ВНИМАНИЕ: Этот скрипт удалит все отчеты и данные,
-- но сохранит пользователей!
-- 
-- Используйте перед запуском реальной работы,
-- если хотите начать с чистого листа.
--
-- Как использовать:
-- psql $DATABASE_URL -f cleanup-test-data.sql
--
-- ============================================

BEGIN;

-- 1. Показать сколько данных будет удалено
SELECT 
  'WeeklyReport' as table_name, 
  COUNT(*) as records_count,
  'Еженедельные отчеты менеджеров' as description
FROM "WeeklyReport"

UNION ALL

SELECT 
  'CountryAggregate' as table_name, 
  COUNT(*) as records_count,
  'Данные Country Manager по городам' as description
FROM "country_aggregates"

UNION ALL

SELECT 
  'CountryUserInput' as table_name, 
  COUNT(*) as records_count,
  'Данные Country Manager по менеджерам' as description
FROM "country_user_inputs"

UNION ALL

SELECT 
  'TeamMeeting' as table_name, 
  COUNT(*) as records_count,
  'Записи о встречах команды' as description
FROM "TeamMeeting"

UNION ALL

SELECT 
  'WeeklyQuestion' as table_name, 
  COUNT(*) as records_count,
  'Еженедельные вопросы' as description
FROM "WeeklyQuestion"

UNION ALL

SELECT 
  'WeeklyQuestionAnswer' as table_name, 
  COUNT(*) as records_count,
  'Ответы на еженедельные вопросы' as description
FROM "WeeklyQuestionAnswer";

-- Пауза для проверки (раскомментируйте если хотите подтвердить)
-- \echo 'Будет удалено указанное количество записей. Нажмите Enter для продолжения...'
-- \prompt 'Продолжить? (yes/no) ' confirm

-- 2. Удаление данных (сохраняя пользователей и структуру)

-- Удаляем ответы на еженедельные вопросы
DELETE FROM "WeeklyQuestionAnswer" WHERE id IS NOT NULL;
RAISE NOTICE '✓ Удалены ответы на еженедельные вопросы';

-- Удаляем еженедельные вопросы
DELETE FROM "WeeklyQuestion" WHERE id IS NOT NULL;
RAISE NOTICE '✓ Удалены еженедельные вопросы';

-- Удаляем встречи команды
DELETE FROM "TeamMeeting" WHERE id IS NOT NULL;
RAISE NOTICE '✓ Удалены встречи команды';

-- Удаляем данные Country Manager по менеджерам
DELETE FROM "country_user_inputs" WHERE id IS NOT NULL;
RAISE NOTICE '✓ Удалены данные Country Manager по менеджерам';

-- Удаляем данные Country Manager по городам
DELETE FROM "country_aggregates" WHERE id IS NOT NULL;
RAISE NOTICE '✓ Удалены данные Country Manager по городам';

-- Удаляем еженедельные отчеты менеджеров
DELETE FROM "WeeklyReport" WHERE id IS NOT NULL;
RAISE NOTICE '✓ Удалены еженедельные отчеты менеджеров';

-- 3. Показать результат
SELECT 
  '================================' as message
UNION ALL
SELECT '  ДАННЫЕ УСПЕШНО ОЧИЩЕНЫ'
UNION ALL
SELECT '================================'
UNION ALL
SELECT ''
UNION ALL
SELECT 'Удалено:'
UNION ALL
SELECT '- Все еженедельные отчеты'
UNION ALL
SELECT '- Все данные Country Manager'
UNION ALL
SELECT '- Все встречи команды'
UNION ALL
SELECT '- Все еженедельные вопросы'
UNION ALL
SELECT ''
UNION ALL
SELECT 'Сохранено:'
UNION ALL
SELECT '- Все пользователи'
UNION ALL
SELECT '- Структура базы данных'
UNION ALL
SELECT ''
UNION ALL
SELECT 'Система готова к реальной работе!';

-- 4. Показать оставшихся пользователей
SELECT 
  '' as separator
UNION ALL
SELECT 
  'Пользователи в системе:'
UNION ALL
SELECT 
  '================================';

SELECT 
  name as "Имя",
  username as "Логин",
  role as "Роль",
  city as "Город",
  CASE WHEN "isActive" THEN '✓' ELSE '✗' END as "Активен"
FROM "User"
ORDER BY 
  CASE role
    WHEN 'ADMIN' THEN 1
    WHEN 'COUNTRY_MANAGER' THEN 2
    WHEN 'HIRING_MANAGER' THEN 3
    WHEN 'OPS_MANAGER' THEN 4
    WHEN 'MIXED_MANAGER' THEN 5
    ELSE 6
  END,
  city,
  name;

COMMIT;

-- ============================================
-- Скрипт завершен
-- ============================================


