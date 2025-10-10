#!/usr/bin/env node
import { config } from 'dotenv';

config();

console.log('🔍 Проверка переменных окружения\n');
console.log('=' .repeat(60));

const requiredVars = {
  'DATABASE_URL': process.env.DATABASE_URL,
  'JWT_SECRET': process.env.JWT_SECRET,
  'REGISTRATION_SECRET': process.env.REGISTRATION_SECRET,
  'CRON_SECRET': process.env.CRON_SECRET,
};

const optionalVars = {
  'OPENAI_API_KEY': process.env.OPENAI_API_KEY,
  'TELEGRAM_BOT_TOKEN': process.env.TELEGRAM_BOT_TOKEN,
  'TELEGRAM_CHAT_ID': process.env.TELEGRAM_CHAT_ID,
};

let hasErrors = false;

console.log('\n🔴 ОБЯЗАТЕЛЬНЫЕ ПЕРЕМЕННЫЕ:\n');
for (const [key, value] of Object.entries(requiredVars)) {
  if (value && value.length > 10) {
    console.log(`✅ ${key}: настроен (${value.substring(0, 15)}...)`);
  } else if (value) {
    console.log(`⚠️  ${key}: слишком короткий (возможно ошибка)`);
    hasErrors = true;
  } else {
    console.log(`❌ ${key}: НЕ НАСТРОЕН`);
    hasErrors = true;
  }
}

console.log('\n🟡 ОПЦИОНАЛЬНЫЕ ПЕРЕМЕННЫЕ:\n');
for (const [key, value] of Object.entries(optionalVars)) {
  if (value && value.length > 5) {
    console.log(`✅ ${key}: настроен`);
  } else {
    console.log(`⚪ ${key}: не настроен (опционально)`);
  }
}

console.log('\n' + '='.repeat(60));

if (hasErrors) {
  console.log('\n❌ ОШИБКА: Не все обязательные переменные настроены!');
  console.log('\n📋 ЧТО ДЕЛАТЬ:');
  console.log('1. Создайте файл .env в корне проекта');
  console.log('2. Скопируйте в него значения из Vercel Dashboard');
  console.log('3. Или запустите: node generate-new-secrets.mjs');
  console.log('4. Следуйте инструкции в SETUP_SECRETS.md\n');
  process.exit(1);
} else {
  console.log('\n✅ ВСЁ ОТЛИЧНО! Все обязательные переменные настроены.');
  console.log('🚀 Система готова к работе!\n');
}

