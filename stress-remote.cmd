@echo off
setlocal

set "CLIENTS=%~1"
if "%CLIENTS%"=="" set "CLIENTS=100"

node "%~dp0tools\stress.mjs" --clients %CLIENTS% --duration 300 --ramp 25
exit /b %ERRORLEVEL%
