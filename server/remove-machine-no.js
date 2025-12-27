#!/usr/bin/env node

/**
 * Remove machine_no column from assets_master table
 * This script will safely remove the machine_no column and update all related code
 */

import postgres from 'postgres';

const dbConfig = {
  host: 'localhost',
  port: 5432,
  database: 'db',
  username: 'postgres',
  password: 'NewPassword'
};

console.log('🔧 Removing machine_no column from assets_master table');
console.log('====================================================');

async function removeMachineNoColumn() {
  let sql;
  
  try {
    console.log('🔌 Connecting to database...');
    sql = postgres(dbConfig);
    
    // Test connection
    await sql`SELECT 1`;
    console.log('✅ Connected successfully');
    
    // Check if machine_no column exists
    console.log('🔍 Checking if machine_no column exists...');
    const columnExists = await sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'assets_master' 
      AND column_name = 'machine_no'
      AND table_schema = 'public'
    `;
    
    if (columnExists.length === 0) {
      console.log('✅ machine_no column does not exist - nothing to remove');
      return;
    }
    
    console.log('📋 Found machine_no column, removing...');
    
    // Remove the column
    await sql`ALTER TABLE public.assets_master DROP COLUMN IF EXISTS machine_no`;
    console.log('✅ machine_no column removed successfully');
    
    // Verify the column is gone
    const remainingColumns = await sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'assets_master' 
      AND table_schema = 'public'
      ORDER BY ordinal_position
    `;
    
    console.log('📊 Remaining columns in assets_master:');
    remainingColumns.forEach(col => {
      console.log(`   - ${col.column_name}`);
    });
    
    console.log('\n🎉 Database migration completed successfully!');
    console.log('📝 The machine_no column has been removed from assets_master table');
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.log('\n🔧 Troubleshooting:');
    console.log('1. Make sure PostgreSQL is running');
    console.log('2. Check if database "db" exists');
    console.log('3. Verify you have ALTER TABLE permissions');
    process.exit(1);
  } finally {
    if (sql) {
      await sql.end();
    }
  }
}

removeMachineNoColumn();
