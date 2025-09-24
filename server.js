import express from "express";
import cors from "cors";
import apiRouter from "./src/apis/index.js"; 
import { startUserFetchCron } from "./src/apis/cron/cron.js";
import { errorHandler } from "./src/middlewares/errorHandler.js";
import { 
  performanceMiddleware, 
  getSystemMetrics,
  DatabaseMonitor 
} from "./src/utils/performanceMonitor.js";
import { startPoolMonitoring, getPoolStatus } from "./src/utils/db.js";

const app = express();
const PORT = process.env.PORT || 3009;

// CORS configuration
const corsOptions = {
  origin: '*', 
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'FETCH', 'OPTIONS'], 
  credentials: true,
};

app.use(cors(corsOptions));

// Body parsing middleware
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Performance monitoring middleware
app.use(performanceMiddleware({
  trackRoutes: true,
  slowRequestThreshold: 1000, // Log requests slower than 1s
  sampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0 // Sample 10% in production
}));

// Health check endpoint with system metrics
app.get('/health', (req, res) => {
  const metrics = getSystemMetrics();
  const poolStatus = getPoolStatus();
  const dbStats = DatabaseMonitor.getStats();
  
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    system: metrics,
    database: {
      pool: poolStatus,
      performance: dbStats
    },
    environment: process.env.NODE_ENV || 'development'
  });
});

// Performance metrics endpoint (development only)
if (process.env.NODE_ENV !== 'production') {
  app.get('/metrics', (req, res) => {
    const metrics = getSystemMetrics();
    const poolStatus = getPoolStatus();
    const dbStats = DatabaseMonitor.getStats();
    
    res.json({
      system: metrics,
      database: {
        pool: poolStatus,
        slowQueries: dbStats.slowQueries,
        activeQueries: dbStats.activeQueries
      },
      performance: {
        uptime: process.uptime(),
        memoryUsage: process.memoryUsage(),
        cpuUsage: process.cpuUsage()
      }
    });
  });
}

// API routes
app.use("/v1", apiRouter);

// Error handling middleware
app.use(errorHandler);

// Start database connection monitoring
const poolMonitorInterval = startPoolMonitoring(60000); // Check every minute

// Start cron jobs
startUserFetchCron();

// Graceful shutdown handling
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  clearInterval(poolMonitorInterval);
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully...');
  clearInterval(poolMonitorInterval);
  process.exit(0);
});

// Start server with performance logging
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Performance monitoring: ${process.env.NODE_ENV !== 'production' ? 'enabled' : 'sampled'}`);
  console.log(`🔍 Health check: http://localhost:${PORT}/health`);
  if (process.env.NODE_ENV !== 'production') {
    console.log(`📈 Metrics endpoint: http://localhost:${PORT}/metrics`);
  }
});
