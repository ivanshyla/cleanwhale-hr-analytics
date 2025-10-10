#!/usr/bin/env node

/**
 * Скрипт для обновления DATABASE_URL в Vercel с оптимизированными параметрами
 * для совместимости Prisma + PgBouncer
 */

import { execSync } from 'child_process';

const OPTIMIZED_DATABASE_URL = 'postgresql://postgres.msluhxhvayzgxfioxgdi:zYjbam-hahheh-mawmo2@aws-1-eu-central-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connect_timeout=30&statement_cache_size=0';

const environments = ['production', 'preview', 'development'];

console.log('🔧 Обновление DATABASE_URL для всех окружений Vercel...\n');

for (const env of environments) {
  try {
    console.log(`📝 Обновление ${env}...`);
    
    // Удаляем старую переменную
    try {
      execSync(`vercel env rm DATABASE_URL ${env} --yes`, { stdio: 'pipe' });
      console.log(`  ✅ Удален старый DATABASE_URL для ${env}`);
    } catch (error) {
      console.log(`  ⚠️  Старый DATABASE_URL для ${env} не найден или уже удален`);
    }
    
    // Добавляем новую переменную
    execSync(`echo '${OPTIMIZED_DATABASE_URL}' | vercel env add DATABASE_URL ${env}`, { stdio: 'pipe' });
    console.log(`  ✅ Добавлен оптимизированный DATABASE_URL для ${env}`);
    
  } catch (error) {
    console.error(`  ❌ Ошибка при обновлении ${env}:`, error.message);
  }
}

console.log('\n🎉 Обновление завершено!');
console.log('\n📋 Что было исправлено:');
console.log('  • Добавлен pgbouncer=true для использования PgBouncer');
console.log('  • Добавлен connect_timeout=30 для таймаута подключения');
console.log('  • Добавлен statement_cache_size=0 для отключения prepared statements');
console.log('  • Используется pooler-хост на порту 6543');
console.log('\n🚀 Теперь нужно сделать redeploy для применения изменений:');
console.log('  git commit --allow-empty -m "trigger redeploy for DATABASE_URL fix"');
console.log('  git push');