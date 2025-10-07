#!/bin/bash

# Скрипт для миграции console.log на logger
# Использовать с осторожностью, проверяйте результаты!

echo "🔄 Миграция console.log → logger"
echo "=================================="
echo ""
echo "⚠️  Этот скрипт заменяет console.log на logger в API routes"
echo "⚠️  Рекомендуется запускать постепенно и проверять результаты"
echo ""
read -p "Продолжить? (y/n) " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 1
fi

# Добавляем import logger в файлы где его нет
echo "1️⃣ Добавление import logger..."
find src/app/api -name "route.ts" -type f ! -path "*/debug/*" | while read file; do
  if ! grep -q "import.*logger" "$file"; then
    # Находим первую строку с import и добавляем после нее
    sed -i.bak3 '/^import.*from/a\
import { logger } from '\''@/lib/logger'\'';' "$file" | head -1
    rm -f "${file}.bak3" 2>/dev/null
  fi
done

echo "2️⃣ Замена console.error() на logger.error()..."
# console.error('message', error) → logger.error('message', error)
find src/app/api -name "route.ts" -type f ! -path "*/debug/*" -exec \
  sed -i.bak4 "s/console\.error(\(.*\), \(error\|err\))/logger.error(\1, \2)/g" {} \;

echo "3️⃣ Замена console.log() на logger.info()..."
# console.log('message') → logger.info('message')
find src/app/api -name "route.ts" -type f ! -path "*/debug/*" -exec \
  sed -i.bak5 "s/console\.log(/logger.info(/g" {} \;

echo "4️⃣ Замена console.warn() на logger.warn()..."
find src/app/api -name "route.ts" -type f ! -path "*/debug/*" -exec \
  sed -i.bak6 "s/console\.warn(/logger.warn(/g" {} \;

# Cleanup backup files
find src/app/api -name "*.bak*" -type f -delete

echo ""
echo "✅ Миграция завершена!"
echo ""
echo "📝 Что дальше:"
echo "1. Проверьте изменения: git diff src/app/api"
echo "2. Протестируйте сборку: npm run build"
echo "3. Проверьте логи в работающем приложении"
echo ""
echo "💡 Некоторые console.log могут требовать ручной правки"
echo "   (например, добавление context параметра)"


