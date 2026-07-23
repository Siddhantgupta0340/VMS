import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
<<<<<<< HEAD
=======
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
>>>>>>> origin/main

// Module Routes
import authRoutes from './modules/auth/auth.routes.js';
import userRoutes from './modules/users/user.routes.js';
import vendorRoutes from './modules/vendors/vendor.routes.js';
import purchaseOrderRoutes from './modules/purchase-orders/po.routes.js';
import invoiceRoutes from './modules/invoices/invoice.routes.js';
import paymentRoutes from './modules/payments/payment.routes.js';
import approvalRoutes from './modules/approvals/approval.routes.js';
<<<<<<< HEAD
=======
import paymentApprovalRoutes from './modules/payment-approvals/payment-approval.routes.js';
>>>>>>> origin/main
import dashboardRoutes from './modules/dashboard/dashboard.routes.js';
import auditRoutes from './modules/audit-logs/audit.routes.js';
import notificationRoutes from './modules/notifications/notification.routes.js';
import matchingRoutes from './modules/three-way-matching/matching.routes.js';
<<<<<<< HEAD

import ApiError from './utils/ApiError.js';

const app = express();

// ─── 1. Security & Global Middleware ─────────────────────────────────────────
app.use(helmet());
app.use(cors({
  origin:          process.env.FRONTEND_URL || 'http://localhost:3000',
=======
import reportRoutes from './modules/reports/report.routes.js';
import lookupRoutes from './modules/lookups/lookup.routes.js';

import ApiError from './utils/ApiError.js';
import sanitizeObject from './utils/logSanitizer.js';
import errorHandler from './middleware/error.middleware.js';
import prisma from './config/prisma.js';


const app = express();
app.set('etag', false);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const APPLICATION_STARTED_AT = Date.now();
const HEALTH_QUERY_TIMEOUT_MS = Number(process.env.HEALTH_QUERY_TIMEOUT_MS || 3000);
const getRequestId = (req) => req.headers['x-request-id'] || randomUUID();
const withTimeout = (promise, timeoutMs) => {
  let timeoutId;
  const timeout = new Promise((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error('HEALTH_CHECK_TIMEOUT')), timeoutMs);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timeoutId));
};

// ─── 1. Security & Global Middleware ─────────────────────────────────────────
app.use(helmet());
const allowedOrigins = [
  process.env.FRONTEND_URL,
  'http://localhost:3000',
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:5175',
  'http://localhost:5176',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:5176',
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow non-browser requests (curl/postman)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error(`CORS origin not allowed: ${origin}`), false);
  },
>>>>>>> origin/main
  credentials:     true,
  methods:         ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders:  ['Content-Type', 'Authorization'],
}));
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// ─── 2. Body Parsers ─────────────────────────────────────────────────────────
app.use((req, _res, next) => {
  const contentType = req.headers['content-type'] || '';
<<<<<<< HEAD
  if (contentType.includes('text/plain') || !contentType) {
=======
  const methodCanCarryBody = ['POST', 'PUT', 'PATCH'].includes(req.method);
  if (contentType.includes('text/plain') || (!contentType && methodCanCarryBody)) {
>>>>>>> origin/main
    req.headers['content-type'] = 'application/json';
  }
  next();
});
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());
<<<<<<< HEAD
=======
app.use('/uploads/vendor-documents', express.static(path.resolve(__dirname, '../uploads/vendor-documents')));
app.use('/uploads/invoices', express.static(path.resolve(__dirname, '../uploads/invoices')));

app.use('/api/v1', (_req, res, next) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  res.set('Surrogate-Control', 'no-store');
  next();
});
>>>>>>> origin/main

// ─── 3. Request Logger (development only) ─────────────────────────────────────
if (process.env.NODE_ENV !== 'production') {
  app.use((req, _res, next) => {
<<<<<<< HEAD
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`[Request] ${req.method} ${req.originalUrl}`);
    console.log(`  Content-Type : ${req.headers['content-type'] || 'NOT SET'}`);
    console.log(`  Authorization: ${req.headers['authorization'] ? 'Bearer ***' : 'NOT SET'}`);
    if (req.method !== 'GET' && Object.keys(req.body || {}).length > 0) {
      console.log('  Body         :', JSON.stringify(req.body, null, 2));
    }
    if (Object.keys(req.query || {}).length > 0) {
      console.log('  Query        :', req.query);
    }
    if (Object.keys(req.params || {}).length > 0) {
      console.log('  Params       :', req.params);
=======
    const sanitizedBody = sanitizeObject(req.body) ?? {};
    const sanitizedQuery = sanitizeObject(req.query) ?? {};
    const sanitizedParams = sanitizeObject(req.params) ?? {};
    const sanitizedHeaders = sanitizeObject(req.headers) ?? {};

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`[Request] ${req.method} ${req.originalUrl}`);
    console.log(`  Content-Type : ${req.headers['content-type'] || 'NOT SET'}`);
    console.log(`  Headers      :`, JSON.stringify(sanitizedHeaders, null, 2));
    if (req.method !== 'GET' && Object.keys(sanitizedBody).length > 0) {
      console.log('  Body         :', JSON.stringify(sanitizedBody, null, 2));
    }
    if (Object.keys(sanitizedQuery).length > 0) {
      console.log('  Query        :', sanitizedQuery);
    }
    if (Object.keys(sanitizedParams).length > 0) {
      console.log('  Params       :', sanitizedParams);
>>>>>>> origin/main
    }
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    next();
  });
}

