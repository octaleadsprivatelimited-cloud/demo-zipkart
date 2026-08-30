@echo off
echo Starting Zipcart Development Environment...

:: Start Firebase Emulators in a new window
start "Firebase Emulators" cmd /k "firebase emulators:start"

:: Wait for emulators to initialize (approx 10 seconds)
echo Waiting for emulators to start...
timeout /t 10

:: Start Vite Development Server
echo Starting Frontend...
npm run dev
