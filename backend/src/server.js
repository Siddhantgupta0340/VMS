import 'dotenv/config'; 
import http from 'http';
import app from './app.js';
import seedAdmin from './utils/seedAdmin.js';
import seedDevUsers from './utils/seedDevUsers.js';

import prisma from './config/prisma.js';

const PORT = process.env.PORT || 5000;
let server;

/**
 * Entry point to start the backend server. 
 */
const startServer = async () => {
  const shutdown = async (signal) => {
    console.log(`\n${signal} received. Shutting down gracefully...`);
    if (server) {
      server.close(async () => {
        await prisma.$disconnect();
        console.log('PostgreSQL connection closed.');
        process.exit(0);
      });
    } else {
      await prisma.$disconnect();
      process.exit(0);
    }
  };

  try {
    // 1. Database Connection Check
    await prisma.$connect();
    console.log('Successfully connected to PostgreSQL database.');

    // 2. Run Automatic Seeders
    await seedAdmin();
    await seedDevUsers();


    // 3. Create HTTP Server
    server = http.createServer(app);

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

    server.listen(PORT, () => {
      console.log(`VMS Backend Server is running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
    });

    // 4. Handle Unhandled Rejections (e.g., failed promises)
    process.on('unhandledRejection', (err) => {
      console.error('UNHANDLED REJECTION! 💥 Shutting down...');
      console.error(err.name, err.message);
      shutdown('UNHANDLED_REJECTION');
    });

    // 5. Handle Uncaught Exceptions
    process.on('uncaughtException', (err) => {
      console.error('UNCAUGHT EXCEPTION! 💥 Shutting down...');
      console.error(err.name, err.message);
      shutdown('UNCAUGHT_EXCEPTION');
    });

  } catch (error) {
    console.error('Failed to start server due to database connection error:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
};

startServer();