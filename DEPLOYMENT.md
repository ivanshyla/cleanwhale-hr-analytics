# 🚀 Развертывание CleanWhale Analytics

## Проблема с деплоем

Сейчас приложение показывает **"Внутренняя ошибка сервера"** при логине, потому что:

1. ❌ Не настроены переменные окружения
2. ❌ Не настроена база данных PostgreSQL  
3. ❌ Не выполнена миграция схемы
4. ❌ Не созданы тестовые пользователи

## 🔧 Быстрое исправление

### 1. Настройка переменных окружения

Создайте в корне проекта файл `.env` со следующим содержимым:

```bash
# Database (ОБЯЗАТЕЛЬНО)
DATABASE_URL="postgresql://username:password@localhost:5432/cleanwhale_analytics"

# JWT Secret (ОБЯЗАТЕЛЬНО)
JWT_SECRET="your-super-secret-jwt-key-change-this-in-production"

# OpenAI (опционально, для AI функций)
OPENAI_API_KEY="your-openai-api-key"

# Next.js
NEXTAUTH_SECRET="your-nextauth-secret"
NEXTAUTH_URL="https://your-domain.com"
```

### 2. Настройка базы данных

```bash
# Установить зависимости
npm install

# Применить миграции Prisma
npx prisma migrate deploy

# Создать тестовых пользователей
npx prisma db seed
```

### 3. Тестовые пользователи

После выполнения seed будут созданы следующие пользователи:

| Логин | Пароль | Роль |
|-------|--------|------|
| `admin` | `password123` | Администратор |
| `country_manager` | `password123` | Менеджер по стране |
| `hr_manager` | `password123` | HR менеджер |
| `ops_manager` | `password123` | Операционный менеджер |
| `mixed_manager` | `password123` | Смешанная роль |

## 🔧 Для продакшена (Vercel/Railway/etc)

### Переменные окружения:

```bash
DATABASE_URL="postgresql://user:pass@host:port/db"
JWT_SECRET="secure-random-string-256-bit"
NEXTAUTH_SECRET="another-secure-random-string"
NEXTAUTH_URL="https://your-production-domain.com"
```

### Команды деплоя:

```bash
# Build команды
npm run build

# После деплоя - один раз выполнить:
npx prisma migrate deploy
npx prisma db seed
```

## 🐛 Отладка

Если логин все еще не работает, проверьте:

1. **Логи сервера** - ошибки подключения к БД
2. **Переменные окружения** - все ли установлены
3. **База данных** - доступна ли, есть ли таблицы
4. **JWT_SECRET** - не пустой ли

## 📞 Быстрый тест

После настройки попробуйте войти с:
- **Логин**: `hr_manager`  
- **Пароль**: `password123`

Если вход успешен - система работает! 🎉
