#!/usr/bin/env node

/**
 * Quick Database Setup - Just insert sample data if tables exist
 * This script assumes your database and tables are already created
 */

import postgres from 'postgres';

const dbConfig = {
  host: 'localhost',
  port: 5432,
  database: 'db',
  username: 'postgres',
  password: 'NewPassword'
};

console.log('🚀 Quick Database Setup - Sample Data Only');
console.log('==========================================');

async function quickSetup() {
  let sql;
  
  try {
    console.log('🔌 Connecting to database...');
    sql = postgres(dbConfig);
    
    // Test connection
    await sql`SELECT 1`;
    console.log('✅ Connected successfully');
    
    // Check if key tables exist
    console.log('🔍 Checking tables...');
    const tables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('users', 'profiles', 'assets_master', 'breakdown_logs', 'spare_parts_inventory')
      ORDER BY table_name
    `;
    
    console.log('📋 Found tables:', tables.map(t => t.table_name).join(', '));
    
    if (tables.length < 5) {
      console.log('❌ Some required tables are missing. Please run the full setup first.');
      process.exit(1);
    }
    
    // Insert sample users if they don't exist
    console.log('👥 Setting up sample users...');
    
    const sampleUsers = [
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
    
    for (const user of sampleUsers) {
      try {
        // Check if user exists
        const existingUser = await sql`
          SELECT id FROM public.users WHERE email = ${user.email}
        `;
        
        if (existingUser.length === 0) {
          // Insert into users table
          const [newUser] = await sql`
            INSERT INTO public.users (email, full_name, role)
            VALUES (${user.email}, ${user.full_name}, ${user.role})
            RETURNING id, email, full_name, role
          `;
          
          // Insert into profiles table
          await sql`
            INSERT INTO public.profiles (id, full_name, email, password, role)
            VALUES (${newUser.id}, ${user.full_name}, ${user.email}, ${user.password}, ${user.role})
          `;
          
          console.log(`✅ Created user: ${user.email} (${user.role})`);
        } else {
          console.log(`⚠️  User ${user.email} already exists`);
        }
      } catch (err) {
        console.log(`⚠️  Error with user ${user.email}: ${err.message}`);
      }
    }
    
    // Insert sample assets if they don't exist
    console.log('🏭 Setting up sample assets...');
    
    const sampleAssets = [
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
      },
      {
        asset_code: 'A003',
        asset_name: 'Press Machine',
        machine_no: 'PRESS-001',
        location: 'Press Shop',
        category: 'Press',
        manufacturer: 'Schuler',
        model: 'P2H-400',
        serial_number: 'S345678',
        install_date: '2023-05-10',
        status: 'UNDER_AMC'
      }
    ];
    
    for (const asset of sampleAssets) {
      try {
        const existingAsset = await sql`
          SELECT id FROM public.assets_master WHERE asset_code = ${asset.asset_code}
        `;
        
        if (existingAsset.length === 0) {
          await sql`
            INSERT INTO public.assets_master 
            (asset_code, asset_name, machine_no, location, category, manufacturer, model, serial_number, install_date, status)
            VALUES (${asset.asset_code}, ${asset.asset_name}, ${asset.machine_no}, ${asset.location}, ${asset.category}, ${asset.manufacturer}, ${asset.model}, ${asset.serial_number}, ${asset.install_date}, ${asset.status})
          `;
          console.log(`✅ Created asset: ${asset.asset_code}`);
        } else {
          console.log(`⚠️  Asset ${asset.asset_code} already exists`);
        }
      } catch (err) {
        console.log(`⚠️  Error with asset ${asset.asset_code}: ${err.message}`);
      }
    }
    
    // Insert sample spare parts
    console.log('🔧 Setting up sample spare parts...');
    
    const sampleSpares = [
      {
        part_code: 'SP001',
        part_name: 'Bearing 6205',
        part_no: 'BR-6205',
        uom: 'NOS',
        stock_on_hand: 15,
        min_level: 5,
        reorder_level: 3,
        location: 'Store A',
        unit_cost: 25.50,
        supplier: 'Bearing Corp'
      },
      {
        part_code: 'SP002',
        part_name: 'Belt A-45',
        part_no: 'BL-A45',
        uom: 'MTR',
        stock_on_hand: 8,
        min_level: 3,
        reorder_level: 2,
        location: 'Store B',
        unit_cost: 12.75,
        supplier: 'Belt Solutions'
      }
    ];
    
    for (const spare of sampleSpares) {
      try {
        const existingSpare = await sql`
          SELECT id FROM public.spare_parts_inventory WHERE part_code = ${spare.part_code}
        `;
        
        if (existingSpare.length === 0) {
          await sql`
            INSERT INTO public.spare_parts_inventory 
            (part_code, part_name, part_no, uom, stock_on_hand, min_level, reorder_level, location, unit_cost, supplier)
            VALUES (${spare.part_code}, ${spare.part_name}, ${spare.part_no}, ${spare.uom}, ${spare.stock_on_hand}, ${spare.min_level}, ${spare.reorder_level}, ${spare.location}, ${spare.unit_cost}, ${spare.supplier})
          `;
          console.log(`✅ Created spare part: ${spare.part_code}`);
        } else {
          console.log(`⚠️  Spare part ${spare.part_code} already exists`);
        }
      } catch (err) {
        console.log(`⚠️  Error with spare part ${spare.part_code}: ${err.message}`);
      }
    }
    
    console.log('\n🎉 Quick setup completed successfully!');
    console.log('📝 You can now start your server with: npm run dev');
    console.log('🔑 Test credentials:');
    console.log('   - admin@mis.com / admin123');
    console.log('   - engineer@mis.com / engineer123');
    console.log('   - operator@mis.com / operator123');
    
  } catch (error) {
    console.error('❌ Quick setup failed:', error.message);
    console.log('\n🔧 Troubleshooting:');
    console.log('1. Make sure PostgreSQL is running');
    console.log('2. Check if database "db" exists');
    console.log('3. Verify tables are created');
    process.exit(1);
  } finally {
    if (sql) {
      await sql.end();
    }
  }
}

quickSetup();
