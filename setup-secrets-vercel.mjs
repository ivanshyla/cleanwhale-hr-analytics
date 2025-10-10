#!/usr/bin/env node
/**
 * Автоматическая настройка секретов через Vercel API
 * Не требует веб-интерфейса!
 */

import crypto from 'crypto';
import https from 'https';
import { config } from 'dotenv';

config();

// Цвета для консоли
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function generateSecret(length) {
  return crypto.randomBytes(length).toString('base64');
}

async function makeVercelRequest(method, path, data = null) {
  const token = process.env.VERCEL_TOKEN;
  const projectId = process.env.VERCEL_PROJECT_ID;

  if (!token) {
    throw new Error('VERCEL_TOKEN не найден в .env файле');
  }

  if (!projectId) {
    throw new Error('VERCEL_PROJECT_ID не найден в .env файле');
  }

  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.vercel.com',
      port: 443,
      path: path.replace(':projectId', projectId),
      method: method,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => {
        body += chunk;
      });
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(JSON.parse(body || '{}'));
        } else {
          reject(new Error(`API Error ${res.statusCode}: ${body}`));
        }
      });
    });

    req.on('error', reject);

    if (data) {
      req.write(JSON.stringify(data));
    }

    req.end();
  });
}

async function getExistingEnvVars() {
  log('\n🔍 Проверяю существующие переменные...', 'cyan');
  try {
    const result = await makeVercelRequest('GET', '/v9/projects/:projectId/env');
    return result.envs || [];
  } catch (error) {
    log(`⚠️  Не удалось получить существующие переменные: ${error.message}`, 'yellow');
    return [];
  }
}

async function upsertEnvVar(key, value, existingVars) {
  const existing = existingVars.find(v => v.key === key && v.target.includes('production'));

  if (existing) {
    // Обновляем существующую переменную
    log(`  📝 Обновляю ${key}...`, 'yellow');
    try {
      await makeVercelRequest('PATCH', `/v10/projects/:projectId/env/${existing.id}`, {
        value: value,
        target: ['production'],
      });
      log(`  ✅ ${key} обновлен`, 'green');
      return true;
    } catch (error) {
      log(`  ❌ Ошибка обновления ${key}: ${error.message}`, 'red');
      return false;
    }
  } else {
    // Создаем новую переменную
    log(`  ➕ Создаю ${key}...`, 'cyan');
    try {
      await makeVercelRequest('POST', '/v10/projects/:projectId/env', {
        key: key,
        value: value,
        type: 'encrypted',
        target: ['production'],
      });
      log(`  ✅ ${key} создан`, 'green');
      return true;
    } catch (error) {
      log(`  ❌ Ошибка создания ${key}: ${error.message}`, 'red');
      return false;
    }
  }
}

async function triggerRedeploy() {
  log('\n🚀 Запускаю redeploy...', 'cyan');
  try {
    // Получаем последний production deployment
    const deployments = await makeVercelRequest('GET', '/v6/deployments?projectId=:projectId&target=production&limit=1');
    
    if (deployments.deployments && deployments.deployments.length > 0) {
      const lastDeployment = deployments.deployments[0];
      
      // Запускаем redeploy
      await makeVercelRequest('POST', `/v13/deployments`, {
        name: lastDeployment.name,
        project: process.env.VERCEL_PROJECT_ID,
        target: 'production',
        gitSource: lastDeployment.meta?.githubCommitRef ? {
          type: 'github',
          ref: lastDeployment.meta.githubCommitRef,
          repo: lastDeployment.meta.githubCommitRepo,
          org: lastDeployment.meta.githubCommitOrg,
        } : undefined,
      });
      
      log('✅ Redeploy запущен успешно!', 'green');
      return true;
    } else {
      log('⚠️  Не найдены существующие deployments', 'yellow');
      return false;
    }
  } catch (error) {
    log(`⚠️  Не удалось запустить redeploy: ${error.message}`, 'yellow');
    log('💡 Vercel автоматически сделает redeploy при следующем коммите', 'cyan');
    return false;
  }
}

async function main() {
  log('\n🔐 АВТОМАТИЧЕСКАЯ НАСТРОЙКА СЕКРЕТОВ ЧЕРЕЗ VERCEL API', 'blue');
  log('════════════════════════════════════════════════════\n', 'blue');

  // Проверяем наличие необходимых переменных
  if (!process.env.VERCEL_TOKEN) {
    log('❌ ОШИБКА: Не найден VERCEL_TOKEN', 'red');
    log('\n📋 Инструкция:', 'yellow');
    log('1. Зайди на https://vercel.com/account/tokens', 'cyan');
    log('2. Создай новый токен (Create Token)', 'cyan');
    log('3. Скопируй его и добавь в .env файл:', 'cyan');
    log('   VERCEL_TOKEN=your_token_here\n', 'green');
    process.exit(1);
  }

  if (!process.env.VERCEL_PROJECT_ID) {
    log('❌ ОШИБКА: Не найден VERCEL_PROJECT_ID', 'red');
    log('\n📋 Инструкция:', 'yellow');
    log('1. Зайди на https://vercel.com/dashboard', 'cyan');
    log('2. Открой свой проект', 'cyan');
    log('3. Settings → General → Project ID', 'cyan');
    log('4. Скопируй его и добавь в .env файл:', 'cyan');
    log('   VERCEL_PROJECT_ID=prj_xxx\n', 'green');
    process.exit(1);
  }

  // Генерируем новые секреты
  log('🎲 Генерирую новые безопасные секреты...', 'cyan');
  const jwtSecret = generateSecret(64);
  const registrationSecret = generateSecret(32);
  const cronSecret = crypto.randomBytes(32).toString('hex');
  log('✅ Секреты сгенерированы\n', 'green');

  // Получаем существующие переменные
  const existingVars = await getExistingEnvVars();

  // Обновляем/создаем переменные
  log('📤 Загружаю секреты в Vercel...', 'cyan');
  
  const results = await Promise.all([
    upsertEnvVar('JWT_SECRET', jwtSecret, existingVars),
    upsertEnvVar('REGISTRATION_SECRET', registrationSecret, existingVars),
    upsertEnvVar('CRON_SECRET', cronSecret, existingVars),
  ]);

  const allSuccess = results.every(r => r);

  if (allSuccess) {
    log('\n✅ ВСЕ СЕКРЕТЫ УСПЕШНО ЗАГРУЖЕНЫ В VERCEL!', 'green');
    
    // Пытаемся запустить redeploy
    await triggerRedeploy();
    
    log('\n════════════════════════════════════════════════════', 'blue');
    log('🎉 ГОТОВО! Секреты обновлены автоматически!', 'green');
    log('════════════════════════════════════════════════════\n', 'blue');
    
    log('📝 Сохрани эти значения в безопасном месте:', 'yellow');
    log(`\nJWT_SECRET:\n${jwtSecret}\n`);
    log(`REGISTRATION_SECRET:\n${registrationSecret}\n`);
    log(`CRON_SECRET:\n${cronSecret}\n`);
    
  } else {
    log('\n⚠️  НЕКОТОРЫЕ СЕКРЕТЫ НЕ УДАЛОСЬ ОБНОВИТЬ', 'yellow');
    log('Проверь права доступа VERCEL_TOKEN', 'yellow');
  }
}

main().catch(error => {
  log(`\n❌ КРИТИЧЕСКАЯ ОШИБКА: ${error.message}`, 'red');
  if (error.stack) {
    log(error.stack, 'red');
  }
  process.exit(1);
});

