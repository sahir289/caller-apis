import { buildInsertQuery } from "../../utils/db.js";
import { executeQuery } from "../../utils/db.js";
import { buildSelectQuery } from "../../utils/db.js";

export const createRecordsDao = async (data) => {
    try {
      const [sql, params] = buildInsertQuery("records", data);
      const result = await executeQuery(sql, params);
      return result.rows[0];

  } catch (error) {
    console.error("Error creating records:", error);
    throw error;
  }
};


export const getRecordsDao = async (data) => {
  try {
    const [sql, params] = buildSelectQuery("records", data);
    const result = await executeQuery(sql, params);
    return result.rows;
  } catch (error) {
    console.error("Error getting records:", error);
    throw error;
  }
};
