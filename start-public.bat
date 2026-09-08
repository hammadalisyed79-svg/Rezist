@echo off
setlocal
cd /d "%~dp0"
set "PATH=%~dp0.tools\node;%PATH%"

echo.
echo  Rezist public server
echo  Website:  http://138.201.139.157:3000/
echo  ERP:      http://138.201.139.157:3000/erp/login
echo  Demo:     admin@rezist.pk / rezist123
echo.
echo  Keep this window open. Press Ctrl+C to stop.
echo.

if not exist ".next\BUILD_ID" (
  echo Building production app first...
  call npm run build
  if errorlevel 1 exit /b 1
)

call npm run start:public
