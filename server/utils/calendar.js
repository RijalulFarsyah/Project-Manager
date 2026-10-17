/**
 * Work calendar utility for ProMan.
 * Single source of truth for working-day calculations.
 * Used by both backend services and frontend display.
 */

/**
 * Check whether a given day-of-week index (0=Sun..6=Sat per JS Date) is a working day
 * based on the project's work_calendar weekday flags.
 *
 * @param {Object} calendar - work_calendar row
 * @param {number} jsDow - Date.getDay() value (0=Sun, 6=Sat)
 * @returns {boolean}
 */
export function isWorkingDayByWeekday(calendar, jsDow) {
  if (!calendar) return false;
  // map JS getDay() -> our weekday index (Mon=1 .. Sun=7)
  const weekdayIndex = ((jsDow + 6) % 7) + 1; // Mon->1 ... Sun->7
  const flagKey = 'is_working_day_' + weekdayIndex;
  if (flagKey in calendar) {
    return !!calendar[flagKey];
  }
  return false;
}

/**
 * Check whether a specific calendar date is a working day.
 * Respects weekly working-day flags and custom holidays.
 *
 * @param {Object} calendar - work_calendar row
 * @param {string} dateStr - ISO date 'YYYY-MM-DD'
 * @param {Array<Object>} holidays - list of holiday rows { date, description }
 * @returns {boolean}
 */
export function isWorkingDate(calendar, dateStr, holidays = []) {
  const d = new Date(dateStr + 'T00:00:00');
  if (isNaN(d.getTime())) return false;
  if (!isWorkingDayByWeekday(calendar, d.getDay())) return false;
  for (const h of holidays) {
    if (h.date === dateStr) return false;
  }
  return true;
}

/**
 * Add a number of working days to a starting date, skipping non-working days.
 * If start date is not a working day, the first working day on or after start is used.
 *
 * @param {Object} calendar - work_calendar row
 * @param {string} startStr - ISO date 'YYYY-MM-DD'
 * @param {number} workingDays - number of working days to add (>=0)
 * @param {Array<Object>} holidays - list of holiday rows
 * @returns {{ startDate: string, endDate: string, workingDays: number }}
 */
export function addWorkingDays(calendar, startStr, workingDays, holidays = []) {
  let cursor = new Date(startStr + 'T00:00:00');
  if (isNaN(cursor.getTime())) {
    cursor = new Date();
  }

  // advance to first working day on or after start
  while (!isWorkingDate(calendar, formatDateYMD(cursor), holidays)) {
    cursor.setDate(cursor.getDate() + 1);
  }

  let count = 0;
  const startDate = formatDateYMD(cursor);
  while (count < workingDays) {
    cursor.setDate(cursor.getDate() + 1);
    if (isWorkingDate(calendar, formatDateYMD(cursor), holidays)) {
      count += 1;
    }
  }
  const endDate = formatDateYMD(cursor);
  return { startDate, endDate, workingDays: count };
}

/**
 * Count working days between two dates (inclusive of start, exclusive of end behavior
 * consistent with duration = number of working days task occupies).
 * Returns number of working days from startDate (first working day on/after) up to but
 * not including endDate if endDate is the "finish boundary".
 *
 * For CPM we use index-based math; this is for display estimation only.
 *
 * @param {Object} calendar
 * @param {string} startStr
 * @param {string} endStr - exclusive end boundary
 * @param {Array<Object>} holidays
 * @returns {number}
 */
export function countWorkingDaysBetween(calendar, startStr, endStr, holidays = []) {
  const start = new Date(startStr + 'T00:00:00');
  const end = new Date(endStr + 'T00:00:00');
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return 0;
  if (end <= start) return 0;

  // advance start to first working day
  let cur = new Date(start);
  while (!isWorkingDate(calendar, formatDateYMD(cur), holidays)) {
    cur.setDate(cur.getDate() + 1);
  }

  let count = 0;
  while (cur < end) {
    if (isWorkingDate(calendar, formatDateYMD(cur), holidays)) {
      count += 1;
    }
    cur.setDate(cur.getDate() + 1);
  }
  return count;
}

/**
 * Find the next working day on or after a given date.
 *
 * @param {Object} calendar
 * @param {string} dateStr
 * @param {Array<Object>} holidays
 * @returns {string}
 */
export function nextWorkingDay(calendar, dateStr, holidays = []) {
  let cur = new Date(dateStr + 'T00:00:00');
  if (isNaN(cur.getTime())) cur = new Date();
  while (!isWorkingDate(calendar, formatDateYMD(cur), holidays)) {
    cur.setDate(cur.getDate() + 1);
  }
  return formatDateYMD(cur);
}

/**
 * Format a Date to 'YYYY-MM-DD' in local time components (no timezone shift issues
 * for date-only values created via new Date('YYYY-MM-DD')).
 *
 * @param {Date} d
 * @returns {string}
 */
export function formatDateYMD(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Parse 'YYYY-MM-DD' to a Date at midnight local time.
 *
 * @param {string} dateStr
 * @returns {Date}
 */
export function parseYMD(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  if (isNaN(d.getTime())) return null;
  return d;
}
