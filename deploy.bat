@echo off
REM Deploy bookstore to Firebase
REM This script deploys both Cloud Functions and frontend

setlocal enabledelayedexpansion
set NODE_PATH=C:\node-v18.18.0-win-x64
set PATH=%NODE_PATH%;%PATH%

cd /d "C:\Users\Swayam\OneDrive\Desktop\bookstore"

echo.
echo ====================================
echo Firebase Deployment Script
echo ====================================
echo.

echo Checking Node.js installation...
node --version
if %errorlevel% neq 0 (
    echo ERROR: Node.js not found. Please install Node.js first.
    pause
    exit /b 1
)

echo Checking npm...
npm --version
if %errorlevel% neq 0 (
    echo ERROR: npm not found. Please install Node.js first.
    pause
    exit /b 1
)

echo.
echo Step 1: Installing Firebase CLI globally (if needed)...
npm install -g firebase-tools@12.9.1
if %errorlevel% neq 0 (
    echo ERROR: Failed to install Firebase CLI
    pause
    exit /b 1
)

echo.
echo Step 2: Checking Firebase login status...
firebase projects:list >nul 2>&1
if %errorlevel% neq 0 (
    echo You need to login to Firebase first.
    echo Run: firebase login
    echo Then run this script again.
    pause
    exit /b 1
)

echo.
echo Step 3: Deploying Cloud Functions and Frontend...
echo This may take several minutes...
firebase deploy
if %errorlevel% neq 0 (
    echo ERROR: Deployment failed
    pause
    exit /b 1
)

echo.
echo ====================================
echo Deployment Complete!
echo ====================================
echo.
echo Your app is now live:
echo - Frontend: https://onlinebookstore-880c4.web.app
echo - Cloud Functions: https://us-central1-onlinebookstore-880c4.cloudfunctions.net
echo.
pause
