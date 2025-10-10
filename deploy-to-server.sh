#!/bin/bash

# 🚀 Скрипт быстрого деплоя на собственный сервер
# Использование: ./deploy-to-server.sh [server-user@server-ip]

set -e  # Остановка при ошибке

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🚀 CleanWhale Analytics - Развертывание на сервер${NC}"
echo "=================================================="

# Проверка аргументов
if [ -z "$1" ]; then
  echo -e "${RED}❌ Ошибка: Укажите адрес сервера${NC}"
  echo "Использование: ./deploy-to-server.sh user@server-ip"
  echo "Пример: ./deploy-to-server.sh root@192.168.1.100"
  exit 1
fi

SERVER=$1
REMOTE_PATH="/var/www/cleanwhale"

echo -e "${YELLOW}📡 Сервер: $SERVER${NC}"
echo -e "${YELLOW}📁 Путь: $REMOTE_PATH${NC}"
echo ""

# Шаг 1: Проверка подключения
echo -e "${GREEN}[1/6] Проверка подключения к серверу...${NC}"
if ! ssh -o ConnectTimeout=5 $SERVER "echo 'Подключение успешно'" > /dev/null 2>&1; then
  echo -e "${RED}❌ Не удалось подключиться к серверу${NC}"
  echo "Проверьте SSH ключи и доступность сервера"
  exit 1
fi
echo -e "${GREEN}✅ Подключение установлено${NC}"

# Шаг 2: Создание директории
echo -e "${GREEN}[2/6] Создание директории на сервере...${NC}"
ssh $SERVER "mkdir -p $REMOTE_PATH"
echo -e "${GREEN}✅ Директория готова${NC}"

# Шаг 3: Загрузка файлов
echo -e "${GREEN}[3/6] Загрузка файлов на сервер...${NC}"
rsync -avz --progress \
  --exclude 'node_modules' \
  --exclude '.next' \
  --exclude '.git' \
  --exclude 'dev.db' \
  --exclude '.env*' \
  ./ $SERVER:$REMOTE_PATH/

echo -e "${GREEN}✅ Файлы загружены${NC}"

# Шаг 4: Проверка .env файла
echo -e "${GREEN}[4/6] Проверка файла окружения...${NC}"
if ssh $SERVER "[ ! -f $REMOTE_PATH/.env.production ]"; then
  echo -e "${YELLOW}⚠️  Файл .env.production не найден${NC}"
  echo ""
  echo "Создайте файл .env.production на сервере:"
  echo "  ssh $SERVER"
  echo "  cd $REMOTE_PATH"
  echo "  nano .env.production"
  echo ""
  echo "Минимальная конфигурация:"
  echo "----------------------------------------"
  cat << 'EOF'
POSTGRES_PASSWORD=$(openssl rand -base64 32)
JWT_SECRET=$(openssl rand -base64 32)
NEXTAUTH_SECRET=$(openssl rand -base64 32)
NEXTAUTH_URL=https://your-domain.com
OPENAI_API_KEY=sk-your-key
EOF
  echo "----------------------------------------"
  echo ""
  read -p "Создать файл сейчас? (y/n): " -n 1 -r
  echo
  if [[ $REPLY =~ ^[Yy]$ ]]; then
    ssh $SERVER "cd $REMOTE_PATH && cat > .env.production" << 'ENVEOF'
# Сгенерированные секреты (ОБЯЗАТЕЛЬНО ИЗМЕНИТЕ!)
POSTGRES_PASSWORD=CHANGE_THIS_PASSWORD_NOW
JWT_SECRET=CHANGE_THIS_SECRET_NOW
NEXTAUTH_SECRET=CHANGE_THIS_SECRET_NOW
NEXTAUTH_URL=http://localhost:3000
OPENAI_API_KEY=

# Опционально
TELEGRAM_BOT_TOKEN=
TELEGRAM_CHAT_ID=
CRON_SECRET=
ENVEOF
    echo -e "${GREEN}✅ Шаблон .env.production создан${NC}"
    echo -e "${YELLOW}⚠️  НЕ ЗАБУДЬТЕ изменить секреты перед запуском!${NC}"
    echo "  ssh $SERVER"
    echo "  nano $REMOTE_PATH/.env.production"
    exit 0
  else
    echo -e "${RED}Деплой остановлен. Создайте .env.production и запустите скрипт снова.${NC}"
    exit 1
  fi
else
  echo -e "${GREEN}✅ Файл .env.production найден${NC}"
fi

# Шаг 5: Запуск Docker
echo -e "${GREEN}[5/6] Запуск Docker контейнеров...${NC}"
ssh $SERVER "cd $REMOTE_PATH && docker-compose -f docker-compose.prod.yml --env-file .env.production up -d --build"
echo -e "${GREEN}✅ Контейнеры запущены${NC}"

# Шаг 6: Инициализация БД
echo -e "${GREEN}[6/6] Инициализация базы данных...${NC}"
echo -e "${YELLOW}Ожидание запуска контейнеров (30 сек)...${NC}"
sleep 30

ssh $SERVER "cd $REMOTE_PATH && docker exec cleanwhale-app npx prisma migrate deploy" || {
  echo -e "${YELLOW}⚠️  Миграция не выполнена (возможно, уже применена)${NC}"
}

read -p "Создать тестовых пользователей? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
  ssh $SERVER "cd $REMOTE_PATH && docker exec cleanwhale-app npx prisma db seed" || {
    echo -e "${YELLOW}⚠️  Seed не выполнен (возможно, уже выполнен)${NC}"
  }
fi

echo ""
echo -e "${GREEN}✅ Деплой завершен!${NC}"
echo ""
echo "=================================================="
echo -e "${GREEN}🎉 Приложение развернуто!${NC}"
echo "=================================================="
echo ""
echo "Доступ к приложению:"
SERVER_IP=$(echo $SERVER | cut -d'@' -f2)
echo "  🌐 С nginx: http://$SERVER_IP"
echo "  🌐 Без nginx: http://$SERVER_IP:3000"
echo ""
echo "Полезные команды:"
echo "  📊 Логи:        ssh $SERVER 'cd $REMOTE_PATH && docker-compose -f docker-compose.prod.yml logs -f'"
echo "  🔄 Рестарт:     ssh $SERVER 'cd $REMOTE_PATH && docker-compose -f docker-compose.prod.yml restart'"
echo "  🛑 Остановка:   ssh $SERVER 'cd $REMOTE_PATH && docker-compose -f docker-compose.prod.yml down'"
echo "  🔍 Статус:      ssh $SERVER 'cd $REMOTE_PATH && docker-compose -f docker-compose.prod.yml ps'"
echo ""
echo "Тестовые пользователи (если создавали):"
echo "  👤 Логин: hr_manager"
echo "  🔑 Пароль: password123"
echo ""
echo "Следующие шаги:"
echo "  1. Настройте домен и SSL (см. DEPLOY_TO_OWN_SERVER.md)"
echo "  2. Настройте cron jobs для еженедельных отчетов"
echo "  3. Настройте бэкапы базы данных"
echo ""




