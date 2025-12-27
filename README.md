# MIS Project 1

This repository contains a full-stack Maintenance Information System (MIS) project with a React frontend (PWA) and a Node.js backend.

## Project Structure

```
MIS_Project1/
├── mis-pwa/        # Frontend (React, Vite, Tailwind)
├── server/         # Backend (Node.js, Express)
├── db/             # Database schema
├── MIS_SRS.pdf     # System Requirements Specification
├── SRS.ini         # Configuration file
```

## Getting Started

### Prerequisites
- Node.js (v18 or above recommended)
- npm


Create a .env file in server folder:
```
PORT=3000
DATABASE_URL=postgres://username:password@localhost:5432/mis_db
```

.env file in mis-pwa:
```
VITE_API_BASE_URL=http://localhost:3000/api
```

### 1. Install Dependencies

#### Frontend
```powershell
cd mis-pwa
npm install
```

#### Backend
```powershell
cd server
npm install
```

### 2. Run the Project

#### Start Frontend
```powershell
cd mis-pwa
npm run dev
# OR
npm start
```
- Open the URL shown in the terminal (e.g., http://localhost:5173) in your browser.

#### Start Backend
```powershell
cd server
npm run dev
```
- The backend will run on the port specified in your server configuration (default http://localhost:3000).

#### Alternative: Run from Project Root
```powershell
# In one terminal
npm run start:backend

# In another terminal
npm run start:frontend
```

### 3. Database
- The `db/schema1.sql` file contains the database schema. Set up your database using this file as needed.

### 4. Configuration
- Update environment variables and configuration files as required for your setup.

## Testing & QA

### Running Tests
```bash
cd mis-pwa
npm test
```

### Manual QA Steps

#### 1. Asset Update/Delete Testing
1. **Navigate to Assets Register page**
2. **Update an asset:**
   - Click the edit button on any asset
   - Change the asset name field
   - Click save
   - **Expected:** Loading spinner → "Asset updated" toast → list shows new name → reload page shows same name
3. **Delete an asset:**
   - Click the delete button on any asset
   - Confirm deletion in dialog
   - **Expected:** Confirmation dialog → row disappears → "Asset deleted" toast → reload page shows asset is gone

#### 2. Data Visibility Testing
1. **Assets Table:**
   - Navigate to Assets Register
   - **Expected:** All assets from database are visible
   - Test category filtering (Auxiliary, Machine, etc.)
   - **Expected:** Filter shows correct assets
2. **Breakdown Maintenance Table:**
   - Navigate to Breakdown Maintenance
   - **Expected:** All breakdowns from database are visible
   - Test date filtering
   - **Expected:** Date filter works correctly
3. **Spare Inventory Table:**
   - Navigate to Spare Inventory
   - **Expected:** All spare parts from database are visible
   - Test search and category filtering
   - **Expected:** Filters work correctly

#### 3. Responsive Design Testing
1. **Resize browser to 1024px width (tablet):**
   - Assets Register should show two-column layout
   - Tables should be horizontally scrollable
   - No overlapping UI elements
2. **Resize browser to 768px width (mobile):**
   - Cards should stack in single column
   - Tables should convert to vertical card layout with labels
   - All text should be readable
   - Touch targets should be at least 44px

#### 4. Visual Polish Verification
1. **Check color consistency:**
   - Primary buttons: Blue gradient (#3b82f6 to #1e40af)
   - Secondary buttons: Gray outline
   - Cards: White/5 background with subtle borders
   - Tables: Zebra striping and hover effects
2. **Verify accessibility:**
   - Text contrast ratio ≥ 4.5:1 on primary buttons
   - All interactive elements have focus states
   - Form labels are clearly associated with inputs
   - Loading states are clearly visible

#### 5. Toast Notifications
1. **Test success toasts:** Update/delete operations should show green success messages
2. **Test error toasts:** Network errors should show red error messages
3. **Test toast dismissal:** Toasts should auto-dismiss after 5 seconds or on manual close

#### 6. API Error Handling
1. **Test 404 errors:** Try updating/deleting non-existent assets
2. **Test network errors:** Disconnect internet and try operations
3. **Expected:** Appropriate error messages and UI rollback for failed operations

#### 7. CRUD Operations Testing
1. **Create new asset/spare part:**
   - Fill out form completely
   - Submit form
   - **Expected:** Success toast, item appears in table immediately
2. **Edit existing item:**
   - Click edit button
   - Modify fields
   - Save changes
   - **Expected:** Success toast, changes reflected immediately
3. **Delete item:**
   - Click delete button
   - Confirm deletion
   - **Expected:** Success toast, item removed immediately

### Professional Color Palette
```css
:root {
  /* Professional color palette inspired by modern web apps */
  --color-primary: #0066cc;      /* Primary Blue */
  --color-secondary: #0099cc;    /* Secondary Blue */
  --color-accent: #ffb300;       /* Accent Orange */
  --color-bg: #f7f8fa;           /* Light Background */
  --color-surface: #ffffff;      /* Card Background */
  --color-text: #1a1a1a;         /* Dark Text */
  --color-muted: #666666;        /* Muted Text */
  
  /* Dark theme colors */
  --primary: #3b82f6;            /* Blue */
  --primary-dark: #1e40af;       /* Dark Blue */
  --secondary: #64748b;          /* Gray */
  --accent: #8b5cf6;             /* Purple */
  --bg: #0f172a;                 /* Dark Background */
  --surface: #1e293b;            /* Card Background */
  --text: #f8fafc;               /* White Text */
  --muted: #64748b;              /* Muted Text */
}
```

### Performance & UX Features
- **Optimistic UI Updates:** All CRUD operations update the UI immediately for better user experience
- **Loading States:** Clear loading indicators during API calls
- **Error Handling:** Comprehensive error handling with user-friendly messages
- **Responsive Design:** Mobile-first approach with tablet and desktop breakpoints
- **Accessibility:** WCAG 2.1 AA compliant with proper contrast ratios and focus states
- **Touch-Friendly:** Minimum 44px touch targets for mobile devices

## Notes
- The API integration has been updated to use the local backend server instead of Supabase.
- API documentation can be found in `server/API_Info.md`.
- For troubleshooting, check the browser console and terminal output for errors.
- All CRUD operations now use optimistic updates for better UX.
- Responsive design supports tablet (768-1024px) and mobile (<768px) breakpoints.

## License
This project is for educational and internal use.


