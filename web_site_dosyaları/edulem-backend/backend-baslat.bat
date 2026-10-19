@echo off
title Laravel Backend - http://127.0.0.1:8000
cd /d "c:\xampp\htdocs\okul"

echo.
echo  Backend baslatiliyor: http://127.0.0.1:8000
echo  Bu pencereyi KAPATMAYIN - kapattiginizda sunucu durur.
echo.
php artisan serve

pause
