#!/usr/bin/env node
import https from 'https';
import { config } from 'dotenv';

config();

const token = process.env.VERCEL_TOKEN;
const projectId = process.env.VERCEL_PROJECT_ID;

if (!token) {
  console.error('❌ VERCEL_TOKEN не найден в .env');
  console.log('💡 Получи токен: https://vercel.com/account/tokens');
  process.exit(1);
}

if (!projectId) {
  console.error('❌ VERCEL_PROJECT_ID не найден в .env');
  console.log('💡 Найди ID проекта на странице проекта в Vercel');
  process.exit(1);
}

const newDatabaseUrl = 'postgresql://postgres.msluhxhvayzgxfioxgdi:zYjbam-hahheh-mawmo2@aws-1-eu-central-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connect_timeout=30&statement_cache_size=0';

console.log('🔧 Обновляю DATABASE_URL на Vercel...\n');

// Функция для HTTP запросов
function request(options, payload) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve({ status: res.statusCode, body: JSON.parse(body || '{}') });
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${body}`));
        }
      });
    });
    req.on('error', reject);
    if (payload) req.write(JSON.stringify(payload));
    req.end();
  });
}

async function main() {
  try {
    // 1. Получаем текущие env variables
    console.log('📋 Получаю текущие переменные...');
    const { body: envData } = await request({
      hostname: 'api.vercel.com',
      path: `/v9/projects/${projectId}/env`,
      method: 'GET',
      headers: { 'Authorization': `Bearer ${token}` },
    });

    const databaseUrlVars = envData.envs.filter(env => env.key === 'DATABASE_URL');
    
    if (databaseUrlVars.length === 0) {
      console.log('⚠️  DATABASE_URL не найден, создаю новый...\n');
    } else {
      console.log(`✅ Найдено ${databaseUrlVars.length} DATABASE_URL\n`);
      
      // Удаляем старые
      console.log('🗑️  Удаляю старые DATABASE_URL...');
      for (const envVar of databaseUrlVars) {
        await request({
          hostname: 'api.vercel.com',
          path: `/v9/projects/${projectId}/env/${envVar.id}`,
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` },
        });
        console.log(`   ✅ Удален: ${envVar.target?.join(', ') || 'all'}`);
      }
      console.log('');
    }

    // 2. Создаем новые DATABASE_URL для всех окружений
    console.log('✨ Создаю новые DATABASE_URL со statement_cache_size=0...');
    
    for (const target of ['production', 'preview', 'development']) {
      await request({
        hostname: 'api.vercel.com',
        path: `/v10/projects/${projectId}/env`,
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }, {
        key: 'DATABASE_URL',
        value: newDatabaseUrl,
        type: 'encrypted',
        target: [target],
      });
      console.log(`   ✅ ${target}`);
    }

    console.log('\n✅ DATABASE_URL обновлен на всех окружениях!\n');

    // 3. Запускаем redeploy
    console.log('🚀 Запускаю redeploy...');
    
    const { body: deployment } = await request({
      hostname: 'api.vercel.com',
      path: `/v13/deployments`,
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    }, {
      name: 'cleanwhale-hr-analytics',
      project: projectId,
      target: 'production',
      gitSource: {
        type: 'github',
        ref: 'main',
      },
    });

    console.log(`✅ Deployment запущен: ${deployment.id}`);
    console.log(`🔗 URL: https://vercel.com/ivanshyla/cleanwhale-hr-analytics/deployments/${deployment.id}`);
    console.log('\n⏱️  Подожди 1-2 минуты пока deployment завершится...');
    console.log('✅ После этого логин заработает!\n');

  } catch (error) {
    console.error('\n❌ Ошибка:', error.message);
    process.exit(1);
  }
}

main();

