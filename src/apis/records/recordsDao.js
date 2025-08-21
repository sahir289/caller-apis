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


export const getRecordsDao = async (filter) => {
  try {
    const { page = 1, size = 10 } = filter; // default page=1, size=10
    const offset = (page - 1) * size;

    // Main query with pagination
    const sql = `
        SELECT 
          r.id,
          r.file,
          r.config,
          r.created_at,
          r.updated_at,
          l.user_name AS uploaded_by,
          CASE 
            WHEN r.company_id IS NULL THEN 'agents/users'
            ELSE (
              SELECT c.name 
              FROM companies c 
              WHERE c.id = r.company_id
            )
          END AS company_name
        FROM records r
        JOIN login l ON r.login_user_id = l.id
        ORDER BY r.created_at DESC
        LIMIT $1 OFFSET $2
      `;

    const rows = await executeQuery(sql, [size, offset]);

    // Get total count
    const countSql = `SELECT COUNT(*) AS total_count FROM records`;
    const countResult = await executeQuery(countSql);
    const totalCount = parseInt(countResult.rows[0].total_count, 10);

    return {
      data: rows.rows,
      totalCount,
    };
  } catch (error) {
    console.error("Error getting records:", error);
    throw error;
  }
};
