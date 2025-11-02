import { checkDatabaseHealth } from './config/db.mjs';
import express from 'express';
import dotenv from 'dotenv';
dotenv.config();
import cookieParser from 'cookie-parser';
import cors from 'cors';
import bodyParser from 'body-parser';
import session from 'express-session';
import prisma from './lib/prisma.mjs';

const app = express();
const PORT = process.env.PORT || 3000;

// ==========================================
// MIDDLEWARE
// ==========================================

app.use(cors({
  origin: process.env.CLIENT_URL || "http://localhost:3000",
  credentials: true
}));

app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'joblify-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// ==========================================
// ROUTES
// ==========================================

// Import routes
import authRouter from './routes/auth.route.mjs';
import jobseekerRouter from './routes/jobseeker.route.mjs';
import companyRouter from './routes/company.route.mjs';

// Use routes
app.use('/api/auth', authRouter);
app.use('/api/jobseeker', jobseekerRouter);
app.use('/api/company', companyRouter);

// ==========================================
// HEALTH CHECK & BASIC ROUTES
// ==========================================

app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    service: 'Joblify API'
  });
});

// Database health check
app.get('/api/db-health', async (req, res) => {
  try {
    const dbHealth = await checkDatabaseHealth();
    res.json(dbHealth);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Database health check failed',
      error: error.message
    });
  }
});

// ==========================================
// ERROR HANDLING MIDDLEWARE
// ==========================================

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`
  });
});

// Global error handler
app.use((error, req, res, next) => {
  console.error('Global error handler:', error);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? error.message : undefined
  });
});

// ==========================================
// SERVER STARTUP
// ==========================================

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📍 Health check: http://localhost:${PORT}/api/health`);
  console.log(`🔗 Environment: ${process.env.NODE_ENV || 'development'}`);
});