# 🔧 ИСПРАВЛЕНИЕ ОШИБОК СБОРКИ

## Проблема

Проект не собирается из-за ошибки:
```
Error: Dynamic server usage: Route couldn't be rendered statically 
because it accessed `request.cookies`
```

## Причина

В Next.js 14 по умолчанию пытается статически рендерить API routes.
Но наши routes используют `request.cookies`, что требует динамического рендеринга.

## Решение

Нужно добавить в начало КАЖДОГО API route файла:

```typescript
export const dynamic = 'force-dynamic';
```

## Затронутые файлы

Все файлы в `src/app/api/` которые используют:
- `request.cookies`
- `request.headers`
- JWT токены из cookies

### Полный список файлов для исправления:

1. src/app/api/auth/me/route.ts
2. src/app/api/auth/login/route.ts
3. src/app/api/country-overview/route.ts
4. src/app/api/country-aggregates/route.ts
5. src/app/api/country-user-inputs/route.ts
6. src/app/api/weekly-reports/route.ts
7. src/app/api/weekly-reports/[id]/route.ts
8. src/app/api/analytics-data/route.ts
9. src/app/api/export/route.ts
10. src/app/api/team-calls/admin/route.ts
11. src/app/api/team-calls/admin/[id]/route.ts

... и все остальные API routes

## Автоматическое исправление

Выполните команду:

```bash
find src/app/api -name "route.ts" -type f -exec sed -i.bak "1i\\
export const dynamic = 'force-dynamic';\\
" {} \;
```

Или используйте скрипт ниже.

## Скрипт для исправления

Создайте файл `fix-api-routes.sh`:

```bash
#!/bin/bash

# Находим все route.ts файлы и добавляем dynamic export
find src/app/api -name "route.ts" -type f | while read file; do
  # Проверяем, не добавлено ли уже
  if ! grep -q "export const dynamic" "$file"; then
    echo "Fixing $file"
    # Добавляем в начало файла
    echo "export const dynamic = 'force-dynamic';" | cat - "$file" > temp && mv temp "$file"
    echo "" >> temp && cat "$file" >> temp && mv temp "$file"
  else
    echo "Skipping $file (already fixed)"
  fi
done

echo "Done!"
```

Запустите:
```bash
chmod +x fix-api-routes.sh
./fix-api-routes.sh
```

## После исправления

Проверьте сборку:
```bash
npm run build
```

Должно успешно собраться без ошибок Dynamic server usage.

## Дополнительно

Также можно добавить в `next.config.mjs`:

```javascript
const nextConfig = {
  experimental: {
    serverActions: true,
  },
  // Убрать эти строки после исправления проблем:
  // eslint: { ignoreDuringBuilds: true },
  // typescript: { ignoreBuildErrors: true },
};
```

