import sql from './src/db.js';

async function checkBreakdownSchema() {
  const columns = await sql`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'breakdown_logs'
  `;
  console.log(columns);
  process.exit(0);
}

checkBreakdownSchema();
