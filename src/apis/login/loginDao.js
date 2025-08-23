import { buildInsertQuery } from "../../utils/db.js";
import { executeQuery } from "../../utils/db.js";
import { buildSelectQuery } from "../../utils/db.js";
import { InternalServerError } from "../../utils/errorHandler.js";
export const createLoginUserDao = async (data) => {
    try {
      const [sql, params] = buildInsertQuery("login", data);
      const result = await executeQuery(sql, params);
      return result.rows[0];

  } catch (error) {
    console.error("Error creating login user", error);
    throw new InternalServerError();
  }
};


export const getLoginUserDao = async (data) => {
  try {
    const [sql, params] = buildSelectQuery("login", data);
    const result = await executeQuery(sql, params);
    return result.rows[0];
  } catch (error) {
    console.error("Error creating login user", error);
    throw new InternalServerError();
  }
};

export const getLoginByUserName= async (data) => {
  try {
    const [sql, params] = buildSelectQuery("login", data);
    const result = await executeQuery(sql, params);
    return result.rows[0];
  } catch (error) {
    console.error("Error creating login user", error);
    throw new InternalServerError();
  }
};