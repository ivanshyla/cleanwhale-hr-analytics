#!/bin/bash

# Скрипт для ручной отправки отчета в Telegram
# Использование: ./send-weekly-report.sh

echo "📊 Отправка еженедельного отчета в Telegram..."
echo ""

# Читаем CRON_SECRET из .env или переменных окружения
if [ -f .env ]; then
  export $(cat .env | grep -v '^#' | xargs)
fi

if [ -z "$CRON_SECRET" ]; then
  echo "❌ CRON_SECRET not set!"
  echo "Установите CRON_SECRET в .env или export CRON_SECRET='your-secret'"
  exit 1
fi

# URL production
URL="https://cleanwhale-hr-analytics.vercel.app/api/cron/weekly-report"

echo "🌐 URL: $URL"
echo "🔑 Используем CRON_SECRET из переменной окружения"
echo ""
echo "⏳ Отправляем запрос..."
echo ""

# Отправляем запрос
curl -X GET "$URL" \
  -H "Authorization: Bearer $CRON_SECRET" \
  -H "Content-Type: application/json" \
  -v

echo ""
echo ""
echo "✅ Готово! Проверьте Telegram чат."

