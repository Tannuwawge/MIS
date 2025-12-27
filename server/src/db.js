
import postgres from 'postgres';

// Database connection configuration
const dbConfig = {
  host: 'localhost',
  port: 5432,
  database: 'db',
  username: 'postgres',
  password: 'NewPassword',
  // Add connection debugging options
  debug: false, // Set to true for detailed SQL logging
  max: 10, // Maximum number of connections
  idle_timeout: 20, // Close idle connections after 20 seconds
  connect_timeout: 10, // Connection timeout in seconds
  onnotice: (notice) => {
    console.log('🔔 Database Notice:', notice);
  },
  onparameter: (key, value) => {
    console.log(`🔧 Database Parameter: ${key} = ${value}`);
  }
};

console.log('🔌 Attempting to connect to database...');
console.log('📊 Database Config:', {
  host: dbConfig.host,
  port: dbConfig.port,
  database: dbConfig.database,
  username: dbConfig.username,
  // Don't log password for security
  password: '***'
});

const sql = postgres(dbConfig);

// Test database connection on startup
async function testDatabaseConnection() {
  try {
    console.log('🧪 Testing database connection...');
    const startTime = Date.now();
    
    // Test basic connection
    const result = await sql`SELECT 1 as test, current_database() as db_name, current_user as user_name, version() as db_version`;
    const endTime = Date.now();
    const responseTime = endTime - startTime;
    
    console.log('✅ Database connection successful!');
    console.log('📊 Connection Details:', {
      database: result[0].db_name,
      user: result[0].user_name,
      version: result[0].db_version.split(' ')[0], // Just the version number
      responseTime: `${responseTime}ms`
    });
    
    // Test table existence
    const tables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `;
    
    console.log('📋 Available tables:', tables.map(t => t.table_name).join(', '));
    
    return true;
  } catch (error) {
    console.error('❌ Database connection failed!');
    console.error('🔍 Error Details:', {
      message: error.message,
      code: error.code,
      severity: error.severity,
      detail: error.detail,
      hint: error.hint
    });
    
    // Provide helpful troubleshooting tips
    console.log('\n🔧 Troubleshooting Tips:');
    console.log('1. Check if PostgreSQL is running: pg_ctl status');
    console.log('2. Verify database exists: psql -l');
    console.log('3. Check connection parameters in db.js');
    console.log('4. Ensure database user has proper permissions');
    console.log('5. Check firewall settings if connecting remotely');
    
    return false;
  }
}

// Test connection on module load
testDatabaseConnection().then(success => {
  if (success) {
    console.log('🚀 Database module loaded successfully');
  } else {
    console.log('⚠️  Database module loaded with connection issues');
  }
});

export default sql;
