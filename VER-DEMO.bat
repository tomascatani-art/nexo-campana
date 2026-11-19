@echo off
cd /d "%~dp0"
where node >nul 2>nul || (echo Falta instalar Node.js: https://nodejs.org (boton LTS) & pause & exit /b)
if not exist node_modules (echo Instalando, la primera vez tarda unos minutos... & call npm install)
call npm run demo
pause
