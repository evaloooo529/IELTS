@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo.
echo  ========================================
echo   IELTS 单词背诵 — 在线网页版
echo  ========================================
echo.
python serve.py
pause
