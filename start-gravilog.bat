@echo off
setlocal

cd /d "%~dp0"

where py >nul 2>nul
if %errorlevel%==0 (
  set "PYTHON_CMD=python"
) else (
  where python >nul 2>nul
  if %errorlevel%==0 (
    set "PYTHON_CMD=python"
  ) else (
    echo Python was not found.
    echo Please install Python 3 from https://www.python.org/downloads/
    echo Then run this script again.
    pause
    exit /b 1
  )
)

for /f %%P in ('powershell -NoProfile -ExecutionPolicy Bypass -Command "$listener=[Net.Sockets.TcpListener]::new([Net.IPAddress]::Loopback,0);$listener.Start();$port=$listener.LocalEndpoint.Port;$listener.Stop();$port"') do set "PORT=%%P"

if "%PORT%"=="" (
  set "PORT=8000"
)

set "URL=http://localhost:%PORT%/index.html"

echo Starting Gravilog...
echo.
echo URL: %URL%
echo Directory: %CD%
echo.
echo Keep this window open while using Gravilog.
echo Press Ctrl+C here to stop the local server.
echo.

start "" "%URL%"
%PYTHON_CMD% -m http.server %PORT% --bind 127.0.0.1

echo.
echo Server stopped.
pause
