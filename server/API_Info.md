# API Endpoints Documentation

Here is the complete list of API endpoints available in the project `server/src/index.js`.

## 🌍 Root & Health Check

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| **GET** | `/` | **Comprehensive Diagnostics**: Checks database connection, lists tables, and provides server info. |
| **GET** | `/api/health` | **Health Check**: Simple status check for database connectivity and memory usage. |

---

## 🏗️ Assets Management

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| **GET** | `/api/assets` | Get all assets. |
| **GET** | `/api/assets/counts` | Get counts of assets by status (ACTIVE, UNDER_AMC, INACTIVE, DISPOSED). |
| **GET** | `/api/assets/:id` | Get a single asset by ID. |
| **POST** | `/api/assets` | Create a new asset. |
| **PUT** | `/api/assets/:id` | Update an existing asset. |
| **DELETE** | `/api/assets/:id` | Delete an asset. |
| **POST** | `/api/assets/bulk` | Bulk create assets from a JSON array. |
| **POST** | `/api/assets/import` | Import assets from a CSV or Excel file (`multipart/form-data`). |

---

## 🔧 Breakdown Logs

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| **GET** | `/api/breakdowns` | Get all breakdown logs. Supports `?date=YYYY-MM-DD` query param. |
| **GET** | `/api/breakdowns/:id` | Get a single breakdown log by ID. |
| **POST** | `/api/breakdowns` | Create a new breakdown log. |
| **PUT** | `/api/breakdowns/:id` | Update an existing breakdown log. |

---

## 📅 Preventive Maintenance (PM)

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| **GET** | `/api/pm` | Get all PM schedules. |
| **GET** | `/api/pm/:id` | Get a single PM schedule by ID. |
| **POST** | `/api/pm` | Create a new PM schedule. |
| **PUT** | `/api/pm/:id` | Update an existing PM schedule. |

---

## ⚙️ Spare Parts Inventory

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| **GET** | `/api/spares` | Get all spare parts. |
| **GET** | `/api/spares/:id` | Get a single spare part by ID. |
| **POST** | `/api/spares` | Create a new spare part. |
| **PUT** | `/api/spares/:id` | Update an existing spare part. |
| **DELETE** | `/api/spares/:id` | Delete a spare part. |

---

## �️ Maintenance & Transactions

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| **POST** | `/api/maintenance_logs` | **Complex Action**: Creates a breakdown log AND automatically deducts used parts from inventory. |

---

## � Utilities Monitoring

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| **GET** | `/api/utilities` | Get all utility logs. |
| **POST** | `/api/utilities` | Create a new utility log entry (POWER, GAS, WATER, AIR). |

---

## � QR Code

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| **GET** | `/api/qr/:payload` | Get asset details associated with a specific QR code payload. |

---

## � Dashboard & Analytics

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| **GET** | `/api/dashboard/stats` | Get aggregated statistics for the main dashboard (Assets, PM, Breakdowns, Spares). |

---

## 👤 Users & Authentication

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| **GET** | `/api/users` | Get all users. |
| **POST** | `/api/getRole` | Fetch user role by email and password. |
| **POST** | `/api/login` | Authenticate user and return token/user info. |
| **POST** | `/api/register` | Register a new user. |
| **GET** | `/api/profile/stats/:id` | Get user profile statistics (tasks completed, reported issues, etc.). |
