-- MPS Jewelry Database Setup Script
-- This script creates the database and user for MPS system

-- Create database
CREATE DATABASE mps_jewelry_db;

-- Create user
CREATE USER mps_user WITH ENCRYPTED PASSWORD 'MPS_Secure_2024!';

-- Grant database privileges
GRANT ALL PRIVILEGES ON DATABASE mps_jewelry_db TO mps_user;

-- Connect to the new database
\c mps_jewelry_db;

-- Grant schema privileges
GRANT USAGE ON SCHEMA public TO mps_user;
GRANT CREATE ON SCHEMA public TO mps_user;

-- Grant privileges on future tables and sequences
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO mps_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO mps_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO mps_user;

-- Display success message
SELECT 'MPS Database and user created successfully!' AS status;

-- List databases to verify
\l

-- List users to verify
\du