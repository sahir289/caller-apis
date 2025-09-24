import { buildInsertQuery } from "../../utils/db.js";
import { executeQuery } from "../../utils/db.js";
import { buildSelectQuery } from "../../utils/db.js";
import { InternalServerError } from "../../utils/errorHandler.js";
export const createusersDao = async (data) => {
    try {
      const [sql, params] = buildInsertQuery("users", data);
      const result = await executeQuery(sql, params);
      return result.rows[0];

  } catch (error) {
    console.error("Error creating users:", error);
    throw new InternalServerError();
  }
};
  
  

  


export const getusersDao = async (data) => {
  try {
    const [sql, params] = buildSelectQuery("users", data);
      const result = await executeQuery(sql, params);
    return result.rows;
  } catch (error) {
    console.error("Error creating users:", error);
    throw new InternalServerError();
  }
};


export const getUsersByIDDao = async (user_id) => {
  try {
    const sql = "SELECT id, user_id FROM users WHERE user_id = $1 LIMIT 1";
    const params = [user_id];
    const result = await executeQuery(sql, params);
    return result.rows.length > 0 ? result.rows[0] : null;
  } catch (error) {
    console.error(
      "Error fetching users by usersID with agent_id IS NULL:",
      error
    );
    throw new InternalServerError();
  }
};
  



export const getUserByUserIDDao = async (userId) => {
  try {
    const sql =
      "SELECT user_id FROM users WHERE user_id = $1 LIMIT 1";
    const params = [userId];
    const result = await executeQuery(sql, params);
    return result.rows.length > 0 ? result.rows[0] : null;
  } catch (error) {
    console.error(
      "Error fetching user by UserID with agent_id IS NULL:",
      error
    );
    throw new InternalServerError();
  }
};

export const updateUserAgentDao = async (userDbId, agentId) => {
  try {
    const sql = "UPDATE users SET agent_id = $1 WHERE user_id = $2";
      const params = [agentId, userDbId];
    const result = await executeQuery(sql, params);
    return result.rows;
  } catch (error) {
    console.error("Error updating user's agent_id:", error);
    throw new InternalServerError();
  }
};
    
    