import bcrypt from 'bcryptjs';
import { getDb } from '../db.js';


export function login(req, res) {
  if (req.session && req.session.userId) {
    return res.status(400).json({
      success: false,
      error: { message: 'Anda sudah login. Silakan logout terlebih dahulu.' }
    });
  }

  const body = req.body || {};
  const username = (body.username || '').trim();
  const password = body.password || '';

  if (!username || !password) {
    return res.status(400).json({
      success: false,
      error: { message: 'Username dan password wajib diisi.' }
    });
  }
  if (username.length > 100) {
    return res.status(400).json({
      success: false,
      error: { message: 'Username terlalu panjang.' }
    });
  }

  const db = getDb();
  const user = db.prepare('SELECT id, username, password_hash FROM users WHERE username = ?').get(username);
  if (!user) {
    return res.status(401).json({
      success: false,
      error: { message: 'Username atau password salah.' }
    });
  }

  const valid = bcrypt.compareSync(password, user.password_hash);
  if (!valid) {
    return res.status(401).json({
      success: false,
      error: { message: 'Username atau password salah.' }
    });
  }

  req.session.userId = user.id;
  req.session.username = user.username;

  return res.json({
    success: true,
    data: { username: user.username }
  });
}

export function logout(req, res) {
  const destroy = () => {
    res.clearCookie('proman.sid', {
      path: '/',
      httpOnly: true,
      sameSite: 'lax'
    });
    return res.json({
      success: true,
      data: null,
      message: 'Anda telah logout.'
    });
  };

  if (req.session) {
    req.session.destroy((err) => {
      if (err) {
        console.error('[auth] session destroy error:', err);
      }
      destroy();
    });
    return;
  }

  return destroy();
}

export function me(req, res) {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({
      success: false,
      error: { message: 'Anda belum login.' }
    });
  }
  return res.json({
    success: true,
    data: { id: req.session.userId, username: req.session.username }
  });
}
