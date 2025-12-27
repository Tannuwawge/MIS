#!/usr/bin/env node

/**
 * Simple Database Connection Test
 * Run this to test your PostgreSQL connection
 */

import postgres from 'postgres';

const dbConfig = {
  host: 'localhost',
  port: 5432,
  database: 'db',
  username: 'postgres',
  password: 'NewPassword'
};

console.log('🧪 Testing Database Connection...');
console.log('================================');

async function testConnection() {
  let sql;
  
  try {
    console.log('🔌 Attempting to connect...');
    console.log('📊 Config:', {
      host: dbConfig.host,
      port: dbConfig.port,
      database: dbConfig.database,
      username: dbConfig.username,
      password: '***'
    });
    
    sql = postgres(dbConfig);
    
    // Test basic connection
    console.log('🧪 Testing basic connection...');
    const result = await sql`SELECT 1 as test`;
    console.log('✅ Basic connection successful');
    
    // Get database info
    console.log('📊 Getting database information...');
    const dbInfo = await sql`
      SELECT 
        current_database() as db_name,
        current_user as user_name,
        version() as db_version
    `;
    
    console.log('📋 Database Info:', {
      database: dbInfo[0].db_name,
      user: dbInfo[0].user_name,
      version: dbInfo[0].db_version.split(' ')[0]
    });
    
    // Check tables
    console.log('📋 Checking tables...');
    const tables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `;
    
    console.log('📊 Available tables:', tables.map(t => t.table_name).join(', '));
    
    // Test key tables
    const keyTables = ['users', 'profiles', 'assets_master'];
    for (const table of keyTables) {
      try {
        const count = await sql`SELECT COUNT(*) as count FROM public.${sql(table)}`;
        console.log(`✅ Table ${table}: ${count[0].count} records`);
      } catch (err) {
        console.log(`❌ Table ${table}: ${err.message}`);
      }
    }
    
    console.log('\n🎉 Database connection test PASSED!');
    console.log('✅ Your backend should work now.');
    
  } catch (error) {
    console.error('\n❌ Database connection test FAILED!');
    console.error('🔍 Error:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.log('\n💡 PostgreSQL is not running or not accessible.');
      console.log('🔧 Try these steps:');
      console.log('1. Start PostgreSQL service');
      console.log('2. Check if PostgreSQL is running on port 5432');
      console.log('3. Verify the password is correct');
    } else if (error.code === '28P01') {
      console.log('\n💡 Authentication failed.');
      console.log('🔧 Check your username and password.');
    } else if (error.code === '3D000') {
      console.log('\n💡 Database "db" does not exist.');
      console.log('🔧 Run the setup script: node setup-db.js');
    }
    
    process.exit(1);
  } finally {
    if (sql) {
      await sql.end();
    }
  }
}

testConnection();
