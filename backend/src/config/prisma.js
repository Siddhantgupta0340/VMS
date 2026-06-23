import pkg from '@prisma/client';

const { PrismaClient } = pkg;

/**
 * PrismaClient Singleton
 * Ensures only one instance of PrismaClient is used throughout the application.
 */
const prisma = new PrismaClient();

// In development, you might want to see the queries
if (process.env.NODE_ENV === 'development' && prisma.$on) {
  // Optional: Add logging logic here if necessary
}

export default prisma;