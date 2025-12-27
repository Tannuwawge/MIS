# Asset Import Data Guide

## Overview

The Asset Import feature allows users to bulk upload asset data via CSV or Excel files. The system follows best practices by handling all file parsing and validation on the backend server.

## How It Works

### Architecture

```
Frontend (React/PWA)
    ↓ (uploads file via multipart/form-data)
Backend (Express API)
    ↓ (parses & validates)
Database (PostgreSQL)
```

### Process Flow

1. **User uploads file** - Frontend allows CSV (.csv) or Excel (.xlsx, .xls) files
2. **File sent to backend** - File uploaded via multipart/form-data to `/api/assets/import`
3. **Backend parsing** - Server parses file using appropriate library:
   - CSV files: `csv-parser`
   - Excel files: `xlsx`
4. **Schema validation** - Checks for required columns and data types
5. **Data validation** - Validates each row's data (required fields, enum values, dates)
6. **Bulk insert** - Inserts validated data into PostgreSQL using transactions
7. **Response** - Returns success count and any errors encountered

## File Format Requirements

### Required Columns
- `asset_code` (string, unique)
- `asset_name` (string)

### Optional Columns
- `machine_no` (string)
- `location` (string)
- `category` (string)
- `manufacturer` (string)
- `model` (string)
- `serial_number` (string)
- `install_date` (date, format: YYYY-MM-DD)
- `status` (enum: ACTIVE, UNDER_AMC, INACTIVE, DISPOSED)

### Sample CSV Format

```csv
asset_code,asset_name,machine_no,location,category,manufacturer,model,serial_number,install_date,status
A001,Conveyor Belt,M001,Plant A - Line 1,Machine,Siemens,CB-2000,SN123456,2024-01-15,ACTIVE
A002,Air Compressor,M002,Utility Room,Utilities,Atlas Copco,GA-75,SN789012,2023-06-20,UNDER_AMC
A003,Injection Molding Machine,M003,Plant B - Line 2,Machine,Haitian,MA-1200,SN345678,2022-11-10,ACTIVE
```

**Note:** Column names are case-insensitive. The system will normalize them during processing.

## Validation Rules

### Schema Validation
- ✅ Checks for required columns (`asset_code`, `asset_name`)
- ✅ Identifies unknown/invalid columns
- ✅ Provides clear error messages with column names

### Data Validation
- ✅ **Required Fields:** `asset_code` and `asset_name` must not be empty
- ✅ **Status Values:** Must be one of: `ACTIVE`, `UNDER_AMC`, `INACTIVE`, `DISPOSED`
- ✅ **Date Format:** `install_date` must be valid date in YYYY-MM-DD format
- ✅ **Duplicates:** Detects duplicate `asset_code` entries
- ✅ **Row Reference:** All errors include row numbers for easy correction

## API Endpoint

### POST `/api/assets/import`

**Headers:**
```
Content-Type: multipart/form-data
```

**Form Data:**
```
file: [your-file.csv or your-file.xlsx]
```

**Success Response (200):**
```json
{
  "message": "Successfully imported 5 out of 5 assets",
  "count": 5,
  "total": 5
}
```

**Partial Success Response (200):**
```json
{
  "message": "Successfully imported 3 out of 5 assets",
  "count": 3,
  "total": 5,
  "errors": [
    "Row 3: Duplicate asset_code 'A002'",
    "Row 5: Invalid status 'BROKEN'. Must be one of: ACTIVE, UNDER_AMC, INACTIVE, DISPOSED"
  ]
}
```

**Error Response (400):**
```json
{
  "error": "Schema validation failed",
  "details": [
    "Missing required columns: asset_code, asset_name"
  ]
}
```

## Frontend Usage

The import functionality is integrated into the Assets page (`/assets`) with the following features:

### User Interface
- **Drag & Drop Support** - Users can drag files into the upload area
- **File Browser** - Click to browse and select files
- **File Type Validation** - Only accepts .csv, .xlsx, .xls files
- **Progress Indicator** - Shows "Importing..." while processing
- **Success Notifications** - Green banner with success message
- **Error Messages** - Red banner with detailed error information
- **Auto-refresh** - Asset list and counts refresh after successful import

### Error Handling
- Schema validation errors displayed before import
- Data validation errors shown with row numbers
- Partial success: Shows both successes and failures
- Network errors caught and displayed
- User-friendly error messages

## Template File

A sample CSV template is available at `MIS_Project/assets_import_template.csv`:

```csv
asset_code,asset_name,machine_no,location,category,manufacturer,model,serial_number,install_date,status
A001,Conveyor Belt,M001,Plant A - Line 1,Machine,Siemens,CB-2000,SN123456,2024-01-15,ACTIVE
A002,Air Compressor,M002,Utility Room,Utilities,Atlas Copco,GA-75,SN789012,2023-06-20,UNDER_AMC
A003,Injection Molding Machine,M003,Plant B - Line 2,Machine,Haitian,MA-1200,SN345678,2022-11-10,ACTIVE
A004,Cooling Tower,M004,Roof Top,Auxillaries,SPX,CT-500,SN901234,2023-03-05,INACTIVE
A005,CNC Machine,M005,Workshop,Machine,Fanuc,CNC-3000,SN567890,2024-05-12,ACTIVE
```

## Export Functionality

Users can also export current asset data by clicking the "Export CSV" button. This generates a CSV file with the same column structure, making it easy to:
- Update existing data
- Use as a template for new imports
- Backup asset information
- Share data with other systems

## Technical Implementation

### Backend Dependencies
```json
{
  "multer": "^1.4.5-lts.1",
  "csv-parser": "^3.0.0",
  "xlsx": "^0.18.5"
}
```

### File Size Limits
- Maximum file size: 10MB
- Configurable in `index.js`:
  ```javascript
  limits: { fileSize: 10 * 1024 * 1024 }
  ```

### Database Transaction
- All inserts are wrapped in a PostgreSQL transaction
- On any critical error, the entire import is rolled back
- Individual row errors are logged but don't stop the process

### Security Features
- File type validation (MIME type and extension)
- File size limits
- SQL injection protection via parameterized queries
- Input sanitization (column name normalization)

## Troubleshooting

### Common Issues

**Issue:** "Missing required columns"
- **Solution:** Ensure your file has `asset_code` and `asset_name` columns (case-insensitive)

**Issue:** "Invalid status value"
- **Solution:** Status must be exactly: ACTIVE, UNDER_AMC, INACTIVE, or DISPOSED (case-insensitive)

**Issue:** "Invalid date format"
- **Solution:** Use YYYY-MM-DD format for dates (e.g., 2024-01-15)

**Issue:** "Duplicate asset_code"
- **Solution:** Each asset_code must be unique in both the file and database

**Issue:** "File too large"
- **Solution:** Split your file into smaller chunks (< 10MB each)

## Best Practices

1. **Test with small files first** - Start with 5-10 rows to verify format
2. **Use the template** - Download and modify the provided template
3. **Check for duplicates** - Ensure asset_code values are unique
4. **Validate dates** - Use YYYY-MM-DD format consistently
5. **Backup first** - Export current data before large imports
6. **Review errors** - Check error messages and fix issues incrementally
7. **Use consistent casing** - While case-insensitive, consistency helps readability

## Future Enhancements

Potential improvements for future versions:
- [ ] Progress bar for large file uploads
- [ ] Preview data before import
- [ ] Dry-run mode to test without saving
- [ ] Support for more file formats (JSON, XML)
- [ ] Automatic duplicate resolution options
- [ ] Batch email notifications for import results
- [ ] Import history and audit logs

