/**
 * Build a consistent JSON response envelope.
 */
export function jsonResponse(res, status, data, message) {
  const body = { success: true, data };
  if (message !== undefined) body.message = message;
  return res.status(status).json(body);
}

/**
 * Build a consistent error response envelope.
 */
export function jsonError(res, status, message, details) {
  const body = { success: false, error: { message } };
  if (details) body.error.details = details;
  return res.status(status).json(body);
}

/**
 * Validate an ISO date string 'YYYY-MM-DD'.
 */
export function isValidDateYMD(dateStr) {
  if (typeof dateStr !== 'string') return false;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return false;
  const d = new Date(dateStr + 'T00:00:00');
  if (isNaN(d.getTime())) return false;
  const parts = dateStr.split('-');
  return (
    Number(parts[0]) === d.getFullYear() &&
    Number(parts[1]) === d.getMonth() + 1 &&
    Number(parts[2]) === d.getDate()
  );
}

/**
 * Simple string sanitizer: trim and strip control characters.
 */
export function sanitizeString(value, maxLength = 500) {
  if (typeof value !== 'string') return '';
  const trimmed = value.trim().slice(0, maxLength);
  return trimmed.replace(/[\x00-\x1f\x7f]/g, '');
}

/**
 * Returns true if value is null, undefined, or blank whitespace.
 */
export function isBlank(value) {
  if (value === null || value === undefined) return true;
  if (typeof value === 'string') return value.trim() === '';
  return false;
}
