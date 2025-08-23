import { buildInsertQuery } from "../../utils/db.js";
import { executeQuery } from "../../utils/db.js";
import { buildSelectQuery } from "../../utils/db.js";
import { InternalServerError } from "../../utils/errorHandler.js";


export const createCompanyDao = async (data) => {
    try {
    const [sql, params] = buildInsertQuery("companies", data);
    const result = await executeQuery(sql, params);
    return result.rows[0];
  } catch (error) {
    console.error("Error creating Company:", error);
    throw new InternalServerError();
  }
};


export const getCompanyDao = async (data) => {
  try {
    const [sql, params] = buildSelectQuery("companies", data);
    const result = await executeQuery(sql, params);
    return result.rows[0];
  } catch (error) {
    console.error("Error creating Company:", error);
    throw new InternalServerError();
  }
};