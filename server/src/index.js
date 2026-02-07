import express from 'express';
import cors from 'cors';
import sql from './db.js'; // your postgres connection file
import dotenv from 'dotenv';
import multer from 'multer';
import csvParser from 'csv-parser';
import XLSX from 'xlsx';
import { Readable } from 'stream';
import { authMiddleware, optionalAuthMiddleware } from './middleware/auth.js';

dotenv.config();

const app = express();
app.use(express.json());
app.use(cors({
  origin: "http://localhost:5173", // React dev server
  methods: ["GET","POST","PUT","DELETE"],
  credentials: true
}));

// Request Logging Middleware
app.use((req, res, next) => {
  const start = Date.now();
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url} - Request received`);
  
  if (Object.keys(req.body).length > 0) {
    console.log('Body:', JSON.stringify(req.body, null, 2));
  }

  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url} - ${res.statusCode} (${duration}ms)`);
  });

  next();
});

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({ 
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['text/csv', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'];
    if (allowedTypes.includes(file.mimetype) || file.originalname.match(/\.(csv|xlsx|xls)$/)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only CSV and Excel files are allowed.'));
    }
  }
});


const PORT = process.env.PORT||3000;


// ------------------------------
// Root endpoint to check database connection with detailed diagnostics
// ------------------------------
app.get('/', async (req, res) => {
  const startTime = Date.now();
  const timestamp = new Date().toISOString();
  
  try {
    console.log('🔍 Performing comprehensive database diagnostics...');
    
    // Test basic connection
    const basicTest = await sql`SELECT 1 AS connection_test`;
    const basicTestTime = Date.now() - startTime;
    
    // Get database info
    const dbInfo = await sql`
      SELECT 
        current_database() as database_name,
        current_user as user_name,
        version() as db_version,
        inet_server_addr() as server_ip,
        inet_server_port() as server_port
    `;
    
    // Get table count and list
    const tables = await sql`
      SELECT table_name, 
            (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
      FROM information_schema.tables t
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `;
    
    // Test key tables existence
    const keyTables = ['assets_master', 'breakdown_logs', 'spare_parts_inventory', 'profiles'];
    const tableStatus = {};
    
    for (const table of keyTables) {
      try {
        const count = await sql`SELECT COUNT(*) as count FROM public.${sql(table)}`;
        tableStatus[table] = {
          exists: true,
          recordCount: parseInt(count[0].count)
        };
      } catch (err) {
        tableStatus[table] = {
          exists: false,
          error: err.message
        };
      }
    }
    
    // Get connection pool info
    const poolInfo = {
      totalTime: Date.now() - startTime,
      basicTestTime: basicTestTime
    };
    
    console.log('✅ Database diagnostics completed successfully');
    
    res.status(200).json({
      status: 'success',
      message: 'Backend server is running and connected to the database!',
      timestamp: timestamp,
      diagnostics: {
        connection: {
          status: 'connected',
          responseTime: `${basicTestTime}ms`,
          totalDiagnosticTime: `${poolInfo.totalTime}ms`
        },
        database: {
          name: dbInfo[0].database_name,
          user: dbInfo[0].user_name,
          version: dbInfo[0].db_version.split(' ')[0],
          server: `${dbInfo[0].server_ip || 'localhost'}:${dbInfo[0].server_port || 5432}`
        },
        tables: {
          total: tables.length,
          list: tables.map(t => ({
            name: t.table_name,
            columns: t.column_count
          }))
        },
        keyTables: tableStatus,
        server: {
          uptime: process.uptime(),
          memory: process.memoryUsage(),
          nodeVersion: process.version,
          platform: process.platform
        }
      }
    });
    
  } catch (err) {
    const errorTime = Date.now() - startTime;
    console.error('❌ Database connection error:', err);
    
    res.status(500).json({
      status: 'error',
      message: 'Backend server is running but database connection failed',
      timestamp: timestamp,
      error: {
        message: err.message,
        code: err.code,
        severity: err.severity,
        detail: err.detail,
        hint: err.hint
      },
      diagnostics: {
        connection: {
          status: 'failed',
          responseTime: `${errorTime}ms`
        },
        troubleshooting: [
          'Check if PostgreSQL service is running',
          'Verify database credentials in db.js',
          'Ensure database "MIS_dev" exists',
          'Check network connectivity to database server',
          'Verify user permissions for database access'
        ],
        server: {
          uptime: process.uptime(),
          memory: process.memoryUsage(),
          nodeVersion: process.version,
          platform: process.platform
        }
      }
    });
  }
});

// ------------------------------
// Database Health Check Endpoint
// ------------------------------
app.get('/api/health', async (req, res) => {
  const healthCheck = {
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    status: 'healthy',
    checks: {}
  };
  
  try {
    // Database connectivity check
    const dbStart = Date.now();
    await sql`SELECT 1`;
    const dbTime = Date.now() - dbStart;
    
    healthCheck.checks.database = {
      status: 'healthy',
      responseTime: `${dbTime}ms`,
      message: 'Database connection is working'
    };
    
    // Check critical tables
    const criticalTables = ['assets_master', 'breakdown_logs', 'spare_parts_inventory', 'profiles'];
    const tableChecks = {};
    
    for (const table of criticalTables) {
      try {
        const start = Date.now();
        const result = await sql`SELECT COUNT(*) as count FROM public.${sql(table)}`;
        const time = Date.now() - start;
        
        tableChecks[table] = {
          status: 'healthy',
          recordCount: parseInt(result[0].count),
          responseTime: `${time}ms`
        };
      } catch (err) {
        tableChecks[table] = {
          status: 'unhealthy',
          error: err.message
        };
        healthCheck.status = 'degraded';
      }
    }
    
    healthCheck.checks.tables = tableChecks;
    
    // Memory usage check
    const memoryUsage = process.memoryUsage();
    const memoryUsageMB = {
      rss: Math.round(memoryUsage.rss / 1024 / 1024),
      heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024),
      heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024),
      external: Math.round(memoryUsage.external / 1024 / 1024)
    };
    
    healthCheck.checks.memory = {
      status: memoryUsageMB.heapUsed < 500 ? 'healthy' : 'warning',
      usage: memoryUsageMB,
      message: memoryUsageMB.heapUsed < 500 ? 'Memory usage is normal' : 'High memory usage detected'
    };
    
    if (memoryUsageMB.heapUsed >= 500) {
      healthCheck.status = 'degraded';
    }
    
    // Overall status determination
    const allChecksHealthy = Object.values(healthCheck.checks).every(check => 
      check.status === 'healthy' || check.status === 'warning'
    );
    
    if (!allChecksHealthy) {
      healthCheck.status = 'unhealthy';
    }
    
    const statusCode = healthCheck.status === 'healthy' ? 200 : 
                      healthCheck.status === 'degraded' ? 200 : 503;
    
    res.status(statusCode).json(healthCheck);
    
  } catch (err) {
    console.error('Health check failed:', err);
    
    healthCheck.status = 'unhealthy';
    healthCheck.checks.database = {
      status: 'unhealthy',
      error: err.message,
      message: 'Database connection failed'
    };
    
    res.status(503).json(healthCheck);
  }
});

