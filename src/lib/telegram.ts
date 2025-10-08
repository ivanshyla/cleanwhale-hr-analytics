// Telegram Bot integration for sending reports

const TELEGRAM_API = 'https://api.telegram.org';

interface TelegramMessage {
  chat_id: string;
  text: string;
  parse_mode?: 'Markdown' | 'HTML';
  disable_web_page_preview?: boolean;
}

/**
 * Отправка сообщения в Telegram
 */
export async function sendTelegramMessage(text: string): Promise<boolean> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!token || !chatId) {
    console.error('❌ Telegram bot token or chat ID not configured');
    return false;
  }

  try {
    const message: TelegramMessage = {
      chat_id: chatId,
      text: text,
      parse_mode: 'Markdown',
      disable_web_page_preview: true
    };

    const response = await fetch(`${TELEGRAM_API}/bot${token}/sendMessage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message)
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('❌ Telegram API error:', error);
      return false;
    }

    const result = await response.json();
    console.log('✅ Message sent to Telegram:', result.result?.message_id);
    return true;
  } catch (error) {
    console.error('❌ Error sending Telegram message:', error);
    return false;
  }
}

/**
 * Отправка файла в Telegram
 */
export async function sendTelegramDocument(
  fileContent: string,
  fileName: string,
  caption?: string
): Promise<boolean> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!token || !chatId) {
    console.error('❌ Telegram bot token or chat ID not configured');
    return false;
  }

  try {
    const formData = new FormData();
    formData.append('chat_id', chatId);
    
    // Создаем Blob из текстового содержимого
    const blob = new Blob([fileContent], { type: 'text/markdown' });
    formData.append('document', blob, fileName);
    
    if (caption) {
      formData.append('caption', caption);
      formData.append('parse_mode', 'Markdown');
    }

    const response = await fetch(`${TELEGRAM_API}/bot${token}/sendDocument`, {
      method: 'POST',
      body: formData
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('❌ Telegram API error:', error);
      return false;
    }

    const result = await response.json();
    console.log('✅ Document sent to Telegram:', result.result?.message_id);
    return true;
  } catch (error) {
    console.error('❌ Error sending Telegram document:', error);
    return false;
  }
}

/**
 * Проверка конфигурации Telegram
 */
export function isTelegramConfigured(): boolean {
  return Boolean(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID);
}

