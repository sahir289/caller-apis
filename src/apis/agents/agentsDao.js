import { buildInsertQuery, buildSelectQuery } from "../../utils/db.js";
import { executeQuery } from "../../utils/db.js";
import { InternalServerError } from "../../utils/errorHandler.js";
export const createAgentDao = async (data) => {
    try {
    const [sql, params] = buildInsertQuery("agents", data);
    const result = await executeQuery(sql, params);
    return result.rows[0];
  } catch (error) {
    console.error("Error creating Agent:", error);
    throw new InternalServerError();
  }
};



export const getAgentDao = async (agentName) => {
  try {
    const sql = "SELECT * FROM agents WHERE name = $1 LIMIT 1";
    const params = [agentName];
    const result = await executeQuery(sql, params);
    return result.rows.length > 0 ? result.rows[0] : null;
  } catch (error) {
    console.error("Error in getAgentDao:", error);
    throw new InternalServerError();
  }
};
  