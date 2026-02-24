import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { json } from 'body-parser';
import { errorHandler } from './middleware/errorHandler';
import { requestLogger } from './middleware/requestLogger';
import { musicRoutes } from './routes/music';
import { videoRoutes } from './routes/video';
import { imageRoutes } from './routes/image';
import { aiRoutes } from './routes/ai';
import { authRoutes } from './routes/auth';
import { healthRoutes } from './routes/health';
import { performanceRoutes } from './routes/performance';
import { SelfPerformanceEngine } from './ai/SelfPerformanceEngine';

const app = express();
const PORT = process.env.PORT || 4000;

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

// Stricter limit for generation endpoints
const generationLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10,
  message: 'Generation rate limit exceeded. Please wait before generating again.',
});
app.use('/api/music/generate', generationLimiter);
app.use('/api/video/generate', generationLimiter);
app.use('/api/image/generate', generationLimiter);

// Body parsing
app.use(json({ limit: '50mb' }));

// Request logging
app.use(requestLogger);

// Routes
app.use('/api/health', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/music', musicRoutes);
app.use('/api/video', videoRoutes);
app.use('/api/image', imageRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/performance', performanceRoutes);

// Global error handler (must be last)
app.use(errorHandler);

// Start self-performance monitoring
const perfEngine = new SelfPerformanceEngine();
perfEngine.startMonitoring();

// Start server
app.listen(PORT, () => {
  console.log(`[DIETER AND ED AI] Backend running on port ${PORT}`);
  console.log(`[DIETER AND ED AI] Environment: ${process.env.NODE_ENV || 'development'}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('[DIETER AND ED AI] SIGTERM received, shutting down gracefully');
  perfEngine.stopMonitoring();
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('[DIETER AND ED AI] SIGINT received, shutting down gracefully');
  perfEngine.stopMonitoring();
  process.exit(0);
});

// Unhandled promise rejection handler
process.on('unhandledRejection', (reason, promise) => {
  console.error('[DIETER AND ED AI] Unhandled Promise Rejection:', reason);
  // Don't exit process - log and continue
});

export default app;
