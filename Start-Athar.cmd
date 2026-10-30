@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js 22.17 or newer is required.
  pause
  exit /b 1
)
echo Starting Athar. Open http://127.0.0.1:4174 in your browser.
echo Keep this window open. Press Ctrl+C to stop.
node server.mjs
pause
