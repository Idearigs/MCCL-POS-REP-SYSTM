# MPS Jewelry Database Setup Guide

## Step 1: Open Command Prompt as Administrator
1. Press `Win + R`, type `cmd`, press `Ctrl + Shift + Enter`
2. This opens Command Prompt with admin privileges

## Step 2: Navigate to PostgreSQL bin directory
```cmd
cd "C:\Program Files\PostgreSQL\17\bin"
```

## Step 3: Connect to PostgreSQL
```cmd
psql -U postgres -h localhost
```
- Enter your postgres password when prompted
- You should see: `postgres=#`

## Step 4: Create MPS Database and User
Copy and paste these commands one by one:

```sql
-- Create database for MPS Jewelry system
CREATE DATABASE mps_jewelry_db;

-- Create dedicated user for MPS
CREATE USER mps_user WITH ENCRYPTED PASSWORD 'MPS_Secure_2024!';

-- Grant all privileges on the database to mps_user
GRANT ALL PRIVILEGES ON DATABASE mps_jewelry_db TO mps_user;

-- Connect to mps_jewelry_db
\c mps_jewelry_db;

-- Grant schema privileges
GRANT USAGE ON SCHEMA public TO mps_user;
GRANT CREATE ON SCHEMA public TO mps_user;

-- Grant privileges on future tables
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO mps_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO mps_user;

-- Verify setup
\l
\du

-- Exit psql
\q
```

## Step 5: Test Connection with MPS User
```cmd
psql -U mps_user -d mps_jewelry_db -h localhost
```
- Password: `MPS_Secure_2024!`
- You should see: `mps_jewelry_db=>`
- Type `\q` to exit

## Step 6: Update MPS Project .env File
Navigate to your MPS backend folder and update .env:

```
DATABASE_URL="postgresql://mps_user:MPS_Secure_2024!@localhost:5432/mps_jewelry_db"
```

## Success Indicators:
✅ No error messages during database creation
✅ Can connect as mps_user
✅ Database mps_jewelry_db exists
✅ User mps_user has proper permissions

If you encounter any issues, let me know the exact error message!
