@echo off
cd /d "%~dp0"
echo Starting MediCare Hospital System at http://127.0.0.1:8000 ...
start "" http://127.0.0.1:8000
python webapp/server.py
pause
