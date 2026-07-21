import 'dotenv/config'; 
import http from 'http';
import app from './app.js';
import seedDevUsers from './utils/seedDevUsers.js';

import {
  disconnectDatabase,
  getSafeDatabaseInfo,
  prisma,
  testDatabaseConnection,
  validateDatabaseUrl,
} from './config/prisma.js';
import { classifyDatabaseError, toSafeErrorLog } from './utils/dbRetry.js';

const PORT = process.env.PORT || 5000;
let server;

const STARTUP_DATABASE_ERROR_CATEGORIES = new Set([
  'DATABASE_AUTHENTICATION_FAILED',
  'DATABASE_CONNECTION_TIMEOUT',
  'DATABASE_DNS_FAILURE',
  'DATABASE_HOST_UNREACHABLE',
  'DATABASE_QUERY_FAILED',
  'DATABASE_SSL_FAILED',
]);

const describeStartupError = (error) => {
  const category = classifyDatabaseError(error);

  if (category === 'DATABASE_ENV_INVALID') {
    return {
      category,
      label: 'Database environment invalid',
      detail: 'DATABASE_URL is missing or invalid. Fix the sanitized startup details before retrying.',
    };
  }

  if (error?.code === 'P2022') {
    return {
      category,
      label: 'Database schema mismatch',
      detail: 'Prisma queried a column that does not exist in the connected database. Apply pending migrations and regenerate Prisma Client.',
    };
  }

  if (
    ['P1000', 'P1001', 'P1002'].includes(error?.code) ||
    (error?.code === 'P2010' && /can't reach database server/i.test(error?.message || ''))
  ) {
    return {
      category,
      label: 'Database connection failure',
      detail: 'The backend could not establish a PostgreSQL connection using the configured DATABASE_URL.',
    };
  }

  if (error?.name === 'PrismaClientInitializationError') {
    return {
      category,
      label: 'Database initialization failure',
      detail: 'Prisma Client could not initialize. Check database configuration and generated client state.',
    };
  }

  return {
    category,
    label: 'Server startup failure',
    detail: 'Startup failed before the HTTP server could listen.',
  };
};

const canStartWithoutDatabase = (startupError) => (
  process.env.NODE_ENV !== 'production' &&
  process.env.ALLOW_DEGRADED_STARTUP !== 'false' &&
  STARTUP_DATABASE_ERROR_CATEGORIES.has(startupError.category)
);

/**
 * Entry point to start the backend server. 
 */
const startServer = async () => {
  const shutdown = async (signal) => {
    console.log(`\n${signal} received. Shutting down gracefully...`);

    const finishShutdown = async () => {
      try {
        await disconnectDatabase();
        console.log('PostgreSQL connection closed.');
        process.exit(0);
      } catch (error) {
        console.error('[shutdown] Failed to close database connection', error?.message);
        process.exit(1);
      }
    };

    if (!server) {
      await finishShutdown();
      return;
    }

    server.close(finishShutdown);
  };

  const listen = (startupMode = 'ready') => {
    server = http.createServer(app);

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

    server.listen(PORT, () => {
      console.log(`VMS Backend Server is running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
      if (startupMode === 'degraded') {
        console.warn('[startup] Running in degraded mode. Database-backed routes will return service-unavailable responses until PostgreSQL is reachable.');
        console.warn('[startup] Set ALLOW_DEGRADED_STARTUP=false to make local development fail fast like production.');
      }
    });

    process.on('unhandledRejection', (err) => {
      console.error('UNHANDLED REJECTION! Shutting down...');
      console.error(err.name, err.message);
      shutdown('UNHANDLED_REJECTION');
    });

    process.on('uncaughtException', (err) => {
      console.error('UNCAUGHT EXCEPTION! Shutting down...');
      console.error(err.name, err.message);
      shutdown('UNCAUGHT_EXCEPTION');
    });
  };

  try {
    // 1. Database Configuration and Connection Check
    validateDatabaseUrl();
    await prisma.$connect();
    await testDatabaseConnection();
    console.log('Successfully connected to PostgreSQL database.', getSafeDatabaseInfo());

    // 2. Run development seeders only when explicitly requested.
    const isProduction = process.env.NODE_ENV === 'production';
    const isDevSeedEnabled = !isProduction && (
      process.env.ENABLE_DEV_SEED === 'true' ||
      process.env.SEED_DEV_USERS === 'true'
    );

    if (isDevSeedEnabled) {
      try {
        await seedDevUsers();
      } catch (seedError) {
        seedError.startupPhase = 'development seeding';
        throw seedError;
      }
    } else if (!isProduction) {
      console.log('[seedDevUsers] Skipped. Set ENABLE_DEV_SEED=true to seed development users.');
    }


    // 3. Create HTTP Server
    listen();

  } catch (error) {
    const startupError = describeStartupError(error);
    console.error(`[startup] ${startupError.category}: ${startupError.label}: ${startupError.detail}`);
    if (error?.startupPhase) {
      console.error(`[startup] Failed phase: ${error.startupPhase}`);
    }
    console.error(toSafeErrorLog(error));
    await disconnectDatabase();

    if (canStartWithoutDatabase(startupError)) {
      listen('degraded');
      return;
    }

    process.exit(1);
  }
};

startServer();
