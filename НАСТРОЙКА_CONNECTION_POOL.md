# ⚙️ НАСТРОЙКА CONNECTION POOL ДЛЯ СТАБИЛЬНОСТИ

## 🎯 Проблема:

По умолчанию Prisma создает **ОЧЕНЬ МАЛЕНЬКИЙ** connection pool:
- Примерно 10 соединений
- При 12+ пользователях одновременно соединения заканчиваются
- Запросы зависают, появляются timeout'ы
- Ошибка "Too many connections" или "Connection timeout"

---

## ✅ Решение: Настройка DATABASE_URL

### Если используете Supabase:

```bash
# В файле .env или .env.local

# БЫЛО (неправильно):
DATABASE_URL="postgresql://user:pass@host:5432/database"

# СТАЛО (правильно):
DATABASE_URL="postgresql://user:pass@host:5432/database?connection_limit=20&pool_timeout=10"
```

### Если используете обычный PostgreSQL:

```bash
# В файле .env или .env.local

# БЫЛО (неправильно):
DATABASE_URL="postgresql://postgres:password@localhost:5432/hr_analytics"

# СТАЛО (правильно):
DATABASE_URL="postgresql://postgres:password@localhost:5432/hr_analytics?connection_limit=20&pool_timeout=10&connect_timeout=10"
```

---

## 📊 Параметры Connection Pool:

| Параметр | Значение | Описание |
|----------|----------|----------|
| `connection_limit` | **20** | Максимум соединений в pool |
| `pool_timeout` | **10** | Timeout получения соединения (сек) |
| `connect_timeout` | **10** | Timeout подключения к БД (сек) |

### Почему 20 соединений?

Расчет для вашей системы:
- 14 пользователей (менеджеры + админы)
- В среднем 2-3 запроса параллельно на пользователя
- 14 × 3 = 42 теоретических соединений
- **Но!** Prisma переиспользует соединения
- 20 соединений = запас для пиковой нагрузки

---

## 🔧 Как применить:

### Вариант 1: Локальная разработка

```bash
# Откройте файл .env.local
nano .env.local

# Найдите DATABASE_URL и добавьте параметры
DATABASE_URL="postgresql://...?connection_limit=20&pool_timeout=10"

# Сохраните (Ctrl+O, Enter, Ctrl+X)

# Перезапустите сервер
npm run dev
```

### Вариант 2: Production (Vercel/другой хостинг)

1. Зайдите в настройки проекта
2. Найдите переменные окружения (Environment Variables)
3. Обновите `DATABASE_URL`
4. Добавьте параметры: `?connection_limit=20&pool_timeout=10`
5. Redeploy проекта

### Вариант 3: Docker

```yaml
# docker-compose.yml
environment:
  DATABASE_URL: "postgresql://postgres:password@postgres:5432/hr_analytics?connection_limit=20&pool_timeout=10"
```

---

## 🧪 Как проверить что работает:

### 1. Логирование Prisma

```bash
# В .env добавьте:
DEBUG="prisma:query,prisma:engine"

# Перезапустите
npm run dev

# Вы должны видеть в логах:
# prisma:engine Connection pool created with 20 slots
```

### 2. Тест нагрузки

```bash
# Запустите много запросов одновременно
for i in {1..15}; do
  curl http://localhost:3000/api/dashboard-stats &
done
wait

# Все должны завершиться успешно без timeout
```

### 3. Мониторинг соединений

```sql
-- В PostgreSQL выполните:
SELECT count(*) as connections, usename, application_name
FROM pg_stat_activity
WHERE datname = 'hr_analytics'
GROUP BY usename, application_name;

-- Должно быть до 20 соединений от Prisma
```

---

## ⚠️ Важно знать:

### PostgreSQL лимиты

PostgreSQL имеет глобальный лимит соединений:
```sql
-- Проверьте текущий лимит:
SHOW max_connections;

-- Обычно: 100 соединений
```

Если у вас **несколько приложений** используют одну БД:
- 1 приложение = 20 соединений
- 5 приложений = 100 соединений
- Можно упереться в лимит!

**Решение:**
- Уменьшите `connection_limit` до 10-15
- Или увеличьте `max_connections` в PostgreSQL

### Supabase лимиты

Supabase имеет **свои лимиты** по тарифу:
- Free: 60 соединений
- Pro: 200 соединений
- Enterprise: Unlimited

Если используете Supabase Free, используйте:
```bash
DATABASE_URL="...?connection_limit=15&pool_timeout=10"
# 15 вместо 20 для запаса
```

---

## 📈 Мониторинг после настройки:

### Что мониторить:

1. **Connection pool exhaustion**
   ```
   ❌ Error: Timed out fetching a new connection from the pool
   ```
   **Решение:** Увеличить `connection_limit`

2. **Too many connections**
   ```
   ❌ Error: sorry, too many clients already
   ```
   **Решение:** Уменьшить `connection_limit` или увеличить `max_connections` в PostgreSQL

3. **Connection timeouts**
   ```
   ❌ Error: Connection timeout
   ```
   **Решение:** Увеличить `connect_timeout` и `pool_timeout`

---

## ✅ После настройки:

Ожидаемые результаты:
- ✅ Логин работает стабильно с первого раза
- ✅ Никого не выкидывает из системы
- ✅ Все запросы выполняются без задержек
- ✅ Нет ошибок "Connection timeout"
- ✅ При 15 одновременных пользователях всё работает

---

## 🔍 Дополнительная оптимизация (опционально):

### Для Supabase:

```bash
# Используйте pooling mode для еще лучшей производительности
DATABASE_URL="postgresql://...?pgbouncer=true&connection_limit=20"
```

### Для локального PostgreSQL:

```bash
# Настройте PostgreSQL для лучшей производительности
# В postgresql.conf:
shared_buffers = 256MB
effective_cache_size = 1GB
max_connections = 200
```

---

**После настройки перезапустите сервер и протестируйте!** 🚀

_Документ создан: 10 октября 2025_

