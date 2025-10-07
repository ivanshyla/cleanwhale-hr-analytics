# Оптимизация производительности

## ✅ Реализовано

### 1. Параллельные запросы
- Главная страница дашборда теперь загружает данные параллельно вместо последовательно
- Используется `Promise.all()` для одновременной загрузки статистики и аналитики

### 2. Кэширование API
- Добавлен in-memory кэш для `/api/country-analytics`
- TTL: 60 секунд
- Повторные запросы за ту же неделю возвращаются мгновенно из кэша

### 3. Оптимизация SELECT запросов
- Убраны лишние поля из `user` (salaryGross, salaryNet)
- Используется `select` вместо полной загрузки связанных таблиц
- Загружаются только необходимые поля метрик

## 📊 Ожидаемые улучшения

- **Загрузка дашборда**: с ~3-5 сек до ~1-2 сек (первый раз)
- **Повторные запросы**: с ~3-5 сек до ~50-200 мс (кэш)
- **Размер данных**: -30-40% (оптимизированные SELECT)

## 🚀 Дополнительные рекомендации

### 1. Индексы в базе данных (КРИТИЧНО!)
```sql
-- Добавить индексы для частых запросов
CREATE INDEX IF NOT EXISTS idx_weekly_reports_weekiso ON weekly_reports(week_iso);
CREATE INDEX IF NOT EXISTS idx_weekly_reports_userid ON weekly_reports(user_id);
CREATE INDEX IF NOT EXISTS idx_weekly_reports_weekiso_userid ON weekly_reports(week_iso, user_id);

CREATE INDEX IF NOT EXISTS idx_hr_metrics_reportid ON hr_metrics(report_id);
CREATE INDEX IF NOT EXISTS idx_ops_metrics_reportid ON ops_metrics(report_id);

CREATE INDEX IF NOT EXISTS idx_country_aggregates_weekiso ON country_aggregates(week_iso);
CREATE INDEX IF NOT EXISTS idx_country_user_inputs_weekiso ON country_user_inputs(week_iso);

CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_city ON users(city);
```

### 2. Connection Pooling
Проверить настройки Prisma для connection pooling:
```prisma
datasource db {
  url = env("DATABASE_URL")
  directUrl = env("DIRECT_URL") // для миграций
  pooling = true
  pool_timeout = 20
  connection_limit = 10
}
```

### 3. React Query / SWR
Установить библиотеку для продвинутого кэширования:
```bash
npm install @tanstack/react-query
# или
npm install swr
```

Преимущества:
- Автоматическое кэширование на клиенте
- Автоматическая ревалидация при фокусе окна
- Оптимистичные обновления
- Меньше boilerplate кода

### 4. Next.js ISR (Incremental Static Regeneration)
Для редко меняющихся данных использовать ISR:
```typescript
export const revalidate = 300; // обновлять каждые 5 минут
```

### 5. Оптимизация компонентов
- Использовать `React.memo()` для избежания лишних re-render
- Добавить `useMemo` и `useCallback` где нужно
- Lazy loading компонентов через `React.lazy()`

### 6. Compression
Включить gzip compression в Next.js:
```javascript
// next.config.js
module.exports = {
  compress: true,
  // ...
}
```

### 7. Локальная база данных (для разработки)
Рассмотреть использование локального PostgreSQL для разработки:
```bash
# Docker
docker run --name postgres-local -e POSTGRES_PASSWORD=postgres -p 5432:5432 -d postgres:15

# Обновить .env.local
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/kalinkowaai"
```

### 8. Edge Runtime (Vercel)
Для некритичных API можно использовать Edge Runtime:
```typescript
export const runtime = 'edge';
```

### 9. Мониторинг производительности
Добавить мониторинг времени запросов:
```typescript
const start = Date.now();
const result = await prisma.weeklyReport.findMany(...);
console.log(`Query took ${Date.now() - start}ms`);
```

### 10. Prefetching
На главной странице можно prefetch страницы аналитики:
```tsx
<Link href="/dashboard/country-analytics" prefetch={true}>
  Аналитика
</Link>
```

## 📈 Метрики для отслеживания

1. **Time to First Byte (TTFB)** - должно быть <500ms
2. **Время загрузки страницы** - должно быть <2 секунд
3. **Время ответа API** - должно быть <500ms
4. **Размер bundle** - минимизировать

## 🔧 Инструменты для анализа

1. Chrome DevTools → Network → Timing
2. Lighthouse (Chrome DevTools → Lighthouse)
3. `npx @next/bundle-analyzer` - анализ размера bundle
4. Vercel Analytics (если используете Vercel)

## ⚠️ Что НЕ оптимизировать

- Премат
урная оптимизация - сначала измерить, потом оптимизировать
- Не кэшировать данные, которые должны быть real-time
- Не добавлять слишком много индексов (замедляют INSERT/UPDATE)

## 🎯 Приоритеты

**Высокий приоритет (сделать сейчас):**
1. ✅ Параллельные запросы
2. ✅ Кэширование API
3. ✅ Оптимизация SELECT
4. 🔄 Добавить индексы в БД

**Средний приоритет (на следующей неделе):**
5. React Query / SWR
6. Connection pooling
7. React.memo для компонентов

**Низкий приоритет (когда будет время):**
8. Edge Runtime
9. Bundle анализ
10. Prefetching

