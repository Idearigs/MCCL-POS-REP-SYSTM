@echo off
echo Setting up MPS Jewelry Database...
echo.
echo Please enter your PostgreSQL 'postgres' user password when prompted.
echo (This is the password you set during PostgreSQL installation)
echo.

"C:\Program Files\PostgreSQL\17\bin\psql.exe" -U postgres -h localhost -f setup_db.sql

echo.
echo Database setup completed!
pause
