import express from 'express'; 
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import authRoutes from './modules/auth/auth.routes.js';
import userRoutes from './modules/users/user.routes.js';
import ApiError from './utils/ApiError.js';

const app = express();

// 1. Global Middleware
app.use(helmet()); // Security headers
app.use(cors()); // Enable CORS for cross-origin requests
app.use(morgan('dev')); // Request logging
app.use(express.json()); // Body parser for JSON
app.use(express.urlencoded({ extended: true }));

// 2. API Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', userRoutes);

// 3. Handle 404 (Not Found)
app.use((req, res, next) => {
  next(new ApiError(404, `Route ${req.originalUrl} not found`));
});

// 4. Centralized Error Handling Middleware
app.use((err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  // Log error for developers
  if (process.env.NODE_ENV !== 'production') {
    console.error(`[Error] ${statusCode} - ${message}`);
    if (err.stack) console.error(err.stack);
  }

  // Standard API Response
  res.status(statusCode).json({
    success: false,
    status: statusCode,
    message,
    // Include stack trace only in development
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
});

export default app; 