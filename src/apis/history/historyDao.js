import { buildInsertQuery } from "../../utils/db.js";
import { executeQuery } from "../../utils/db.js";
import { buildSelectQuery } from "../../utils/db.js";
import { InternalServerError } from "../../utils/errorHandler.js";
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
    throw new InternalServerError();
  }
};
export const getHourlyHistoryAllAgentWiseUserIdsDao = async () => {
  try {
    const date = new Date().toLocaleDateString("en-CA", {
      timeZone: "Asia/Kolkata",
    });
    const indianDate = new Date(date).toISOString().split("T")[0];
    const sql = `
     WITH DeduplicatedHistory AS (
  SELECT DISTINCT ON (h.user_id,h.last_played_date, h.total_deposit_amount,
    h.total_withdrawal_amount)
   h.user_id,
    h.last_played_date,
    h.total_deposit_amount,
    h.total_withdrawal_amount
  FROM history h
  WHERE h.last_played_date::date = $1
  AND h.is_obsolete = false
  ORDER BY
  h.user_id,
    h.last_played_date,
     h.total_deposit_amount,
      h.total_withdrawal_amount,
    h.created_at DESC 
)
SELECT
  TRIM(a.name) AS agent_name,
  COUNT(DISTINCT u.user_id) FILTER (WHERE dh.user_id IS NOT NULL) AS active_clients_count,
  COALESCE(SUM(dh.total_deposit_amount::NUMERIC), 0) AS total_deposit_amount,
  COALESCE(SUM(dh.total_withdrawal_amount::NUMERIC), 0) AS total_withdrawal_amount
FROM agents a
LEFT JOIN users u ON u.agent_id = a.id
LEFT JOIN DeduplicatedHistory dh 
  ON dh.user_id = u.user_id
GROUP BY TRIM(a.name)
ORDER BY TRIM(a.name)
    `;
    const result = await executeQuery(sql, [indianDate]);
    return result.rows;
  } catch (error) {
    console.error("Error getting daily agent report:", error);
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
     WITH DeduplicatedHistory AS (
    SELECT DISTINCT ON (h.user_id,h.last_played_date, h.total_deposit_amount,
    h.total_withdrawal_amount)
    h.user_id,
    h.last_played_date,
    h.total_deposit_amount,
    h.total_withdrawal_amount
  FROM history h
  WHERE h.last_played_date::date = $1
  AND h.is_obsolete = false
  ORDER BY
      h.user_id,
    h.last_played_date,
     h.total_deposit_amount,
      h.total_withdrawal_amount,
    h.created_at DESC 
)
SELECT
  COALESCE(SUM(dh.total_deposit_amount::NUMERIC), 0) AS total_deposit_amount,
  COALESCE(SUM(dh.total_withdrawal_amount::NUMERIC), 0) AS total_withdrawal_amount,
  ARRAY_AGG(DISTINCT dh.user_id) AS user_ids
FROM DeduplicatedHistory dh
 WHERE dh.user_id IS NOT NULL
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
    const data = {
      time: formattedTime,
      total_deposit_amount: row.total_deposit_amount,
      total_withdrawal_amount: row.total_withdrawal_amount,
      user_count: row.user_ids?.length || 0,
    };
    return data;
  } catch (error) {
    console.error("Error getting daily history user IDs:", error);
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
      SELECT
        COALESCE(TRIM(a.name), 'Unassigned') AS agent_name,
        ARRAY_AGG(DISTINCT u.user_id) FILTER (
          WHERE h.last_played_date::date = $1
        ) AS active_client_ids,
        COUNT(DISTINCT u.user_id) FILTER (
          WHERE h.last_played_date::date = $1
        ) AS active_clients_count,
        ARRAY_AGG(DISTINCT u.user_id) FILTER (
          WHERE h.last_played_date IS NULL OR h.last_played_date::date <> $1
        ) AS inactive_client_ids,
        COUNT(DISTINCT u.user_id) FILTER (
          WHERE h.last_played_date IS NULL OR h.last_played_date::date <> $1
        ) AS inactive_clients_count
      FROM users u
      LEFT JOIN agents a ON u.agent_id = a.id
      LEFT JOIN history h ON h.user_id = u.user_id
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
