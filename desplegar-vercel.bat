@echo off
setlocal
cd /d "%~dp0"
echo ============================================
echo   SphereWars - subir a Vercel
echo ============================================
where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo Necesitas instalar Node.js 20 o superior: https://nodejs.org  ^(version LTS^)
  echo Despues vuelve a ejecutar este archivo.
  pause
  exit /b 1
)
echo.
echo 1/2  Inicia sesion en Vercel ^(se abre el navegador; crea la cuenta gratis si no la tienes^)
call npx --yes vercel@latest login
if errorlevel 1 ( echo Error al iniciar sesion. & pause & exit /b 1 )
echo.
echo 2/2  Subiendo y publicando. Responde a las preguntas con Enter ^(valores por defecto^).
call npx --yes vercel@latest --prod
echo.
echo Si todo ha ido bien, arriba aparece la direccion publica ^(https://...vercel.app^).
pause
