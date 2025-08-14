import fsPromises from "fs/promises";
import Papa from "papaparse";


const MAX_IDS_PER_COLUMN = 500;

function splitIdsByCount(
  ids,
  maxPerCol= MAX_IDS_PER_COLUMN
) {
  const columns = [];
  for (let i = 0; i < ids.length; i += maxPerCol) {
    columns.push(ids.slice(i, i + maxPerCol).join(","));
  }
  return columns;
}

export async function generateCSV(reports, reportType, date) {
  const filePath = `./${reportType}_report_${date.replace(/\//g, "-")}.csv`;

  const csvData = reports.map((r) => {
    const activeIds = Array.isArray(r.active_client_ids)
      ? r.active_client_ids.filter((id) => id !== null && id !== undefined)
      : [];
    const inactiveIds = Array.isArray(r.inactive_client_ids)
      ? r.inactive_client_ids.filter((id) => id !== null && id !== undefined)
      : [];

    const activeColumns = splitIdsByCount(activeIds);
    const inactiveColumns = splitIdsByCount(inactiveIds);

    const row = {
      agent: r.agent_name,
      total_clients:
        Number(r.active_clients_count || 0) +
        Number(r.inactive_clients_count || 0),
      active_count: Number(r.active_clients_count || 0),
      inactive_count: Number(r.inactive_clients_count || 0),
    };

    activeColumns.forEach((val, i) => {
      row[`active_clients_${i + 1}`] = val;
    });

    inactiveColumns.forEach((val, i) => {
      row[`inactive_clients_${i + 1}`] = val;
    });

    return row;
  });

  const headersSet = new Set();
  csvData.forEach((row) => Object.keys(row).forEach((k) => headersSet.add(k)));
  const headers = Array.from(headersSet);

  const csvString = Papa.unparse(csvData, { header: true, columns: headers });

  await fsPromises.writeFile(filePath, csvString, "utf-8");
  console.log(`Generated CSV: ${filePath}`);
  return filePath;
}
