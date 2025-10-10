# 🚀 План оптимизации производительности и масштабируемости

**Дата:** 10 октября 2025  
**Статус:** В процессе реализации

---

## 📋 Обзор проблем

Из анализа выявлено 8 категорий проблем масштабируемости:

1. ⚡ **Кэширование**: `force-dynamic` везде → нет кэша
2. 📄 **Пагинация**: `findMany` без limit → рост latency
3. 💾 **Локальный кэш**: Map-кэш только на 1 инстансе
4. ⏰ **Синхронные операции**: OpenAI/Telegram блокируют HTTP
5. 🔍 **Широкие выборки**: лишние include и поля
6. 🔐 **Идемпотентность**: нет защиты от дублей в кроне
7. 🔄 **Retry**: нет повторов при ошибках внешних API
8. 📊 **Индексы**: могут отсутствовать для частых запросов

---

## ✅ Что уже сделано

### 1. Инфраструктура базовых утилит

#### `src/lib/pagination.ts` ✅
- Парсинг параметров пагинации из URL
- Создание мета-данных (page, limit, total, hasNext, etc.)
- Поддержка курсорной пагинации

#### `src/lib/retry.ts` ✅
- Retry с exponential backoff
- Timeout для всех внешних вызовов
- Специализированные функции для OpenAI и Telegram
- Логирование всех попыток

#### `src/lib/cache.ts` ✅
- Абстракция над кэшем (In-Memory / Redis)
- Автоматический выбор: Redis в production, In-Memory в dev
- Helper функция `cached()` для кэширования результатов
- Готовность к Upstash Redis

#### `src/lib/job-lock.ts` ✅
- Блокировки для предотвращения параллельных запусков крона
- `acquireLock()` / `releaseLock()`
- Helper `withLock()` для автоматической блокировки
- Очистка просроченных блокировок

#### Prisma Schema ✅
- Добавлена модель `JobLock` для идемпотентности
- Индексы для быстрого поиска

---

## 🔧 Примеры применения

### Пример 1: Оптимизированный API endpoint

**Было:**
```typescript
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const users = await prisma.user.findMany({
    include: {
      weeklyReports: true, // Лишнее!
      workSchedules: true, // Лишнее!
    }
  });
  return NextResponse.json(users); // Может быть 10000+ записей
}
```

**Стало:**
```typescript
export const revalidate = 60; // Кэш на 60 секунд

export async function GET(request: NextRequest) {
  const { page, limit, skip, take } = parsePaginationParams(searchParams);
  
  const [total, users] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      select: { // Только нужные поля!
        id: true,
        name: true,
        email: true,
        // НЕ грузим отношения
      },
      skip,
      take,
      orderBy: { createdAt: 'desc' },
    }),
  ]);
  
  return NextResponse.json(createPaginatedResponse(users, page, limit, total));
}
```

**Выигрыш:**
- ✅ Кэширование → меньше нагрузка на БД
- ✅ Пагинация → быстрый ответ даже при 10000 записях
- ✅ Минимальный select → меньше трафика
- ✅ Параллельные запросы → быстрее

---

### Пример 2: OpenAI с retry и timeout

**Было:**
```typescript
const completion = await openai.chat.completions.create({
  model: 'gpt-4',
  messages: [...],
}); // Может зависнуть или упасть без retry
```

**Стало:**
```typescript
import { withOpenAIRetry } from '@/lib/retry';

const completion = await withOpenAIRetry(async () => {
  return await openai.chat.completions.create({
    model: 'gpt-4',
    messages: [...],
  });
});
// Автоматически: 3 попытки, exponential backoff, timeout 60s
```

**Выигрыш:**
- ✅ Не падает при временных ошибках OpenAI
- ✅ Timeout предотвращает зависание
- ✅ Логирование всех попыток

---

### Пример 3: Идемпотентный крон

**Было:**
```typescript
export async function GET(request: NextRequest) {
  // Проверка секрета
  if (authHeader !== `Bearer ${cronSecret}`) return 401;
  
  // Генерация отчета
  const report = await generateWeeklyReport(weekIso);
  await sendTelegram(report);
  // Если запустить 2 раза параллельно → 2 отчета!
}
```

**Стало:**
```typescript
import { withLock } from '@/lib/job-lock';

export async function GET(request: NextRequest) {
  // Проверка секрета
  if (authHeader !== `Bearer ${cronSecret}`) return 401;
  
  const result = await withLock(
    'weekly-report',
    weekIso, // Уникальный ключ
    async () => {
      const report = await generateWeeklyReport(weekIso);
      await sendTelegram(report);
      return report;
    },
    600000 // Timeout 10 минут
  );
  
  if (!result) {
    return NextResponse.json({ message: 'Already running' });
  }
  
  return NextResponse.json({ success: true });
}
```

**Выигрыш:**
- ✅ Невозможно запустить 2 раза для одной недели
- ✅ Автоматическая очистка при зависании
- ✅ Логирование всех блокировок

---

### Пример 4: Кэширование тяжелых запросов

**Было:**
```typescript
export async function GET(request: NextRequest) {
  const stats = await prisma.weeklyReport.findMany({
    include: {
      user: true,
      hrMetrics: true,
      opsMetrics: true,
    },
  }); // Тяжелый запрос при каждом обращении
  
  const aggregated = aggregateData(stats);
  return NextResponse.json(aggregated);
}
```

