@echo off
echo ========================================
echo MPS JEWELRY BACKEND SETUP & TEST
echo ========================================
echo.

echo Step 1: Generating Prisma Client...
call npx prisma generate
if errorlevel 1 (
    echo ERROR: Prisma generation failed!
    pause
    exit /b 1
)
echo ✅ Prisma client generated successfully!
echo.

echo Step 2: Running Database Migrations...
call npx prisma migrate dev --name initial_setup
if errorlevel 1 (
    echo ERROR: Database migration failed!
    echo Make sure you've created the database first using the setup guide.
    pause
    exit /b 1
)
echo ✅ Database migrations completed successfully!
echo.

echo Step 3: Testing Database Connection...
call npx ts-node src/test-db.ts
if errorlevel 1 (
    echo ERROR: Database connection test failed!
    pause
    exit /b 1
)
echo ✅ Database connection test passed!
echo.

echo Step 4: Starting Backend Server...
echo Server will start on: http://localhost:3000
echo API Documentation: http://localhost:3000/api
echo.
echo Press Ctrl+C to stop the server when done testing.
echo.
call npm run start:dev

pause