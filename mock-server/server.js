#!/usr/bin/env node

/**
 * Mock Backend Server for MIS Frontend Development
 * This server provides mock API responses without requiring a database
 */

import express from 'express';
import cors from 'cors';

const app = express();
const PORT = 3000;

// Middleware
app.use(express.json());
app.use(cors({
  origin: "http://localhost:5173",
  methods: ["GET", "POST", "PUT", "DELETE"],
  credentials: true
}));

// Mock data
const mockUsers = [
  {
    id: 1,
    email: 'admin@mis.com',
    full_name: 'Admin User',
    role: 'admin',
    password: 'admin123'
  },
  {
    id: 2,
    email: 'engineer@mis.com',
    full_name: 'Engineer User', 
    role: 'engineer',
    password: 'engineer123'
  },
  {
    id: 3,
    email: 'operator@mis.com',
    full_name: 'Operator User',
    role: 'operator', 
    password: 'operator123'
  }
];

const mockAssets = [
  {
    id: 1,
    asset_code: 'A001',
    asset_name: 'CNC Machine 1',
    machine_no: 'CNC-001',
    location: 'Production Floor',
    category: 'Machinery',
    manufacturer: 'Haas',
    model: 'VF-2',
    serial_number: 'H123456',
    install_date: '2023-01-15',
    status: 'ACTIVE',
    created_at: '2023-01-15T10:00:00Z',
    updated_at: '2023-01-15T10:00:00Z'
  },
  {
    id: 2,
    asset_code: 'A002',
    asset_name: 'Conveyor Belt',
    machine_no: 'CONV-001', 
    location: 'Assembly Line',
    category: 'Conveyor',
    manufacturer: 'Flexco',
    model: 'FB-500',
    serial_number: 'F789012',
    install_date: '2023-03-20',
    status: 'ACTIVE',
    created_at: '2023-03-20T10:00:00Z',
    updated_at: '2023-03-20T10:00:00Z'
  },
  {
    id: 3,
    asset_code: 'A003',
    asset_name: 'Press Machine',
    machine_no: 'PRESS-001',
    location: 'Press Shop',
    category: 'Press',
    manufacturer: 'Schuler',
    model: 'P2H-400',
    serial_number: 'S345678',
    install_date: '2023-05-10',
    status: 'UNDER_AMC',
    created_at: '2023-05-10T10:00:00Z',
    updated_at: '2023-05-10T10:00:00Z'
  }
];

const mockBreakdowns = [
  {
    id: 1,
    asset_id: 1,
    description: 'Machine stopped working',
    reported_by: 'operator@mis.com',
    acknowledged_by: 'engineer@mis.com',
    root_cause: 'Motor failure',
    action_taken: 'Replaced motor',
    started_at: '2024-01-15T09:00:00Z',
    ended_at: '2024-01-15T15:30:00Z',
    status: 'RESOLVED',
    created_at: '2024-01-15T09:00:00Z'
  },
  {
    id: 2,
    asset_id: 2,
    description: 'Conveyor belt jammed',
    reported_by: 'operator@mis.com',
    acknowledged_by: null,
    root_cause: null,
    action_taken: null,
    started_at: '2024-01-16T14:20:00Z',
    ended_at: null,
    status: 'OPEN',
    created_at: '2024-01-16T14:20:00Z'
  }
];

const mockSpares = [
  {
    id: 1,
    part_code: 'SP001',
    part_name: 'Bearing 6205',
    part_no: 'BR-6205',
    uom: 'NOS',
    stock_on_hand: 15,
    min_level: 5,
    reorder_level: 3,
    location: 'Store A',
    unit_cost: 25.50,
    supplier: 'Bearing Corp',
    created_at: '2023-01-01T10:00:00Z',
    updated_at: '2023-01-01T10:00:00Z'
  },
  {
    id: 2,
    part_code: 'SP002',
    part_name: 'Belt A-45',
    part_no: 'BL-A45',
    uom: 'MTR',
    stock_on_hand: 8,
    min_level: 3,
    reorder_level: 2,
    location: 'Store B',
    unit_cost: 12.75,
    supplier: 'Belt Solutions',
    created_at: '2023-01-01T10:00:00Z',
    updated_at: '2023-01-01T10:00:00Z'
  }
];

// Helper function to simulate delay
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Helper function to find user by credentials
const findUserByCredentials = (email, password) => {
  return mockUsers.find(user => user.email === email && user.password === password);
};

