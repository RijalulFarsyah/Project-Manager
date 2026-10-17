const BASE = '/api';

/**
 * Fetch wrapper that reads the ProMan JSON envelope.
 * Throws on HTTP error or API-level error so callers can handle uniformly.
 */
async function request(path, options = {}) {
  const headers = new Headers(options.headers || {});
  if (!headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers,
    credentials: 'include',
  });

  let body;
  try {
    body = await res.json();
  } catch {
    body = { success: false, error: { message: 'Respons tidak terduga.' } };
  }

  // ProMan API returns { success, data? } / { success: false, error: { message } }
  if (!res.ok || body.success === false) {
    const message =
      body?.error?.message ||
      body?.message ||
      (res.ok ? 'Operasi gagal.' : `Permintaan gagal (HTTP ${res.status}).`);
    const err = new Error(message);
    err.status = res.status;
    err.body = body;
    throw err;
  }

  return body;
}

export const api = {
  get: (path) => request(path, { method: 'GET' }),
  post: (path, data) =>
    request(path, { method: 'POST', body: JSON.stringify(data) }),
  put: (path, data) =>
    request(path, { method: 'PUT', body: JSON.stringify(data) }),
  del: (path) => request(path, { method: 'DELETE' }),
};

export default api;
