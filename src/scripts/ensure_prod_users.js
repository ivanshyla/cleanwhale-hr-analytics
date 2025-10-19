/*
  Ensures baseline users exist in PRODUCTION Supabase DB and are active.
  Uses direct SQL via pg, hashing passwords with bcryptjs.
  DB URL resolution:
    - PROD_DATABASE_URL env if set
    - else fallback to known Supabase pooler URL from test-supabase.js
*/

const { Client } = require('pg');
const bcrypt = require('bcryptjs');

const FALLBACK_URL = 'postgresql://postgres.msluhxhvayzgxfioxgdi:zYjbam-hahheh-mawmo2@aws-1-eu-central-1.pooler.supabase.com:5432/postgres';
const connectionString = process.env.PROD_DATABASE_URL || process.env.DATABASE_URL || FALLBACK_URL;

async function ensureUser(client, { login, password, name, role, city }) {
  const hash = await bcrypt.hash(password, 10);
  const sql = `
    insert into "users" (id, login, password, name, role, city, "isActive")
    values (gen_random_uuid()::text, $1, $2, $3, $4::"Role", $5::"City", true)
    on conflict (login) do update set
      password = excluded.password,
      name = excluded.name,
      role = excluded.role,
      city = excluded.city,
      "isActive" = true
    returning id, login, "isActive";
  `;
  const res = await client.query(sql, [login, hash, name, role, city]);
  return res.rows[0];
}

async function main() {
  const client = new Client({ connectionString });
  console.log('🔌 Connecting to production DB...');
  await client.connect();

  try {
    const admin = await ensureUser(client, {
      login: 'admin',
      password: 'admin123',
      name: 'Системный администратор',
      role: 'ADMIN',
      city: 'WARSAW',
    });
    console.log('✅ Admin ensured:', admin);

    const country = await ensureUser(client, {
      login: 'country_manager',
      password: 'country123',
      name: 'Country Manager',
      role: 'COUNTRY_MANAGER',
      city: 'WARSAW',
    });
    console.log('✅ Country manager ensured:', country);
  } catch (e) {
    console.error('❌ Ensure users failed:', e.message);
    process.exitCode = 1;
  } finally {
    await client.end();
    console.log('🔌 Disconnected');
  }
}

main();


