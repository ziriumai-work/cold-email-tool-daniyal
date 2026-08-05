@echo off
title Cold Email Tool
cd /d "%~dp0"

if not exist "node_modules" (
  echo First-time setup: installing dependencies...
  call npm install
)

if not exist ".next\BUILD_ID" (
  echo First-time setup: building the app ^(about a minute^)...
  call npm run build
)

echo.
echo ============================================================
echo    Cold Email Tool is starting...
echo    It will open in your browser at http://localhost:3000
echo.
echo    KEEP THIS WINDOW OPEN while you use the app.
echo    Close this window to stop the app.
echo ============================================================
echo.

start "" cmd /c "timeout /t 4 >nul & start http://localhost:3000"
call npm run start
