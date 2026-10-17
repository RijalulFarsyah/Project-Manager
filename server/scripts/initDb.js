import { initializeDatabase } from '../db.js';
import { seedAdmin } from './seedAdmin.js';

/**
 * Initialize database schema and seed default admin.
 * Safe to call on every server start.
 */
export function initDb() {
  initializeDatabase();
  const result = seedAdmin();
  return result;
}
