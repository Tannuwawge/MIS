Here’s the full **list of API endpoints** from your current backend code, along with their HTTP methods and usage for testing:

---

### ✅ **Root / Health Check**

* **GET /**

  * Test if backend is running and DB is connected.
  * Example: `http://localhost:3000/`

---

### 🔹 **Assets APIs**

1. **GET all assets**

   * **GET** `/api/assets`
   * Example: `http://localhost:3000/api/assets`
   
2. **GET asset counts by status**

   * **GET** `/api/assets/counts`
   * Example: `http://localhost:3000/api/assets/counts`
   * Returns total asset count and breakdown by status (ACTIVE, UNDER_AMC, INACTIVE, DISPOSED)
   
3. **GET single asset by ID**

   * **GET** `/api/assets/:id`
   * Example: `http://localhost:3000/api/assets/1`
   
4. **Create a new asset**

   * **POST** `/api/assets`
   * JSON body example:

     ```json
     {
       "asset_code": "A001",
       "asset_name": "Conveyor",
       "machine_no": "M001",
       "location": "Plant1",
       "category": "Mechanical",
       "manufacturer": "XYZ",
       "model": "X1",
       "serial_number": "SN001",
       "install_date": "2025-10-01",
       "status": "ACTIVE"
     }
     ```
   * Example: `http://localhost:3000/api/assets`
   
5. **Bulk import assets**

   * **POST** `/api/assets/bulk`
   * JSON body example:

     ```json
     {
       "assets": [
         {
           "asset_code": "A001",
           "asset_name": "Conveyor Belt",
           "machine_no": "M001",
           "location": "Plant1",
           "category": "Machine",
           "manufacturer": "XYZ Corp",
           "model": "CB-100",
           "serial_number": "SN001",
           "install_date": "2025-01-15",
           "status": "ACTIVE"
         },
         {
           "asset_code": "A002",
           "asset_name": "Compressor",
           "category": "Utilities",
           "status": "UNDER_AMC"
         }
       ]
     }
     ```
   * Example: `http://localhost:3000/api/assets/bulk`
   * Note: Returns count of successfully imported assets and any errors encountered
   
6. **Import assets from CSV/Excel file**

   * **POST** `/api/assets/import`
   * Content-Type: `multipart/form-data`
   * Form data:
     - `file`: CSV or Excel file (.csv, .xlsx, .xls)
   * Example using curl:
     ```bash
     curl -X POST http://localhost:3000/api/assets/import \
       -F "file=@assets.csv"
     ```
   * Expected CSV/Excel columns (case-insensitive):
     - Required: `asset_code`, `asset_name`
     - Optional: `machine_no`, `location`, `category`, `manufacturer`, `model`, `serial_number`, `install_date`, `status`
   * Valid status values: `ACTIVE`, `UNDER_AMC`, `INACTIVE`, `DISPOSED`
   * Date format: YYYY-MM-DD
   * Note: Backend validates schema and data types before import
   * Response includes count of imported assets and any errors
   
7. **Update an existing asset**

   * **PUT** `/api/assets/:id`
   * JSON body can include any fields to update.
   * Example: `http://localhost:3000/api/assets/1`
   
8. **Delete an asset**

   * **DELETE** `/api/assets/:id`
   * Example: `http://localhost:3000/api/assets/1`

---

### 🔹 **Breakdown Logs APIs**

1. **GET all breakdowns or by date**

   * **GET** `/api/breakdowns?date=YYYY-MM-DD`
   * Example: `http://localhost:3000/api/breakdowns`
   * Example with date: `http://localhost:3000/api/breakdowns?date=2025-10-08`
2. **Create a new breakdown log**

   * **POST** `/api/breakdowns`
   * JSON body example:

     ```json
     {
       "asset_id": 1,
       "description": "Motor failure",
       "reported_by": "uuid-of-user",
       "acknowledged_by": null,
       "root_cause": null,
       "action_taken": null,
       "started_at": "2025-10-08T10:00:00Z",
       "ended_at": null,
       "status": "OPEN"
     }
     ```
   * Example: `http://localhost:3000/api/breakdowns`

---

### 🔹 **Users / Authentication APIs**

1. **Get all users**

   * **GET** `/api/users`
   * Example: `http://localhost:3000/api/users`
2. **Fetch role by email & password**

   * **POST** `/api/getRole`
   * JSON body example:

     ```json
     {
       "email": "user@example.com",
       "password": "123456"
     }
     ```
   * Example: `http://localhost:3000/api/getRole`
3. **Login API**

   * **POST** `/api/login`
   * JSON body example:

     ```json
     {
       "email": "user@example.com",
       "password": "123456"
     }
     ```
   * Example: `http://localhost:3000/api/login`
4. **Register new user**

   * **POST** `/api/register`
   * JSON body example:

     ```json
     {
       "email": "newuser@example.com",
       "password": "123456",
       "role": "operator",
       "full_name": "John Doe"
     }
     ```
   * Example: `http://localhost:3000/api/register`

---

### 🔹 **Spare Parts Inventory APIs**

1. **GET all spare parts**

   * **GET** `/api/spares`
   * Example: `http://localhost:3000/api/spares`
2. **GET single spare part by ID**

   * **GET** `/api/spares/:id`
   * Example: `http://localhost:3000/api/spares/1`
3. **Create a new spare part**

   * **POST** `/api/spares`
   * JSON body example:

     ```json
     {
       "part_code": "SP001",
       "part_name": "Bearing",
       "part_no": "B001",
       "uom": "NOS",
       "stock_on_hand": 10,
       "min_level": 2,
       "reorder_level": 5,
       "location": "Store1",
       "unit_cost": 25.50,
       "supplier": "ABC Supplies"
     }
     ```
   * Example: `http://localhost:3000/api/spares`
4. **Update an existing spare part**

   * **PUT** `/api/spares/:id`
   * JSON body can include any fields to update.
   * Example: `http://localhost:3000/api/spares/1`
5. **Delete a spare part**

   * **DELETE** `/api/spares/:id`
   * Example: `http://localhost:3000/api/spares/1`

---

### 🔹 **Maintenance Log APIs**

1. **Create a maintenance log with inventory update**

   * **POST** `/api/maintenance_logs`
   * JSON body example:

     ```json
     {
       "asset_id": 1,
       "description": "Bearing replacement",
       "reported_by": "uuid-of-user",
       "root_cause": "Wear and tear",
       "action_taken": "Replaced bearing",
       "parts_used": [
         { "part_id": 1, "qty": 2 }
       ]
     }
     ```
   * Example: `http://localhost:3000/api/maintenance_logs`
   * Note: This endpoint automatically deducts spare parts from inventory and records the transaction

---

### 🔹 **Utilities Monitoring APIs**

1. **GET all utility logs**

   * **GET** `/api/utilities`
   * Example: `http://localhost:3000/api/utilities`
2. **Create a new utility log entry**

   * **POST** `/api/utilities`
   * JSON body example:

     ```json
     {
       "utility_type": "POWER",
       "meter_point": "Main Building",
       "reading": 1250.5,
       "reading_at": "2025-10-08T10:00:00Z"
     }
     ```
   * Note: Allowed utility types are 'POWER', 'GAS', 'WATER', 'AIR'
   * Example: `http://localhost:3000/api/utilities`

---

### 🔹 **QR Code APIs**

1. **GET asset by QR payload**

   * **GET** `/api/qr/:payload`
   * Example: `http://localhost:3000/api/qr/ABC123`
   * Returns the asset information associated with the QR code

---

### 🔹 **Dashboard & KPI APIs**

1. **GET dashboard statistics**

   * **GET** `/api/dashboard/stats`
   * Example: `http://localhost:3000/api/dashboard/stats`
   * Returns counts for assets, preventive maintenance due, open breakdowns, spare inventory, and active utility meters

2. **GET asset counts by status**

   * **GET** `/api/assets/counts`
   * Example: `http://localhost:3000/api/assets/counts`
   * Returns total asset count and breakdown by status (ACTIVE, UNDER_AMC, INACTIVE, DISPOSED)
   * Response format:
     ```json
     {
       "total": 100,
       "active": 85,
       "under_amc": 10,
       "inactive": 3,
       "disposed": 2
     }
     ```
