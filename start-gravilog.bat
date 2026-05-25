@echo off
setlocal EnableExtensions

cd /d "%~dp0"

where npm >nul 2>nul
if errorlevel 1 (
  echo npm was not found.
  echo Please install Node.js LTS from https://nodejs.org/
  echo Then run this script again.
  pause
  exit /b 1
)

call npm run serve

echo.
echo Server stopped.
pause
