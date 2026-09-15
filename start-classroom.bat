@echo off
setlocal
cd /d "%~dp0"
"%SystemRoot%\System32\WindowsPowerShell\v1.0\powershell.exe" -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\start-classroom.ps1" %*
set "launcher_exit=%ERRORLEVEL%"
if not "%launcher_exit%"=="0" pause
exit /b %launcher_exit%
