import { Pool } from "pg";
import { database, environment } from "../config/config";

const pool = new Pool({
  connectionString: database.url,
  ssl:
    environment === "production" ? { rejectUnauthorized: false } : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

pool.on("error", (err) => {
  console.error("Idle client error:", err.message);
});

const executeQuery = async (query, params = []) => {
  try {
    const { rows } = await pool.query(query, params);
    return rows;
  } catch (error) {
    throw new Error(`Query failed: ${error.message}`);
  }
};

const transactionWrapper =
  (fn) =>
  async (...args) => {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const result = await fn(client, ...args);
      await client.query("COMMIT");
      return result;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  };

export default {
  pool,
  executeQuery,
  transactionWrapper,
};
