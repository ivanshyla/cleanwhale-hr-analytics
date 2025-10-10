#!/usr/bin/env node

import { Client } from 'pg';
import bcrypt from 'bcryptjs';

const client = new Client({
  connectionString: process.env.DATABASE_URL
});

async function testPassword() {
  try {
    await client.connect();
    console.log('✅ Подключились к production базе данных');

    // Получаем хеш пароля пользователя
    const result = await client.query(`
      SELECT login, password, name 
      FROM "users" 
      WHERE login = 'country_manager'
    `);

    if (result.rows.length > 0) {
      const user = result.rows[0];
      const storedPasswordHash = user.password;
      
      console.log('🔍 Проверяем пароли для country_manager:');
      console.log(`   Хеш в базе: ${storedPasswordHash.substring(0, 20)}...`);
      
      // Тестируем разные пароли
      const testPasswords = ['password123', 'country123', 'admin123', 'country_manager'];
      
      for (const testPassword of testPasswords) {
        const isValid = await bcrypt.compare(testPassword, storedPasswordHash);
        console.log(`   Пароль "${testPassword}": ${isValid ? '✅ ВЕРНЫЙ' : '❌ неверный'}`);
        
        if (isValid) {
          console.log(`\n🎯 НАЙДЕН ПРАВИЛЬНЫЙ ПАРОЛЬ: "${testPassword}"`);
          break;
        }
      }
      
    } else {
      console.log('❌ Пользователь country_manager не найден!');
    }

  } catch (error) {
    console.error('❌ Ошибка:', error.message);
  } finally {
    await client.end();
  }
}

testPassword();
