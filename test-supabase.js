// require('dotenv').config();
process.env.DATABASE_URL = "postgresql://postgres.msluhxhvayzgxfioxgdi:zYjbam-hahheh-mawmo2@aws-1-eu-central-1.pooler.supabase.com:5432/postgres";
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testConnection() {
  try {
    console.log('🔌 Подключаемся к Supabase...');
    
    // Простой тест подключения
    const result = await prisma.$queryRaw`SELECT 1 as test`;
    console.log('✅ Подключение успешно:', result);
    
    // Проверяем существующие таблицы
    const tables = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
    `;
    console.log('📋 Существующие таблицы:', tables);
    
  } catch (error) {
    console.error('❌ Ошибка подключения:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

testConnection();
