import { buildInsertQuery, buildSelectQuery } from "../../utils/db.js";
import { executeQuery } from "../../utils/db.js";

export const createAgentDao = async (data) => {
    try {
    const [sql, params] = buildInsertQuery("agents", data);
    const result = await executeQuery(sql, params);
    return result.rows[0];
  } catch (error) {
    console.error("Error creating Agent:", error);
    throw error;
  }
};



export const getAgentDao = async (data) => {
  try {
    const [sql, params] = buildSelectQuery("agents", data);
    const result = await executeQuery(sql, params);
    return result.rows[0];
  } catch (error) {
    console.error("Error creating users:", error);
    throw error;
  }
};