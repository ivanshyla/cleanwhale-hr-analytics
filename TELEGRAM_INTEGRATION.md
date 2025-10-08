# 📱 Telegram Integration

## Описание

AI отчеты для правления автоматически отправляются в Telegram чат после генерации.

## Конфигурация

В файле `.env` настроены:

```env
TELEGRAM_BOT_TOKEN=7983513621:AAEhkYoAhpsgUD4A1GrZaqnZERKJBbyFs9Y
TELEGRAM_CHAT_ID=-834590892
```

## Как это работает

1. **Генерация отчета**: Когда Country Manager или Admin генерирует AI отчет через страницу Analytics
2. **Автоматическая отправка**: Отчет автоматически отправляется в Telegram чат "CleanWhale Board"
3. **Формат**: Отчет отправляется в Markdown формате с форматированием

## API Endpoint

`POST /api/export/ai-report`

### Response

```json
{
  "success": true,
  "report": "...",
  "weekIso": "2025-W41",
  "generatedAt": "2025-10-08T10:00:00.000Z",
  "sentToTelegram": true
}
```

## Используемые файлы

- **`/src/lib/telegram.ts`** - утилиты для работы с Telegram Bot API
- **`/src/app/api/export/ai-report/route.ts`** - генерация и отправка отчетов
- **`.env`** - конфигурация (токены не коммитятся в Git)

## Функции

### `sendTelegramMessage(text: string)`

Отправка текстового сообщения в настроенный чат.

```typescript
import { sendTelegramMessage } from '@/lib/telegram';

await sendTelegramMessage('Привет из CleanWhale!');
```

### `sendTelegramDocument(fileContent: string, fileName: string, caption?: string)`

Отправка файла в Telegram.

```typescript
import { sendTelegramDocument } from '@/lib/telegram';

await sendTelegramDocument(
  reportContent,
  'report.md',
  'Отчет за неделю 41'
);
```

### `isTelegramConfigured()`

Проверка наличия конфигурации Telegram.

```typescript
import { isTelegramConfigured } from '@/lib/telegram';

if (isTelegramConfigured()) {
  // Telegram настроен
}
```

## Преимущества

✅ **Автоматизация**: Отчеты сразу попадают в чат правления  
✅ **Удобство**: Не нужно скачивать и пересылать файлы вручную  
✅ **Уведомления**: Telegram присылает push-уведомления  
✅ **История**: Все отчеты сохраняются в чате  
✅ **Доступность**: Можно читать с любого устройства  

## Безопасность

⚠️ **Важно**: 
- Токен бота и Chat ID хранятся в `.env` (не в Git)
- Бот имеет доступ только к одному чату
- Отчеты содержат внутреннюю информацию компании

## Тестирование

Telegram интеграция протестирована:
- ✅ Отправка текстовых сообщений
- ✅ Markdown форматирование
- ✅ Кириллица
- ✅ Длинные сообщения (AI отчеты ~2-3 KB)

**Тестовое сообщение успешно доставлено в чат "CleanWhale Board"** (Message ID: 914)

