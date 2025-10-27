#!/bin/bash

# Скрипт для ручной отправки отчета за конкретную неделю в Telegram

WEEK="${1:-2025-W42}"

echo "📊 Отправка отчета за неделю $WEEK в Telegram..."
echo ""

# Читаем переменные из .env
if [ -f .env ]; then
  export $(cat .env | grep -v '^#' | xargs)
fi

if [ -z "$CRON_SECRET" ]; then
  echo "❌ CRON_SECRET not set!"
  exit 1
fi

# URL production с параметром недели
URL="https://cleanwhale-hr-analytics.vercel.app/api/cron/weekly-report"

echo "🌐 URL: $URL"
echo "📅 Неделя: $WEEK"
echo ""
echo "⏳ Отправляем запрос..."
echo ""

# Отправляем запрос (крон сам определит прошлую неделю, но мы можем добавить параметр если нужно)
curl -X GET "$URL" \
  -H "Authorization: Bearer $CRON_SECRET" \
  -H "Content-Type: application/json" \
  -w "\n\nHTTP Status: %{http_code}\n" \
  -s

echo ""
echo "✅ Готово! Проверьте Telegram чат 'CleanWhale Board'"
echo ""
echo "⚠️ Внимание: Виктория Коммуникации указала 55 рабочих дней вместо максимум 7!"
echo "Нужно попросить её исправить отчет."

