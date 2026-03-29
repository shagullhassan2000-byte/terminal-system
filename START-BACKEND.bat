@echo off
title Terminal Management System
color 0A
echo.
echo  ==========================================
echo   Terminal Management System
echo   Starting backend on port 3000...
echo  ==========================================
echo.

cd /d "%~dp0backend"

if not exist "node_modules" (
    echo  Installing dependencies — please wait...
    echo.
    npm install
    echo.
)

echo  Backend running at: http://localhost:3000
echo  Open frontend at:   http://localhost:8080
echo.
echo  To open frontend in another window, run START-FRONTEND.bat
echo.
node src/app.js
pause
