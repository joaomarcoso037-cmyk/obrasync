@echo off
title ObraSync
cd /d "%~dp0"
if not exist node_modules (
  echo Preparando o ObraSync pela primeira vez...
  call npm install || goto erro
)
call npm run build || goto erro
start "" cmd /c "timeout /t 2 >nul & start http://localhost:4173"
echo.
echo ObraSync aberto em http://localhost:4173
echo Deixe esta janela aberta enquanto usa. Para encerrar, feche a janela.
echo.
call npm run preview
goto fim
:erro
echo.
echo Nao foi possivel abrir o ObraSync. Veja a mensagem acima.
pause
:fim
