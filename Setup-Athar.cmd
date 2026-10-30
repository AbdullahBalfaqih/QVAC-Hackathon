@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js 22.17 or newer is required. Install it first.
  pause
  exit /b 1
)
echo Installing locked dependencies. Internet is required once.
node scripts\install-locked.mjs
if errorlevel 1 goto fail
echo Downloading and verifying the local model.
node scripts\download-model.mjs
if errorlevel 1 goto fail
echo Setup complete. Run Start-Athar.cmd.
pause
exit /b 0
:fail
echo Setup failed. Read the error and README.md. Windows is not yet tested.
pause
exit /b 1
