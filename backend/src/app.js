import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';

// Module Routes
import authRoutes from './modules/auth/auth.routes.js';
import userRoutes from './modules/users/user.routes.js';
import vendorRoutes from './modules/vendors/vendor.routes.js';
import purchaseOrderRoutes from './modules/purchase-orders/po.routes.js';
import invoiceRoutes from './modules/invoices/invoice.routes.js';
import paymentRoutes from './modules/payments/payment.routes.js';
import approvalRoutes from './modules/approvals/approval.routes.js';
import dashboardRoutes from './modules/dashboard/dashboard.routes.js';
import auditRoutes from './modules/audit-logs/audit.routes.js';
import notificationRoutes from './modules/notifications/notification.routes.js';
import matchingRoutes from './modules/three-way-matching/matching.routes.js';

import ApiError from './utils/ApiError.js';

const app = express();

// ─── 1. Security & Global Middleware ─────────────────────────────────────────
app.use(helmet());
app.use(cors({
  origin:          process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials:     true,
  methods:         ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders:  ['Content-Type', 'Authorization'],
}));
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// ─── 2. Body Parsers ─────────────────────────────────────────────────────────
app.use((req, _res, next) => {
  const contentType = req.headers['content-type'] || '';
  if (contentType.includes('text/plain') || !contentType) {
    req.headers['content-type'] = 'application/json';
  }
  next();
});
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// ─── 3. Request Logger (development only) ─────────────────────────────────────
if (process.env.NODE_ENV !== 'production') {
  app.use((req, _res, next) => {
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
    }
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    next();
  });
}

// ─── 4. Health Check ──────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.status(200).json({
    success:     true,
    message:     'VMS API is running.',
    timestamp:   new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    version:     '2.0.0',
  });
});

// ─── 5. API Routes ────────────────────────────────────────────────────────────
app.use('/api/v1/auth',               authRoutes);
app.use('/api/v1/users',              userRoutes);
app.use('/api/v1/vendors',            vendorRoutes);
app.use('/api/v1/purchase-orders',    purchaseOrderRoutes);
app.use('/api/v1/invoices',           invoiceRoutes);
app.use('/api/v1/payments',           paymentRoutes);
app.use('/api/v1/approvals',          approvalRoutes);
app.use('/api/v1/dashboard',          dashboardRoutes);
app.use('/api/v1/audit-logs',         auditRoutes);
app.use('/api/v1/notifications',      notificationRoutes);
app.use('/api/v1/three-way-matching', matchingRoutes);

// ─── 6. 404 Handler ───────────────────────────────────────────────────────────
app.use((req, _res, next) => {
  next(new ApiError(404, `Route ${req.method} ${req.originalUrl} not found`));
});

// ─── 7. Centralized Error Handler ─────────────────────────────────────────────
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

export default app;
