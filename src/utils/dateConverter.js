export function convertToDateOnly(dateString) {
  if (!dateString) return null;

  dateString = dateString.toString().trim().replace(/['"]+/g, "");

  try {
    const patterns = [
      // Matches: 31/7/2024, 11:44:13 pm
      {
        regex:
          /^(\d{1,2})\/(\d{1,2})\/(\d{4}),?\s+(\d{1,2}):(\d{2}):(\d{2})\s*(am|pm)?/i,
        handler: (match) => {
          let [_, day, month, year, hour, minute, second, ampm] = match;
          hour = parseInt(hour, 10).toString();
          if (ampm) {
            let h = parseInt(hour, 10);
            if (ampm.toLowerCase() === "pm" && h < 12) h += 12;
            if (ampm.toLowerCase() === "am" && h === 12) h = 0;
            hour = h.toString();
          }
          return `${year}-${month.padStart(2, "0")}-${day.padStart(
            2,
            "0"
          )} ${hour.padStart(2, "0")}:${minute}:${second}`;
        },
      },

      // Matches: 31/12/2023 13:31:49  (24-hour format)
      {
        regex: /^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{2}):(\d{2}):(\d{2})/,
        handler: (match) => {
          const [_, day, month, year, hour, minute, second] = match;
          return `${year}-${month.padStart(2, "0")}-${day.padStart(
            2,
            "0"
          )} ${hour}:${minute}:${second}`;
        },
      },

      // Matches ISO-like date (YYYY-MM-DD or YYYY-MM-DDTHH:mm:ss)
      {
        regex: /^(\d{4})-(\d{2})-(\d{2})([ T](\d{2}):(\d{2}):(\d{2}))?/,
        handler: (match) => {
          const [
            _,
            year,
            month,
            day,
            ,
            hour = "00",
            minute = "00",
            second = "00",
          ] = match;
          return `${year}-${month}-${day} ${hour}:${minute}:${second}`;
        },
      },

      // Matches: July 31, 2024 13:31:49
      {
        regex:
          /^([a-zA-Z]+)\s+(\d{1,2}),?\s+(\d{4})(\s+(\d{2}):(\d{2}):(\d{2}))?/i,
        handler: (match) => {
          const [
            _,
            month,
            day,
            year,
            ,
            hour = "00",
            minute = "00",
            second = "00",
          ] = match;
          const monthIndex = new Date(`${month} 1, ${year}`).getMonth() + 1;
          return `${year}-${monthIndex
            .toString()
            .padStart(2, "0")}-${day.padStart(
            2,
            "0"
          )} ${hour}:${minute}:${second}`;
        },
      },
    ];

    for (const pattern of patterns) {
      const match = dateString.match(pattern.regex);
      if (match) {
        const dateTime = pattern.handler(match);
        const dateObj = new Date(dateTime.replace(" ", "T")); 
        if (!isNaN(dateObj.getTime())) {
          return dateTime;
        }
      }
    }

    // Fallback to native Date()
    const dateObj = new Date(dateString);
    if (!isNaN(dateObj.getTime())) {
      const yyyy = dateObj.getFullYear();
      const mm = String(dateObj.getMonth() + 1).padStart(2, "0");
      const dd = String(dateObj.getDate()).padStart(2, "0");
      const hh = String(dateObj.getHours()).padStart(2, "0");
      const mi = String(dateObj.getMinutes()).padStart(2, "0");
      const ss = String(dateObj.getSeconds()).padStart(2, "0");
      return `${yyyy}-${mm}-${dd} ${hh}:${mi}:${ss}`;
    }

    console.warn(`Unrecognized date format: ${dateString}`);
    return null;
  } catch (error) {
    console.error(`Error parsing date '${dateString}':`, error);
    return null;
  }
}
