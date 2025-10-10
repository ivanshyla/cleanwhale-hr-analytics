#!/usr/bin/env node
import { randomBytes } from 'crypto';

console.log('🔐 Генерация новых секретов для production\n');
console.log('=' .repeat(60));

// Генерируем безопасные случайные секреты
const jwtSecret = randomBytes(64).toString('base64');
const registrationSecret = randomBytes(32).toString('base64');
const cronSecret = randomBytes(32).toString('hex');

console.log('\n✅ НОВЫЕ СЕКРЕТЫ СГЕНЕРИРОВАНЫ:\n');

console.log('📌 JWT_SECRET (для авторизации):');
console.log(jwtSecret);
console.log('\n');

console.log('📌 REGISTRATION_SECRET (для регистрации):');
console.log(registrationSecret);
console.log('\n');

console.log('📌 CRON_SECRET (для крон-задач):');
console.log(cronSecret);
console.log('\n');

console.log('=' .repeat(60));
console.log('\n⚠️  ВАЖНО:');
console.log('1. Скопируйте эти значения в безопасное место');
console.log('2. НЕ коммитьте эти значения в git');
console.log('3. Следуйте инструкции в SETUP_SECRETS.md');
console.log('\n');

// Сохраняем в файл для удобства (с предупреждением)
import { writeFileSync } from 'fs';

const content = `# ⚠️  КРИТИЧНО: НЕ КОММИТИТЬ ЭТОТ ФАЙЛ!
# Этот файл должен быть немедленно удален после копирования секретов

JWT_SECRET="${jwtSecret}"
REGISTRATION_SECRET="${registrationSecret}"
CRON_SECRET="${cronSecret}"

# DATABASE_URL - используйте текущий из Vercel или создайте новый
# TELEGRAM_BOT_TOKEN - ваш токен бота
# TELEGRAM_CHAT_ID - ID чата для уведомлений
# OPENAI_API_KEY - ваш ключ OpenAI API
`;

writeFileSync('.env.secrets.tmp', content);
console.log('📄 Секреты также сохранены в файл: .env.secrets.tmp');
console.log('⚠️  Удалите этот файл после копирования секретов!\n');

