import mysql from 'mysql2/promise';

// MySQL Database connection configuration
const dbConfig = {
  host: 'localhost',
  port: 3306,
  database: 'mis_db',
  user: 'root',
  password: 'your_mysql_password',
  // Add connection debugging options
  acquireTimeout: 10000,
  timeout: 10000,
  reconnect: true,
  charset: 'utf8mb4'
};

console.log('🔌 Attempting to connect to MySQL database...');
console.log('📊 Database Config:', {
  host: dbConfig.host,
  port: dbConfig.port,
  database: dbConfig.database,
  user: dbConfig.user,
  // Don't log password for security
  password: '***'
});

// Create connection pool
const pool = mysql.createPool(dbConfig);

// Test database connection on startup
async function testDatabaseConnection() {
  let connection;
  try {
    console.log('🧪 Testing MySQL database connection...');
    const startTime = Date.now();
    
    connection = await pool.getConnection();
    
    // Test basic connection
    const [rows] = await connection.execute('SELECT 1 as test, DATABASE() as db_name, USER() as user_name, VERSION() as db_version');
    const endTime = Date.now();
    const responseTime = endTime - startTime;
    
    console.log('✅ MySQL database connection successful!');
    console.log('📊 Connection Details:', {
      database: rows[0].db_name,
      user: rows[0].user_name,
      version: rows[0].db_version.split(' ')[0], // Just the version number
      responseTime: `${responseTime}ms`
    });
    
    // Test table existence
    const [tables] = await connection.execute(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = ? 
      ORDER BY table_name
    `, [dbConfig.database]);
    
    console.log('📋 Available tables:', tables.map(t => t.table_name).join(', '));
    
    return true;
  } catch (error) {
    console.error('❌ MySQL database connection failed!');
    console.error('🔍 Error Details:', {
      message: error.message,
      code: error.code,
      errno: error.errno,
      sqlState: error.sqlState
    });
    
    // Provide helpful troubleshooting tips
    console.log('\n🔧 Troubleshooting Tips:');
    console.log('1. Check if MySQL is running: net start mysql (Windows) or systemctl status mysql (Linux)');
    console.log('2. Verify database exists: mysql -u root -p -e "SHOW DATABASES;"');
    console.log('3. Check connection parameters in db-mysql.js');
    console.log('4. Ensure MySQL user has proper permissions');
    console.log('5. Check firewall settings if connecting remotely');
    console.log('6. Verify MySQL is running on port 3306');
    
    return false;
  } finally {
    if (connection) {
      connection.release();
    }
  }
}

// Test connection on module load
testDatabaseConnection().then(success => {
  if (success) {
    console.log('🚀 MySQL database module loaded successfully');
  } else {
    console.log('⚠️  MySQL database module loaded with connection issues');
  }
});

// Export a query function that works with your existing code
export default {
  // Execute a query (similar to postgres template literals)
  async query(sql, params = []) {
    const connection = await pool.getConnection();
    try {
      const [rows] = await connection.execute(sql, params);
      return rows;
    } finally {
      connection.release();
    }
  },
  
  // For template literal style queries (you'll need to adapt your existing code)
  async templateQuery(strings, ...values) {
    // Convert postgres template literal to MySQL prepared statement
    let sql = strings[0];
    const params = [];
    
    for (let i = 0; i < values.length; i++) {
      sql += '?';
      params.push(values[i]);
      if (i < strings.length - 1) {
        sql += strings[i + 1];
      }
    }
    
    return this.query(sql, params);
  },
  
  // Close the connection pool
  async end() {
    await pool.end();
  }
};
