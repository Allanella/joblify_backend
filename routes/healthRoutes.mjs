import express from 'express';
import dotenv from 'dotenv';
dotenv.config();
import cookieParser from 'cookie-parser';
import cors from 'cors';
import bodyParser from 'body-parser';
import session from 'express-session';
import connectDB from './config/db.mjs';
import { checkDatabaseHealth } from './config/db.mjs';

// Import all routers
import authRouter from './routes/auth.route.mjs';
import paymentRoutes from './routes/paymentRoutes.mjs';
import rewardRoutes from './routes/rewardRoutes.mjs';
import questionAttemptRoutes from './routes/questionAttemptRoutes.mjs';
import questionRoutes from './routes/questionRoutes.mjs';
import surveyRoutes from './routes/surveyRoutes.mjs';
import videoRoutes from './routes/videoRoutes.mjs';
import AdRoutes from './routes/AdRoutes.mjs';
import exploreRoutes from './routes/exploreRoutes.mjs';
import rewardQuestionRoutes from './routes/rewardQuestionRoutes.mjs';
import notificationRoutes from './routes/notificationRoutes.mjs';
import userRoutes from './routes/userRoutes.mjs';
import healthRouter from './routes/health.route.mjs'; // your new health router

console.log('Starting DelipuCash server...');
console.log('Environment variables loaded:', {
  PORT: process.env.PORT,
  NODE_ENV: process.env.NODE_ENV,
  DATABASE_URL: process.env.DATABASE_URL ? 'Present' : 'Missing'
});

const app = express();

// Connect to DB if not running on Vercel
if (process.env.VERCEL !== '1') {
  console.log('Attempting to connect to database...');
  connectDB();
}

// Middleware
app.use(express.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());

const allowedOrigins = [
  'http://localhost:3000',
  'https://delipucashserver.vercel.app',
  'http://localhost:8081',
  'exp://192.168.0.117:8081',
  process.env.FRONTEND_URL
].filter(Boolean);

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    if (!allowedOrigins.includes(origin)) {
      return callback(new Error('CORS not allowed from this origin'), false);
    }
    return callback(null, true);
  },
  credentials: true,
}));

// Session middleware
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key-change-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000,
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'
  }
}));

// Development request logging
if (process.env.NODE_ENV !== 'production') {
  app.use((req, res, next) => {
    console.log(`Incoming request: ${req.method} ${req.url}`);
    if (req.headers.authorization) {
      console.log('Authorization header (truncated):', req.headers.authorization.substring(0, 20) + '...');
    }
    next();
  });
}

// Debug endpoint to inspect request body
app.post('/api/debug-body', (req, res) => {
  console.log('DEBUG ENDPOINT HIT', req.body);
  res.json({
    success: true,
    bodyReceived: req.body,
    contentType: req.headers['content-type'],
    bodyKeys: Object.keys(req.body || {})
  });
});

// Mount health router first
app.use('/api', healthRouter);

// Mount all other API routes
app.use('/api/rewards', rewardRoutes);
app.use('/api/attempts', questionAttemptRoutes);
app.use('/api/questions', questionRoutes);
app.use('/api/surveys', surveyRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/videos', videoRoutes);
app.use('/api/auth', authRouter);
app.use('/api/ads', AdRoutes);
app.use('/api/explore', exploreRoutes);
app.use('/api/reward-questions', rewardQuestionRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/users', userRoutes);

// Simple test route
app.get('/hello', (req, res) => {
  res.json({ success: true, message: 'Hello World' });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'DelipuCash Server is running!',
    timestamp: new Date().toISOString()
  });
});

// 404 handler (must come after all routes)
app.use('/api/*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'API endpoint not found'
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.statusCode || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
  });
});

// Start server
const PORT = process.env.PORT || 3000;
if (process.env.VERCEL !== '1') {
  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
    console.log(`💾 Database connected: ${process.env.DATABASE_URL ? 'Yes' : 'No'}`);
  });
}

export default app;
