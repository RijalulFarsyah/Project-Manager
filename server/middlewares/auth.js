/**
 * Authentication middleware for protected API routes.
 * Requires an active session (req.session.userId).
 */
export function requireAuth(req, res, next) {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({
      success: false,
      error: { message: 'Anda harus login terlebih dahulu.' }
    });
  }
  next();
}

/**
 * Attach the current user info to the request for internal use.
 */
export function attachUser(req, res, next) {
  if (req.session && req.session.userId) {
    req.currentUser = { id: req.session.userId, username: req.session.username };
  }
  next();
}
