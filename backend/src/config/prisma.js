import 'dotenv/config';
import pg from 'pg';
import prismaPkg from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import {
  DatabaseConfigError,
  sanitizeDatabaseUrl,
  validateDatabaseUrl,
} from './databaseEnv.js';

const { PrismaClient } = prismaPkg;
const { Pool } = pg;

/**
 * PrismaClient Singleton (Prisma v7 pattern)
 * Database connection is configured via adapter, not datasource url in schema.
 */
const parsePositiveInt = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const NODE_ENV = process.env.NODE_ENV || 'development';
const DEFAULT_POOL_MAX = NODE_ENV === 'production' ? 5 : 3;

const normalizeDatabaseUrl = (url) => {
  validateDatabaseUrl(url);
  const parsed = new URL(url);
  const sslMode = parsed.searchParams.get('sslmode');

  if (sslMode && ['prefer', 'require', 'verify-ca'].includes(sslMode)) {
    parsed.searchParams.set('sslmode', 'verify-full');
  }

  return parsed.toString();
};

const buildPoolConfig = () => {
  const connectionString = normalizeDatabaseUrl(process.env.DATABASE_URL);
  let isNeonHost = false;
  try {
    const parsed = new URL(connectionString);
    isNeonHost = parsed.hostname.endsWith('.neon.tech');
  } catch {}

  return {
    connectionString,
    max: parsePositiveInt(process.env.DB_POOL_MAX, DEFAULT_POOL_MAX),
    idleTimeoutMillis: parsePositiveInt(process.env.DB_IDLE_TIMEOUT_MS, 30000),
    connectionTimeoutMillis: parsePositiveInt(process.env.DB_CONNECTION_TIMEOUT_MS, 20000),
    query_timeout: parsePositiveInt(process.env.DB_QUERY_TIMEOUT_MS, 15000),
    statement_timeout: parsePositiveInt(process.env.DB_STATEMENT_TIMEOUT_MS, 15000),
    keepAlive: process.env.DB_KEEP_ALIVE !== 'false',
    ...(isNeonHost ? { ssl: { rejectUnauthorized: true } } : {}),
  };
};

const getDatabaseUrlInfo = () => {
  try {
    const parsed = new URL(normalizeDatabaseUrl(process.env.DATABASE_URL));
    return {
      configured: true,
      host: parsed.hostname,
      port: parsed.port || '5432',
      database: parsed.pathname.replace(/^\//, '') || null,
      schema: parsed.searchParams.get('schema') || 'public',
      sslmode: parsed.searchParams.get('sslmode') || 'not-set',
      pooled: parsed.hostname.includes('-pooler'),
      sanitizedUrl: sanitizeDatabaseUrl(parsed.toString()),
    };
  } catch (error) {
    return {
      configured: false,
      host: null,
      port: null,
      database: null,
      schema: null,
      sslmode: null,
      pooled: false,
      errorCode: error?.code || 'DATABASE_ENV_INVALID',
    };
  }
};

const poolConfig = buildPoolConfig();

const globalForPrisma = globalThis;

const pool = globalForPrisma.__vmsPgPool ?? new Pool(poolConfig);

if (!pool.__vmsEventsAttached) {
  pool.on('error', (error) => {
    console.error('[database] idle PostgreSQL client error', {
      name: error?.name,
      code: error?.code,
      message: error?.message,
    });
  });

  pool.on('remove', () => {
    if (NODE_ENV !== 'production') {
      console.debug('[database] PostgreSQL client removed from pool');
    }
  });

  pool.__vmsEventsAttached = true;
}

const adapter = new PrismaPg(pool);

const prisma = globalForPrisma.__vmsPrisma ?? new PrismaClient({
  adapter,
  log: NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
});

if (NODE_ENV !== 'production') {
  globalForPrisma.__vmsPgPool = pool;
  globalForPrisma.__vmsPrisma = prisma;
}

const dbConfig = {
  environment: NODE_ENV,
  pool: {
    max: poolConfig.max,
    idleTimeoutMillis: poolConfig.idleTimeoutMillis,
    connectionTimeoutMillis: poolConfig.connectionTimeoutMillis,
    queryTimeoutMillis: poolConfig.query_timeout,
    statementTimeoutMillis: poolConfig.statement_timeout,
    keepAlive: poolConfig.keepAlive,
  },
};

const getSafeDatabaseInfo = () => ({
  ...getDatabaseUrlInfo(),
  ...dbConfig,
});

const testDatabaseConnection = async () => {
  const [result] = await prisma.$queryRaw`SELECT 1::int AS ok`;
  return result?.ok === 1;
};

const disconnectDatabase = async () => {
  await prisma.$disconnect();
  if (!pool.ended) {
    await pool.end();
  }
};

export {
  dbConfig,
  DatabaseConfigError,
  disconnectDatabase,
  getSafeDatabaseInfo,
  normalizeDatabaseUrl,
  pool,
  prisma,
  sanitizeDatabaseUrl,
  testDatabaseConnection,
  validateDatabaseUrl,
};


export default prisma;
