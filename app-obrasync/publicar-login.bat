@echo off
title Publicar ObraSync com login
echo Isto vai colocar a versao com login no ar em:
echo https://obrasync-nd4.pages.dev
echo.
pause
cd /d "%~dp0"
echo.
echo Gerando a versao com login...
call npx tsc --noEmit || goto erro
call npx vite build --mode supabase --outDir "%TEMP%\obrasync-login" --emptyOutDir || goto erro
rem Fora da pasta do app: dentro dela, a ferramenta da Cloudflare altera arquivos do projeto.
cd /d "%TEMP%\obrasync-login"
echo.
echo Publicando...
call npx --yes wrangler@latest pages deploy . --project-name obrasync --branch main --commit-dirty=true --commit-message "Versao com login" || goto erro
echo.
echo Pronto. Pode fechar esta janela e avisar o Claude.
pause
goto fim
:erro
echo.
echo Nao foi possivel publicar. Copie a mensagem acima e envie ao Claude.
pause
:fim
