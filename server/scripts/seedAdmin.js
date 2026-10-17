import bcrypt from 'bcryptjs';
import { getDb } from '../db.js';

const ADMIN_USERNAME = 'admin';
const ADMIN_PASSWORD = 'admin123';
const BCRYPT_ROUNDS = 10;

/**
 * Seed the default admin user if it does not exist yet.
 * Idempotent: repeated runs do not create duplicates.
 */
export function seedAdmin() {
  const db = getDb();
  const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(ADMIN_USERNAME);
  if (existing) {
    return { seeded: false, reason: 'admin already exists' };
  }

  const passwordHash = bcrypt.hashSync(ADMIN_PASSWORD, BCRYPT_ROUNDS);
  db.prepare('INSERT INTO users (username, password_hash) VALUES (?, ?)').run(
    ADMIN_USERNAME,
    passwordHash
  );
  return { seeded: true, username: ADMIN_USERNAME };
}
