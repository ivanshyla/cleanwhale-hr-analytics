#!/bin/bash
# Скрипт для инициализации production базы данных

set -e

echo "🔐 Инициализация Production базы данных"
echo "========================================"
echo ""

# Проверка SETUP_SECRET
if [ -z "$SETUP_SECRET" ]; then
  echo "❌ ОШИБКА: SETUP_SECRET не задан"
  echo ""
  echo "Создай случайный секрет:"
  echo "  export SETUP_SECRET=\$(openssl rand -base64 32)"
  echo ""
  echo "Затем добавь его в Vercel:"
  echo "  1. Vercel Dashboard → Settings → Environment Variables"
  echo "  2. Добавь SETUP_SECRET со значением"
  echo "  3. Redeploy проект"
  exit 1
fi

# Проверка URL
if [ -z "$VERCEL_URL" ]; then
  echo "⚠️  VERCEL_URL не задан, используй свой домен:"
  read -p "Введи URL проекта (например: https://your-app.vercel.app): " VERCEL_URL
fi

echo "🌐 URL: $VERCEL_URL"
echo "🔑 SETUP_SECRET: ${SETUP_SECRET:0:10}..."
echo ""

# Проверяем статус
echo "1️⃣ Проверяю статус инициализации..."
STATUS=$(curl -s "$VERCEL_URL/api/setup/initialize")
echo "Статус: $STATUS"
echo ""

# Инициализируем
echo "2️⃣ Запускаю инициализацию..."
echo ""

RESPONSE=$(curl -s -X POST "$VERCEL_URL/api/setup/initialize" \
  -H "Authorization: Bearer $SETUP_SECRET" \
  -H "Content-Type: application/json")

echo "$RESPONSE" | jq . || echo "$RESPONSE"

echo ""
echo "✅ Готово!"
echo ""
echo "📋 Следующие шаги:"
echo "  1. Проверь что пользователи созданы"
echo "  2. Зайди на $VERCEL_URL/login"
echo "  3. Используй креденшалы из USERS_LIST.md"
echo ""

