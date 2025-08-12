import { buildInsertQuery } from "../../utils/db.js";
import { executeQuery } from "../../utils/db.js";
import { buildSelectQuery } from "../../utils/db.js";

export const createusersDao = async (data) => {
    try {
      const [sql, params] = buildInsertQuery("users", data);
      const result = await executeQuery(sql, params);
      return result.rows[0];

  } catch (error) {
    console.error("Error creating users:", error);
    throw error;
  }
};
  
  
export const getDailyAgentReportDao = async () => {
  try {
    const sql = `
      SELECT
  a.name AS agent_name,

  -- New Registrations (previous day)
  COUNT(DISTINCT CASE 
    WHEN u.registration_date::date = CURRENT_DATE - INTERVAL '1 day'
    THEN u.users_id END
  ) AS new_registrations,

  -- First-time depositors (previous day)
  COUNT(DISTINCT CASE 
    WHEN u.first_deposit_date::date = CURRENT_DATE - INTERVAL '1 day'
    THEN u.users_id END
  ) AS first_time_depositors,

  -- First-time deposit amount
  COALESCE(SUM(CASE 
    WHEN u.first_deposit_date::date = CURRENT_DATE - INTERVAL '1 day'
    THEN u.first_time_deposit_amount::float ELSE 0 END
  ), 0)::float AS first_time_deposit_amount,

  -- Repeat depositors
  COUNT(DISTINCT CASE 
    WHEN u.number_of_deposits > 1
      AND u.last_deposit_date::date = CURRENT_DATE - INTERVAL '1 day'
    THEN u.users_id END
  ) AS repeat_depositors,

  -- Total deposits count & amount
  COUNT(CASE 
    WHEN u.last_deposit_date::date = CURRENT_DATE - INTERVAL '1 day'
    THEN 1 END
  ) AS total_deposits,

  COALESCE(SUM(CASE 
    WHEN u.last_deposit_date::date = CURRENT_DATE - INTERVAL '1 day'
    THEN u.total_deposit_amount::float ELSE 0 END
  ), 0)::float AS deposit_amount,

  -- Active clients
  COUNT(DISTINCT CASE 
    WHEN u.last_played_date::date = CURRENT_DATE - INTERVAL '1 day'
    THEN u.users_id END
  ) AS active_clients,

  -- Inactive clients
  (COUNT(DISTINCT u.users_id) -
    COUNT(DISTINCT CASE 
      WHEN u.last_played_date::date = CURRENT_DATE - INTERVAL '1 day'
      THEN u.users_id END)
  ) AS inactive_clients

FROM users u
LEFT JOIN agents a ON a.id = u.agent_id
GROUP BY a.name
ORDER BY a.name
      `;

    const result = await executeQuery(sql);
    return result.rows;
  } catch (error) {
    console.error("Error getting daily agent report:", error);
    throw error;
  }
};
  


export const getusersDao = async (data) => {
  try {
    const [sql, params] = buildSelectQuery("users", data);
      const result = await executeQuery(sql, params);
    return result.rows;
  } catch (error) {
    console.error("Error creating users:", error);
    throw error;
  }
};


export const getUsersByIDDao = async (user_id) => {
  try {
    const sql = "SELECT user_id FROM users WHERE user_id = $1  LIMIT 1";
    const params = [user_id];
    const result = await executeQuery(sql, params);
    return result.rows.length > 0 ? result.rows[0] : null;
  } catch (error) {
    console.error(
      "Error fetching users by usersID with agent_id IS NULL:",
      error
    );
    throw error;
  }
};
  



export const getUserByUserIDDao = async (userId) => {
  try {
    const sql =
      "SELECT user_id FROM users WHERE user_id = $1 AND agent_id IS NULL LIMIT 1";
    const params = [userId];
    const result = await executeQuery(sql, params);
    return result.rows.length > 0 ? result.rows[0] : null;
  } catch (error) {
    console.error(
      "Error fetching user by UserID with agent_id IS NULL:",
      error
    );
    throw error;
  }
};

export const updateUserAgentDao = async (userDbId, agentId) => {
  try {
    const sql = "UPDATE users SET agent_id = $1 WHERE id = $2";
    const params = [agentId, userDbId];
    await executeQuery(sql, params);
    return true;
  } catch (error) {
    console.error("Error updating user's agent_id:", error);
    throw error;
  }
};
    
    