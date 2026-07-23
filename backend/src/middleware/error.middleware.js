import sanitizeObject from '../utils/logSanitizer.js';
import { randomUUID } from 'node:crypto';
import { classifyDatabaseError } from '../utils/dbRetry.js';

const SERVICE_UNAVAILABLE_MESSAGE = 'The service is temporarily unavailable. Please try again later.';

const POOL_DEAD_PATTERNS = [
  /cannot use a pool after calling end/i,
  /pool has been destroyed/i,
  /connection terminated/i,
  /connection timeout/i,
];

const isPoolDeadError = (err) =>
  POOL_DEAD_PATTERNS.some((p) => p.test(err?.message || ''));

const mapPrismaError = (err) => {
  // pg pool was shut down (e.g. degraded-mode startup). Treat as transient 503.
  if (isPoolDeadError(err)) {
    return {
      statusCode: 503,
      code: 'SERVICE_TEMPORARILY_UNAVAILABLE',
      message: SERVICE_UNAVAILABLE_MESSAGE,
      errors: {},
    };
  }

  const isDatabaseError = (
    err?.name?.startsWith('Prisma') ||
    err?.code === 'DATABASE_ENV_INVALID' ||
    /^P\d{4}$/.test(String(err?.code || '')) ||
    ['ENOTFOUND', 'EAI_AGAIN', 'ECONNREFUSED', 'EHOSTUNREACH', 'ENETUNREACH', 'ETIMEDOUT', '28P01', '3D000', '42703'].includes(err?.code)
  );

  if (!isDatabaseError) {
    return null;
  }

  const category = classifyDatabaseError(err);

  if (category === 'DATABASE_SCHEMA_MISMATCH') {
    return {
      statusCode: 503,
      code: 'SERVICE_TEMPORARILY_UNAVAILABLE',
      message: SERVICE_UNAVAILABLE_MESSAGE,
      errors: {},
    };
  }

  if ([
    'DATABASE_DNS_FAILURE',
    'DATABASE_HOST_UNREACHABLE',
    'DATABASE_CONNECTION_TIMEOUT',
    'DATABASE_SSL_FAILED',
    'DATABASE_QUERY_FAILED',
  ].includes(category)) {
    return {
      statusCode: 503,
      code: 'SERVICE_TEMPORARILY_UNAVAILABLE',
      message: SERVICE_UNAVAILABLE_MESSAGE,
      errors: {},
    };
  }

  if (category === 'DATABASE_AUTHENTICATION_FAILED') {
    return {
      statusCode: 503,
      code: 'SERVICE_TEMPORARILY_UNAVAILABLE',
      message: SERVICE_UNAVAILABLE_MESSAGE,
      errors: {},
    };
  }

  if (err.code === 'P2002') {
    const field = Array.isArray(err.meta?.target)
      ? err.meta.target.join('.')
      : String(err.meta?.target || 'field');
    const cleanField = field.replace(/^.*_([^_]+)_unique$/, '$1').replace('_key', '');

    return {
      statusCode: 409,
      code: 'CONFLICT_ERROR',
      message: 'A record with that value already exists.',
      errors: { [cleanField]: ['A record with this value already exists.'] },
    };
  }

  if (err.code === 'P2025') {
    return {
      statusCode: 404,
      code: 'NOT_FOUND_ERROR',
      message: 'Record not found.',
      errors: {},
    };
  }

  if (err.code === 'P2003') {
    return {
      statusCode: 409,
      code: 'REFERENCE_ERROR',
      message: 'The requested action conflicts with related records.',
      errors: {},
    };
  }

  return null;
};

/**
 * Centralized error handler middleware.
 * - Redacts sensitive details from logs recursively.
 * - Formats validation issues and DB conflicts.
 * - Strips error stacks in production.
 */
export const errorHandler = (err, req, res, _next) => {
  const requestId = req.headers['x-request-id'] || randomUUID();
  const isDev = process.env.NODE_ENV !== 'production';
  const mappedPrismaError = mapPrismaError(err);

  const statusCode = mappedPrismaError?.statusCode || err.statusCode || 500;
  let message = mappedPrismaError?.message || err.message || 'Internal Server Error';
  let errorCode = mappedPrismaError?.code || err.code || 'INTERNAL_ERROR';
  let errors = mappedPrismaError?.errors || err.errors || {};

  if (statusCode >= 500 && !mappedPrismaError) {
    message = SERVICE_UNAVAILABLE_MESSAGE;
    errorCode = 'SERVICE_TEMPORARILY_UNAVAILABLE';
    errors = {};
  }

  // Set explicit VALIDATION_ERROR code if thrown from validation middleware
  if (err.code === 'VALIDATION_ERROR') {
    errorCode = 'VALIDATION_ERROR';
    message = 'Validation failed';
  }

  // Sanitized log error representation to ensure zero secrets leak to logs/stdout
  const sanitizedErr = sanitizeObject({
    message,
    code: errorCode,
    requestId,
    category: classifyDatabaseError(err),
    errors: err.errors,
    stack: mappedPrismaError ? null : err.stack,
  });

  console.error(`\n[Error] ${statusCode} - ${req.method} ${req.originalUrl}`);
  console.error(`  Request: ${requestId}`);
  console.error(`  Code   : ${sanitizedErr.code || errorCode}`);
  console.error(`  Message: ${sanitizedErr.message}`);
  
  if (isDev && sanitizedErr.stack) {
    console.error(`  Stack  : ${sanitizedErr.stack}`);
  }

  const responsePayload = {
    success: false,
    message,
    code: errorCode,
    requestId,
    errors,
  };

  res.status(statusCode).json(responsePayload);
};

export default errorHandler;
