import * as mysql from 'mysql2/promise';
import * as dotenv from 'dotenv';

dotenv.config();

// Create a connection pool
// Database connection configuration
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: 'pos_mccl_db', // Hardcoded to match the database we created
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  multipleStatements: true,
  connectTimeout: 10000, // 10 seconds
  // Enable for debugging
  debug: false,
  // Better error handling
  enableKeepAlive: true,
  keepAliveInitialDelay: 10000 // 10 seconds
};

console.log('Connecting to database with config:', {
  ...dbConfig,
  password: dbConfig.password ? '***' : 'empty'
});

// Create a connection pool
const pool = mysql.createPool(dbConfig);

// Test the connection
pool.getConnection()
  .then(connection => {
    console.log('Successfully connected to the database');
    connection.release();
  })
  .catch(error => {
    console.error('Error connecting to the database:', error);
  });

export default pool;
