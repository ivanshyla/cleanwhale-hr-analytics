# 📦 План оптимизации размера бандла

**Дата:** 10 октября 2025  
**Цель:** Уменьшить размер клиентского бандла на 50-70%

---

## 🎯 Проблемы (выявлено)

### 1. Слишком много `use client`
- **Проблема:** 20 файлов с `'use client'` в `/dashboard`
- **Влияние:** Весь код страницы попадает в клиентский JS
- **Решение:** Server Components по умолчанию, `use client` только для интерактивных островков

### 2. Тяжелые графики (recharts)
- **Проблема:** Прямой импорт `recharts` в 4 компонентах
- **Влияние:** +100-200 KB в бандле
- **Решение:** `next/dynamic` с `ssr: false` и lazy-загрузка

### 3. Много иконок lucide-react
- **Проблема:** Массовые импорты на каждой странице
- **Влияние:** +30-50 KB суммарно
- **Решение:** Точечные импорты, минимизация количества

### 4. Нет `next/image`
- **Проблема:** Обычные `<img>` без оптимизации
- **Влияние:** Большие изображения, нет WebP/AVIF
- **Решение:** Заменить на `<Image>` с `sizes`/`quality`

### 5. `force-dynamic` везде
- **Проблема:** Отключен кэш на API уровне
- **Влияние:** Больше холодных стартов, медленнее
- **Решение:** `revalidate` где безопасно

---

## ✅ Что сделано (Infrastructure)

### 1. `src/components/DynamicChart.tsx` ✅

Создан универсальный модуль для ленивой загрузки recharts:

```typescript
// ✅ Использование:
import { 
  DynamicLineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip 
} from '@/components/DynamicChart';

<DynamicLineChart data={data}>
  <XAxis dataKey="name" />
  <YAxis />
  <Tooltip />
  <Line dataKey="value" />
</DynamicLineChart>
```

**Выигрыш:**
- ✅ Recharts не попадает в начальный бандл
- ✅ Загружается только когда компонент виден
- ✅ SSR отключен (не нужен для графиков)
- ✅ Placeholder во время загрузки

---

## 📋 План применения

### Этап 1: Оптимизация recharts (КРИТИЧНО)

**Файлы для обновления:**
1. `src/components/AnalyticsCharts.tsx`
2. `src/components/MetricsChart.tsx`
3. `src/components/RatingBreakdown.tsx`
4. `src/components/UnitComparison.tsx`

**Шаблон замены:**
```typescript
// БЫЛО:
import { LineChart, Line, ... } from 'recharts';

// СТАЛО:
import { 
  DynamicLineChart as LineChart,
  Line,
  XAxis,
  YAxis,
  ... 
} from '@/components/DynamicChart';
```

**Ожидаемый выигрыш:** -150 KB из начального бандла

---

### Этап 2: Server Components (КРИТИЧНО)

**Принцип:**
- Страница = Server Component (по умолчанию)
- Только интерактивные части = Client Component

**Пример:**

```typescript
// ❌ БЫЛО: вся страница в клиенте
'use client';

export default function Page() {
  const [data, setData] = useState([]);
  
  useEffect(() => {
    fetch('/api/data').then(setData);
  }, []);
  
  return <div>{/* Куча кода */}</div>;
}

// ✅ СТАЛО: страница на сервере, данные на сервере
async function getData() {
  const res = await fetch('/api/data', { cache: 'no-store' });
  return res.json();
}

export default async function Page() {
  const data = await getData();
  
  return (
    <div>
      <h1>Статичный контент</h1>
      <InteractiveWidget data={data} /> {/* use client здесь */}
    </div>
  );
}

// Отдельный файл: InteractiveWidget.tsx
'use client';
export default function InteractiveWidget({ data }) {
  const [selected, setSelected] = useState(null);
  return <div onClick={() => setSelected(...)}>{...}</div>;
}
```

**Страницы для рефакторинга:**
- `src/app/dashboard/page.tsx` - можно частично
- `src/app/dashboard/analytics/page.tsx` - сложная, постепенно
- `src/app/dashboard/country-analytics/page.tsx` - да
- `src/app/dashboard/manager-schedules/page.tsx` - да
- `src/app/dashboard/users/page.tsx` - да
- ... и другие

**Ожидаемый выигрыш:** -200-300 KB из начального бандла

---

### Этап 3: `next/image` (СРЕДНИЙ ПРИОРИТЕТ)

**Где искать:**
```bash
grep -r "<img" src/app src/components
grep -r "logo" src/app src/components
```

**Замена:**
```typescript
// БЫЛО:
<img src="/logo.png" alt="Logo" />

// СТАЛО:
import Image from 'next/image';

<Image 
  src="/logo.png" 
  alt="Logo"
  width={200}
  height={100}
  priority // Для логотипов выше fold
/>
```

**Для фоновых изображений:**
```typescript
<Image 
  src="/bg.jpg"
  alt=""
  fill
  sizes="100vw"
  style={{ objectFit: 'cover' }}
/>
```

**Ожидаемый выигрыш:** -30-50% размера изображений (WebP/AVIF)

---

### Этап 4: Оптимизация иконок