// ------------------------------
//route to fetch all assets
// ------------------------------
app.get('/api/assets', async (req, res) => {
  try {
    const assets = await sql`SELECT * FROM public.assets_master`;
    res.json(assets);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

// ------------------------------
// route to fetch all assets
// ------------------------------
app.get('/api/breakdowns', async (req, res) => {
  const { date } = req.query; // date in 'YYYY-MM-DD' format

  try {
    let query;
    if (date) {
      query = await sql`
        SELECT b.*, a.asset_name 
        FROM public.breakdown_logs b
        LEFT JOIN public.assets_master a ON b.asset_id = a.id
        WHERE DATE(b.created_at) = ${date}
        ORDER BY b.created_at DESC
      `;
    } else {
      query = await sql`
        SELECT b.*, a.asset_name
        FROM public.breakdown_logs b
        LEFT JOIN public.assets_master a ON b.asset_id = a.id
        ORDER BY b.created_at DESC
      `;
    }

    res.json(query);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error fetching breakdowns' });
  }
});

// ------------------------------
// GET /api/breakdowns/:id - Get single breakdown
// ------------------------------
app.get('/api/breakdowns/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const query = await sql`
      SELECT b.*, a.asset_name, a.location, a.model, a.serial_number, a.asset_code
      FROM public.breakdown_logs b
      LEFT JOIN public.assets_master a ON b.asset_id = a.id
      WHERE b.id = ${id}
    `;
    
    if (!query.length) return res.status(404).json({ error: 'Breakdown log not found' });
    res.json(query[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error fetching breakdown' });
  }
});

// ------------------------------
// PUT /api/breakdowns/:id - Update breakdown
// ------------------------------
app.put('/api/breakdowns/:id', async (req, res) => {
  const { id } = req.params;
  const { 
    description, reported_by, acknowledged_by, root_cause, action_taken, 
    started_at, ended_at, status, parts_replaced, work_performed, faults_found, technician
  } = req.body;

  try {
    const result = await sql`
      UPDATE public.breakdown_logs
      SET
        description = COALESCE(${description}, description),
        reported_by = COALESCE(${reported_by}, reported_by),
        acknowledged_by = COALESCE(${acknowledged_by}, acknowledged_by),
        root_cause = COALESCE(${root_cause}, root_cause),
        action_taken = COALESCE(${action_taken}, action_taken),
        started_at = COALESCE(${started_at}, started_at),
        ended_at = COALESCE(${ended_at}, ended_at),
        status = COALESCE(${status}, status),
        updated_at = now()
      WHERE id = ${id}
      RETURNING *;
    `;

    if (!result.length) return res.status(404).json({ error: 'Breakdown log not found' });
    res.json(result[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error updating breakdown' });
  }
});

// ------------------------------
// POST /api/breakdowns - Create new breakdown
// ------------------------------
app.post('/api/breakdowns', async (req, res) => {
  const { 
    asset_id, description, reported_by, status = 'OPEN',
    bu_name = null, production_opening_time = null, entry_date = null, entry_time = null,
    equipment_type = null, root_cause = null, action_taken = null, note = null
  } = req.body;
  
  console.log('Breakdown POST values:', {
    asset_id, description, reported_by, status,
    bu_name, production_opening_time, entry_date, entry_time,
    equipment_type, root_cause, action_taken, note
  });

  try {
    const result = await sql`
      INSERT INTO public.breakdown_logs (
        asset_id, description, reported_by, status,
        bu_name, production_opening_time, entry_date, entry_time,
        equipment_type, root_cause, action_taken, note
      )
      VALUES (
        ${asset_id}, ${description}, ${reported_by}, ${status},
        ${bu_name}, ${production_opening_time}, ${entry_date}, ${entry_time},
        ${equipment_type}, ${root_cause}, ${action_taken}, ${note}
      )
      RETURNING *
    `;
    res.status(201).json(result[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error creating breakdown' });
  }
});

// ------------------------------
// PUT /api/breakdowns/:id - Update breakdown
// ------------------------------
app.put('/api/breakdowns/:id', async (req, res) => {
  const { id } = req.params;
  const updates = req.body;
  
  // Filter out fields that shouldn't be updated directly or map them if needed
  // For simplicity, we'll construct the update query dynamically
  // but safely using postgres.js helper if possible, or manual construction
  
  // Safe whitelist of columns
  const allowedColumns = [
    'description', 'root_cause', 'action_taken', 'status', 'ended_at', 'acknowledged_by',
    'bu_name', 'production_opening_time', 'entry_date', 'entry_time', 'equipment_type', 'note'
  ];
  const updateData = {};
  
  allowedColumns.forEach(col => {
    if (updates[col] !== undefined) {
      updateData[col] = updates[col];
    }
  });

  if (Object.keys(updateData).length === 0) {
    return res.status(400).json({ error: 'No valid fields to update' });
  }

  try {
    const result = await sql`
      UPDATE public.breakdown_logs
      SET ${sql(updateData)}
      WHERE id = ${id}
      RETURNING *
    `;
    
    if (result.length === 0) {
      return res.status(404).json({ error: 'Breakdown not found' });
    }
    
    res.json(result[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error updating breakdown' });
  }
});

// ------------------------------
// PM Endpoints
// ------------------------------

// GET all PM schedules
app.get('/api/pm', async (req, res) => {
  try {
    const pms = await sql`
      SELECT pm.*, a.asset_name 
      FROM public.pm_schedule pm
      LEFT JOIN public.assets_master a ON pm.asset_id = a.id
      ORDER BY pm.due_date ASC
    `;
    res.json(pms);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error fetching PM schedules' });
  }
});

// GET single PM schedule
app.get('/api/pm/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const pm = await sql`
      SELECT pm.*, a.asset_name, a.asset_code, a.location, a.model
      FROM public.pm_schedule pm
      LEFT JOIN public.assets_master a ON pm.asset_id = a.id
      WHERE pm.id = ${id}
    `;
    if (!pm.length) return res.status(404).json({ error: 'PM schedule not found' });
    res.json(pm[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error fetching PM schedule' });
  }
});

// POST create PM schedule
app.post('/api/pm', async (req, res) => {
  const { asset_id, title, frequency, due_date, checklist, status, last_completed_at } = req.body;
  try {
    const result = await sql`
      INSERT INTO public.pm_schedule (asset_id, title, frequency, due_date, checklist, status, last_completed_at)
      VALUES (${asset_id}, ${title}, ${frequency}, ${due_date}, ${checklist}, ${status}, ${last_completed_at})
      RETURNING *
    `;
    res.status(201).json(result[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error creating PM schedule' });
  }
});

// PUT update PM schedule
app.put('/api/pm/:id', async (req, res) => {
  const { id } = req.params;
  const updates = req.body;
  
  const allowedColumns = ['title', 'frequency', 'due_date', 'checklist', 'status', 'last_completed_at'];
  const updateData = {};
  
  allowedColumns.forEach(col => {
    if (updates[col] !== undefined) {
      updateData[col] = updates[col];
    }
  });

  if (Object.keys(updateData).length === 0) {
    return res.status(400).json({ error: 'No valid fields to update' });
  }

  try {
    const result = await sql`
      UPDATE public.pm_schedule
      SET ${sql(updateData)}
      WHERE id = ${id}
      RETURNING *
    `;
    if (result.length === 0) return res.status(404).json({ error: 'PM schedule not found' });
    res.json(result[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error updating PM schedule' });
  }
});

// ------------------------------
// Spares Endpoints
// ------------------------------

// GET all spares
app.get('/api/spares', async (req, res) => {
  try {
    const spares = await sql`SELECT * FROM public.spare_parts_inventory ORDER BY part_name`;
    res.json(spares);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error fetching spares' });
  }
});

// POST create spare
app.post('/api/spares', async (req, res) => {
  const { part_code, part_name, uom, stock_on_hand, reorder_level, location, category, min_level, unit_cost, supplier } = req.body;
  try {
    const result = await sql`
      INSERT INTO public.spare_parts_inventory (part_code, part_name, uom, stock_on_hand, reorder_level, location, category, min_level, unit_cost, supplier)
      VALUES (${part_code}, ${part_name}, ${uom}, ${stock_on_hand}, ${reorder_level}, ${location}, ${category}, ${min_level}, ${unit_cost}, ${supplier})
      RETURNING *
    `;
    res.status(201).json(result[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error creating spare' });
  }
});

// PUT update spare
app.put('/api/spares/:id', async (req, res) => {
  const { id } = req.params;
  const updates = req.body;
  
  const allowedColumns = ['part_name', 'uom', 'stock_on_hand', 'reorder_level', 'location', 'category', 'min_level', 'unit_cost', 'supplier'];
  const updateData = {};
  
  allowedColumns.forEach(col => {
    if (updates[col] !== undefined) {
      updateData[col] = updates[col];
    }
  });

  if (Object.keys(updateData).length === 0) {
    return res.status(400).json({ error: 'No valid fields to update' });
  }

  try {
    const result = await sql`
      UPDATE public.spare_parts_inventory
      SET ${sql(updateData)}
      WHERE id = ${id}
      RETURNING *
    `;
    if (result.length === 0) return res.status(404).json({ error: 'Spare not found' });
    res.json(result[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error updating spare' });
  }
});
//check api from here 
// ------------------------------
// DASHBOARD STATS API
// ------------------------------
app.get('/api/dashboard/stats', async (req, res) => {
  try {
    const [
      assetCount,
      pmTotal,
      pmDueToday,
      sparesCount,
      openBreakdowns
    ] = await Promise.all([
      sql`SELECT COUNT(*) FROM public.assets_master`,
      sql`SELECT COUNT(*) FROM public.pm_schedule`,
      sql`SELECT COUNT(*) FROM public.pm_schedule WHERE due_date = CURRENT_DATE`,
      sql`SELECT COUNT(*) FROM public.spare_parts_inventory`,
      sql`SELECT COUNT(*) FROM public.breakdown_logs WHERE status = 'OPEN'`
    ]);

    res.json({
      assets: {
        total: parseInt(assetCount[0].count),
        subtitle: 'Total Assets'
      },
      pm: {
        total: parseInt(pmTotal[0].count),
        dueToday: parseInt(pmDueToday[0].count)
      },
      spares: {
        total: parseInt(sparesCount[0].count),
        subtitle: 'Items in Stock'
      },
      breakdowns: {
        open: parseInt(openBreakdowns[0].count)
      }
    });
  } catch (err) {
    console.error('Error fetching dashboard stats:', err);
    res.status(500).json({ error: 'Database error fetching dashboard stats' });
  }
});

// ------------------------------
// 📊 ASSET COUNTS API - Must be before /api/assets/:id to avoid route conflict
// ------------------------------
app.get('/api/assets/counts', async (req, res) => {
    try {
        const [
            totalCount,
            activeCount,
            underAmcCount,
            inactiveCount,
            disposedCount
        ] = await Promise.all([
            sql`SELECT COUNT(*) FROM public.assets_master`,
            sql`SELECT COUNT(*) FROM public.assets_master WHERE status = 'ACTIVE'`,
            sql`SELECT COUNT(*) FROM public.assets_master WHERE status = 'UNDER_AMC'`,
            sql`SELECT COUNT(*) FROM public.assets_master WHERE status = 'INACTIVE'`,
            sql`SELECT COUNT(*) FROM public.assets_master WHERE status = 'DISPOSED'`
        ]);

        res.json({
            total: parseInt(totalCount[0].count, 10),
            active: parseInt(activeCount[0].count, 10),
            under_amc: parseInt(underAmcCount[0].count, 10),
            inactive: parseInt(inactiveCount[0].count, 10),
            disposed: parseInt(disposedCount[0].count, 10)
        });

    } catch (err) {
        console.error('Error fetching asset counts:', err);
        res.status(500).json({ error: 'Database error fetching asset counts', details: err.message });
    }
});

// ------------------------------
// GET single asset by ID
// ------------------------------
app.get('/api/assets/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const asset = await sql`SELECT * FROM public.assets_master WHERE id = ${id}`;
    if (!asset.length) return res.status(404).json({ error: 'Asset not found' });
    res.json(asset[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error fetching asset' });
  }
});
// ------------------------------
// CREATE new asset
// ------------------------------
app.post('/api/assets', async (req, res) => {
  const { asset_code, asset_name, location, category, manufacturer, model, serial_number, install_date, status } = req.body;

  // Validate status
  const allowedStatus = ['ACTIVE','UNDER_AMC','INACTIVE','DISPOSED'];
  if (!allowedStatus.includes(status)) return res.status(400).json({ error: 'Invalid status value' });

  try {
    const result = await sql`
      INSERT INTO public.assets_master
      (asset_code, asset_name, location, category, manufacturer, model, serial_number, install_date, status)
      VALUES
      (${asset_code}, ${asset_name}, ${location}, ${category}, ${manufacturer}, ${model}, ${serial_number}, ${install_date}, ${status})
      RETURNING *;
    `;
    res.status(201).json(result[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error creating asset' });
  }
});

// ------------------------------
// BULK INSERT assets
// ------------------------------
app.post('/api/assets/bulk', async (req, res) => {
  const { assets } = req.body;

  if (!assets || !Array.isArray(assets) || assets.length === 0) {
    return res.status(400).json({ error: 'Invalid request: assets array is required' });
  }

  const allowedStatus = ['ACTIVE','UNDER_AMC','INACTIVE','DISPOSED'];
  const errors = [];
  let successCount = 0;

  try {
    // Use a transaction for bulk insert
    await sql.begin(async (tx) => {
      for (let i = 0; i < assets.length; i++) {
        const asset = assets[i];
        
        // Normalize column names (convert to lowercase)
        const normalizedAsset = {};
        Object.keys(asset).forEach(key => {
          normalizedAsset[key.toLowerCase().trim()] = asset[key];
        });

        const {
          asset_code,
          asset_name,
          location = null,
          category = null,
          manufacturer = null,
          model = null,
          serial_number = null,
          install_date = null,
          status = 'ACTIVE'
        } = normalizedAsset;

        // Validate required fields
        if (!asset_code || !asset_name) {
          errors.push(`Row ${i + 2}: Missing required fields (asset_code and asset_name)`);
          continue;
        }

        // Validate status
        const statusUpper = status ? status.toString().toUpperCase() : 'ACTIVE';
        if (!allowedStatus.includes(statusUpper)) {
          errors.push(`Row ${i + 2}: Invalid status value '${status}'`);
          continue;
        }

        try {
          await tx`
            INSERT INTO public.assets_master
            (asset_code, asset_name, location, category, manufacturer, model, serial_number, install_date, status)
            VALUES
            (${asset_code}, ${asset_name}, ${location}, ${category}, ${manufacturer}, ${model}, ${serial_number}, ${install_date}, ${statusUpper})
          `;
          successCount++;
        } catch (err) {
          // Handle duplicate asset_code or other DB errors
          if (err.code === '23505') { // PostgreSQL unique violation error code
            errors.push(`Row ${i + 2}: Duplicate asset_code '${asset_code}'`);
          } else {
            errors.push(`Row ${i + 2}: Database error - ${err.message}`);
          }
        }
      }
    });

    // Return response with results
    if (errors.length > 0 && successCount === 0) {
      return res.status(400).json({
        error: 'Bulk import failed',
        details: errors,
        count: 0
      });
    }

    res.status(201).json({
      message: `Successfully imported ${successCount} out of ${assets.length} assets`,
      count: successCount,
      errors: errors.length > 0 ? errors : undefined
    });

  } catch (err) {
    console.error('Bulk insert error:', err);
    res.status(500).json({ error: 'Database error during bulk import', details: err.message });
  }
});

// ------------------------------
// IMPORT assets from CSV/Excel file
// ------------------------------
app.post('/api/assets/import', upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  try {
    let parsedData = [];
    const fileExtension = req.file.originalname.split('.').pop().toLowerCase();

    // Parse file based on extension
    if (fileExtension === 'csv') {
      parsedData = await parseCSVFile(req.file.buffer);
    } else if (fileExtension === 'xlsx' || fileExtension === 'xls') {
      parsedData = await parseExcelFile(req.file.buffer);
    } else {
      return res.status(400).json({ error: 'Unsupported file format. Only CSV and Excel files are allowed.' });
    }

    // Validate schema
    const schemaValidation = validateAssetSchema(parsedData);
    if (!schemaValidation.valid) {
      return res.status(400).json({ 
        error: 'Schema validation failed', 
        details: schemaValidation.errors 
      });
    }

    // Validate data types and values
    const dataValidation = validateAssetData(parsedData);
    if (!dataValidation.valid) {
      return res.status(400).json({ 
        error: 'Data validation failed', 
        details: dataValidation.errors 
      });
    }

    // Insert data using bulk insert logic
    const allowedStatus = ['ACTIVE','UNDER_AMC','INACTIVE','DISPOSED'];
    const errors = [];
    let successCount = 0;

    await sql.begin(async (tx) => {
      for (let i = 0; i < parsedData.length; i++) {
        const row = parsedData[i];
        
        // Normalize column names
        const normalizedRow = {};
        Object.keys(row).forEach(key => {
          normalizedRow[key.toLowerCase().trim()] = row[key];
        });

        const {
          asset_code,
          asset_name,
          location = null,
          category = null,
          manufacturer = null,
          model = null,
          serial_number = null,
          install_date = null,
          status = 'ACTIVE'
        } = normalizedRow;

        try {
          const statusUpper = status ? status.toString().toUpperCase() : 'ACTIVE';
          await tx`
            INSERT INTO public.assets_master
            (asset_code, asset_name, location, category, manufacturer, model, serial_number, install_date, status)
            VALUES
            (${asset_code}, ${asset_name}, ${location}, ${category}, ${manufacturer}, ${model}, ${serial_number}, ${install_date}, ${statusUpper})
          `;
          successCount++;
        } catch (err) {
          if (err.code === '23505') {
            errors.push(`Row ${i + 2}: Duplicate asset_code '${asset_code}'`);
          } else {
            errors.push(`Row ${i + 2}: ${err.message}`);
          }
        }
      }
    });

    res.status(200).json({
      message: `Successfully imported ${successCount} out of ${parsedData.length} assets`,
      count: successCount,
      total: parsedData.length,
      errors: errors.length > 0 ? errors : undefined
    });

  } catch (err) {
    console.error('Import error:', err);
    res.status(500).json({ error: 'Failed to import data', details: err.message });
  }
});

// Helper function to parse CSV file
function parseCSVFile(buffer) {
  return new Promise((resolve, reject) => {
    const results = [];
    const stream = Readable.from(buffer.toString());
    
    stream
      .pipe(csvParser())
      .on('data', (data) => results.push(data))
      .on('end', () => resolve(results))
      .on('error', (error) => reject(error));
  });
}

// Helper function to parse Excel file
function parseExcelFile(buffer) {
  try {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);
    return Promise.resolve(data);
  } catch (error) {
    return Promise.reject(error);
  }
}

// Helper function to validate schema
function validateAssetSchema(data) {
  if (!data || data.length === 0) {
    return { valid: false, errors: ['File is empty or contains no data'] };
  }

  const requiredColumns = ['asset_code', 'asset_name'];
  const optionalColumns = ['location', 'category', 'manufacturer', 'model', 'serial_number', 'install_date', 'status'];
  const allValidColumns = [...requiredColumns, ...optionalColumns];
  
  const fileColumns = Object.keys(data[0]).map(col => col.toLowerCase().trim());
  const errors = [];

  // Check for required columns
  const missingColumns = requiredColumns.filter(col => !fileColumns.includes(col.toLowerCase()));
  if (missingColumns.length > 0) {
    errors.push(`Missing required columns: ${missingColumns.join(', ')}`);
  }

  // Check for unknown columns
  const unknownColumns = fileColumns.filter(col => !allValidColumns.map(c => c.toLowerCase()).includes(col));
  if (unknownColumns.length > 0) {
    errors.push(`Unknown columns: ${unknownColumns.join(', ')}. Valid columns are: ${allValidColumns.join(', ')}`);
  }

  return {
    valid: errors.length === 0,
    errors: errors.length > 0 ? errors : undefined
  };
}

// Helper function to validate data types and values
function validateAssetData(data) {
  const errors = [];
  const allowedStatus = ['ACTIVE', 'UNDER_AMC', 'INACTIVE', 'DISPOSED'];

  data.forEach((row, index) => {
    const rowNum = index + 2; // +2 because index starts at 0 and row 1 is header
    
    // Normalize column names
    const normalizedRow = {};
    Object.keys(row).forEach(key => {
      normalizedRow[key.toLowerCase().trim()] = row[key];
    });

    // Check required fields
    if (!normalizedRow.asset_code || normalizedRow.asset_code.toString().trim() === '') {
      errors.push(`Row ${rowNum}: Missing required field 'asset_code'`);
    }
    if (!normalizedRow.asset_name || normalizedRow.asset_name.toString().trim() === '') {
      errors.push(`Row ${rowNum}: Missing required field 'asset_name'`);
    }

    // Validate status if provided
    if (normalizedRow.status) {
      const statusUpper = normalizedRow.status.toString().toUpperCase();
      if (!allowedStatus.includes(statusUpper)) {
        errors.push(`Row ${rowNum}: Invalid status '${normalizedRow.status}'. Must be one of: ${allowedStatus.join(', ')}`);
      }
    }

    // Validate date format if provided
    if (normalizedRow.install_date) {
      const dateValue = new Date(normalizedRow.install_date);
      if (isNaN(dateValue.getTime())) {
        errors.push(`Row ${rowNum}: Invalid date format for 'install_date'. Use YYYY-MM-DD format`);
      }
    }
  });

  // Limit errors to first 10 for readability
  if (errors.length > 10) {
    const remainingCount = errors.length - 10;
    errors.splice(10);
    errors.push(`... and ${remainingCount} more validation errors`);
  }

  return {
    valid: errors.length === 0,
    errors: errors.length > 0 ? errors : undefined
  };
}

// ------------------------------
// UPDATE asset
// ------------------------------
app.put('/api/assets/:id', async (req, res) => {
  const { id } = req.params;
  const { asset_code, asset_name, location, category, manufacturer, model, serial_number, install_date, status } = req.body;

  const allowedStatus = ['ACTIVE','UNDER_AMC','INACTIVE','DISPOSED'];
  if (status && !allowedStatus.includes(status)) return res.status(400).json({ error: 'Invalid status value' });

  try {
    const updated = await sql`
      UPDATE public.assets_master
      SET
        asset_code = COALESCE(${asset_code}, asset_code),
        asset_name = COALESCE(${asset_name}, asset_name),
        location = COALESCE(${location}, location),
        category = COALESCE(${category}, category),
        manufacturer = COALESCE(${manufacturer}, manufacturer),
        model = COALESCE(${model}, model),
        serial_number = COALESCE(${serial_number}, serial_number),
        install_date = COALESCE(${install_date}, install_date),
        status = COALESCE(${status}, status),
        updated_at = now()
      WHERE id = ${id}
      RETURNING *;
    `;

    if (!updated.length) return res.status(404).json({ error: 'Asset not found' });
    res.json(updated[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error updating asset' });
  }
});
// ------------------------------
// DELETE asset
// ------------------------------
app.delete('/api/assets/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const deleted = await sql`DELETE FROM public.assets_master WHERE id = ${id} RETURNING *;`;
    if (!deleted.length) return res.status(404).json({ error: 'Asset not found' });
    res.json({ message: 'Asset deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error deleting asset' });
  }
});
// ------------------------------
// CREATE new breakdown log
// ------------------------------
app.post('/api/breakdowns', async (req, res) => {
  const {
    asset_id,
    description,
    reported_by,
    acknowledged_by = null,
    root_cause = null,
    action_taken = null,
    started_at = new Date().toISOString(),
    ended_at = null,
    status = 'OPEN'
  } = req.body;

  const allowedStatus = ['OPEN','ACK','IN_PROGRESS','RESOLVED','CLOSED'];
  if (!allowedStatus.includes(status)) return res.status(400).json({ error: 'Invalid status value' });

  try {
    const result = await sql`
      INSERT INTO public.breakdown_logs
      (asset_id, description, reported_by, acknowledged_by, root_cause, action_taken, started_at, ended_at, status)
      VALUES
      (${asset_id}, ${description}, ${reported_by}, ${acknowledged_by}, ${root_cause}, ${action_taken}, ${started_at}, ${ended_at}, ${status})
      RETURNING *;
    `;

    res.status(201).json(result[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error creating breakdown' });
  }
});

// ======================================================
// 🧾 USERS LIST — GET all users//demo purpose 
// ======================================================
app.get("/api/users", async (req, res) => {
  try {
    const users = await sql`
      SELECT id, full_name, role, created_at
      FROM public.profiles
      ORDER BY created_at DESC
    `;
    res.json(users);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error fetching users' });
  }
});
// ======================================================
// 🧠 FETCH ROLE API — Get role by email & password
// ======================================================
app.post("/api/getRole", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }

  try {
    const user = await sql`
      SELECT role
      FROM public.profiles
      WHERE email = ${email} AND password = ${password}
      LIMIT 1
    `;

    if (!user.length) {
      return res.status(404).json({ error: "User not found or invalid credentials" });
    }

    res.json({ role: user[0].role });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error fetching role" });
  }
});
// ======================================================
// 🔑 LOGIN API — Verify credentials and return user info
// ======================================================
app.post("/api/login", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }

  try {
    // Query Postgres for user
    const user = await sql`
      SELECT id, full_name, email, role, password
      FROM public.profiles
      WHERE email = ${email}
      LIMIT 1
    `;

    if (!user.length) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    // For demo purposes, plain-text password check
    if (user[0].password !== password) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    // Return user info (without password) and a token
    res.json({
      message: "Login successful",
      token: "demo-token", // In a real app, generate a JWT token here
      user: {
        id: user[0].id,
        full_name: user[0].full_name,
        email: user[0].email,
        role: user[0].role
      }
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error during login" });
  }
});
// ======================================================
// 🧩 REGISTER API — Add new user (email, password, role)
// ======================================================
app.post("/api/register", async (req, res) => {
  const { email, password, role, full_name } = req.body;

  if (!email || !password || !role) {
    return res.status(400).json({ error: "Email, password, and role are required" });
  }

  try {
    // Check if email already exists in profiles
    const existing = await sql`
      SELECT id FROM public.profiles WHERE email = ${email}
    `;
    if (existing.length) {
      return res.status(409).json({ error: "Email already registered" });
    }

    // 1️⃣ Insert into users
    const user = await sql`
      INSERT INTO public.users (email, full_name, role)
      VALUES (${email}, ${full_name}, ${role})
      RETURNING id, email, full_name, role, created_at
    `;

    const userId = user[0].id;

    // 2️⃣ Insert into profiles
    const profile = await sql`
      INSERT INTO public.profiles (id, full_name, email, password, role)
      VALUES (${userId}, ${full_name}, ${email}, ${password}, ${role})
      RETURNING *
    `;

    res.status(201).json({
      message: "User registered successfully",
      token: "demo-token", // In a real app, generate a JWT token here
      user: profile[0]
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error during registration" });
  }
});
// ======================================================
// 🧰 SPARE PARTS INVENTORY CRUD
// ======================================================

// GET all spare parts
app.get("/api/spares", async (req, res) => {
  try {
    const spares = await sql`SELECT * FROM public.spare_parts_inventory ORDER BY id ASC`;
    res.json(spares);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error fetching spare parts" });
  }
});

// GET single spare part by ID
app.get("/api/spares/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const part = await sql`SELECT * FROM public.spare_parts_inventory WHERE id = ${id}`;
    if (!part.length) return res.status(404).json({ error: "Spare part not found" });
    res.json(part[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error fetching spare part" });
  }
});

// CREATE new spare part
app.post("/api/spares", async (req, res) => {
  const {
    part_code,
    part_name,
    part_no,
    uom = "NOS",
    stock_on_hand = 0,
    min_level = 0,
    reorder_level = 0,
    location,
    unit_cost,
    supplier,
  } = req.body;

  try {
    const result = await sql`
      INSERT INTO public.spare_parts_inventory
      (part_code, part_name, part_no, uom, stock_on_hand, min_level, reorder_level, location, unit_cost, supplier)
      VALUES
      (${part_code}, ${part_name}, ${part_no}, ${uom}, ${stock_on_hand}, ${min_level}, ${reorder_level}, ${location}, ${unit_cost}, ${supplier})
      RETURNING *;
    `;
    res.status(201).json(result[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error creating spare part" });
  }
});

// UPDATE existing spare part
app.put("/api/spares/:id", async (req, res) => {
  const { id } = req.params;
  const {
    part_code,
    part_name,
    stock_on_hand,
    min_level,
    reorder_level,
    location,
    unit_cost,
    supplier,
  } = req.body;

  try {
    const updated = await sql`
      UPDATE public.spare_parts_inventory
      SET
        part_code = COALESCE(${part_code}, part_code),
        part_name = COALESCE(${part_name}, part_name),
        stock_on_hand = COALESCE(${stock_on_hand}, stock_on_hand),
        min_level = COALESCE(${min_level}, min_level),
        reorder_level = COALESCE(${reorder_level}, reorder_level),
        location = COALESCE(${location}, location),
        unit_cost = COALESCE(${unit_cost}, unit_cost),
        supplier = COALESCE(${supplier}, supplier),
        updated_at = now()
      WHERE id = ${id}
      RETURNING *;
    `;
    if (!updated.length) return res.status(404).json({ error: "Spare part not found" });
    res.json(updated[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error updating spare part" });
  }
});

// DELETE spare part
app.delete("/api/spares/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const deleted = await sql`DELETE FROM public.spare_parts_inventory WHERE id = ${id} RETURNING *;`;
    if (!deleted.length) return res.status(404).json({ error: "Spare part not found" });
    res.json({ message: "Spare part deleted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error deleting spare part" });
  }
});
// ======================================================
// 🧾 MAINTENANCE/breakdown LOG + AUTO INVENTORY UPDATE
// ======================================================
app.post("/api/maintenance_logs", async (req, res) => {
  const { asset_id, description, reported_by, root_cause, action_taken, parts_used } = req.body;
  // parts_used = [{ part_id: 1, qty: 2 }, ...]

  if (!asset_id || !description || !reported_by) {
    return res.status(400).json({ error: "Asset, description, and reporter are required" });
  }

  try {
    await sql.begin(async (tx) => {
      // 1️⃣ Insert maintenance/breakdown log
      const [log] = await tx`
        INSERT INTO public.breakdown_logs (asset_id, description, reported_by, root_cause, action_taken, status)
        VALUES (${asset_id}, ${description}, ${reported_by}, ${root_cause}, ${action_taken}, 'RESOLVED')
        RETURNING id, created_at;
      `;

      // 2️⃣ Deduct spare part quantities and record transaction
      if (parts_used && parts_used.length > 0) {
        for (const part of parts_used) {
          await tx`
            UPDATE public.spare_parts_inventory
            SET stock_on_hand = stock_on_hand - ${part.qty}, updated_at = now()
            WHERE id = ${part.part_id};
          `;

          await tx`
            INSERT INTO public.spare_txn (part_id, qty, direction, asset_id, related_breakdown_id, created_by)
            VALUES (${part.part_id}, ${part.qty}, 'ISSUE', ${asset_id}, ${log.id}, ${reported_by});
          `;
        }
      }

      res.status(201).json({
        message: "Maintenance log created and inventory updated successfully",
        breakdown_id: log.id,
      });
    });
  } catch (err) {
    console.error("Error creating maintenance log:", err);
    res.status(500).json({ error: "Database error while creating maintenance log" });
  }
});
//test api from here
app.get('/api/qr/:payload', async (req, res) => {
  const { payload } = req.params;
  try {
    const asset = await sql`
      SELECT a.*
      FROM public.assets_master a
      JOIN public.asset_qr q ON a.id = q.asset_id
      WHERE q.qr_payload = ${payload};
    `;
    if (!asset.length) return res.status(404).json({ error: 'No asset found for this QR code' });
    res.json(asset[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error fetching asset by QR code' });
  }
});
// ======================================================
// 💡 UTILITIES MONITORING APIs
// ======================================================

// GET all utility logs
app.get('/api/utilities', async (req, res) => {
    try {
        const logs = await sql`SELECT * FROM public.utilities_log ORDER BY reading_at DESC`;
        res.json(logs);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error fetching utility logs' });
    }
});

// CREATE a new utility log entry
app.post('/api/utilities', async (req, res) => {
    const { utility_type, meter_point, reading, reading_at } = req.body;
    const allowedTypes = ['POWER', 'GAS', 'WATER', 'AIR'];
    if (!allowedTypes.includes(utility_type)) return res.status(400).json({ error: 'Invalid utility type' });

    try {
        const newLog = await sql`
            INSERT INTO public.utilities_log (utility_type, meter_point, reading, reading_at)
            VALUES (${utility_type}, ${meter_point}, ${reading}, ${reading_at})
            RETURNING *;
        `;
        res.status(201).json(newLog[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error creating utility log' });
    }
});

// ======================================================
// 📱 QR CODE API
// ======================================================

// GET asset by QR payload
app.get('/api/qr/:payload', async (req, res) => {
  const { payload } = req.params;
  try {
    const asset = await sql`
      SELECT a.*
      FROM public.assets_master a
      JOIN public.asset_qr q ON a.id = q.asset_id
      WHERE q.qr_payload = ${payload};
    `;
    if (!asset.length) return res.status(404).json({ error: 'No asset found for this QR code' });
    res.json(asset[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error fetching asset by QR code' });
  }
});


// ======================================================
// 📊 DASHBOARD & KPI APIs
// ======================================================
// GET stats for the main dashboard
app.get('/api/dashboard/stats', async (req, res) => {
    try {
        const [
            assetsCount,
            pmDueCount,
            urgentBreakdownsCount,
            spareInventoryCount,
            activeMetersCount
        ] = await Promise.all([
            sql`SELECT COUNT(*) FROM public.assets_master`,
            sql`SELECT COUNT(*) FROM public.pm_schedule WHERE status = 'DUE'`,
            sql`SELECT COUNT(*) FROM public.breakdown_logs WHERE status = 'OPEN'`,
            sql`SELECT SUM(stock_on_hand) as total_stock FROM public.spare_parts_inventory`,
            sql`SELECT COUNT(DISTINCT meter_point) FROM public.utilities_log`
        ]);

        res.json({
            assets: parseInt(assetsCount[0].count, 10),
            preventiveMaintenance: parseInt(pmDueCount[0].count, 10),
            breakdownMaintenance: parseInt(urgentBreakdownsCount[0].count, 10),
            spareInventory: parseFloat(spareInventoryCount[0].total_stock),
            utilitiesMonitoring: parseInt(activeMetersCount[0].count, 10),
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error fetching dashboard stats' });
    }
});



// ------------------------------
// Database Connection Monitoring Middleware
// ------------------------------
app.use((req, res, next) => {
  const startTime = Date.now();
  
  // Log database operations
  const originalSend = res.send;
  res.send = function(data) {
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    // Log slow database operations
    if (duration > 1000) {
      console.warn(`🐌 Slow database operation detected: ${req.method} ${req.path} took ${duration}ms`);
    }
    
    // Log database errors
    if (res.statusCode >= 500) {
      console.error(`❌ Database error in ${req.method} ${req.path}: Status ${res.statusCode}`);
    }
    
    return originalSend.call(this, data);
  };
  
  next();
});

// ------------------------------
// Global Error Handler for Database Operations
// ------------------------------
app.use((err, req, res, next) => {
  console.error('🚨 Unhandled error:', err);
  
  // Database-specific error handling
  if (err.code && err.code.startsWith('23')) {
    // PostgreSQL constraint violations
    console.error('🔒 Database constraint violation:', {
      code: err.code,
      message: err.message,
      detail: err.detail,
      hint: err.hint
    });
    
    return res.status(400).json({
      error: 'Database constraint violation',
      message: err.message,
      code: err.code
    });
  }
  
  if (err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND') {
    console.error('🔌 Database connection error:', {
      code: err.code,
      message: err.message,
      host: 'localhost',
      port: 5432
    });
    
    return res.status(503).json({
      error: 'Database connection failed',
      message: 'Unable to connect to database server',
      troubleshooting: [
        'Check if PostgreSQL is running',
        'Verify database server is accessible',
        'Check network connectivity'
      ]
    });
  }
  
  // Generic error response
  res.status(500).json({
    error: 'Internal server error',
    message: err.message,
    timestamp: new Date().toISOString()
  });
});

// ------------------------------
// Graceful Shutdown Handler
// ------------------------------
process.on('SIGINT', async () => {
  console.log('\n🛑 Received SIGINT, shutting down gracefully...');
  
  try {
    // Close database connections
    await sql.end();
    console.log('✅ Database connections closed');
  } catch (err) {
    console.error('❌ Error closing database connections:', err);
  }
  
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Received SIGTERM, shutting down gracefully...');
  
  try {
    await sql.end();
    console.log('✅ Database connections closed');
  } catch (err) {
    console.error('❌ Error closing database connections:', err);
  }
  
  process.exit(0);
});

// ======================================================
// 👤 PROFILE STATS API
// ======================================================
app.get('/api/profile/stats/:id', async (req, res) => {
  const { id } = req.params;
  try {
    // 1. Get User Details
    const userResult = await sql`SELECT * FROM public.profiles WHERE id = ${id}`;
    const user = userResult[0] || {};

    // 2. Get Reported Breakdowns (as a proxy for activity)
    let reportedBreakdowns = 0;
    try {
        const breakdownCount = await sql`SELECT COUNT(*) FROM public.breakdown_logs WHERE reported_by = ${id}`;
        reportedBreakdowns = parseInt(breakdownCount[0].count);
    } catch (e) {
        console.warn("Could not fetch breakdown stats for user", id);
    }

    // 3. Get Completed PM Tasks
    let completedTasks = 0;
    try {
        const entryCount = await sql`SELECT COUNT(*) FROM public.daily_entry_engineer WHERE created_by = ${id}`;
        completedTasks = parseInt(entryCount[0].count);
    } catch (e) {
         // Fallback
    }

    // 4. Assigned Assets (Mocked as 0 since we don't have assignment column)
    const assignedAssets = 0;

    res.json({
      role: user.role || 'User',
      department: 'Engineering', 
      assigned_assets: assignedAssets,
      completed_pm: completedTasks,
      reported_issues: reportedBreakdowns,
      last_login: user.updated_at || new Date().toISOString()
    });

  } catch (err) {
    console.error('Error fetching profile stats:', err);
    res.status(500).json({ error: 'Database error fetching profile stats' });
  }
});

// ------------------------------
// Start Server with Connection Logging
// ------------------------------
app.listen(PORT, () => {
  console.log('🚀 Server starting...');
  console.log(`📡 Server running on http://localhost:${PORT}`);
  console.log('🔍 Database debugging endpoints available:');
  console.log(`   - GET  http://localhost:${PORT}/          (Comprehensive diagnostics)`);
  console.log(`   - GET  http://localhost:${PORT}/api/health (Health check)`);
  console.log('📊 Database connection will be tested on startup...');
});
