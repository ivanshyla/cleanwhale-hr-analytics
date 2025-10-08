# ⏰ Автоматическая отправка еженедельных отчетов

## Описание

Система автоматически генерирует и отправляет AI-отчет для правления **каждый понедельник в 12:00** (по UTC).

## Конфигурация

### 1. Vercel Cron Job (`vercel.json`)

```json
{
  "crons": [
    {
      "path": "/api/cron/weekly-report",
      "schedule": "0 12 * * 1"
    }
  ]
}
```

**Schedule формат:** `минута час день месяц день_недели`
- `0 12 * * 1` = Каждый понедельник в 12:00 UTC (15:00 по Варшаве)

### 2. Переменные окружения (`.env`)

```env
CRON_SECRET=cleanwhale_cron_secret_2024_secure_key
TELEGRAM_BOT_TOKEN=7983513621:AAEhkYoAhpsgUD4A1GrZaqnZERKJBbyFs9Y
TELEGRAM_CHAT_ID=-834590892
```

## Как это работает

1. **Vercel** вызывает endpoint `/api/cron/weekly-report` каждый понедельник в 12:00 UTC
2. **Endpoint** проверяет секретный ключ (`CRON_SECRET`) для безопасности
3. **Система** загружает данные за прошедшую неделю из базы данных
4. **OpenAI** генерирует профессиональный отчет с анализом и рекомендациями
5. **Telegram Bot** автоматически отправляет отчет в чат правления "CleanWhale Board"

## API Endpoint

`GET /api/cron/weekly-report`

### Headers
```
Authorization: Bearer ${CRON_SECRET}
```

### Response (success)
```json
{
  "success": true,
  "message": "Weekly report generated and sent",
  "weekIso": "2025-W39",
  "sentToTelegram": true,
  "reportLength": 1400,
  "timestamp": "2025-10-08T09:07:44.486Z"
}
```

### Response (no data)
```json
{
  "success": true,
  "message": "No data available, notification sent",
  "weekIso": "2025-W39"
}
```

Если данных нет, система отправит предупреждающее сообщение в Telegram.

### Response (error)
```json
{
  "success": false,
  "error": "error message"
}
```

При ошибке система также отправит уведомление об ошибке в Telegram.

## Формат отчета

Отчет включает:

1. **Executive Summary** - краткие выводы для правления
2. **Ключевые метрики** с динамикой (↑↓%) за 4 недели
3. **Анализ по городам** - производительность по локациям
4. **Анализ по типам менеджеров** - HR vs Ops vs Mixed
5. **Проблемные зоны** - что требует внимания
6. **Достижения** - что работает хорошо
7. **Прогноз** - ожидания на следующую неделю

## Ручной запуск (для тестирования)

Вы можете вручную запустить генерацию отчета через API:

```bash
curl -X GET https://your-domain.vercel.app/api/cron/weekly-report \
  -H "Authorization: Bearer ${CRON_SECRET}"
```

Или через страницу Analytics:
1. Войдите как `country_manager` или `admin`
2. Перейдите на страницу **"Аналитика"**
3. Нажмите кнопку **"🧠 AI Отчет для правления"**

## Безопасность

- ✅ Endpoint защищен секретным ключом `CRON_SECRET`
- ✅ Доступ только для авторизованных запросов
- ✅ Vercel автоматически проверяет подпись запроса от Cron
- ✅ Токен Telegram Bot не коммитится в Git

## Мониторинг

### Vercel Dashboard
- Логи выполнения: https://vercel.com/your-project/logs
- Статус Cron Jobs: https://vercel.com/your-project/crons

### Telegram
- Отчеты приходят в чат "CleanWhale Board"
- При ошибках приходят уведомления

## Настройка расписания

Если нужно изменить время отправки, отредактируйте `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/weekly-report",
      "schedule": "0 14 * * 1"  // Понедельник в 14:00 UTC (17:00 Варшава)
    }
  ]
}
```

**Примеры расписаний:**
- `0 9 * * 1` - Понедельник в 09:00 UTC (12:00 Варшава)
- `0 12 * * 1` - Понедельник в 12:00 UTC (15:00 Варшава) ⬅️ **ТЕКУЩЕЕ**
- `0 15 * * 1` - Понедельник в 15:00 UTC (18:00 Варшава)
- `0 12 * * 5` - Пятница в 12:00 UTC

После изменения нужно задеплоить на Vercel: `git push origin main`

## Файлы

- **`/src/app/api/cron/weekly-report/route.ts`** - Cron endpoint
- **`/src/lib/telegram.ts`** - Telegram интеграция
- **`/vercel.json`** - Конфигурация Vercel Cron
- **`.env`** - Секретные ключи (не в Git)

## Тестирование

✅ **Протестировано:** 08.10.2025
- Генерация отчета: ✅
- Отправка в Telegram: ✅
- Формат Markdown: ✅
- Кириллица: ✅

**Результат теста:**
```json
{
  "success": true,
  "weekIso": "2025-W39",
  "sentToTelegram": true,
  "reportLength": 1400
}
```

Отчет успешно доставлен в чат "CleanWhale Board".

## Troubleshooting

### Отчет не приходит
1. Проверьте логи в Vercel Dashboard
2. Проверьте, что `CRON_SECRET` настроен в Vercel Environment Variables
3. Проверьте, что Telegram credentials корректны

### Отчет приходит пустой
1. Убедитесь, что менеджеры заполнили еженедельные отчеты
2. Проверьте данные в базе данных для нужной недели
3. Если данных нет, система отправит предупреждение

### Ошибка OpenAI
1. Проверьте, что `OPENAI_API_KEY` настроен
2. Проверьте лимиты API на https://platform.openai.com/usage
3. Проверьте баланс аккаунта OpenAI

---

**Автоматизация работает! 🎉**

Каждый понедельник в 15:00 (по Варшаве) правление автоматически получает подробный AI-отчет с аналитикой за прошедшую неделю.