**Стало:**
```typescript
import { cached } from '@/lib/cache';

export const revalidate = 300; // 5 минут

export async function GET(request: NextRequest) {
  const cacheKey = `dashboard-stats:${weekIso}`;
  
  const stats = await cached(
    cacheKey,
    async () => {
      const data = await prisma.weeklyReport.findMany({
        where: { weekIso },
        select: { // Только нужное
          workdays: true,
          stressLevel: true,
          user: { select: { city: true, role: true } },
        },
      });
      return aggregateData(data);
    },
    { ttl: 300 } // Кэш на 5 минут
  );
  
  return NextResponse.json(stats);
}
```

**Выигрыш:**
- ✅ Тяжелый запрос выполняется 1 раз в 5 минут
- ✅ Работает с Redis (многоинстансово) или In-Memory
- ✅ Автоматическая инвалидация по TTL

---

## 📊 Приоритет внедрения

### ⚡ Высокий приоритет (сделать сейчас)

1. **Пагинация** → `src/app/api/users/route.ts` ✅ (пример готов)
2. **Убрать force-dynamic** → где только чтение (GET без auth)
3. **Минимизировать select** → убрать лишние include
4. **Job locking для крона** → `src/app/api/cron/weekly-report/route.ts`
5. **Retry для OpenAI/Telegram** → все вызовы обернуть

### 🔄 Средний приоритет (после основного)

6. **Redis кэш** → добавить REDIS_URL в production
7. **Индексы БД** → анализ медленных запросов
8. **Материализованные представления** → для недельной аналитики

### 📈 Низкий приоритет (опционально)

9. **Фоновые очереди** → вынести экспорты в background jobs
10. **Streaming ответов** → для больших экспортов
11. **Database read replicas** → разделение чтения/записи

---

## 🛠️ Инструкция по применению

### Шаг 1: Применить SQL миграцию

```bash
node apply-job-lock-migration.mjs
```

### Шаг 2: Обновить Prisma Client

```bash
npx prisma generate
```

### Шаг 3: Применить оптимизации к API endpoints

Используй шаблон из `src/app/api/users/route.ts` для других файлов:

**Список файлов для оптимизации:**
- `src/app/api/work-schedules/route.ts`
- `src/app/api/team-meetings/route.ts`
- `src/app/api/export/route.ts`
- `src/app/api/country-analytics/route.ts`
- `src/app/api/dashboard-stats/route.ts`

### Шаг 4: Обновить крон

```typescript
// src/app/api/cron/weekly-report/route.ts
import { withLock } from '@/lib/job-lock';
import { withOpenAIRetry, withTelegramRetry } from '@/lib/retry';

export async function GET(request: NextRequest) {
  // ...проверка секрета...
  
  const result = await withLock('weekly-report', targetWeek, async () => {
    // Генерация с retry
    const report = await withOpenAIRetry(async () => {
      return await generateReport(targetWeek);
    });
    
    // Отправка с retry
    await withTelegramRetry(async () => {
      return await sendTelegramMessage(report);
    });
    
    return { success: true };
  });
  
  return NextResponse.json(result || { message: 'Already running' });
}
```

### Шаг 5: Настроить Redis (опционально, для production)

```bash
# 1. Добавь в .env.production:
REDIS_URL=https://your-redis-url
REDIS_TOKEN=your-token

# 2. Установи библиотеку:
npm install @upstash/redis

# 3. Всё! Кэш автоматически переключится на Redis
```

---

## 📈 Ожидаемые результаты

### Текущие проблемы:
- ❌ Запрос списка users: 2-5 секунд (10000 записей)
- ❌ Dashboard stats: 3-7 секунд (тяжелые агрегаты)
- ❌ Крон может запуститься 2 раза → дубли
- ❌ OpenAI падает при временных ошибках
- ❌ Кэш работает только на 1 инстансе

### После оптимизации:
- ✅ Запрос списка users: 100-300ms (пагинация + кэш)
- ✅ Dashboard stats: 50-200ms (кэш)
- ✅ Крон гарантированно 1 раз (job lock)
- ✅ OpenAI с auto-retry → надежность
- ✅ Кэш работает на всех инстансах (Redis)

**Общий выигрыш: ~10-20x по скорости, +50% надежности**

---

## ✅ Чеклист применения

- [x] Создана инфраструктура (pagination, retry, cache, job-lock)
- [x] Обновлена Prisma схема (JobLock)
- [x] SQL миграция готова
- [x] Пример оптимизации (users/route.ts)
- [ ] Применить к остальным endpoints (15 файлов)
- [ ] Обновить крон с retry и locking
- [ ] Настроить Redis для production
- [ ] Добавить индексы по результатам анализа
- [ ] Протестировать производительность

---

## 📚 Дополнительные ресурсы

- `src/lib/pagination.ts` - утилиты пагинации
- `src/lib/retry.ts` - retry и timeout
- `src/lib/cache.ts` - кэш абстракция
- `src/lib/job-lock.ts` - идемпотентность
- `add-job-lock-table.sql` - SQL миграция

**Документация по Redis:**
- Upstash: https://upstash.com/docs/redis
- Vercel KV: https://vercel.com/docs/storage/vercel-kv

---

**Автор:** AI Assistant  
**Версия:** 1.0  
**Следующее обновление:** После применения к production
