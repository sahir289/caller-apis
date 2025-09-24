import { performance } from 'perf_hooks';

// Performance monitoring utilities
export class PerformanceMonitor {
  constructor(name, options = {}) {
    this.name = name;
    this.options = {
      logToConsole: options.logToConsole !== false,
      trackMemory: options.trackMemory !== false,
      sampleRate: options.sampleRate || 1, // 1 = 100%, 0.1 = 10%
      ...options
    };
    
    this.startTime = null;
    this.endTime = null;
    this.startMemory = null;
    this.endMemory = null;
    this.checkpoints = [];
  }

  start() {
    this.startTime = performance.now();
    if (this.options.trackMemory) {
      this.startMemory = process.memoryUsage();
    }
    
    if (this.options.logToConsole) {
      console.log(`[PERF] ${this.name} - Started`);
    }
    
    return this;
  }

  checkpoint(label) {
    const now = performance.now();
    const duration = this.startTime ? now - this.startTime : 0;
    
    this.checkpoints.push({
      label,
      timestamp: now,
      duration,
      memory: this.options.trackMemory ? process.memoryUsage() : null
    });
    
    if (this.options.logToConsole) {
      console.log(`[PERF] ${this.name} - Checkpoint "${label}": ${duration.toFixed(2)}ms`);
    }
    
    return this;
  }

  end() {
    this.endTime = performance.now();
    if (this.options.trackMemory) {
      this.endMemory = process.memoryUsage();
    }
    
    const duration = this.startTime ? this.endTime - this.startTime : 0;
    
    const result = {
      name: this.name,
      duration: Math.round(duration * 100) / 100, // Round to 2 decimal places
      startTime: this.startTime,
      endTime: this.endTime,
      checkpoints: this.checkpoints
    };

    if (this.options.trackMemory && this.startMemory && this.endMemory) {
      result.memoryUsage = {
        start: this.startMemory,
        end: this.endMemory,
        delta: {
          rss: this.endMemory.rss - this.startMemory.rss,
          heapUsed: this.endMemory.heapUsed - this.startMemory.heapUsed,
          heapTotal: this.endMemory.heapTotal - this.startMemory.heapTotal,
          external: this.endMemory.external - this.startMemory.external
        }
      };
    }
    
    if (this.options.logToConsole) {
      console.log(`[PERF] ${this.name} - Completed in ${result.duration}ms`);
      if (result.memoryUsage) {
        const delta = result.memoryUsage.delta;
        console.log(`[PERF] ${this.name} - Memory delta: RSS ${Math.round(delta.rss / 1024)}KB, Heap ${Math.round(delta.heapUsed / 1024)}KB`);
      }
    }
    
    return result;
  }
}

// Request performance middleware
export const performanceMiddleware = (options = {}) => {
  const {
    trackRoutes = true,
    slowRequestThreshold = 1000, // ms
    memoryWarningThreshold = 100 * 1024 * 1024, // 100MB
    sampleRate = 1.0
  } = options;

  return (req, res, next) => {
    // Sample requests based on sample rate
    if (Math.random() > sampleRate) {
      return next();
    }

    const monitor = new PerformanceMonitor(`${req.method} ${req.path}`, {
      logToConsole: false,
      trackMemory: true
    });

    monitor.start();

    // Track response
    const originalSend = res.send;
    res.send = function(data) {
      const perfResult = monitor.end();
      
      // Log slow requests
      if (perfResult.duration > slowRequestThreshold) {
        console.warn(`[PERF] Slow request detected: ${req.method} ${req.path} took ${perfResult.duration}ms`);
      }

      // Log high memory usage
      if (perfResult.memoryUsage && perfResult.memoryUsage.delta.heapUsed > memoryWarningThreshold) {
        console.warn(`[PERF] High memory usage: ${req.method} ${req.path} used ${Math.round(perfResult.memoryUsage.delta.heapUsed / 1024 / 1024)}MB`);
      }

      // Add performance header (in development)
      if (process.env.NODE_ENV === 'development') {
        res.set('X-Response-Time', `${perfResult.duration}ms`);
      }

      return originalSend.call(this, data);
    };

    next();
  };
};

// Database query performance tracker
export class DatabaseMonitor {
  static queryTimes = new Map();
  static slowQueries = [];
  static SLOW_QUERY_THRESHOLD = 1000; // ms

  static startQuery(queryId, sql) {
    this.queryTimes.set(queryId, {
      sql,
      startTime: performance.now(),
      startMemory: process.memoryUsage()
    });
  }

