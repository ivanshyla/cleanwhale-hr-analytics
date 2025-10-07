import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config();

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

// Тестовый токен (нужно получить реальный)
let authCookie = '';

async function login() {
  console.log('🔐 Логин...');
  const response = await fetch(`${API_BASE}/api/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      login: 'country_manager',
      password: 'password123',
    }),
  });

  if (response.ok) {
    // Получаем cookie из заголовка
    const setCookie = response.headers.get('set-cookie');
    if (setCookie) {
      authCookie = setCookie.split(';')[0];
      console.log('✅ Успешный логин\n');
      return true;
    }
  }
  
  console.log('❌ Не удалось войти\n');
  return false;
}

async function measureRequest(name, url, options = {}) {
  const start = Date.now();
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        'Cookie': authCookie,
      },
    });
    
    const duration = Date.now() - start;
    const status = response.status;
    
    if (response.ok) {
      const data = await response.json();
      const cached = data.cached ? '🟢 CACHED' : '🔵 FRESH';
      console.log(`✅ ${name}: ${duration}ms ${cached} (status: ${status})`);
      return { success: true, duration, cached: data.cached };
    } else {
      console.log(`❌ ${name}: ${duration}ms (status: ${status})`);
      return { success: false, duration };
    }
  } catch (error) {
    const duration = Date.now() - start;
    console.log(`❌ ${name}: ${duration}ms (error: ${error.message})`);
    return { success: false, duration, error: error.message };
  }
}

async function testPerformance() {
  console.log('⚡ Тест производительности API\n');
  console.log('='.repeat(50) + '\n');

  // Логин
  const loggedIn = await login();
  if (!loggedIn) {
    console.log('Не удалось войти. Проверьте учетные данные.');
    return;
  }

  await new Promise(resolve => setTimeout(resolve, 500));

  // 1. Тест /api/auth/me
  console.log('📋 Тест 1: /api/auth/me');
  await measureRequest('auth/me #1', `${API_BASE}/api/auth/me`);
  await measureRequest('auth/me #2', `${API_BASE}/api/auth/me`);
  await measureRequest('auth/me #3', `${API_BASE}/api/auth/me`);
  console.log('');

  // 2. Тест /api/dashboard-stats
  console.log('📊 Тест 2: /api/dashboard-stats');
  await measureRequest('dashboard-stats #1', `${API_BASE}/api/dashboard-stats`);
  await measureRequest('dashboard-stats #2', `${API_BASE}/api/dashboard-stats`);
  console.log('');

  // 3. Тест /api/country-analytics (главный!)
  console.log('🌍 Тест 3: /api/country-analytics (с кэшем)');
  const result1 = await measureRequest('country-analytics #1', `${API_BASE}/api/country-analytics`);
  await new Promise(resolve => setTimeout(resolve, 100));
  
  const result2 = await measureRequest('country-analytics #2', `${API_BASE}/api/country-analytics`);
  await new Promise(resolve => setTimeout(resolve, 100));
  
  const result3 = await measureRequest('country-analytics #3', `${API_BASE}/api/country-analytics`);
  console.log('');

  // Проверка кэша
  if (result1.success && result2.success && result3.success) {
    if (result2.cached || result3.cached) {
      console.log('✅ Кэш работает!');
      console.log(`   Первый запрос: ${result1.duration}ms`);
      console.log(`   Кэшированный: ${result2.cached ? result2.duration : result3.duration}ms`);
      const speedup = Math.round(result1.duration / (result2.cached ? result2.duration : result3.duration));
      console.log(`   Ускорение: ${speedup}x\n`);
    } else {
      console.log('⚠️  Кэш не сработал (возможно, прошло >60 сек)\n');
    }
  }

  // 4. Параллельные запросы (как на дашборде)
  console.log('🚀 Тест 4: Параллельные запросы');
  const parallelStart = Date.now();
  await Promise.all([
    measureRequest('parallel: auth/me', `${API_BASE}/api/auth/me`),
    measureRequest('parallel: dashboard-stats', `${API_BASE}/api/dashboard-stats`),
    measureRequest('parallel: country-analytics', `${API_BASE}/api/country-analytics`),
  ]);
  const parallelDuration = Date.now() - parallelStart;
  console.log(`⏱️  Общее время параллельных запросов: ${parallelDuration}ms\n`);

  // 5. Последовательные запросы (старый метод)
  console.log('🐌 Тест 5: Последовательные запросы (для сравнения)');
  const sequentialStart = Date.now();
  await measureRequest('sequential: auth/me', `${API_BASE}/api/auth/me`);
  await measureRequest('sequential: dashboard-stats', `${API_BASE}/api/dashboard-stats`);
  await measureRequest('sequential: country-analytics', `${API_BASE}/api/country-analytics`);
  const sequentialDuration = Date.now() - sequentialStart;
  console.log(`⏱️  Общее время последовательных запросов: ${sequentialDuration}ms\n`);

  // Сравнение
  console.log('='.repeat(50));
  console.log('\n📈 Итоги:\n');
  console.log(`Параллельные запросы:      ${parallelDuration}ms`);
  console.log(`Последовательные запросы:  ${sequentialDuration}ms`);
  const improvement = Math.round((sequentialDuration / parallelDuration - 1) * 100);
  console.log(`Улучшение:                 ${improvement}%`);
  console.log(`Ускорение:                 ${(sequentialDuration / parallelDuration).toFixed(1)}x\n`);

  // Рекомендации
  console.log('💡 Рекомендации:');
  if (parallelDuration > 2000) {
    console.log('  ⚠️  Запросы все еще медленные (>2 сек)');
    console.log('  - Проверьте латентность до Supabase (может быть ~500-1000ms)');
    console.log('  - Рассмотрите использование connection pooling');
    console.log('  - Попробуйте увеличить pool size в Prisma');
  } else if (parallelDuration > 1000) {
    console.log('  ⚠️  Запросы умеренно быстрые (1-2 сек)');
    console.log('  - Это нормально для удаленной БД');
    console.log('  - Кэш поможет при повторных запросах');
  } else {
    console.log('  ✅ Запросы быстрые (<1 сек)!');
  }
}

testPerformance().catch(console.error);

