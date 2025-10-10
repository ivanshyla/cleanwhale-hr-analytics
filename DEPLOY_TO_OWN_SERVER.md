# 🚀 Развертывание на собственном сервере

## 📋 Содержание
1. [Требования](#требования)
2. [Быстрый старт с Docker](#быстрый-старт-с-docker)
3. [Настройка домена и SSL](#настройка-домена-и-ssl)
4. [Настройка Cron Jobs](#настройка-cron-jobs)
5. [Обновление приложения](#обновление-приложения)
6. [Мониторинг и логи](#мониторинг-и-логи)

---

## 🔧 Требования

### Минимальные требования к серверу:
- **OS**: Ubuntu 20.04+ / Debian 11+ / CentOS 8+
- **RAM**: 2 GB минимум, 4 GB рекомендуется
- **Disk**: 20 GB свободного места
- **CPU**: 2 ядра минимум
- **Доступ**: SSH с правами sudo

### Установите Docker (если еще не установлен):

```bash
# Ubuntu/Debian
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Перелогиньтесь для применения прав
exit
```

---

## 🐳 Быстрый старт с Docker

### Шаг 1: Загрузите проект на сервер

```bash
# Клонируйте репозиторий
git clone <your-repo-url> /var/www/cleanwhale
cd /var/www/cleanwhale

# Или загрузите через rsync/scp с локальной машины
rsync -avz --exclude 'node_modules' \
  /Users/ivanshyla/KalinkowaAI/ \
  user@your-server:/var/www/cleanwhale/
```

### Шаг 2: Настройте переменные окружения

```bash
# Создайте .env.production файл
cp .env.production.example .env.production
nano .env.production
```

**Заполните важные переменные:**

```bash
# Сгенерируйте надежные секреты:
openssl rand -base64 32  # для JWT_SECRET
openssl rand -base64 32  # для NEXTAUTH_SECRET
openssl rand -base64 32  # для POSTGRES_PASSWORD

# Добавьте в .env.production:
POSTGRES_PASSWORD=<generated-password>
JWT_SECRET=<generated-secret>
NEXTAUTH_SECRET=<generated-secret>
NEXTAUTH_URL=https://your-domain.com  # или http://your-server-ip:3000
OPENAI_API_KEY=sk-your-key  # если нужны AI функции
```

### Шаг 3: Обновите next.config для standalone

Откройте `next.config.ts` и добавьте:

```typescript
const config: NextConfig = {
  output: 'standalone',  // 👈 Добавьте эту строку!
  // ... остальные настройки
};
```

### Шаг 4: Запустите проект

```bash
# Соберите и запустите контейнеры
docker-compose -f docker-compose.prod.yml --env-file .env.production up -d

# Проверьте статус
docker-compose -f docker-compose.prod.yml ps

# Посмотрите логи
docker-compose -f docker-compose.prod.yml logs -f app
```

### Шаг 5: Инициализируйте базу данных

```bash
# Войдите в контейнер приложения
docker exec -it cleanwhale-app sh

# Выполните миграции
npx prisma migrate deploy

# Создайте начальных пользователей (опционально)
npx prisma db seed

# Выйдите из контейнера
exit
```

### Шаг 6: Проверьте работу

```bash
# Проверьте доступность
curl http://localhost:3000

# Если используете nginx, проверьте на порту 80
curl http://localhost
```

**Готово!** 🎉 Приложение доступно по адресу:
- Без nginx: `http://your-server-ip:3000`
- С nginx: `http://your-server-ip`

---

## 🌐 Настройка домена и SSL

### Шаг 1: Настройте DNS

В панели управления вашим доменом создайте A-запись:

```
A    @              -> IP_ВАШЕГО_СЕРВЕРА
A    www            -> IP_ВАШЕГО_СЕРВЕРА
```

### Шаг 2: Установите Certbot для SSL (Let's Encrypt)

```bash
# Установите Certbot
sudo apt update
sudo apt install certbot

# Получите SSL сертификат
sudo certbot certonly --standalone -d your-domain.com -d www.your-domain.com

# Сертификаты будут сохранены в:
# /etc/letsencrypt/live/your-domain.com/fullchain.pem
# /etc/letsencrypt/live/your-domain.com/privkey.pem
```

### Шаг 3: Обновите nginx.conf

Создайте папку для SSL:

```bash
mkdir -p ssl
sudo cp /etc/letsencrypt/live/your-domain.com/fullchain.pem ssl/
sudo cp /etc/letsencrypt/live/your-domain.com/privkey.pem ssl/
sudo chmod 644 ssl/*.pem
```

Раскомментируйте HTTPS секцию в `nginx.conf` и обновите `server_name`:

```nginx
server {
    listen 443 ssl http2;
    server_name your-domain.com www.your-domain.com;

    ssl_certificate /etc/nginx/ssl/fullchain.pem;
    ssl_certificate_key /etc/nginx/ssl/privkey.pem;
    # ... остальное
}
```

Перезапустите nginx:

```bash
docker-compose -f docker-compose.prod.yml restart nginx
```

### Шаг 4: Автообновление SSL

```bash
# Добавьте в crontab
sudo crontab -e

# Добавьте эту строку (обновление каждые 3 месяца)
0 3 1 */3 * certbot renew --quiet && cp /etc/letsencrypt/live/your-domain.com/*.pem /var/www/cleanwhale/ssl/ && docker-compose -f /var/www/cleanwhale/docker-compose.prod.yml restart nginx
```

---

## ⏰ Настройка Cron Jobs

Ваше приложение использует еженедельные отчеты. Настройте cron на сервере:

```bash
# Откройте crontab
crontab -e

# Добавьте задачу (каждый понедельник в 12:00)
0 12 * * 1 curl -X POST http://localhost:3000/api/cron/weekly-report \
  -H "Authorization: Bearer ${CRON_SECRET}" \
  >> /var/log/cleanwhale-cron.log 2>&1
```

Или используйте docker для запуска:

```bash
# Создайте скрипт /usr/local/bin/cleanwhale-cron.sh
#!/bin/bash
docker exec cleanwhale-app node -e "
  const fetch = require('node-fetch');
  fetch('http://localhost:3000/api/cron/weekly-report', {
    method: 'POST',
    headers: {'Authorization': 'Bearer ${process.env.CRON_SECRET}'}
  }).then(r => console.log('Cron executed:', r.status));
"
```

```bash
# Сделайте исполняемым
sudo chmod +x /usr/local/bin/cleanwhale-cron.sh

# Добавьте в crontab
0 12 * * 1 /usr/local/bin/cleanwhale-cron.sh >> /var/log/cleanwhale-cron.log 2>&1
```

---

## 🔄 Обновление приложения

При обновлении кода:

```bash
cd /var/www/cleanwhale

# Заберите последние изменения
git pull origin main

# Пересоберите и перезапустите
docker-compose -f docker-compose.prod.yml build app
docker-compose -f docker-compose.prod.yml up -d app

# Выполните миграции (если есть)
docker exec -it cleanwhale-app npx prisma migrate deploy

# Проверьте логи
docker-compose -f docker-compose.prod.yml logs -f app
```

### Автоматическое обновление (опционально)

Создайте скрипт `/usr/local/bin/cleanwhale-update.sh`:

```bash
#!/bin/bash
cd /var/www/cleanwhale
git pull origin main
docker-compose -f docker-compose.prod.yml build app
docker-compose -f docker-compose.prod.yml up -d app
docker exec cleanwhale-app npx prisma migrate deploy
```

---

## 📊 Мониторинг и логи

### Просмотр логов

```bash
# Все логи
docker-compose -f docker-compose.prod.yml logs -f

# Только приложение
docker-compose -f docker-compose.prod.yml logs -f app

# Только база данных
docker-compose -f docker-compose.prod.yml logs -f postgres

# Последние 100 строк
docker-compose -f docker-compose.prod.yml logs --tail=100 app
```

### Мониторинг ресурсов

```bash
# Статистика контейнеров
docker stats

# Использование дискового пространства
docker system df

# Очистка неиспользуемых образов
docker system prune -a
```

### Бэкап базы данных

```bash
# Создайте скрипт /usr/local/bin/cleanwhale-backup.sh
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/var/backups/cleanwhale"
mkdir -p $BACKUP_DIR

docker exec cleanwhale-db pg_dump -U cleanwhale_user cleanwhale_analytics \
  | gzip > $BACKUP_DIR/backup_$DATE.sql.gz

# Удалить бэкапы старше 30 дней
find $BACKUP_DIR -name "backup_*.sql.gz" -mtime +30 -delete
```

```bash
# Сделайте исполняемым
sudo chmod +x /usr/local/bin/cleanwhale-backup.sh

# Добавьте в crontab (каждый день в 2:00 ночи)
0 2 * * * /usr/local/bin/cleanwhale-backup.sh
```

---

## 🔒 Безопасность

### Firewall

```bash
# Ubuntu UFW
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw enable

# CentOS/RHEL firewalld
sudo firewall-cmd --permanent --add-service=ssh
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --reload
```

### Регулярные обновления

```bash
# Настройте автообновления безопасности
sudo apt install unattended-upgrades
sudo dpkg-reconfigure -plow unattended-upgrades
```

---

## 🆘 Troubleshooting

### Приложение не запускается

```bash
# Проверьте логи
docker-compose -f docker-compose.prod.yml logs app

# Проверьте переменные окружения
docker exec cleanwhale-app env | grep DATABASE_URL

# Пересоздайте контейнеры
docker-compose -f docker-compose.prod.yml down
docker-compose -f docker-compose.prod.yml up -d
```

### База данных не подключается

```bash
# Проверьте статус
docker-compose -f docker-compose.prod.yml ps

# Проверьте логи БД
docker-compose -f docker-compose.prod.yml logs postgres

# Подключитесь к БД вручную
docker exec -it cleanwhale-db psql -U cleanwhale_user -d cleanwhale_analytics
```

### Недостаточно памяти

```bash
# Увеличьте память для Node.js в docker-compose.prod.yml
environment:
  NODE_OPTIONS: "--max-old-space-size=4096"
```

---

## 📞 Поддержка

Если возникли проблемы:
1. Проверьте логи: `docker-compose logs`
2. Проверьте статус: `docker-compose ps`
3. Проверьте переменные окружения
4. Убедитесь, что порты не заняты: `sudo netstat -tulpn | grep -E '(3000|5432|80|443)'`

---

**Готово!** Ваш проект развернут на собственном сервере! 🎉




