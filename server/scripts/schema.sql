-- ProMan database schema
-- Idempotent: safe to run on every server start

-- Projects
CREATE TABLE IF NOT EXISTS projects (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  organization TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  start_date TEXT NOT NULL,
  end_date TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);

CREATE INDEX IF NOT EXISTS idx_projects_start_date ON projects(start_date);

-- Work calendar (one per project)
CREATE TABLE IF NOT EXISTS work_calendar (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL UNIQUE,
  is_working_day_mon INTEGER NOT NULL DEFAULT 1,
  is_working_day_tue INTEGER NOT NULL DEFAULT 1,
  is_working_day_wed INTEGER NOT NULL DEFAULT 1,
  is_working_day_thu INTEGER NOT NULL DEFAULT 1,
  is_working_day_fri INTEGER NOT NULL DEFAULT 1,
  is_working_day_sat INTEGER NOT NULL DEFAULT 0,
  is_working_day_sun INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

-- Custom holidays (unique per project + date)
CREATE TABLE IF NOT EXISTS holidays (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL,
  date TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  UNIQUE(project_id, date)
);

CREATE INDEX IF NOT EXISTS idx_holidays_project ON holidays(project_id);

-- Tasks (main tasks + subtasks via parent_task_id)
CREATE TABLE IF NOT EXISTS tasks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL,
  parent_task_id INTEGER,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  start_date TEXT NOT NULL,
  duration INTEGER NOT NULL DEFAULT 1,
  priority TEXT NOT NULL DEFAULT 'Medium',
  progress INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'Belum Mulai',
  created_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  FOREIGN KEY (parent_task_id) REFERENCES tasks(id) ON DELETE RESTRICT,
  CHECK (duration >= 1),
  CHECK (progress >= 0 AND progress <= 100),
  CHECK (priority IN ('Low','Medium','High')),
  CHECK (status IN ('Belum Mulai','Berjalan','Selesai'))
);

CREATE INDEX IF NOT EXISTS idx_tasks_project ON tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_parent ON tasks(parent_task_id);

-- Dependencies
CREATE TABLE IF NOT EXISTS dependencies (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL,
  predecessor_id INTEGER NOT NULL,
  successor_id INTEGER NOT NULL,
  type TEXT NOT NULL DEFAULT 'FS',
  lag INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  FOREIGN KEY (predecessor_id) REFERENCES tasks(id) ON DELETE CASCADE,
  FOREIGN KEY (successor_id) REFERENCES tasks(id) ON DELETE CASCADE,
  CHECK (predecessor_id != successor_id),
  CHECK (type IN ('FS','SS')),
  CHECK (lag >= 0)
);

CREATE INDEX IF NOT EXISTS idx_dependencies_project ON dependencies(project_id);
CREATE INDEX IF NOT EXISTS idx_dependencies_pred ON dependencies(predecessor_id);
CREATE INDEX IF NOT EXISTS idx_dependencies_succ ON dependencies(successor_id);

-- Team members
CREATE TABLE IF NOT EXISTS team_members (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL DEFAULT '',
  role TEXT NOT NULL DEFAULT '',
  daily_rate INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  UNIQUE(project_id, email)
);

CREATE INDEX IF NOT EXISTS idx_team_project ON team_members(project_id);

-- Leaves
CREATE TABLE IF NOT EXISTS leaves (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  member_id INTEGER NOT NULL,
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL,
  reason TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
  FOREIGN KEY (member_id) REFERENCES team_members(id) ON DELETE CASCADE,
  CHECK (end_date >= start_date)
);

CREATE INDEX IF NOT EXISTS idx_leaves_member ON leaves(member_id);

-- Assignments (many-to-many tasks <-> team_members)
CREATE TABLE IF NOT EXISTS assignments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  task_id INTEGER NOT NULL,
  member_id INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
  FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
  FOREIGN KEY (member_id) REFERENCES team_members(id) ON DELETE CASCADE,
  UNIQUE(task_id, member_id)
);

CREATE INDEX IF NOT EXISTS idx_assignments_task ON assignments(task_id);
CREATE INDEX IF NOT EXISTS idx_assignments_member ON assignments(member_id);

-- Users (authentication)
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);
