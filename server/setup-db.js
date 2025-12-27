#!/usr/bin/env node

/**
 * Database Setup Script for MIS Project
 * This script will help you set up the PostgreSQL database properly
 */

import postgres from 'postgres';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Database configuration
const dbConfig = {
  host: 'localhost',
  port: 5432,
  database: 'postgres', // Connect to default postgres database first
  username: 'postgres',
  password: 'NewPassword'
};

console.log('🔧 MIS Database Setup Script');
console.log('============================');

async function setupDatabase() {
  let sql;
  
  try {
    console.log('🔌 Connecting to PostgreSQL...');
    sql = postgres(dbConfig);
    
    // Test connection
    await sql`SELECT 1`;
    console.log('✅ Connected to PostgreSQL successfully');
    
    // Check if MIS database exists
    const databases = await sql`
      SELECT datname FROM pg_database 
      WHERE datname = 'db'
    `;
    
    if (databases.length === 0) {
      console.log('📦 Creating database "db"...');
      await sql`CREATE DATABASE db`;
      console.log('✅ Database "db" created successfully');
    } else {
      console.log('✅ Database "db" already exists');
    }
    
    // Close connection to default database
    await sql.end();
    
    // Connect to the MIS database
    console.log('🔌 Connecting to MIS database...');
    const misDbConfig = { ...dbConfig, database: 'db' };
    sql = postgres(misDbConfig);
    
    // Test connection to MIS database
    await sql`SELECT 1`;
    console.log('✅ Connected to MIS database successfully');
    
    // Read and execute schema
    const schemaPath = path.join(__dirname, '..', 'db', 'localschema.sql');
    if (fs.existsSync(schemaPath)) {
      console.log('📋 Reading schema file...');
      const schema = fs.readFileSync(schemaPath, 'utf8');
      
      console.log('🏗️  Executing schema...');
      
      // Split schema into individual statements and execute them one by one
      const statements = schema
        .split(';')
        .map(stmt => stmt.trim())
        .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
      
      for (const statement of statements) {
        try {
          await sql.unsafe(statement);
        } catch (error) {
          // Skip errors for existing objects (tables, triggers, functions, etc.)
          if (error.code === '42710' || // extension already exists
              error.code === '42P07' || // relation already exists
              error.code === '42723' || // function already exists
              error.code === '42710' || // trigger already exists
              error.message.includes('already exists')) {
            console.log(`⚠️  Skipping existing object: ${error.message.split('"')[1] || 'object'}`);
            continue;
          } else {
            console.error(`❌ Error executing statement: ${error.message}`);
            throw error;
          }
        }
      }
      
      console.log('✅ Schema executed successfully');
      
      // Insert sample data
      console.log('📊 Inserting sample data...');
      await insertSampleData(sql);
      console.log('✅ Sample data inserted successfully');
      
    } else {
      console.log('⚠️  Schema file not found at:', schemaPath);
    }
    
    console.log('\n🎉 Database setup completed successfully!');
    console.log('📝 You can now start your server with: npm run dev');
    
  } catch (error) {
    console.error('❌ Database setup failed:', error.message);
    console.log('\n🔧 Troubleshooting steps:');
    console.log('1. Make sure PostgreSQL is running');
    console.log('2. Check if the password "NewPassword" is correct');
    console.log('3. Verify PostgreSQL is accessible on localhost:5432');
    console.log('4. Check if user "postgres" has CREATE DATABASE privileges');
    
    if (error.code === 'ECONNREFUSED') {
      console.log('\n💡 PostgreSQL might not be running. Try:');
      console.log('   - Windows: Start PostgreSQL service from Services');
      console.log('   - Or run: pg_ctl start');
    }
    
    process.exit(1);
  } finally {
    if (sql) {
      await sql.end();
    }
  }
}

async function insertSampleData(sql) {
  // Insert sample users
  const users = [
    {
      email: 'admin@mis.com',
      full_name: 'Admin User',
      role: 'admin',
      password: 'admin123'
    },
    {
      email: 'engineer@mis.com', 
      full_name: 'Engineer User',
      role: 'engineer',
      password: 'engineer123'
    },
    {
      email: 'operator@mis.com',
      full_name: 'Operator User', 
      role: 'operator',
      password: 'operator123'
    }
  ];
  
  for (const user of users) {
    try {
      // Insert into users table
      const [newUser] = await sql`
        INSERT INTO public.users (email, full_name, role)
        VALUES (${user.email}, ${user.full_name}, ${user.role})
        ON CONFLICT (email) DO NOTHING
        RETURNING id, email, full_name, role
      `;
      
      if (newUser) {
        // Insert into profiles table
        await sql`
          INSERT INTO public.profiles (id, full_name, email, password, role)
          VALUES (${newUser.id}, ${user.full_name}, ${user.email}, ${user.password}, ${user.role})
          ON CONFLICT (id) DO NOTHING
        `;
        
        console.log(`✅ Created user: ${user.email} (${user.role})`);
      }
    } catch (err) {
      console.log(`⚠️  User ${user.email} might already exist`);
    }
  }
  
  // Insert sample assets
  const assets = [
    {
      asset_code: 'A001',
      asset_name: 'CNC Machine 1',
      machine_no: 'CNC-001',
      location: 'Production Floor',
      category: 'Machinery',
      manufacturer: 'Haas',
      model: 'VF-2',
      serial_number: 'H123456',
      install_date: '2023-01-15',
      status: 'ACTIVE'
    },
    {
      asset_code: 'A002', 
      asset_name: 'Conveyor Belt',
      machine_no: 'CONV-001',
      location: 'Assembly Line',
      category: 'Conveyor',
      manufacturer: 'Flexco',
      model: 'FB-500',
      serial_number: 'F789012',
      install_date: '2023-03-20',
      status: 'ACTIVE'
    }
  ];
  
  for (const asset of assets) {
    try {
      await sql`
        INSERT INTO public.assets_master 
        (asset_code, asset_name, machine_no, location, category, manufacturer, model, serial_number, install_date, status)
        VALUES (${asset.asset_code}, ${asset.asset_name}, ${asset.machine_no}, ${asset.location}, ${asset.category}, ${asset.manufacturer}, ${asset.model}, ${asset.serial_number}, ${asset.install_date}, ${asset.status})
        ON CONFLICT (asset_code) DO NOTHING
      `;
      console.log(`✅ Created asset: ${asset.asset_code}`);
    } catch (err) {
      console.log(`⚠️  Asset ${asset.asset_code} might already exist`);
    }
  }
}

// Run the setup
setupDatabase();
