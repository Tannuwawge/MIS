import sql from './src/db.js';

async function checkSchema() {
  const columns = await sql`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'pm_schedule'
  `;
  console.log(columns);
  process.exit(0);
}

checkSchema();
