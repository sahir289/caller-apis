// Database utilities
import { buildInsertQuery, executeQuery, buildSelectQuery } from "../../utils/db.js";
import { InternalServerError } from "../../utils/errorHandler.js";

// Constants for query optimization
const BATCH_SIZE = 500; // For bulk operations
const MAX_DAYS_LOOKBACK = 7;

export const createhistoryDao = async (data) => {
    try {
      const [sql, params] = buildInsertQuery("history", data);
      const result = await executeQuery(sql, params);
      return result.rows[0];

  } catch (error) {
    console.error("Error creating history:", error);
    throw new InternalServerError();
  }
};


export const gethistoryByLastPlayedDateDao = async (data) => {
  try {
    const [sql, params] = buildSelectQuery("history", data);
    const result = await executeQuery(sql, params);
    return result.rows[0];
  } catch (error) {
    console.error("Error creating history:", error);
    throw new InternalServerError();
  }
};
export const getDailyAgentReportDao = async () => {
  try {
    // Optimized query with better indexing strategy
    const sql = `
      WITH RecentActivity AS (
        SELECT DISTINCT u.user_id as user_string_id, u.agent_id
        FROM history h
        INNER JOIN users u ON u.id = h.user_id
        WHERE h.played_at::date >= CURRENT_DATE - INTERVAL '7 days'
          AND h.is_obsolete = false
          AND h.user_id IS NOT NULL
      )
      SELECT
        a.name AS agent_name,
        COALESCE(
          ARRAY_AGG(DISTINCT ra.user_string_id) FILTER (WHERE ra.user_string_id IS NOT NULL), 
          '{}'
        ) AS active_client_ids,
        COALESCE(
          ARRAY_AGG(DISTINCT u.user_id) FILTER (WHERE ra.user_string_id IS NULL AND u.user_id IS NOT NULL), 
          '{}'
        ) AS inactive_client_ids,
        COUNT(DISTINCT ra.user_string_id) AS active_clients_count,
        COUNT(DISTINCT CASE WHEN ra.user_string_id IS NULL THEN u.user_id END) AS inactive_clients_count
      FROM agents a
      LEFT JOIN users u ON u.agent_id = a.id
      LEFT JOIN RecentActivity ra ON ra.user_string_id = u.user_id
      GROUP BY a.id, a.name
      ORDER BY a.name;
    `;

    const result = await executeQuery(sql);
    return result.rows;
  } catch (error) {
    console.error("Error getting daily agent report:", error);
    throw new InternalServerError();
  }
};
export const getHourlyHistoryAllAgentWiseUserIdsDao = async () => {
  try {
    const date = new Date().toLocaleDateString("en-CA", {
      timeZone: "Asia/Kolkata",
    });
    const indianDate = new Date(date).toISOString().split("T")[0];
    
    // Optimized query with better performance
    const sql = `
      WITH DailyHistory AS (
        SELECT 
            h.user_id,
            u.user_id as user_string_id,
            u.agent_id,
            SUM(CASE WHEN h.type IN ('PAYIN', 'DEPOSIT') AND h.status IN ('SUCCESS', 'APPROVED') THEN h.amount ELSE 0 END) as deposit_amount,
            SUM(CASE WHEN h.type IN ('PAYOUT', 'WITHDRAWAL') AND h.status IN ('SUCCESS', 'APPROVED') THEN h.amount ELSE 0 END) as withdrawal_amount
        FROM history h
        INNER JOIN users u ON u.id = h.user_id
        WHERE h.played_at::date = $1
          AND h.is_obsolete = false
          AND h.user_id IS NOT NULL
          AND NOT (
            h.config->>'Description' ILIKE '%lc%' 
            OR h.config->>'Remark' ILIKE '%lc%'
            OR h.config->>'Remark' ILIKE '%Hold%'
            OR h.config->>'Remark' ILIKE '%Bonus%'
            OR h.config->>'Description' ILIKE '%Withdraw Reversal%'
          )
        GROUP BY h.user_id, u.user_id, u.agent_id
      )
      SELECT
          COALESCE(TRIM(a.name), 'Unassigned') AS agent_name,
          COUNT(DISTINCT dh.user_string_id) AS active_clients_count,
          COALESCE(SUM(dh.deposit_amount), 0) AS total_deposit_amount,
          COALESCE(SUM(dh.withdrawal_amount), 0) AS total_withdrawal_amount
      FROM agents a
      RIGHT JOIN DailyHistory dh ON dh.agent_id = a.id
      GROUP BY a.id, a.name
      HAVING COUNT(DISTINCT dh.user_string_id) > 0
      ORDER BY COALESCE(TRIM(a.name), 'Unassigned');
    `;
    
    const result = await executeQuery(sql, [indianDate]);
    return result.rows;
  } catch (error) {
    console.error("Error getting hourly agent-wise report:", error);
    throw new InternalServerError();
  }
};
  
