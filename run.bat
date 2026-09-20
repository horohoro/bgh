@echo off

echo Starting BGH (Board Game Helper)...
echo Backend: http://localhost:3001
echo Frontend: http://localhost:5173
echo.

start "BGH Server" cmd /k "npm --prefix server run dev"
start "BGH Client" cmd /k "npm --prefix client run dev"

echo Both services launched in separate windows!
