@echo off
setlocal

echo.
echo Bladesmith - Supabase + Docker Startup
echo ======================================
echo.

where docker >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Docker is not installed or not in PATH.
    exit /b 1
)

docker info >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Docker Desktop is not running. Start Docker Desktop and run again.
    exit /b 1
)

if not exist .env (
    echo ERROR: .env file is missing in project root.
    echo Create .env with SUPABASE_URL and SUPABASE_KEY, then run again.
    exit /b 1
)

findstr /C:"SUPABASE_URL=" .env >nul
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: SUPABASE_URL is missing in .env
    exit /b 1
)

findstr /C:"SUPABASE_KEY=" .env >nul
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: SUPABASE_KEY is missing in .env
    exit /b 1
)

echo Starting all services (redis, backend x3, frontend, nginx)...
docker compose up -d --build
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Docker compose failed.
    exit /b 1
)

echo.
echo Services started.
echo - App: http://localhost
echo - Frontend direct: http://localhost:3000
echo - Backend health: http://localhost:5000/health
echo.
echo To stop everything: docker compose down
echo.

endlocal