export const getHourlyHistoryAllUserIdsDao = async () => {
  try {
    const date = new Date().toLocaleDateString("en-CA", {
      timeZone: "Asia/Kolkata",
    });
    const indianDate = new Date(date).toISOString().split("T")[0];
    
    const sql = `
      WITH DailyHistory AS (
        SELECT 
            u.user_id as user_string_id,
            CASE WHEN h.type IN ('PAYIN', 'DEPOSIT') THEN h.amount ELSE 0 END as deposit_amount,
            CASE WHEN h.type IN ('PAYOUT', 'WITHDRAWAL') THEN h.amount ELSE 0 END as withdrawal_amount
        FROM history h
        JOIN users u ON u.id = h.user_id
        WHERE h.played_at::date = $1
          AND h.is_obsolete = false
          AND h.status IN ('SUCCESS', 'APPROVED')
          AND NOT (h.config->>'Description' ILIKE '%lc%' 
                  OR h.config->>'Remark' ILIKE '%lc%'
                  OR h.config->>'Remark' ILIKE '%Hold%'
                  OR h.config->>'Remark' ILIKE '%Bonus%'
                  OR h.config->>'Description' ILIKE '%Withdraw Reversal%')
      ),
      ReversalHistory AS (
        SELECT 
            COALESCE(SUM(h.amount), 0) AS total_reversal_amount
        FROM history h
        WHERE h.played_at::date = $1
          AND h.is_obsolete = false
          AND h.config->>'Description' ILIKE '%Withdraw Reversal%'
      )
      SELECT
          COALESCE(SUM(dh.deposit_amount), 0) AS total_deposit_amount,
          COALESCE(SUM(dh.withdrawal_amount), 0) AS total_withdrawal_amount,
          (SELECT total_reversal_amount FROM ReversalHistory) AS total_reversal_amount,
          COUNT(DISTINCT dh.user_string_id) AS user_count
      FROM DailyHistory dh
    `;
    
    const result = await executeQuery(sql, [indianDate]);
    const row = result.rows[0];
    
    const nowIST = new Date().toLocaleString("en-US", {
      timeZone: "Asia/Kolkata",
    });
    const dateObj = new Date(nowIST);
    let hours = dateObj.getHours();
    const minutes = dateObj.getMinutes().toString().padStart(2, "0");
    const ampm = hours >= 12 ? "PM" : "AM";
    hours = hours % 12 || 12;

    const day = dateObj.getDate().toString().padStart(2, "0");
    const month = (dateObj.getMonth() + 1).toString().padStart(2, "0");
    const year = dateObj.getFullYear();
    
    const formattedTime = `${hours}:${minutes} ${ampm} ${day}-${month}-${year}`;
    
    return {
      time: formattedTime,
      total_deposit_amount: row.total_deposit_amount || 0,
      total_withdrawal_amount: row.total_withdrawal_amount || 0,
      total_reversal_amount: row.total_reversal_amount || 0,
      user_count: row.user_count || 0,
    };
  } catch (error) {
    console.error("Error getting hourly summary:", error);
    throw new InternalServerError();
  }
};

