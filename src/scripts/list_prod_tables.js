const { Client } = require('pg');

const FALLBACK_URL = 'postgresql://postgres.msluhxhvayzgxfioxgdi:zYjbam-hahheh-mawmo2@aws-1-eu-central-1.pooler.supabase.com:5432/postgres';
const connectionString = process.env.PROD_DATABASE_URL || process.env.DATABASE_URL || FALLBACK_URL;

(async () => {
  const client = new Client({ connectionString });
  await client.connect();
  const sql = `
    select table_name 
    from information_schema.tables 
    where table_schema = 'public' and table_type='BASE TABLE'
    order by table_name
  `;
  const res = await client.query(sql);
  console.log(res.rows.map(r => r.table_name));
  await client.end();
})().catch(e => { console.error(e.message); process.exit(1); });


