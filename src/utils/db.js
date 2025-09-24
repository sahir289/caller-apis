import pool from "../config/config.js";
import { DatabaseMonitor } from "./performanceMonitor.js";
import { v4 as uuidv4 } from 'uuid';

// Enhanced database connection with performance monitoring
export const executeQuery = async (text, params = []) => {
  const queryId = uuidv4();
  const client = await pool.connect();
  
  try {
    // Start performance monitoring
    DatabaseMonitor.startQuery(queryId, text);
    
    const res = await client.query(text, params);
    
    // End performance monitoring
    const perfResult = DatabaseMonitor.endQuery(queryId);
    
    // Log query performance in development
    if (process.env.NODE_ENV === 'development' && perfResult && perfResult.duration > 100) {
      console.log(`[DB] Query took ${perfResult.duration}ms: ${text.substring(0, 50)}...`);
    }
    
    return res;
  } catch (error) {
    // End monitoring on error
    DatabaseMonitor.endQuery(queryId);
    console.error('[DB] Query error:', error.message);
    console.error('[DB] Query:', text);
    console.error('[DB] Params:', params);
    throw error;
  } finally {
    client.release();
  }
};

// Batch query execution with transaction support
export const executeBatchQuery = async (queries, useTransaction = true) => {
  const client = await pool.connect();
  const queryId = uuidv4();
  
  try {
    DatabaseMonitor.startQuery(queryId, `BATCH: ${queries.length} queries`);
    
    if (useTransaction) {
      await client.query('BEGIN');
    }
    
    const results = [];
    for (let i = 0; i < queries.length; i++) {
      const { text, params = [] } = queries[i];
      try {
        const result = await client.query(text, params);
        results.push(result);
      } catch (error) {
        if (useTransaction) {
          await client.query('ROLLBACK');
        }
        throw new Error(`Batch query failed at index ${i}: ${error.message}`);
      }
    }
    
    if (useTransaction) {
      await client.query('COMMIT');
    }
    
    const perfResult = DatabaseMonitor.endQuery(queryId);
    console.log(`[DB] Batch completed: ${queries.length} queries in ${perfResult?.duration || 0}ms`);
    
    return results;
  } catch (error) {
    DatabaseMonitor.endQuery(queryId);
    if (useTransaction) {
      try {
        await client.query('ROLLBACK');
      } catch (rollbackError) {
        console.error('[DB] Rollback failed:', rollbackError);
      }
    }
    throw error;
  } finally {
    client.release();
  }
};

// Connection pool monitoring
export const getPoolStatus = () => {
  return {
    totalConnections: pool.totalCount,
    idleConnections: pool.idleCount,
    waitingClients: pool.waitingCount,
    maxConnections: pool.options.max || 20,
    usage: Math.round(((pool.totalCount - pool.idleCount) / (pool.options.max || 20)) * 100)
  };
};

// Log pool status periodically
export const startPoolMonitoring = (intervalMs = 30000) => {
  return setInterval(() => {
    const status = getPoolStatus();
    if (status.usage > 80) {
      console.warn(`[DB] High connection pool usage: ${status.usage}% (${status.totalConnections - status.idleConnections}/${status.maxConnections})`);
    }
  }, intervalMs);
};

export const buildInsertQuery = (table, data) => {
  if (!data || Object.keys(data).length === 0) {
    throw new Error('Insert data cannot be empty');
  }
  
  const keys = Object.keys(data);
  const columns = keys.join(", ");
  const placeholders = keys.map((_, i) => `$${i + 1}`).join(", ");
  const values = keys.map((key) => data[key]);

  const sql = `INSERT INTO ${table} (${columns}) VALUES (${placeholders}) RETURNING *`;
  return [sql, values];
};

export const buildBulkInsertQuery = (table, dataArray, onConflict = null) => {
  if (!Array.isArray(dataArray) || dataArray.length === 0) {
    throw new Error('Bulk insert data must be a non-empty array');
  }
  
  // Use keys from first record as template
  const keys = Object.keys(dataArray[0]);
  const columns = keys.join(", ");
  
  let valuesClauses = [];
  let values = [];
  let paramIndex = 1;
  
  for (const data of dataArray) {
    const rowPlaceholders = keys.map(() => `$${paramIndex++}`).join(", ");
    valuesClauses.push(`(${rowPlaceholders})`);
    values.push(...keys.map(key => data[key]));
  }
  
  let sql = `INSERT INTO ${table} (${columns}) VALUES ${valuesClauses.join(", ")}`;
  
  if (onConflict) {
    sql += ` ${onConflict}`;
  }
  
  sql += " RETURNING *";
  
  return [sql, values];
};

export const buildSelectQuery = (table, conditions = {}, options = {}) => {
  const keys = Object.keys(conditions);
  let sql = `SELECT * FROM ${table}`;
  let values = [];
  let paramIndex = 1;

  if (keys.length > 0) {
    const whereClause = keys
      .map((key) => `${key} = $${paramIndex++}`)
      .join(" AND ");
    sql += ` WHERE ${whereClause}`;
    values = keys.map((key) => conditions[key]);
  }
  
  // Add optional ORDER BY
  if (options.orderBy) {
    sql += ` ORDER BY ${options.orderBy}`;
    if (options.orderDirection) {
      sql += ` ${options.orderDirection}`;
    }
  }
  
  // Add optional LIMIT
  if (options.limit) {
    sql += ` LIMIT $${paramIndex++}`;
    values.push(options.limit);
  }
  
  // Add optional OFFSET
  if (options.offset) {
    sql += ` OFFSET $${paramIndex++}`;
    values.push(options.offset);
  }
  
  return [sql, values];
};

export const buildUpdateQuery = (table, data, conditions = {}) => {
  if (!data || Object.keys(data).length === 0) {
    throw new Error('Update data cannot be empty');
  }
  
  if (!conditions || Object.keys(conditions).length === 0) {
    throw new Error('Update conditions cannot be empty');
  }
  
  const dataKeys = Object.keys(data);
  const conditionKeys = Object.keys(conditions);
  
  let paramIndex = 1;
  const setClause = dataKeys
    .map(key => `${key} = $${paramIndex++}`)
    .join(", ");
  
  const whereClause = conditionKeys
    .map(key => `${key} = $${paramIndex++}`)
    .join(" AND ");
  
  const values = [
    ...dataKeys.map(key => data[key]),
    ...conditionKeys.map(key => conditions[key])
  ];
  
  const sql = `UPDATE ${table} SET ${setClause} WHERE ${whereClause} RETURNING *`;
  
  return [sql, values];
};