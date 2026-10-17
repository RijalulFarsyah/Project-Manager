import express from 'express';
import { createServer } from 'http';
import session from 'express-session';
import path from 'path';
import { fileURLToPath } from 'url';
import { getDb, initializeDatabase } from './db.js';
import { initDb } from './scripts/initDb.js';
import authRoutes from './routes/auth.js';
import { requireAuth, attachUser } from './middlewares/auth.js';
import { errorHandler, notFoundHandler } from './middlewares/errorHandler.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = createServer(app);

const PORT = parseInt(process.env.PORT || '3001', 10);
const NODE_ENV = process.env.NODE_ENV || 'development';
const SESSION_SECRET = process.env.SESSION_SECRET || 'change-me-in-production';

// ---------- Session ----------
const sessionOptions = {
  name: 'proman.sid',
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: 'lax',
    secure: false, // PAKSA false untuk development
    maxAge: 24 * 60 * 60 * 1000
  }
  // store: (tidak di-set, gunakan MemoryStore default)
};

if (NODE_ENV === 'production' && process.env.COOKIE_DOMAIN) {
  sessionOptions.cookie.domain = process.env.COOKIE_DOMAIN;
}

app.use(session(sessionOptions));

// ---------- Body / CORS ----------
app.use((req, res, next) => {
  const origin = process.env.CLIENT_URL || 'http://localhost:5173';
  res.header('Access-Control-Allow-Origin', origin);
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: false }));

// ---------- Attachments ----------
app.use(attachUser);

// ---------- API routes ----------
app.use('/api/auth', authRoutes);

// Projects (dan seluruh sub-resource yang tertanam di dalamnya)
// Di bagian atas (setelah import projectRoutes):
import projectRoutes from './routes/projectRoutes.js';
import taskRoutes from './routes/taskRoutes.js';

// Di bagian route mounting:
app.use('/api/projects', projectRoutes);
app.use('/api/tasks', taskRoutes);

// Health
app.get('/api/health', (req, res) => {
  res.json({ success: true, data: { status: 'ok', env: NODE_ENV } });
});

// ---------- Error handling ----------
app.use(notFoundHandler);
app.use(errorHandler);

// ---------- Start ----------
async function start() {
  try {
    initializeDatabase();
    const seedResult = initDb();
    console.log('[ProMan] Database initialized. Seed:', JSON.stringify(seedResult));

    // Verify table existence
    const db = getDb();
    const tables = db
      .prepare(
        "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
      )
      .all()
      .map((r) => r.name);
    console.log('[ProMan] Tables:', tables.join(', '));

    server.listen(PORT, () => {
      console.log(`[ProMan] Backend listening on http://localhost:${PORT}`);
      console.log(`[ProMan] Environment: ${NODE_ENV}`);
    });
  } catch (err) {
    console.error('[ProMan] Failed to start:', err);
    process.exit(1);
  }
}

start();

export default app;
