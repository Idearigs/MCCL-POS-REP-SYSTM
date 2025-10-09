-- Create database for MPS Jewelry system
CREATE DATABASE mps_jewelry_db;

-- Create dedicated user for MPS
CREATE USER mps_user WITH ENCRYPTED PASSWORD 'MPS_Secure_2024!';

-- Grant all privileges on the database to mps_user
GRANT ALL PRIVILEGES ON DATABASE mps_jewelry_db TO mps_user;

-- Connect to mps_jewelry_db and grant schema privileges
\c mps_jewelry_db;

-- Grant usage on public schema
GRANT USAGE ON SCHEMA public TO mps_user;
GRANT CREATE ON SCHEMA public TO mps_user;

-- Grant all privileges on all tables in public schema (for future tables)
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO mps_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO mps_user;

-- Display success message
SELECT 'MPS Database setup completed successfully!' AS status;
