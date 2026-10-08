@echo off
title AlumniConnect Launcher
color 0B
echo ========================================================
echo        Starting AlumniConnect (Backend + Frontend)
echo ========================================================
echo.

:: 1. Start Backend in a dedicated window
echo [1/2] Starting Backend service on http://localhost:5000...
start "AlumniConnect - Backend" cmd /k "cd /d %~dp0backend && npm run dev"

:: 2. Start Frontend in a dedicated window
echo [2/2] Starting Frontend service on http://localhost:5173...
start "AlumniConnect - Frontend" cmd /k "cd /d %~dp0frontend && npm run dev"

echo.
echo Waiting 4 seconds for servers to initialize...
timeout /t 4 /nobreak >nul

:: 3. Automatically open browser to the frontend
echo Opening AlumniConnect in your browser...
start http://localhost:5173

echo.
echo ========================================================
echo  AlumniConnect is running!
echo  - Frontend: http://localhost:5173
echo  - Backend:  http://localhost:5000/api/health
echo ========================================================
echo.
echo Both services are running in their respective command windows.
echo You can close this launcher window now.
pause