// ─── 4. Health Check ──────────────────────────────────────────────────────────
<<<<<<< HEAD
app.get('/health', (_req, res) => {
  res.status(200).json({
    success:     true,
    message:     'VMS API is running.',
    timestamp:   new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    version:     '2.0.0',
=======
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    status: 'healthy',
    service: 'vms-backend',
    environment: process.env.NODE_ENV || 'development',
    uptimeSeconds: Math.floor((Date.now() - APPLICATION_STARTED_AT) / 1000),
    timestamp: new Date().toISOString(),
    requestId: getRequestId(req),
>>>>>>> origin/main
  });
});

// ─── 5. API Routes ────────────────────────────────────────────────────────────
<<<<<<< HEAD
=======
app.get('/health/ready', async (req, res) => {
  const requestId = getRequestId(req);
  try {
    await withTimeout(prisma.$connect(), HEALTH_QUERY_TIMEOUT_MS);
    const [result] = await withTimeout(prisma.$queryRawUnsafe('SELECT 1::int AS ok'), HEALTH_QUERY_TIMEOUT_MS);
    if (result?.ok !== 1) {
      throw new Error('HEALTH_CHECK_FAILED');
    }

    res.status(200).json({
      success: true,
      status: 'ready',
      checks: {
        database: 'up',
        application: 'ready',
      },
      timestamp: new Date().toISOString(),
      requestId,
    });
  } catch {
    res.status(503).json({
      success: false,
      status: 'not_ready',
      checks: {
        database: 'down',
        application: 'not_ready',
      },
      message: 'The service is temporarily unavailable.',
      timestamp: new Date().toISOString(),
      requestId,
    });
  }
});

>>>>>>> origin/main
app.use('/api/v1/auth',               authRoutes);
app.use('/api/v1/users',              userRoutes);
app.use('/api/v1/vendors',            vendorRoutes);
app.use('/api/v1/purchase-orders',    purchaseOrderRoutes);
app.use('/api/v1/invoices',           invoiceRoutes);
app.use('/api/v1/payments',           paymentRoutes);
app.use('/api/v1/approvals',          approvalRoutes);
<<<<<<< HEAD
=======
app.use('/api/v1/payment-approvals',  paymentApprovalRoutes);
>>>>>>> origin/main
app.use('/api/v1/dashboard',          dashboardRoutes);
app.use('/api/v1/audit-logs',         auditRoutes);
app.use('/api/v1/notifications',      notificationRoutes);
app.use('/api/v1/three-way-matching', matchingRoutes);
<<<<<<< HEAD
=======
app.use('/api/v1/reports',           reportRoutes);
app.use('/api/v1/lookups',           lookupRoutes);
>>>>>>> origin/main

// ─── 6. 404 Handler ───────────────────────────────────────────────────────────
app.use((req, _res, next) => {
  next(new ApiError(404, `Route ${req.method} ${req.originalUrl} not found`));
});

// ─── 7. Centralized Error Handler ─────────────────────────────────────────────
<<<<<<< HEAD
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, _next) => {
  const statusCode = err.statusCode || 500;
  const message    = err.message    || 'Internal Server Error';
  const isDev      = process.env.NODE_ENV !== 'production';

  console.error(`\n[Error] ${statusCode} - ${req.method} ${req.originalUrl}`);
  console.error(`  Message: ${message}`);
  if (isDev && err.stack) {
    console.error(`  Stack  : ${err.stack}`);
  }

  // Parse Prisma errors
  let prismaMessage = null;
  if (err.code === 'P2002') {
    prismaMessage = `Duplicate entry: a record with that value already exists.`;
  } else if (err.code === 'P2025') {
    prismaMessage = `Record not found.`;
  } else if (err.code === 'P2003') {
    prismaMessage = `Invalid reference: related record does not exist.`;
  }

  res.status(statusCode).json({
    success:  false,
    status:   statusCode,
    message:  prismaMessage || message,
    errors:   err.errors || [],
    ...(isDev && { stack: err.stack }),
  });
});
=======
app.use(errorHandler);
>>>>>>> origin/main

export default app;
