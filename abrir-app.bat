@echo off
cd /d "%~dp0"
start "" "http://127.0.0.1:8877/"
powershell -ExecutionPolicy Bypass -File "%~dp0start-backend.ps1"