// Helper function to generate token
const generateToken = () => {
  return 'mock-token-' + Math.random().toString(36).substr(2, 9);
};

console.log('🚀 Starting Mock Backend Server...');
console.log('================================');

// Root endpoint - Database diagnostics
app.get('/', async (req, res) => {
  await delay(100); // Simulate database response time
  
  res.json({
    status: 'success',
    message: 'Mock backend server is running! (No database required)',
    timestamp: new Date().toISOString(),
    diagnostics: {
      connection: {
        status: 'mock',
        responseTime: '100ms',
        totalDiagnosticTime: '150ms'
      },
      database: {
        name: 'mock-database',
        user: 'mock-user',
        version: 'Mock v1.0',
        server: 'localhost:3000'
      },
      tables: {
        total: 4,
        list: [
          { name: 'users', columns: 5 },
          { name: 'assets_master', columns: 12 },
          { name: 'breakdown_logs', columns: 9 },
          { name: 'spare_parts_inventory', columns: 11 }
        ]
      },
      keyTables: {
        users: { exists: true, recordCount: mockUsers.length },
        assets_master: { exists: true, recordCount: mockAssets.length },
        breakdown_logs: { exists: true, recordCount: mockBreakdowns.length },
        spare_parts_inventory: { exists: true, recordCount: mockSpares.length }
      },
      server: {
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        nodeVersion: process.version,
        platform: process.platform
      }
    }
  });
});

// Health check endpoint
app.get('/api/health', async (req, res) => {
  await delay(50);
  
  res.json({
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    status: 'healthy',
    checks: {
      database: {
        status: 'healthy',
        responseTime: '50ms',
        message: 'Mock database is working'
      },
      tables: {
        users: { status: 'healthy', recordCount: mockUsers.length, responseTime: '10ms' },
        assets_master: { status: 'healthy', recordCount: mockAssets.length, responseTime: '10ms' },
        breakdown_logs: { status: 'healthy', recordCount: mockBreakdowns.length, responseTime: '10ms' },
        spare_parts_inventory: { status: 'healthy', recordCount: mockSpares.length, responseTime: '10ms' }
      },
      memory: {
        status: 'healthy',
        usage: {
          rss: Math.round(process.memoryUsage().rss / 1024 / 1024),
          heapTotal: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
          heapUsed: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
          external: Math.round(process.memoryUsage().external / 1024 / 1024)
        },
        message: 'Memory usage is normal'
      }
    }
  });
});

// Authentication endpoints
app.post('/api/login', async (req, res) => {
  await delay(200);
  
  const { email, password } = req.body;
  
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }
  
  const user = findUserByCredentials(email, password);
  
  if (!user) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }
  
  const token = generateToken();
  
  res.json({
    message: 'Login successful',
    token: token,
    user: {
      id: user.id,
      full_name: user.full_name,
      email: user.email,
      role: user.role
    }
  });
});

app.post('/api/register', async (req, res) => {
  await delay(300);
  
  const { email, password, role, full_name } = req.body;
  
  if (!email || !password || !role) {
    return res.status(400).json({ error: 'Email, password, and role are required' });
  }
  
  // Check if user already exists
  const existingUser = mockUsers.find(user => user.email === email);
  if (existingUser) {
    return res.status(409).json({ error: 'Email already registered' });
  }
  
  const newUser = {
    id: mockUsers.length + 1,
    email,
    full_name: full_name || 'New User',
    role,
    password
  };
  
  mockUsers.push(newUser);
  
  const token = generateToken();
  
  res.status(201).json({
    message: 'User registered successfully',
    token: token,
    user: {
      id: newUser.id,
      full_name: newUser.full_name,
      email: newUser.email,
      role: newUser.role
    }
  });
});

app.post('/api/getRole', async (req, res) => {
  await delay(150);
  
  const { email, password } = req.body;
  
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }
  
  const user = findUserByCredentials(email, password);
  
  if (!user) {
    return res.status(404).json({ error: 'User not found or invalid credentials' });
  }
  
  res.json({ role: user.role });
});

// Assets endpoints
app.get('/api/assets', async (req, res) => {
  await delay(100);
  res.json(mockAssets);
});

app.get('/api/assets/:id', async (req, res) => {
  await delay(50);
  
  const { id } = req.params;
  const asset = mockAssets.find(a => a.id === parseInt(id));
  
  if (!asset) {
    return res.status(404).json({ error: 'Asset not found' });
  }
  
  res.json(asset);
});

