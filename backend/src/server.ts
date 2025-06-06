import app from './app';
import * as dotenv from 'dotenv';
import { dbMigration } from './utils/dbMigration';

// Load environment variables
dotenv.config();

// Set port
const PORT = process.env.PORT || 5000;

// Start server
const server = app.listen(PORT, async () => {
  console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
  
  // Run migrations on server start in development mode
  if (process.env.NODE_ENV === 'development') {
    try {
      console.log('Running database migrations...');
      await dbMigration.runMigrations();
      console.log('Database migrations completed successfully!');
    } catch (error) {
      console.error('Error running migrations:', error);
    }
  }
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err: Error) => {
  console.error(`Error: ${err.message}`);
  // Close server & exit process
  server.close(() => process.exit(1));
});

export default server;