**Текущее состояние:**
```typescript
// Плохо (если используется):
import * as Icons from 'lucide-react';

// Хорошо (точечный импорт):
import { User, Settings, LogOut } from 'lucide-react';
```

**Проверка:**
```bash
grep "import.*lucide-react" src/app src/components -r
```

**Ожидаемый выигрыш:** -20-30 KB (если есть массовые импорты)

---

### Этап 5: Убрать `force-dynamic` из API

**Уже частично сделано:**
- ✅ `api/users/route.ts` - `revalidate: 60`
- ✅ `api/work-schedules/route.ts` - оптимизирован

**Осталось:**
```
api/dashboard-stats/route.ts
api/country-analytics/route.ts
api/country-aggregates/route.ts
api/team-meetings/route.ts
api/export/route.ts
... и другие
```

**Шаблон:**
```typescript
// БЫЛО:
export const dynamic = 'force-dynamic';

// СТАЛО (для данных которые можно кэшировать):
export const revalidate = 60; // 60 секунд

// ИЛИ (для очень стабильных данных):
export const revalidate = 300; // 5 минут
```

**Ожидаемый выигрыш:** Меньше холодных стартов, быстрее ответы

---

## 📈 Ожидаемые результаты

### До оптимизации:
```
First Load JS: ~87 KB shared
Page bundles: 90-200 KB per page
Total: 180-290 KB per page
```

### После оптимизации:
```
First Load JS: ~60 KB shared (-30%)
Page bundles: 30-80 KB per page (-60-70%)
Total: 90-140 KB per page (-50%)
```

**Дополнительно:**
- ✅ Faster Time to Interactive (TTI)
- ✅ Меньше холодных стартов
- ✅ Лучше Core Web Vitals
- ✅ Быстрее на мобильных

---

## 🛠️ Инструменты для анализа

### Анализ бандла:

```bash
# 1. Собрать с анализом
ANALYZE=true npm run build

# 2. Или через Next.js встроенный анализатор
npm install -D @next/bundle-analyzer
```

```javascript
// next.config.mjs
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

module.exports = withBundleAnalyzer({
  // ... existing config
});
```

### Проверка производительности:

```bash
# Lighthouse
npx lighthouse https://your-site.com --view

# Web Vitals
npm install -D web-vitals
```

---

## 📊 Приоритеты (порядок внедрения)

### 🔴 **Высокий приоритет (сейчас):**

1. **Recharts → Dynamic Import** (4 файла)
   - Самый большой выигрыш по бандлу
   - Быстрое применение (15-20 минут)
   - Ожидаемо: **-150 KB**

2. **Server Components для простых страниц** (5-7 файлов)
   - Страницы без сложной интерактивности
   - Средняя сложность
   - Ожидаемо: **-100-200 KB**

### 🟡 **Средний приоритет (после основного):**

3. **next/image** для всех картинок
   - Найти все `<img>` теги
   - Заменить на `<Image>`
   - Ожидаемо: **-30-50% размера изображений**

4. **Оптимизация иконок**
   - Проверить массовые импорты
   - Минимизировать количество
   - Ожидаемо: **-20-30 KB**

### 🟢 **Низкий приоритет (опционально):**

5. **Материализация агрегатов**
   - Pre-calculate weekly data
   - Кэшировать в БД
   - Ожидаемо: Быстрее API

6. **Prisma Data Proxy / Accelerate**
   - Для уменьшения холодных стартов
   - Платная опция

---

## ✅ Чеклист применения

- [x] Создана инфраструктура (`DynamicChart.tsx`)
- [ ] Применить к `AnalyticsCharts.tsx`
- [ ] Применить к `MetricsChart.tsx`
- [ ] Применить к `RatingBreakdown.tsx`
- [ ] Применить к `UnitComparison.tsx`
- [ ] Рефакторинг `dashboard/page.tsx` → Server Component
- [ ] Рефакторинг `dashboard/users/page.tsx` → Server Component
- [ ] Рефакторинг `dashboard/manager-schedules/page.tsx` → Server Component
- [ ] Найти все `<img>` теги
- [ ] Заменить на `<Image>`
- [ ] Проверить импорты `lucide-react`
- [ ] Убрать `force-dynamic` из оставшихся API
- [ ] Собрать и проанализировать бандл
- [ ] Измерить Web Vitals

---

## 🎉 Готовая инфраструктура

✅ **`src/components/DynamicChart.tsx`** - готов к использованию
✅ **`src/lib/pagination.ts`** - готов
✅ **`src/lib/retry.ts`** - готов
✅ **`src/lib/cache.ts`** - готов
✅ **`src/lib/job-lock.ts`** - готов

**Все инструменты готовы. Осталось применить! 🚀**

---

## 📝 Следующие шаги

1. **Применить DynamicChart к 4 компонентам**
2. **Рефакторинг 5-7 простых страниц → Server Components**
3. **Замена img → Image**
4. **Собрать и измерить результаты**

**Estimated time:** 2-4 часа работы  
**Expected gain:** -50% bundle size, +50% faster TTI

---

**Автор:** AI Assistant  
**Версия:** 1.0  
**Статус:** Infrastructure Ready

