#!/bin/bash

echo "🚀 Настройка HR Analytics Dashboard..."

# Проверяем наличие Docker
if ! command -v docker &> /dev/null; then
    echo "❌ Docker не установлен. Установите Docker и Docker Compose."
    exit 1
fi

# Создаем .env файл если его нет
if [ ! -f .env ]; then
    echo "📝 Создаем .env файл..."
    cat > .env << EOF
# Database
DATABASE_URL="postgresql://postgres:password@localhost:5432/hr_analytics_db?schema=public"

# Authentication
JWT_SECRET="hr-analytics-super-secret-jwt-key-2024"

# OpenAI Integration (для AI аналитики)
OPENAI_API_KEY=""

# Trengo Integration
TRENGO_API_TOKEN=""
TRENGO_BASE_URL="https://app.trengo.com/api/v2"

# CRM Integration
CRM_API_URL=""
CRM_API_KEY=""

# App Settings
NEXT_PUBLIC_APP_NAME="CleanWhale Analytics"
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# Development
NODE_ENV="development"
EOF
    echo "✅ .env файл создан"
fi

# Запускаем PostgreSQL через Docker
echo "🐘 Запускаем PostgreSQL..."
docker-compose up -d postgres

# Ждем пока база данных запустится
echo "⏳ Ждем запуска базы данных..."
sleep 5

# Устанавливаем зависимости
echo "📦 Устанавливаем зависимости..."
npm install

# Генерируем Prisma Client
echo "🔧 Генерируем Prisma Client..."
npx prisma generate

# Применяем миграции
echo "🗄️ Применяем схему базы данных..."
npx prisma db push

# Заполняем демо данными
echo "🌱 Заполняем демо данными..."
npm run db:seed

echo ""
echo "🎉 Настройка завершена!"
echo ""
echo "📋 Демо пользователи:"
echo "   admin / password123 (Админ)"
echo "   country_manager / password123 (Менеджер по стране)"
echo "   hr_manager / password123 (HR - Варшава)"
echo "   ops_manager / password123 (Операции - Варшава)"
echo "   mixed_manager / password123 (Смешанный - Краков)"
echo ""
echo "🚀 Запустите приложение: npm run dev"
echo "🌐 Откройте: http://localhost:3000"
