import { buildInsertQuery } from "../../utils/db.js";
import { executeQuery } from "../../utils/db.js";
import { buildSelectQuery } from "../../utils/db.js";

export const createUsersDao = async (data) => {
  try {
    const keys = Object.keys(data);
    const columns = keys.join(", ");
    const placeholders = keys.map((_, i) => `$${i + 1}`).join(", ");
    const values = keys.map((key) => data[key]);

    const numericFields = [
      "first_time_deposit_amount",
      "number_of_deposits",
      "total_deposit_amount",
      "total_winning_amount",
      "total_withdrawal_amount",
      "available_points",
    ];

    const updates = keys
      .filter((k) => k !== "user_id")
      .map((key) => {
        if (numericFields.includes(key)) {
          return `${key} = users.${key} + EXCLUDED.${key}`;
        } else {
          return `${key} = EXCLUDED.${key}`;
        }
      })
      .join(", ");

    const sql = `
        INSERT INTO users (${columns}) 
        VALUES (${placeholders}) 
        ON CONFLICT (user_id) DO UPDATE SET 
          ${updates}
        RETURNING *;
      `;

    const result = await executeQuery(sql, values);
    return result.rows[0];
  } catch (error) {
    console.error("Error creating/updating users:", error);
    throw error;
  }
};
  
  


export const getUsersDao = async (data) => {
  try {
    const [sql, params] = buildSelectQuery("users", data);
    const result = await executeQuery(sql, params);
    return result.rows[0];
  } catch (error) {
    console.error("Error creating users:", error);
    throw error;
  }
};