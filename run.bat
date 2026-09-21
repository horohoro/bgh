@echo off
chcp 65001 >nul
setlocal

:: Check if Node.js is installed and in PATH
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js was not found in your PATH.
    echo Please install Node.js from https://nodejs.org/ and ensure it is added to your PATH.
    echo.
    pause
    exit /b 1
)
title BGH Server

echo Starting BGH Client in a separate window...
start "BGH Client" cmd /k "npm --prefix client run dev"

echo Starting BGH Server (QR code will appear below)...
npm --prefix server run dev

if errorlevel 1 (
    echo.
    echo Server exited with an error.
    pause
)
