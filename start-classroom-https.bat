@echo off
setlocal
cd /d "%~dp0"
call "%~dp0start-classroom.bat" -Https %*
exit /b %ERRORLEVEL%
