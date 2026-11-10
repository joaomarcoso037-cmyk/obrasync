@echo off
setlocal
title Configurar cobranca do ObraSync (Asaas)
cd /d "%~dp0"
set REF=zntiblqunnowsrijmzpj

echo Isto liga a cobranca de mensalidade do ObraSync pelo Asaas.
echo.
echo Antes de continuar, confira:
echo  1. Voce ja rodou o arquivo supabase\assinaturas.sql no SQL Editor da Supabase.
echo  2. Voce tem a chave de API do Asaas em maos (Integracoes ^> Chaves de API).
echo.
pause

echo.
echo Qual ambiente do Asaas?
echo   1 = Teste (sandbox.asaas.com, dinheiro de mentira)
echo   2 = Cobranca real (asaas.com)
set /p AMBIENTE=Digite 1 ou 2 e aperte Enter:
if "%AMBIENTE%"=="2" (set ASAAS_URL=https://api.asaas.com/v3) else (set ASAAS_URL=https://api-sandbox.asaas.com/v3)

echo.
set /p CHAVE=Cole a chave de API do Asaas e aperte Enter:
if "%CHAVE%"=="" goto erro

rem Senha que o Asaas manda junto com cada aviso, para provar que e ele.
for /f %%t in ('powershell -NoProfile -Command "[guid]::NewGuid().ToString('N') + [guid]::NewGuid().ToString('N')"') do set TOKEN=%%t

echo.
echo Vai abrir o navegador para voce entrar na Supabase. Depois volte para esta janela.
call npx --yes supabase@3.1.0 login || goto erro

echo.
echo Guardando as chaves no servidor...
call npx --yes supabase@3.1.0 secrets set --remote=%REF% --yes "ASAAS_API_KEY=%CHAVE%" "ASAAS_URL=%ASAAS_URL%" "ASAAS_WEBHOOK_TOKEN=%TOKEN%" || goto erro

echo.
echo Publicando as funcoes...
call npx --yes supabase@3.1.0 functions deploy assinatura --remote=%REF% --yes --use-api || goto erro
call npx --yes supabase@3.1.0 functions deploy asaas-webhook --remote=%REF% --yes --use-api --no-verify-jwt || goto erro

echo.
echo ============================================================
echo  Falta so um passo, no painel do Asaas:
echo  Integracoes ^> Webhooks ^> Adicionar
echo.
echo  URL:
echo  https://%REF%.supabase.co/functions/v1/asaas-webhook
echo.
echo  Token de autenticacao:
echo  %TOKEN%
echo.
echo  Versao da API: v3. Tipo de envio: sequencial. Ative o webhook e marque
echo  todos os eventos de Cobrancas e de Assinaturas.
echo ============================================================
echo.
echo Copie a URL e o token antes de fechar esta janela.
echo Se fechar sem copiar, e so rodar este arquivo de novo.
pause
goto fim

:erro
echo.
echo Nao foi possivel concluir. Copie a mensagem acima e envie ao Claude.
pause
:fim
endlocal