export const getHourlyActiveClientsDao = async () => {
  try {
    const date = new Date().toLocaleDateString("en-CA", {
      timeZone: "Asia/Kolkata",
    });
    const reportDate = new Date(date).toISOString().split("T")[0];
    
    const sql = `
      WITH ActiveClients AS (
        SELECT DISTINCT u.user_id as user_string_id, u.agent_id
        FROM history h
        JOIN users u ON u.id = h.user_id
        WHERE h.played_at::date = $1
          AND h.is_obsolete = false
      )
      SELECT
        COALESCE(TRIM(a.name), 'Unassigned') AS agent_name,
        ARRAY_AGG(DISTINCT ac.user_string_id) FILTER (WHERE ac.user_string_id IS NOT NULL) AS active_client_ids,
        COUNT(DISTINCT ac.user_string_id) AS active_clients_count,
        ARRAY_AGG(DISTINCT u.user_id) FILTER (
          WHERE ac.user_string_id IS NULL AND u.user_id IS NOT NULL
        ) AS inactive_client_ids,
        COUNT(DISTINCT u.user_id) FILTER (WHERE ac.user_string_id IS NULL) AS inactive_clients_count
      FROM users u
      LEFT JOIN agents a ON u.agent_id = a.id
      LEFT JOIN ActiveClients ac ON ac.user_string_id = u.user_id
      GROUP BY TRIM(a.name)
      ORDER BY TRIM(a.name);
    `;

    const result = await executeQuery(sql, [reportDate]);
    return result.rows.length
      ? result.rows
      : [
          {
            agent_name: "Unassigned",
            active_client_ids: [],
            active_clients_count: 0,
            inactive_client_ids: [],
            inactive_clients_count: 0,
          },
        ];
  } catch (error) {
    console.error("Error getting hourly active clients:", error.message);
    throw new InternalServerError();
  }
};


export const getUnassignedUsersReportDao = async () => {
  try {
    const sql = `
      WITH RecentActivity AS (
        SELECT DISTINCT u.user_id as user_string_id
        FROM history h
        JOIN users u ON u.id = h.user_id
        WHERE h.played_at::date >= CURRENT_DATE - INTERVAL '7 days'
          AND h.is_obsolete = false
      )
      SELECT
        'Unassigned' AS agent_name,
        COALESCE(ARRAY_AGG(DISTINCT CASE 
          WHEN ra.user_string_id IS NOT NULL THEN ra.user_string_id 
          END), '{}') AS active_client_ids,
        COALESCE(ARRAY_AGG(DISTINCT CASE 
          WHEN ra.user_string_id IS NULL THEN u.user_id 
          END), '{}') AS inactive_client_ids,
        COUNT(DISTINCT CASE 
          WHEN ra.user_string_id IS NOT NULL THEN ra.user_string_id 
          END) AS active_clients_count,
        COUNT(DISTINCT CASE 
          WHEN ra.user_string_id IS NULL THEN u.user_id 
          END) AS inactive_clients_count
      FROM users u
      LEFT JOIN RecentActivity ra ON ra.user_string_id = u.user_id
      WHERE u.agent_id IS NULL
      GROUP BY agent_name
      ORDER BY agent_name;
    `;
    const result = await executeQuery(sql);
    return result.rows;
  } catch (error) {
    console.error("Error getting unassigned users report:", error);
    throw new InternalServerError();
  }
};



export const gethistoryDao = async (data) => {
  try {
    const [sql, params] = buildSelectQuery("history", data);
      const result = await executeQuery(sql, params);
    return result.rows;
  } catch (error) {
    console.error("Error creating history:", error);
    throw new InternalServerError();
  }
};

export const bulkCreateHistoryDao = async (records) => {
  try {
    if (!records || records.length === 0) {
      return [];
    }

    // Process in batches for better performance
    const results = [];
    for (let i = 0; i < records.length; i += BATCH_SIZE) {
      const batch = records.slice(i, i + BATCH_SIZE);
      const batchResults = await processBatch(batch);
      results.push(...batchResults);
    }

    return results;
  } catch (error) {
    console.error("Error bulk creating history records:", error);
    throw new InternalServerError();
  }
};

// Helper function for batch processing
const processBatch = async (batch) => {
  const keys = Object.keys(batch[0]);
  const columns = keys.join(", ");
  
  // Create placeholders for each record
  const valuePlaceholders = batch.map((_, recordIndex) => {
    const recordPlaceholders = keys.map((_, keyIndex) => 
      `$${recordIndex * keys.length + keyIndex + 1}`
    ).join(", ");
    return `(${recordPlaceholders})`;
  }).join(", ");

  // Flatten all values
  const allValues = batch.flatMap(record => keys.map(key => record[key]));

  const sql = `INSERT INTO history (${columns}) VALUES ${valuePlaceholders} RETURNING id`;
  const result = await executeQuery(sql, allValues);
  
  return result.rows;
};

export const checkDuplicateHistoryDao = async (originalId, type) => {
  try {
    const sql = `
      SELECT id FROM history 
      WHERE config->>'original_id' = $1 
      AND type = $2 
      AND is_obsolete = false
      LIMIT 1
    `;
    const result = await executeQuery(sql, [originalId, type]);
    return result.rows[0] || null;
  } catch (error) {
    console.error("Error checking duplicate history:", error);
    throw new InternalServerError();
  }
};
