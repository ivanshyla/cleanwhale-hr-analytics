#!/bin/bash

echo "🧪 Тестируем API напрямую..."
echo ""

# Получаем production URL
PROD_URL="https://cleanwhale-hr-analytics.vercel.app"

echo "1. Логинимся как hr_manager..."
LOGIN_RESPONSE=$(curl -s -X POST "$PROD_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "login": "hr_manager",
    "password": "password123"
  }' \
  -c cookies.txt)

echo "Login response: $LOGIN_RESPONSE"
echo ""

# Извлекаем токен из cookies
TOKEN=$(grep -o 'token[[:space:]]*[^;]*' cookies.txt | sed 's/token[[:space:]]*//')

echo "2. Отправляем weekly report..."
REPORT_RESPONSE=$(curl -s -X POST "$PROD_URL/api/weekly-reports" \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "weekIso": "2025-W39",
    "role": "hr",
    "hr": {
      "interviews": 5,
      "jobPosts": 3,
      "registered": 8,
      "fullDays": 5,
      "difficult": "Test from script"
    }
  }')

echo "Report response:"
echo "$REPORT_RESPONSE" | jq '.' 2>/dev/null || echo "$REPORT_RESPONSE"
echo ""

# Cleanup
rm -f cookies.txt

echo "✅ Тест завершен"
