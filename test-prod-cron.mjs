import https from 'https';

const PROD_URL = 'cleanwhale-hr-analytics.vercel.app';
const CRON_SECRET = 'cleanwhale_cron_secret_2024_secure_key';

console.log('🚀 Тестируем крон-задачу на PRODUCTION\n');
console.log(`📍 URL: https://${PROD_URL}/api/cron/weekly-report`);
console.log(`🔑 Using CRON_SECRET\n`);

const options = {
  hostname: PROD_URL,
  port: 443,
  path: '/api/cron/weekly-report',
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${CRON_SECRET}`,
    'Content-Type': 'application/json',
    'User-Agent': 'Test-Client'
  }
};

console.log('⏳ Отправляем запрос на продакшен...\n');

const req = https.request(options, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    console.log(`📊 HTTP Status: ${res.statusCode}\n`);
    
    try {
      const json = JSON.parse(data);
      console.log('✅ Response от сервера:');
      console.log(JSON.stringify(json, null, 2));
      
      if (json.success && json.sentToTelegram) {
        console.log('\n🎉 ОТЧЕТ УСПЕШНО ОТПРАВЛЕН ИЗ PRODUCTION В TELEGRAM!\n');
      }
    } catch (e) {
      console.log('📄 Response (raw):', data);
    }
  });
});

req.on('error', (error) => {
  console.error('❌ Error:', error.message);
  process.exit(1);
});

req.end();

setTimeout(() => {
  console.log('\n⏱️ Timeout - ответ не получен');
  process.exit(1);
}, 15000);
