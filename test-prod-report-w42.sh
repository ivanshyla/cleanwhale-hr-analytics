#!/bin/bash

echo "🚀 Запускаем генерацию отчета для W42 на PRODUCTION"
echo ""

# Попробуем через обычный крон endpoint
echo "📍 Endpoint: https://cleanwhale-hr-analytics.vercel.app/api/cron/weekly-report"
echo "🔑 Auth: Bearer cleanwhale_cron_secret_2024_secure_key"
echo ""

# Запускаем крон
RESPONSE=$(curl -s -w "\n%{http_code}" -X GET "https://cleanwhale-hr-analytics.vercel.app/api/cron/weekly-report" \
  -H "Authorization: Bearer cleanwhale_cron_secret_2024_secure_key" \
  -H "Content-Type: application/json")

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

echo "📊 HTTP Status: $HTTP_CODE"
echo ""
echo "Response:"
echo "$BODY" | jq . 2>/dev/null || echo "$BODY"

echo ""
if echo "$BODY" | grep -q '"success":true'; then
  echo "✅ Отчет успешно отправлен с PRODUCTION в Telegram!"
  echo ""
  echo "📋 Details:"
  echo "$BODY" | jq '{success, message, weekIso, sentToTelegram, timestamp}' 2>/dev/null || echo "$BODY"
else
  echo "❌ Ошибка"
fi
