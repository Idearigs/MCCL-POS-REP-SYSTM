@echo off
echo ========================================
echo MPS JEWELRY BACKEND - COMPLETE TEST SUITE
echo ========================================
echo.

echo 📋 Step 1: Component Tests (No Database Required)
echo ================================================
echo.
call npx ts-node src/simple-test.ts
echo.

echo 📋 Step 2: Database Connection Test
echo ===================================
echo.
echo Testing database connection...
call npx ts-node src/test-db.ts
if errorlevel 1 (
    echo.
    echo ⚠️ Database connection failed!
    echo.
    echo 📋 To set up the database:
    echo 1. Follow the database setup guide in MPS_Database_Setup.md
    echo 2. Run: npx prisma migrate dev --name init
    echo 3. Then run this test again
    echo.
    pause
    exit /b 1
)
echo.

echo 📋 Step 3: Starting Backend Server for API Tests
echo ==============================================
echo.
echo Starting backend server in background...
echo Please wait for "Nest application successfully started" message...
echo.

start /B "MPS Backend" cmd /c "npm run start:dev"

echo Waiting 10 seconds for server to start...
timeout /t 10 /nobreak > nul

echo.
echo 📋 Step 4: API Endpoint Tests
echo ============================
echo.
call npx ts-node src/api-test.ts

echo.
echo 📋 Step 5: Test Summary
echo ======================
echo.
echo ✅ Component tests completed
echo ✅ Database connection verified  
echo ✅ API endpoints tested
echo.
echo 🌐 Your backend is running at:
echo   - API Server: http://localhost:3000
echo   - API Documentation: http://localhost:3000/api
echo   - Health Check: http://localhost:3000/health
echo.
echo 📚 Next Steps:
echo   - Check the FRONTEND_INTEGRATION_GUIDE.md for frontend integration
echo   - Use the Swagger UI at /api to test endpoints interactively
echo   - Start your React frontend and test the full integration
echo.
echo Press any key to stop the backend server...
pause > nul

echo.
echo Stopping backend server...
taskkill /F /IM node.exe 2>nul
echo Backend server stopped.
echo.
echo Test suite completed! 🎉