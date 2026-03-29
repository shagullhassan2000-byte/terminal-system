# Terminal Management System — v7 Final

## HOW TO START (Windows)

### Step 1 — Start Backend
Double-click: START-BACKEND.bat
(First run will install dependencies automatically)

### Step 2 — Start Frontend  
Double-click: START-FRONTEND.bat

### Step 3 — Open Browser
Go to: http://localhost:8080

---

## LOGIN ACCOUNTS

| Username | Password      | Role  |
|----------|---------------|-------|
| admin    | terminal2026  | Admin |
| shagull  | hajiumaran    | Admin |
| staff    | staff1234     | Staff |

---

## MANUAL START (PowerShell)

```powershell
# Terminal 1 — Backend
cd C:\path\to\terminal-system\backend
npm install
npm start

# Terminal 2 — Frontend
cd C:\path\to\terminal-system
npx serve frontend -p 8080
```

---

## HEALTH CHECK
Open: http://localhost:3000/api/health
Should return: {"success":true,"status":"running"}
