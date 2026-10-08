@echo off
title AlumniConnect Full Stack Launcher
color 0B
echo ========================================================
echo   Starting AlumniConnect Full Stack (Backend + Frontend + AI)
echo ========================================================
echo.

:: 1. Start Backend
echo [1/3] Starting Backend service on http://localhost:5000...
start "AlumniConnect - Backend" cmd /k "cd /d %~dp0backend && npm run dev"

:: 2. Start Frontend
echo [2/3] Starting Frontend service on http://localhost:5173...
start "AlumniConnect - Frontend" cmd /k "cd /d %~dp0frontend && npm run dev"

:: 3. Start AI Service
echo [3/3] Starting AI service on http://localhost:8000...
start "AlumniConnect - AI Service" cmd /k "cd /d %~dp0ai-service && call .venv\Scripts\activate.bat && uvicorn app.main:app --port 8000 --reload"

echo.
echo Waiting 4 seconds for servers to initialize...
timeout /t 4 /nobreak >nul

:: 4. Automatically open browser
echo Opening AlumniConnect in your browser...
start http://localhost:5173

echo.
echo ========================================================
echo  All AlumniConnect services are running!
echo  - Frontend:   http://localhost:5173
echo  - Backend:    http://localhost:5000/api/health
echo  - AI Service: http://localhost:8000/health
echo ========================================================
echo.
echo Each service is running in its own labeled terminal window.
echo You can close this launcher window now.
pause
