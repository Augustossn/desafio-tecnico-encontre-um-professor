@echo off
setlocal
title API - Lingua
set "PROJECT_DIR=%~dp0api"
if not exist "%PROJECT_DIR%\Idiomas.Api.csproj" (
  echo Nao foi possivel encontrar o projeto. Coloque este arquivo ao lado da pasta api.
  pause
  exit /b 1
)
set "DOTNET_EXE=%~dp0..\..\work\dotnet\dotnet.exe"
if not exist "%DOTNET_EXE%" set "DOTNET_EXE=dotnet"
echo.
echo Iniciando a API do Lingua...
echo Mantenha esta janela aberta enquanto usa o programa.
echo Quando aparecer "Now listening on", a API esta pronta.
echo Para encerrar, pressione Ctrl+C ou feche esta janela.
echo.
"%DOTNET_EXE%" run --project "%PROJECT_DIR%\Idiomas.Api.csproj" --urls http://localhost:5080
if errorlevel 1 (
  echo.
  echo A API nao conseguiu iniciar. Se a porta 5080 estiver em uso,
  echo outra janela pode estar executando a API. Nao e preciso abrir duas vezes.
  echo Se o comando dotnet nao foi encontrado, instale o SDK .NET 8.
  pause
)
endlocal
