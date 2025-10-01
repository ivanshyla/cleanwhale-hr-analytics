#!/bin/bash

echo "🚀 Настройка HR Analytics Dashboard (локальная версия)..."

# Создаем .env файл для SQLite
if [ ! -f .env ]; then
    echo "📝 Создаем .env файл..."
    cat > .env << EOF
# Database (SQLite для разработки)
DATABASE_URL="file:./dev.db"

# Authentication
JWT_SECRET="hr-analytics-super-secret-jwt-key-2024"

# OpenAI Integration (для AI аналитики)
OPENAI_API_KEY=""

# Trengo Integration
TRENGO_API_TOKEN=""
TRENGO_BASE_URL="https://app.trengo.com/api/v2"

# App Settings
NEXT_PUBLIC_APP_NAME="CleanWhale Analytics"
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# Development
NODE_ENV="development"
EOF
    echo "✅ .env файл создан"
fi

# Временно переключаем на SQLite для быстрого запуска
echo "🔧 Настраиваем SQLite для разработки..."
sed -i.bak 's/provider = "postgresql"/provider = "sqlite"/' prisma/schema.prisma
sed -i.bak 's/url      = env("DATABASE_URL")/url      = "file:..\/dev.db"/' prisma/schema.prisma

# Устанавливаем зависимости
echo "📦 Устанавливаем зависимости..."
npm install

# Генерируем Prisma Client
echo "🔧 Генерируем Prisma Client..."
npx prisma generate

# Применяем схему
echo "🗄️ Создаем базу данных..."
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
echo ""
echo "💡 Для продакшена настройте PostgreSQL и восстановите настройки в prisma/schema.prisma"
