import sql from './src/db.js';

async function checkSchema() {
  try {
    const tables = ['assets_master'];
    
    for (const table of tables) {
      console.log(`\nTable: ${table}`);
      const columns = await sql`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = ${table}
        ORDER BY ordinal_position;
      `;
      console.table(columns);
    }
  } catch (err) {
    console.error(err);
  } finally {
    process.exit();
  }
}

checkSchema();