  static endQuery(queryId) {
    const queryData = this.queryTimes.get(queryId);
    if (!queryData) return null;

    const endTime = performance.now();
    const duration = endTime - queryData.startTime;
    const endMemory = process.memoryUsage();

    const result = {
      queryId,
      sql: queryData.sql,
      duration: Math.round(duration * 100) / 100,
      memoryDelta: endMemory.heapUsed - queryData.startMemory.heapUsed,
      timestamp: new Date().toISOString()
    };

    // Track slow queries
    if (duration > this.SLOW_QUERY_THRESHOLD) {
      this.slowQueries.push(result);
      console.warn(`[DB] Slow query detected (${result.duration}ms): ${result.sql.substring(0, 100)}...`);
      
      // Keep only last 50 slow queries
      if (this.slowQueries.length > 50) {
        this.slowQueries = this.slowQueries.slice(-50);
      }
    }

    this.queryTimes.delete(queryId);
    return result;
  }

  static getSlowQueries() {
    return [...this.slowQueries];
  }

  static getStats() {
    return {
      activeQueries: this.queryTimes.size,
      slowQueriesCount: this.slowQueries.length,
      slowQueries: this.getSlowQueries()
    };
  }
}

// Memory monitoring utilities
export const getMemoryUsage = () => {
  const usage = process.memoryUsage();
  return {
    rss: Math.round(usage.rss / 1024 / 1024), // MB
    heapUsed: Math.round(usage.heapUsed / 1024 / 1024), // MB
    heapTotal: Math.round(usage.heapTotal / 1024 / 1024), // MB
    external: Math.round(usage.external / 1024 / 1024), // MB
    timestamp: new Date().toISOString()
  };
};

export const logMemoryUsage = (label = 'Memory Usage') => {
  const usage = getMemoryUsage();
  console.log(`[MEMORY] ${label}:`, usage);
  return usage;
};

// System performance metrics
export const getSystemMetrics = () => {
  const memUsage = getMemoryUsage();
  const uptime = process.uptime();
  
  return {
    memory: memUsage,
    uptime: {
      seconds: Math.round(uptime),
      human: formatUptime(uptime)
    },
    pid: process.pid,
    version: process.version,
    platform: process.platform,
    arch: process.arch,
    timestamp: new Date().toISOString()
  };
};

// Helper function to format uptime
const formatUptime = (seconds) => {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  if (days > 0) return `${days}d ${hours}h ${minutes}m ${secs}s`;
  if (hours > 0) return `${hours}h ${minutes}m ${secs}s`;
  if (minutes > 0) return `${minutes}m ${secs}s`;
  return `${secs}s`;
};

// Performance decorator for async functions
export const withPerformanceTracking = (name, options = {}) => {
  return (target, propertyKey, descriptor) => {
    const originalMethod = descriptor.value;
    
    descriptor.value = async function (...args) {
      const monitor = new PerformanceMonitor(name || `${target.constructor.name}.${propertyKey}`, options);
      monitor.start();
      
      try {
        const result = await originalMethod.apply(this, args);
        monitor.end();
        return result;
      } catch (error) {
        monitor.checkpoint('error');
        monitor.end();
        throw error;
      }
    };
    
    return descriptor;
  };
};

// Batch operation performance tracker
export class BatchMonitor {
  constructor(name, totalItems, batchSize) {
    this.name = name;
    this.totalItems = totalItems;
    this.batchSize = batchSize;
    this.processedItems = 0;
    this.startTime = performance.now();
    this.lastUpdateTime = this.startTime;
    this.batchTimes = [];
  }

  updateProgress(itemsProcessed) {
    const now = performance.now();
    const timeSinceStart = now - this.startTime;
    const timeSinceLastUpdate = now - this.lastUpdateTime;
    
    this.processedItems = itemsProcessed;
    this.batchTimes.push(timeSinceLastUpdate);
    this.lastUpdateTime = now;

    const progress = (this.processedItems / this.totalItems) * 100;
    const avgBatchTime = this.batchTimes.reduce((a, b) => a + b, 0) / this.batchTimes.length;
    const eta = ((this.totalItems - this.processedItems) / this.batchSize) * avgBatchTime;

    const status = {
      name: this.name,
      progress: Math.round(progress * 100) / 100,
      processed: this.processedItems,
      total: this.totalItems,
      remaining: this.totalItems - this.processedItems,
      duration: Math.round(timeSinceStart),
      avgBatchTime: Math.round(avgBatchTime),
      eta: Math.round(eta),
      itemsPerSecond: Math.round((this.processedItems / (timeSinceStart / 1000)) * 100) / 100
    };

    console.log(`[BATCH] ${this.name}: ${status.progress}% (${status.processed}/${status.total}) - ETA: ${Math.round(status.eta/1000)}s`);
    
    return status;
  }

  complete() {
    const totalTime = performance.now() - this.startTime;
    const result = {
      name: this.name,
      totalItems: this.totalItems,
      totalTime: Math.round(totalTime),
      avgTimePerItem: Math.round((totalTime / this.totalItems) * 100) / 100,
      itemsPerSecond: Math.round((this.totalItems / (totalTime / 1000)) * 100) / 100
    };

    console.log(`[BATCH] ${this.name} completed: ${result.totalItems} items in ${result.totalTime}ms (${result.itemsPerSecond} items/sec)`);
    
    return result;
  }
}