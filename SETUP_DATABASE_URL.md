# Оптимизация DATABASE_URL для Vercel + Supabase

## Проблема
Prisma + PgBouncer (Supabase pooler) без отключения prepared statements может работать нестабильно.

## Решение
Добавить `statement_cache_size=0` в DATABASE_URL для Vercel.

## Текущий DATABASE_URL
```
DATABASE_URL="postgresql://postgres:[password]@db.[project].supabase.co:5432/postgres"
```

## Оптимизированный DATABASE_URL для Vercel
```
DATABASE_URL="postgresql://postgres:[password]@db.[project].pooler.supabase.com:6543/postgres?pgbouncer=true&connect_timeout=30&statement_cache_size=0"
```

## Что изменить:
1. **Хост**: `db.[project].supabase.co:5432` → `db.[project].pooler.supabase.com:6543`
2. **Добавить параметры**:
   - `pgbouncer=true` - использовать PgBouncer
   - `connect_timeout=30` - таймаут подключения
   - `statement_cache_size=0` - отключить prepared statements cache

## Команда для обновления в Vercel:
```bash
vercel env add DATABASE_URL production
# Вставить оптимизированный URL при запросе
```

## Альтернативно через Dashboard:
1. Vercel Dashboard → Project → Settings → Environment Variables
2. Найти `DATABASE_URL` для production
3. Обновить значение на оптимизированный URL
