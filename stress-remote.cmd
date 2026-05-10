@echo off
setlocal

set "CLIENTS=%~1"
if "%CLIENTS%"=="" set "CLIENTS=30"

set "DURATION=%~2"
if "%DURATION%"=="" set "DURATION=120"

:: Remote server cap is 180 connections shared with real players.
:: Keep bots low (default 30) and ramp slowly so real players aren't disrupted.
node "%~dp0tools\stress.mjs" --clients %CLIENTS% --duration %DURATION% --ramp 120
exit /b %ERRORLEVEL%
