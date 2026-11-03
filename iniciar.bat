@echo off
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Necesitas instalar Node.js 20 o superior: https://nodejs.org
  pause
  exit /b 1
)
if not exist node_modules (
  echo Instalando dependencias...
  call npm install || (pause & exit /b 1)
)
if not exist .next (
  echo Compilando...
  call npm run build || (pause & exit /b 1)
)
start "" http://localhost:3000
call npm start