app.get('/api/assets/counts', async (req, res) => {
  await delay(50);
  
  const counts = {
    total: mockAssets.length,
    active: mockAssets.filter(a => a.status === 'ACTIVE').length,
    under_amc: mockAssets.filter(a => a.status === 'UNDER_AMC').length,
    inactive: mockAssets.filter(a => a.status === 'INACTIVE').length,
    disposed: mockAssets.filter(a => a.status === 'DISPOSED').length
  };
  
  res.json(counts);
});

app.post('/api/assets', async (req, res) => {
  await delay(200);
  
  const newAsset = {
    id: mockAssets.length + 1,
    ...req.body,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
  
  mockAssets.push(newAsset);
  
  res.status(201).json(newAsset);
});

// Breakdowns endpoints
app.get('/api/breakdowns', async (req, res) => {
  await delay(100);
  
  const { date } = req.query;
  let breakdowns = mockBreakdowns;
  
  if (date) {
    breakdowns = mockBreakdowns.filter(b => 
      new Date(b.created_at).toISOString().split('T')[0] === date
    );
  }
  
  res.json(breakdowns);
});

app.post('/api/breakdowns', async (req, res) => {
  await delay(200);
  
  const newBreakdown = {
    id: mockBreakdowns.length + 1,
    ...req.body,
    created_at: new Date().toISOString()
  };
  
  mockBreakdowns.push(newBreakdown);
  
  res.status(201).json(newBreakdown);
});

// Spares endpoints
app.get('/api/spares', async (req, res) => {
  await delay(100);
  res.json(mockSpares);
});

app.get('/api/spares/:id', async (req, res) => {
  await delay(50);
  
  const { id } = req.params;
  const spare = mockSpares.find(s => s.id === parseInt(id));
  
  if (!spare) {
    return res.status(404).json({ error: 'Spare part not found' });
  }
  
  res.json(spare);
});

app.post('/api/spares', async (req, res) => {
  await delay(200);
  
  const newSpare = {
    id: mockSpares.length + 1,
    ...req.body,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
  
  mockSpares.push(newSpare);
  
  res.status(201).json(newSpare);
});

// Users endpoints
app.get('/api/users', async (req, res) => {
  await delay(100);
  
  const users = mockUsers.map(user => ({
    id: user.id,
    full_name: user.full_name,
    role: user.role,
    created_at: '2023-01-01T10:00:00Z'
  }));
  
  res.json(users);
});

// Dashboard stats
app.get('/api/dashboard/stats', async (req, res) => {
  await delay(100);
  
  const stats = {
    assets: mockAssets.length,
    preventiveMaintenance: 5, // Mock data
    breakdownMaintenance: mockBreakdowns.filter(b => b.status === 'OPEN').length,
    spareInventory: mockSpares.reduce((sum, spare) => sum + spare.stock_on_hand, 0),
    utilitiesMonitoring: 3 // Mock data
  };
  
  res.json(stats);
});

// Catch-all for undefined routes
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    message: `Mock server doesn't have endpoint: ${req.method} ${req.originalUrl}`,
    availableEndpoints: [
      'GET /',
      'GET /api/health',
      'POST /api/login',
      'POST /api/register',
      'GET /api/assets',
      'GET /api/breakdowns',
      'GET /api/spares',
      'GET /api/users'
    ]
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🎉 Mock Backend Server running on http://localhost:${PORT}`);
  console.log('📡 Available endpoints:');
  console.log('   - GET  /                    (Database diagnostics)');
  console.log('   - GET  /api/health         (Health check)');
  console.log('   - POST /api/login           (User login)');
  console.log('   - POST /api/register       (User registration)');
  console.log('   - GET  /api/assets         (Get all assets)');
  console.log('   - GET  /api/breakdowns      (Get all breakdowns)');
  console.log('   - GET  /api/spares         (Get all spare parts)');
  console.log('   - GET  /api/users          (Get all users)');
  console.log('');
  console.log('🔑 Test credentials:');
  console.log('   - admin@mis.com / admin123 (admin)');
  console.log('   - engineer@mis.com / engineer123 (engineer)');
  console.log('   - operator@mis.com / operator123 (operator)');
  console.log('');
  console.log('✅ Your frontend can now connect to this mock server!');
});
