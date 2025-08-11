import pool from "../config/config.js";
  

export const executeQuery = async (text, params) => {
  const client = await pool.connect();
  try {
    const res = await client.query(text, params);
    return res;
  } finally {
    client.release();
  }
};


export const buildInsertQuery = (table, data) => {
  const keys = Object.keys(data);
  const columns = keys.join(", ");
  const placeholders = keys.map((_, i) => `$${i + 1}`).join(", ");
  const values = keys.map((key) => data[key]);

  const sql = `INSERT INTO ${table} (${columns}) VALUES (${placeholders}) RETURNING *`;
  return [sql, values];
};

export const buildSelectQuery = (table, conditions = {}) => {
  const keys = Object.keys(conditions);
  let sql = `SELECT * FROM ${table}`;
  let values = [];

  if (keys.length > 0) {
    const whereClause = keys
      .map((key, i) => `${key} = $${i + 1}`)
      .join(" AND ");
    sql += ` WHERE ${whereClause}`;
    values = keys.map((key) => conditions[key]);
  }

  return [sql, values];
};