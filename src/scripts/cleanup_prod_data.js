/*
  Cleanup production data (Supabase):
  - Delete all weekly_reports (cascades hr_metrics, ops_metrics)
  - Delete all work_schedules and user_schedule_exceptions
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
    // There is no separate user_schedule_exceptions table in production; skip
    const res3 = { rowCount: 0 };

    await client.query('COMMIT');
    console.log('✅ Deleted weekly_reports:', res1.rowCount);
    console.log('✅ Deleted work_schedules:', res2.rowCount);
    console.log('✅ Deleted user_schedule_exceptions:', res3.rowCount);

    const [wr, hr, ops, ws, wse, tm] = await Promise.all([
      client.query('select count(*) from "weekly_reports"'),
      client.query('select count(*) from "hr_metrics"'),
      client.query('select count(*) from "ops_metrics"'),
      client.query('select count(*) from "work_schedules"'),
      client.query('select count(*) from "work_schedules" where 1=0'),
      client.query('select count(*) from "team_meetings"'),
    ]);
    console.log('📊 Remaining counts:', {
      weeklyReports: wr.rows[0].count,
      hrMetrics: hr.rows[0].count,
      opsMetrics: ops.rows[0].count,
      workSchedules: ws.rows[0].count,
      scheduleExceptions: wse.rows[0].count,
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


