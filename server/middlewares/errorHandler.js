/**
 * Centralized error handler for Express.
 * Catches synchronous errors from route handlers and JSON parse errors.
 */
export function errorHandler(err, req, res, next) {
  console.error('[ProMan error]', err?.message || err);

  if (err?.type === 'entity.parse.failed') {
    return res.status(400).json({
      success: false,
      error: { message: 'Format JSON tidak valid.' }
    });
  }

  const status = err?.status || 500;
  const message =
    process.env.NODE_ENV === 'production'
      ? 'Terjadi kesalahan pada server.'
      : err?.message || 'Terjadi kesalahan pada server.';

  res.status(status).json({
    success: false,
    error: { message, details: process.env.NODE_ENV !== 'production' ? err?.stack : undefined }
  });
}

/**
 * 404 handler for undefined API routes.
 */
export function notFoundHandler(req, res) {
  res.status(404).json({
    success: false,
    error: { message: 'Endpoint tidak ditemukan.' }
  });
}
