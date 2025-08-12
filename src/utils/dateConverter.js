
export function convertToDateOnly(dateString) {
  if (!dateString) return null;

  dateString = dateString.toString().trim().replace(/['"]+/g, "");

  try {
    const patterns = [
      {
        regex: /^(\d{1,2})\/(\d{1,2})\/(\d{4})/,
        handler: (match) => {
          const [_, day, month, year] = match;
          return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
        },
      },
      {
        regex: /^(\d{4})-(\d{2})-(\d{2})/,
        handler: (match) => match[0],
      },
      {
        regex: /^([a-zA-Z]+)\s+(\d{1,2}),?\s+(\d{4})/i,
        handler: (match) => {
          const [_, month, day, year] = match;
          const monthIndex = new Date(`${month} 1, ${year}`).getMonth() + 1;
          return `${year}-${monthIndex
            .toString()
            .padStart(2, "0")}-${day.padStart(2, "0")}`;
        },
      },
      {
        regex: /^(\d{2})-(\d{2})-(\d{4})/,
        handler: (match) => {
          const [_, day, month, year] = match;
          return `${year}-${month}-${day}`;
        },
      },
      {
        regex: /^(\d{1,2}\/\d{1,2}\/\d{4}),?\s+.+/i,
        handler: (match) => {
          const datePart = match[0].split(",")[0].split(" ")[0];
          const [day, month, year] = datePart.split("/");
          return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
        },
      },
    ];

    for (const pattern of patterns) {
      const match = dateString.match(pattern.regex);
      if (match) {
        const date = pattern.handler(match);
        const dateObj = new Date(date);
        if (!isNaN(dateObj.getTime())) {
          return date; 
        }
      }
    }

    const dateObj = new Date(dateString);
    if (!isNaN(dateObj.getTime())) {
      return dateObj.toISOString().split("T")[0];
    }

    console.warn(`Unrecognized date format: ${dateString}`);
    return null;
  } catch (error) {
    console.error(`Error parsing date '${dateString}':`, error);
    return null;
  }
}


