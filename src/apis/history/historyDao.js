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

export const getHourlyActiveClientsDao = async () => {
  try {
    const sql = `
      SELECT
        COALESCE(a.name, 'Unassigned') AS agent_name,
        ARRAY_AGG(DISTINCT CASE 
          WHEN h.created_at >= (CURRENT_TIMESTAMP AT TIME ZONE 'UTC+4') - INTERVAL '1 hour'
           AND h.last_played_date = (CURRENT_TIMESTAMP AT TIME ZONE 'UTC+4')::date
           THEN u.user_id
        END) FILTER (WHERE h.created_at IS NOT NULL) AS active_client_ids,
        COUNT(DISTINCT CASE 
          WHEN h.created_at >= (CURRENT_TIMESTAMP AT TIME ZONE 'UTC+4') - INTERVAL '1 hour'
           AND h.last_played_date = (CURRENT_TIMESTAMP AT TIME ZONE 'UTC+4')::date
           THEN u.user_id
        END) AS active_clients_count,
        ARRAY_AGG(DISTINCT CASE 
          WHEN h.created_at < (CURRENT_TIMESTAMP AT TIME ZONE 'UTC+4') - INTERVAL '1 hour' 
           OR h.user_id IS NULL
           THEN u.user_id
        END) FILTER (WHERE u.user_id IS NOT NULL) AS inactive_client_ids,
        COUNT(DISTINCT CASE 
          WHEN h.created_at < (CURRENT_TIMESTAMP AT TIME ZONE 'UTC+4') - INTERVAL '1 hour' 
           OR h.user_id IS NULL
           THEN u.user_id
        END) AS inactive_clients_count
      FROM users u
      LEFT JOIN agents a ON u.agent_id = a.id
      LEFT JOIN history h ON h.user_id = u.user_id
      GROUP BY a.name
    `;

    const result = await executeQuery(sql);

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
    console.error(
      "Error getting hourly active clients:",
      error.message,
    );
    throw new Error(`Failed to fetch hourly active clients: ${error.message}`);
  }
};

export const getUnassignedUsersReportDao = async () => {
  try {
    const sql = `
      SELECT
        'Unassigned' AS agent_name,
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
      FROM users u
      LEFT JOIN (
        SELECT DISTINCT user_id
        FROM history
        WHERE last_played_date::date >= CURRENT_DATE - INTERVAL '7 days'
      ) h ON h.user_id = u.user_id
      WHERE u.agent_id IS NULL
      GROUP BY agent_name
      ORDER BY agent_name;
    `;
    const result = await executeQuery(sql);
    return result.rows;
  } catch (error) {
    console.error("Error getting unassigned users report:", error);
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
