/*
  Cleanup production data (Supabase):
  - Delete all weekly_reports (cascades hr_metrics, ops_metrics)
  - Delete all work_schedules
  - Delete all country_aggregates and country_user_inputs
  - Keep team_meetings and users

  Uses direct SQL as preferred.
*/

const { Client } = require('pg');

const FALLBACK_URL = 'postgresql://postgres.msluhxhvayzgxfioxgdi:zYjbam-hahheh-mawmo2@aws-1-eu-central-1.pooler.supabase.com:5432/postgres';
const connectionString = process.env.PROD_DATABASE_URL || process.env.DATABASE_URL || FALLBACK_URL;

async function main() {
  const client = new Client({ connectionString });
  await client.connect();
  console.log('🔌 Connected to production DB');

  try {
    await client.query('BEGIN');
    // Disable triggers if needed for speed; but here we rely on FK onDelete: Cascade in schema
    const res1 = await client.query('delete from "weekly_reports"');
    const res2 = await client.query('delete from "work_schedules"');
    const res3 = await client.query('delete from "country_aggregates"');
    const res4 = await client.query('delete from "country_user_inputs"');

    await client.query('COMMIT');
    console.log('✅ Deleted weekly_reports:', res1.rowCount);
    console.log('✅ Deleted work_schedules:', res2.rowCount);
    console.log('✅ Deleted country_aggregates:', res3.rowCount);
    console.log('✅ Deleted country_user_inputs:', res4.rowCount);

    const [wr, hr, ops, ws, ca, cui, tm] = await Promise.all([
      client.query('select count(*) from "weekly_reports"'),
      client.query('select count(*) from "hr_metrics"'),
      client.query('select count(*) from "ops_metrics"'),
      client.query('select count(*) from "work_schedules"'),
      client.query('select count(*) from "country_aggregates"'),
      client.query('select count(*) from "country_user_inputs"'),
      client.query('select count(*) from "team_meetings"'),
    ]);
    console.log('📊 Remaining counts:', {
      weeklyReports: wr.rows[0].count,
      hrMetrics: hr.rows[0].count,
      opsMetrics: ops.rows[0].count,
      workSchedules: ws.rows[0].count,
      countryAggregates: ca.rows[0].count,
      countryUserInputs: cui.rows[0].count,
      teamMeetings: tm.rows[0].count,
    });
  } catch (e) {
    await client.query('ROLLBACK');
    console.error('❌ Cleanup failed:', e.message);
    process.exitCode = 1;
  } finally {
    await client.end();
    console.log('🔌 Disconnected');
  }
}

main();


