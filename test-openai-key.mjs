// Быстрая проверка OpenAI API ключа
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Загружаем .env
config({ path: join(__dirname, '.env') });

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

console.log('🔑 Проверка OpenAI API ключа...\n');

if (!OPENAI_API_KEY) {
  console.log('❌ OPENAI_API_KEY не найден в .env');
  process.exit(1);
}

console.log(`✅ Ключ найден: ${OPENAI_API_KEY.substring(0, 20)}...`);
console.log('📡 Проверяю валидность ключа...\n');

// Проверяем ключ минимальным запросом
try {
  const response = await fetch('https://api.openai.com/v1/models', {
    headers: {
      'Authorization': `Bearer ${OPENAI_API_KEY}`
    }
  });

  if (response.ok) {
    const data = await response.json();
    console.log('✅ OpenAI API ключ валиден!');
    console.log(`📊 Доступно моделей: ${data.data.length}`);
    
    // Проверяем есть ли gpt-4o-mini
    const hasGPT4Mini = data.data.some(m => m.id === 'gpt-4o-mini');
    if (hasGPT4Mini) {
      console.log('✅ Модель gpt-4o-mini доступна');
    } else {
      console.log('⚠️  Модель gpt-4o-mini не найдена');
    }
    
    console.log('\n🎉 Всё готово для генерации AI отчетов!');
  } else {
    const error = await response.json();
    console.log('❌ Ошибка валидации ключа:');
    console.log(error);
    
    if (response.status === 401) {
      console.log('\n💡 Ключ недействителен или истек. Получите новый на https://platform.openai.com/api-keys');
    } else if (response.status === 429) {
      console.log('\n💡 Превышен лимит запросов. Подождите или проверьте баланс на https://platform.openai.com/usage');
    }
  }
} catch (error) {
  console.log('❌ Ошибка подключения к OpenAI API:');
  console.log(error.message);
  console.log('\n💡 Проверьте интернет-соединение');
}



