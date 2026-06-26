import pkg from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const { PrismaClient } = pkg;

/**
 * PrismaClient Singleton
 * Ensures only one instance of PrismaClient is used throughout the application.
 */
const prisma = new PrismaClient({
  adapter: new PrismaPg({
    connectionString: process.env.DATABASE_URL,
  }),
});

// In development, you might want to see the queries
if (process.env.NODE_ENV === 'development' && prisma.$on) {
  // Optional: Add logging logic here if necessary
}

export default prisma;