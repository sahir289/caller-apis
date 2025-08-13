import { buildInsertQuery } from "../../utils/db.js";
import { executeQuery } from "../../utils/db.js";
import { buildSelectQuery } from "../../utils/db.js";

export const createhistoryDao = async (data) => {
    try {
      const [sql, params] = buildInsertQuery("history", data);
      const result = await executeQuery(sql, params);
      return result.rows[0];

  } catch (error) {
    console.error("Error creating history:", error);
    throw error;
  }
};
  
  
export const getDailyAgentReportDao = async () => {
  try {
    const sql = `
      SELECT
        a.name AS agent_name,
        COALESCE(ARRAY_AGG(DISTINCT CASE 
          WHEN h.user_id IS NOT NULL THEN u.user_id 
          END), '{}') AS active_client_ids,
        COALESCE(ARRAY_AGG(DISTINCT CASE 
          WHEN h.user_id IS NULL THEN u.user_id 
          END), '{}') AS inactive_client_ids,
        COUNT(DISTINCT CASE 
          WHEN h.user_id IS NOT NULL THEN u.user_id 
          END) AS active_clients_count,
        COUNT(DISTINCT CASE 
          WHEN h.user_id IS NULL THEN u.user_id 
          END) AS inactive_clients_count
      FROM agents a
      LEFT JOIN users u ON u.agent_id = a.id
      LEFT JOIN (
        SELECT DISTINCT user_id
        FROM history
        WHERE last_played_date::date >= CURRENT_DATE - INTERVAL '7 days'
      ) h ON h.user_id = u.user_id
      GROUP BY a.name
      ORDER BY a.name;
    `;

    const result = await executeQuery(sql);
    return result.rows;
  } catch (error) {
    console.error("Error getting daily agent report:", error);
    throw error;
  }
};

  


export const gethistoryDao = async (data) => {
  try {
    const [sql, params] = buildSelectQuery("history", data);
      const result = await executeQuery(sql, params);
    return result.rows;
  } catch (error) {
    console.error("Error creating history:", error);
    throw error;
  }
};
