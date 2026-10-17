/**
 * Respons API konsisten untuk endpoint ProMan.
 * Format sukses: { success: true, data: ..., message?: ... }
 * Format error:  { success: false, error: { message: ..., details?: ... } }
 */

export function ok(res, data, message) {
  const body = { success: true, data };
  if (message !== undefined) body.message = message;
  return res.json(body);
}

export function created(res, data, message) {
  const body = { success: true, data };
  if (message !== undefined) body.message = message;
  return res.status(201).json(body);
}

export function error(res, status, message, details) {
  const body = { success: false, error: { message } };
  if (details) body.error.details = details;
  return res.status(status).json(body);
}

export function badRequest(res, message, details) {
  return error(res, 400, message, details);
}

export function notFound(res, message) {
  return error(res, 404, message);
}

export function unauthorized(res, message) {
  return error(res, 401, message);
}

export function conflict(res, message, details) {
  return error(res, 409, message, details);
}
