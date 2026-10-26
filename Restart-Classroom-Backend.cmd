@echo off
cd /d "%~dp0"
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\restart-classroom-api.ps1"
if errorlevel 1 (
  echo Restart did not finish. Please keep this window and share the error.
  pause
  exit /b 1
)
echo Backend restarted. Classroom records retained.
pause
