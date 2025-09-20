const { Client } = require('pg');

async function testConn() {
  // Прямое подключение к Supabase
  const client = new Client({
    connectionString: "postgresql://postgres.msluhxhvayzgxfioxgdi:zYjbam-hahheh-mawmo2@aws-1-eu-central-1.pooler.supabase.com:5432/postgres",
    connectionTimeoutMillis: 5000,
  });

  try {
    console.log('🔌 Подключаемся...');
    await client.connect();
    console.log('✅ Подключено!');
    
    const res = await client.query('SELECT 1 as test');
    console.log('📊 Результат:', res.rows);
    
  } catch (err) {
    console.error('❌ Ошибка:', err.message);
  } finally {
    await client.end();
  }
}

testConn();
