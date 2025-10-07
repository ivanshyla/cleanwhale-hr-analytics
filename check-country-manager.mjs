import pkg from 'pg';
const { Client } = pkg;

const client = new Client({
  connectionString: process.env.DATABASE_URL
});

async function checkCountryManager() {
  try {
    await client.connect();
    console.log('✅ Connected to database\n');

    // 1. Проверяем все записи с username содержащим 'country'
    console.log('=== 1. Все записи с country в username ===');
    const allCountry = await client.query(`
      SELECT id, username, email, role, "isActive", 
             LEFT(password, 20) as password_start,
             LENGTH(password) as password_length
      FROM users 
      WHERE username ILIKE '%country%'
      ORDER BY id
    `);
    console.log(`Найдено записей: ${allCountry.rows.length}`);
    console.table(allCountry.rows);

    // 2. Точный поиск country_manager
    console.log('\n=== 2. Точный поиск country_manager ===');
    const exact = await client.query(`
      SELECT id, username, email, role, "isActive", 
             password,
             "createdAt", "updatedAt"
      FROM users 
      WHERE username = 'country_manager'
    `);
    console.log(`Найдено записей: ${exact.rows.length}`);
    if (exact.rows.length > 0) {
      console.log('\nДетали:');
      exact.rows.forEach((row, i) => {
        console.log(`\n--- Запись ${i + 1} ---`);
        console.log(`ID: ${row.id}`);
        console.log(`Username: "${row.username}"`);
        console.log(`Email: "${row.email}"`);
        console.log(`Role: ${row.role}`);
        console.log(`isActive: ${row.isActive}`);
        console.log(`Password: ${row.password}`);
        console.log(`Password length: ${row.password?.length}`);
        console.log(`Created: ${row.createdAt}`);
        console.log(`Updated: ${row.updatedAt}`);
      });
    }

    // 3. Проверяем с разными вариантами написания
    console.log('\n=== 3. Проверка разных вариантов ===');
    const variants = [
      'country_manager',
      'country_manager ',  // с пробелом
      ' country_manager',  // с пробелом
      'COUNTRY_MANAGER',
      'Country_Manager'
    ];

    for (const variant of variants) {
      const result = await client.query(
        'SELECT COUNT(*) FROM users WHERE username = $1',
        [variant]
      );
      console.log(`"${variant}": ${result.rows[0].count} записей`);
    }

    // 4. Все пользователи для сравнения
    console.log('\n=== 4. Все пользователи (для сравнения) ===');
    const allUsers = await client.query(`
      SELECT id, username, email, role, "isActive",
             LEFT(password, 20) as password_start,
             LENGTH(password) as password_length
      FROM users 
      ORDER BY id
    `);
    console.table(allUsers.rows);

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await client.end();
  }
}

checkCountryManager();

