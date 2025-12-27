import sql from './src/db.js';

async function migrate() {
  try {
    console.log('Starting migration...');

    // 1. Drop FK constraint and Modify reported_by to TEXT
    try {
      await sql`ALTER TABLE breakdown_logs DROP CONSTRAINT IF EXISTS breakdown_logs_reported_by_fkey`;
      console.log('Dropped FK constraint breakdown_logs_reported_by_fkey');
    } catch (e) {
      console.log('Constraint might not exist or failed to drop:', e.message);
    }

    await sql`ALTER TABLE breakdown_logs ALTER COLUMN reported_by TYPE text USING reported_by::text`;
    console.log('Altered reported_by to TEXT');

    // 2. Add missing columns
    await sql`ALTER TABLE breakdown_logs ADD COLUMN IF NOT EXISTS bu_name text`;
    await sql`ALTER TABLE breakdown_logs ADD COLUMN IF NOT EXISTS production_opening_time time`;
    await sql`ALTER TABLE breakdown_logs ADD COLUMN IF NOT EXISTS entry_date date`;
    await sql`ALTER TABLE breakdown_logs ADD COLUMN IF NOT EXISTS entry_time time`;
    await sql`ALTER TABLE breakdown_logs ADD COLUMN IF NOT EXISTS equipment_type text`;
    await sql`ALTER TABLE breakdown_logs ADD COLUMN IF NOT EXISTS note text`;
    
    console.log('Added missing columns to breakdown_logs');

    // 3. Ensure pm_schedule has last_completed_at (it does, but just in case)
    // It checked out in schema check.

  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    process.exit();
  }
}

migrate();
