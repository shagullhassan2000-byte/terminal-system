@echo off
title Terminal Frontend
color 0B
echo.
echo  ==========================================
echo   Terminal Management System — Frontend
echo   Starting on http://localhost:8080
echo  ==========================================
echo.
cd /d "%~dp0"
npx serve frontend -p 8080
pause
