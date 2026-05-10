@echo off
setlocal

set "CLIENTS=%~1"
if "%CLIENTS%"=="" set "CLIENTS=50"

set "PORT=%~2"
if "%PORT%"=="" set "PORT=8080"

node "%~dp0tools\stress.mjs" --url ws://localhost:%PORT%/ws --clients %CLIENTS% --duration 60 --ramp 40
exit /b %ERRORLEVEL%
