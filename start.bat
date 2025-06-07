@echo off
call venv\Scripts\activate
uvicorn backend.app:app --reload
pause
