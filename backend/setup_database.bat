@echo off
echo ========================================
echo MPS JEWELRY DATABASE SETUP
echo ========================================
echo.
echo This script will create the MPS database and user.
echo You will be prompted for your PostgreSQL 'postgres' user password.
echo.
echo Press any key to continue or Ctrl+C to cancel...
pause > nul
echo.

echo Creating database and user...
"C:\Program Files\PostgreSQL\17\bin\psql.exe" -U postgres -h localhost -f create_database.sql

if errorlevel 1 (
    echo.
    echo ❌ Database setup failed!
    echo Please check if:
    echo 1. PostgreSQL is running
    echo 2. You entered the correct postgres password
    echo 3. The postgres user has sufficient privileges
    pause
    exit /b 1
)

echo.
echo ✅ Database setup completed!
echo.
echo Testing connection with mps_user...
echo Password: MPS_Secure_2024!
echo.
"C:\Program Files\PostgreSQL\17\bin\psql.exe" -U mps_user -d mps_jewelry_db -h localhost -c "SELECT 'Connection successful!' AS status;"

if errorlevel 1 (
    echo ❌ Connection test failed!
    pause
    exit /b 1
)

echo.
echo ✅ Database setup and connection test successful!
echo.
echo Next steps:
echo 1. Run: npx prisma migrate dev --name init
echo 2. Run: npm run start:dev
echo.
pause