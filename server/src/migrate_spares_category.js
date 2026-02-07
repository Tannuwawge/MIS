import sql from './db.js';

async function migrate() {
  try {
    console.log('Running migration: Add category to spare_parts_inventory');
    await sql`
      ALTER TABLE public.spare_parts_inventory 
      ADD COLUMN IF NOT EXISTS category TEXT;
    `;
    console.log('Migration successful');
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
}

migrate();
