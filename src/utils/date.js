const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/**
 * Formats date into Option B: DD-MMM-YYYY (e.g. 01-May-2026, 01-Nov-2026).
 * No time included, purely date.
 */
export const formatOptionBDate = (dateVal) => {
  if (!dateVal) return '';
  try {
    // If string like "2026-11-01" or "2026-11-01T00:00:00.000Z"
    const str = String(dateVal).trim();
    const parts = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (parts) {
      const year = parts[1];
      const monthIdx = parseInt(parts[2], 10) - 1;
      const day = parts[3];
      return `${day}-${MONTHS[monthIdx] || parts[2]}-${year}`;
    }

    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return String(dateVal);
    const day = String(d.getDate()).padStart(2, '0');
    const month = MONTHS[d.getMonth()];
    const year = d.getFullYear();
    return `${day}-${month}-${year}`;
  } catch {
    return String(dateVal);
  }
};

/**
 * Formats tournament date range using Option B.
 * If start and end are identical, outputs single date.
 */
export const formatTournamentDateRange = (startDate, endDate) => {
  if (!startDate) return '';
  const start = formatOptionBDate(startDate);
  if (!endDate) return start;
  const end = formatOptionBDate(endDate);
  if (start === end) return start;
  return `${start} to ${end}`;
};
