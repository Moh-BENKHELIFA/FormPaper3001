@echo off
echo ========================================
echo   Starting FormPaper3001 Servers
echo ========================================
echo.

REM Change to the script's directory
cd /d "%~dp0"

echo Starting Backend Server (Port 5004)...
start "FormPaper Backend" cmd /k "cd backend && npm run dev"

echo Waiting 3 seconds...
timeout /t 3 /nobreak >nul

echo Starting Frontend Server (Port 8666)...
start "FormPaper Frontend" cmd /k "cd frontend && npm run dev"

echo.
echo ========================================
echo   Servers are starting!
echo ========================================
echo.
echo Backend:  http://localhost:5004
echo Frontend: http://localhost:8666
echo.
echo Press any key to exit this window...
echo (The servers will continue running)
pause >nul
