import { getDb } from '../db.js';
import { isBlank } from '../utils/helpers.js';

const DB = () => getDb();

export function getAllProjects() {
  const db = DB();
  return db
    .prepare(
      `SELECT p.*,
              wc.is_working_day_mon, wc.is_working_day_tue, wc.is_working_day_wed,
              wc.is_working_day_thu, wc.is_working_day_fri, wc.is_working_day_sat,
              wc.is_working_day_sun,
              (SELECT COUNT(*) FROM tasks t WHERE t.project_id = p.id) AS task_count,
              (SELECT COUNT(*) FROM team_members tm WHERE tm.project_id = p.id) AS member_count
       FROM projects p
       LEFT JOIN work_calendar wc ON wc.project_id = p.id
       ORDER BY p.created_at DESC`
    )
    .all();
}

export function getProjectById(id) {
  const db = DB();
  const project = db
    .prepare(
      `SELECT p.*,
              wc.is_working_day_mon, wc.is_working_day_tue, wc.is_working_day_wed,
              wc.is_working_day_thu, wc.is_working_day_fri, wc.is_working_day_sat,
              wc.is_working_day_sun
       FROM projects p
       LEFT JOIN work_calendar wc ON wc.project_id = p.id
       WHERE p.id = ?`
    )
    .get(id);
  if (!project) return null;

  const holidays = getHolidaysForProject(id);
  const tasks = getTasksForProject(id);
  const members = getTeamMembersForProject(id);
  const dependencies = getDependenciesForProject(id);
  const assignments = getAssignmentsForProject(id);
  const leaves = getLeavesForProject(id);

  return {
    ...project,
    holidays,
    tasks,
    team_members: members,
    dependencies,
    assignments,
    leaves,
  };
}

export function createProject({ name, organization, description, start_date }) {
  const db = DB();
  const calendarInsert = db.prepare(
    `INSERT INTO work_calendar (project_id, is_working_day_mon, is_working_day_tue,
     is_working_day_wed, is_working_day_thu, is_working_day_fri,
     is_working_day_sat, is_working_day_sun)
     VALUES (?, 1, 1, 1, 1, 1, 0, 0)`
  );

  const insert = db.prepare(
    `INSERT INTO projects (name, organization, description, start_date)
     VALUES (?, ?, ?, ?)`
  );

  const runWithinTransaction = db.transaction(() => {
    const info = insert.run(name, organization || '', description || '', start_date);
    const projectId = info.lastInsertRowid;
    calendarInsert.run(projectId);
    return getProjectById(projectId);
  });

  return runWithinTransaction();
}

export function updateProject(id, fields) {
  const db = DB();
  const existing = getProjectById(id);
  if (!existing) return null;

  const { name, organization, description, start_date, end_date } = fields;
  const setClauses = [];
  const values = [];

  if (!isBlank(name)) { setClauses.push('name = ?'); values.push(name); }
  if (!isBlank(organization)) { setClauses.push('organization = ?'); values.push(organization); }
  if (!isBlank(description)) { setClauses.push('description = ?'); values.push(description); }
  if (start_date !== undefined && start_date !== null && String(start_date).trim() !== '') {
    setClauses.push('start_date = ?'); values.push(start_date);
  }
  if (end_date !== undefined && end_date !== null && String(end_date).trim() !== '') {
    setClauses.push('end_date = ?'); values.push(end_date);
  }

  if (setClauses.length === 0) return existing;

  values.push(id);
  const sql = `UPDATE projects SET ${setClauses.join(', ')} WHERE id = ?`;
  db.prepare(sql).run(...values);

  return getProjectById(id);
}

export function deleteProject(id) {
  const db = DB();
  const affected = db.prepare('DELETE FROM projects WHERE id = ?').run(id);
  return affected.changes > 0;
}

// ---- Work Calendar ----

export function getCalendarForProject(projectId) {
  const db = DB();
  const calendar = db
    .prepare('SELECT * FROM work_calendar WHERE project_id = ?')
    .get(projectId);
  if (!calendar) return null;
  return calendar;
}

export function upsertCalendar(projectId, data) {
  const db = DB();
  const existing = getCalendarForProject(projectId);
  const fields = [
    'is_working_day_mon',
    'is_working_day_tue',
    'is_working_day_wed',
    'is_working_day_thu',
    'is_working_day_fri',
    'is_working_day_sat',
    'is_working_day_sun',
  ];
  
  // Build set clauses only for fields that are explicitly provided
  const setClauses = [];
  const values = [];
  
  for (const f of fields) {
    // Only include field if it was sent in the request body
    if (data[f] !== undefined && data[f] !== null) {
      setClauses.push(`${f} = ?`);
      values.push(data[f] ? 1 : 0);
    }
  }
  
  if (setClauses.length === 0) {
    // No fields to update, return existing calendar as-is
    return existing;
  }

  if (existing) {
    // Append project_id for WHERE clause
    values.push(projectId);
    db.prepare(`UPDATE work_calendar SET ${setClauses.join(', ')} WHERE project_id = ?`).run(...values);
  } else {
    // When creating a new calendar, use defaults for any unspecified fields
    const insertValues = [projectId];
    for (const f of fields) {
      insertValues.push(data[f] !== undefined ? (data[f] ? 1 : 0) : 0);
    }
    db.prepare(
      `INSERT INTO work_calendar (project_id, ${fields.join(', ')}) VALUES (${fields.map(() => '?').join(', ')})`
    ).run(...insertValues);
  }

  return getCalendarForProject(projectId);
}

// ---- Holidays ----

export function getHolidaysForProject(projectId) {
  const db = DB();
  return db
    .prepare('SELECT * FROM holidays WHERE project_id = ? ORDER BY date ASC')
    .all(projectId);
}

export function getHolidayById(holidayId) {
  const db = DB();
  return db.prepare('SELECT * FROM holidays WHERE id = ?').get(holidayId);
}

export function addHoliday(projectId, { date, description }) {
  const db = DB();
  try {
    const info = db
      .prepare('INSERT INTO holidays (project_id, date, description) VALUES (?, ?, ?)')
      .run(projectId, date, description || '');
    return db.prepare('SELECT * FROM holidays WHERE id = ?').get(info.lastInsertRowid);
  } catch (err) {
    if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      const existing = db
        .prepare('SELECT * FROM holidays WHERE project_id = ? AND date = ?')
        .get(projectId, date);
      return { conflict: true, existing };
    }
    throw err;
  }
}

export function updateHoliday(holidayId, { date, description }) {
  const db = DB();
  const existing = getHolidayById(holidayId);
  if (!existing) return null;

  const setClauses = [];
  const values = [];
  if (date !== undefined && date !== null && String(date).trim() !== '') {
    setClauses.push('date = ?');
    values.push(date);
  }
  if (!isBlank(description)) {
    setClauses.push('description = ?');
    values.push(description);
  }

  if (setClauses.length === 0) return existing;

  values.push(holidayId);
  db.prepare(`UPDATE holidays SET ${setClauses.join(', ')} WHERE id = ?`).run(...values);

  const updated = db.prepare('SELECT * FROM holidays WHERE id = ?').get(holidayId);

  // If date changed, check uniqueness again
  if (date !== undefined && date !== null && String(date).trim() !== '') {
    const conflict = db
      .prepare('SELECT * FROM holidays WHERE project_id = ? AND date = ? AND id != ?')
      .get(existing.project_id, date, holidayId);
    if (conflict) {
      return { conflict: true, existing: conflict };
    }
  }

  return updated;
}

export function deleteHoliday(holidayId) {
  const db = DB();
  const affected = db.prepare('DELETE FROM holidays WHERE id = ?').run(holidayId);
  return affected.changes > 0;
}

// ---- Reusable task/member/leaves fetchers ----

export function getTasksForProject(projectId) {
  const db = DB();
  return db
    .prepare('SELECT * FROM tasks WHERE project_id = ? ORDER BY created_at ASC')
    .all(projectId);
}

export function getTaskById(taskId) {
  const db = DB();
  return db.prepare('SELECT * FROM tasks WHERE id = ?').get(taskId);
}

export function getTeamMembersForProject(projectId) {
  const db = DB();
  return db
    .prepare('SELECT * FROM team_members WHERE project_id = ? ORDER BY created_at ASC')
    .all(projectId);
}

export function getTeamMemberById(memberId) {
  const db = DB();
  return db.prepare('SELECT * FROM team_members WHERE id = ?').get(memberId);
}

export function getLeavesForProject(projectId) {
  const db = DB();
  const members = db
    .prepare('SELECT id FROM team_members WHERE project_id = ?')
    .all(projectId)
    .map((m) => m.id);
  if (members.length === 0) return [];
  const placeholders = members.map(() => '?').join(',');
  return db
    .prepare(
      `SELECT l.*, tm.name AS member_name FROM leaves l
       JOIN team_members tm ON tm.id = l.member_id
       WHERE tm.project_id = ? ORDER BY l.start_date ASC`
    )
    .all(projectId);
}

export function getLeavesForMember(memberId) {
  const db = DB();
  return db
    .prepare(
      `SELECT l.*, tm.name AS member_name FROM leaves l
       JOIN team_members tm ON tm.id = l.member_id
       WHERE l.member_id = ? ORDER BY l.start_date ASC`
    )
    .all(memberId);
}

export function getDependenciesForProject(projectId) {
  const db = DB();
  const rows = db
    .prepare(
      `SELECT d.*,
              pred.name AS predecessor_name, pred.start_date AS predecessor_start,
              succ.name AS successor_name, succ.start_date AS successor_start
       FROM dependencies d
       JOIN tasks pred ON pred.id = d.predecessor_id
       JOIN tasks succ ON succ.id = d.successor_id
       WHERE d.project_id = ?
       ORDER BY d.created_at ASC`
    )
    .all(projectId);
  return rows;
}

export function getDependencyById(depId) {
  const db = DB();
  const d = db.prepare('SELECT * FROM dependencies WHERE id = ?').get(depId);
  if (!d) return null;
  const pred = db.prepare('SELECT * FROM tasks WHERE id = ?').get(d.predecessor_id);
  const succ = db.prepare('SELECT * FROM tasks WHERE id = ?').get(d.successor_id);
  return { ...d, predecessor: pred, successor: succ };
}

export function getAssignmentsForProject(projectId) {
  const db = DB();
  const rows = db
    .prepare(
      `SELECT a.*, t.name AS task_name, t.project_id AS task_project_id,
              tm.name AS member_name, tm.email AS member_email
       FROM assignments a
       JOIN tasks t ON t.id = a.task_id
       JOIN team_members tm ON tm.id = a.member_id
       WHERE t.project_id = ?
       ORDER BY t.id, tm.id`
    )
    .all(projectId);
  return rows;
}

export function getAssignmentsForTask(taskId) {
  const db = DB();
  return db
    .prepare(
      `SELECT a.*, t.name AS task_name,
              tm.name AS member_name, tm.email AS member_email, tm.role AS member_role
       FROM assignments a
       JOIN tasks t ON t.id = a.task_id
       JOIN team_members tm ON tm.id = a.member_id
       WHERE a.task_id = ?
       ORDER BY tm.id`
    )
    .all(taskId);
}

export function getAssignmentsForMember(memberId) {
  const db = DB();
  return db
    .prepare(
      `SELECT a.*, t.name AS task_name, t.project_id AS task_project_id,
              p.name AS project_name
       FROM assignments a
       JOIN tasks t ON t.id = a.task_id
       JOIN projects p ON p.id = t.project_id
       WHERE a.member_id = ?
       ORDER BY t.id`
    )
    .all(memberId);
}

export function getWorkloadForProject(projectId) {
  const db = DB();
  const members = db
    .prepare('SELECT * FROM team_members WHERE project_id = ?')
    .all(projectId);
  const result = [];
  for (const m of members) {
    const tasks = db
      .prepare(
        `SELECT a.task_id, t.name, t.status, t.start_date, t.duration, t.priority,
                GROUP_CONCAT(DISTINCT tm.name) AS other_members
         FROM assignments a
         JOIN tasks t ON t.id = a.task_id
         JOIN assignments a2 ON a2.task_id = a.task_id
         JOIN team_members tm ON tm.id = a2.member_id
         WHERE a.member_id = ? AND t.project_id = ?
         GROUP BY a.task_id, t.name, t.status, t.start_date, t.duration, t.priority
         ORDER BY t.start_date`
      )
      .all(m.id, projectId);

    const activeCount = tasks.filter(
      (t) => t.status === 'Belum Mulai' || t.status === 'Berjalan'
    ).length;

    result.push({
      member: {
        id: m.id,
        name: m.name,
        email: m.email,
        role: m.role,
      },
      active_task_count: activeCount,
      tasks,
    });
  }
  return result;
}

export function addTask(projectId, data) {
  const db = DB();
  const info = db
    .prepare(
      `INSERT INTO tasks (project_id, name, description, start_date, duration,
        priority, progress, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      projectId,
      data.name,
      data.description || '',
      data.start_date,
      data.duration,
      data.priority || 'Medium',
      data.progress ?? 0,
      computeStatusFromProgress(data.progress ?? 0)
    );
  return db.prepare('SELECT * FROM tasks WHERE id = ?').get(info.lastInsertRowid);
}

export function addSubtask(parentTaskId, projectId, data) {
  const db = DB();
  const parent = getTaskById(parentTaskId);
  if (!parent) return null;
  if (parent.project_id !== projectId) return null;

  const info = db
    .prepare(
      `INSERT INTO tasks (project_id, parent_task_id, name, description, start_date,
        duration, priority, progress, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      projectId,
      parentTaskId,
      data.name,
      data.description || '',
      data.start_date,
      data.duration,
      data.priority || parent.priority || 'Medium',
      data.progress ?? 0,
      computeStatusFromProgress(data.progress ?? 0)
    );
  return db.prepare('SELECT * FROM tasks WHERE id = ?').get(info.lastInsertRowid);
}

export function updateTask(taskId, fields) {
  const db = DB();
  const existing = getTaskById(taskId);
  if (!existing) return null;

  const {
    name,
    description,
    start_date,
    duration,
    priority,
    progress,
    status,
  } = fields;

  const setClauses = [];
  const values = [];

  if (!isBlank(name)) { setClauses.push('name = ?'); values.push(name); }
  if (!isBlank(description)) { setClauses.push('description = ?'); values.push(description); }
  if (start_date !== undefined && start_date !== null && String(start_date).trim() !== '') {
    setClauses.push('start_date = ?'); values.push(start_date);
  }
  if (duration !== undefined && duration !== null && !isNaN(Number(duration))) {
    setClauses.push('duration = ?'); values.push(Number(duration));
  }
  if (!isBlank(priority)) { setClauses.push('priority = ?'); values.push(priority); }

  if (progress !== undefined && progress !== null) {
    const p = Math.max(0, Math.min(100, Number(progress)));
    setClauses.push('progress = ?'); values.push(p);
  }
  if (status !== undefined && status !== null && ['Belum Mulai', 'Berjalan', 'Selesai'].includes(status)) {
    setClauses.push('status = ?'); values.push(status);
  }

  if (setClauses.length === 0) return existing;

  // Sync status/progress consistency
  const resolvedProgress = computeProgressFromStatus(
    progress !== undefined ? Math.max(0, Math.min(100, Number(progress))) : existing.progress,
    status
  );
  const resolvedStatus = computeStatusFromProgress(resolvedProgress);

  values.push(taskId);
  const sql =
    `UPDATE tasks SET ${setClauses.join(', ')}, progress = ?, status = ? WHERE id = ?`;
  db.prepare(sql).run(
    ...values.slice(0, values.length - 1),
    resolvedProgress,
    resolvedStatus,
    taskId
  );

  return getTaskById(taskId);
}

export function deleteTask(taskId) {
  const db = DB();
  const existing = getTaskById(taskId);
  if (!existing) return null;
  if (existing.parent_task_id) {
    // Sub-task: allow deletion directly
  } else {
    // Main task: must not have subtasks
    const childCount = db
      .prepare('SELECT COUNT(*) AS cnt FROM tasks WHERE parent_task_id = ?')
      .get(taskId).cnt;
    if (childCount > 0) {
      return { blocked: true, reason: 'Tugas ini memiliki sub-tugas. Hapus sub-tugas terlebih dahulu.' };
    }
  }
  const affected = db.prepare('DELETE FROM tasks WHERE id = ?').run(taskId);
  return affected.changes > 0;
}

export function addDependency(projectId, { predecessor_id, successor_id, type, lag }) {
  const db = DB();
  if (predecessor_id === successor_id) {
    return { blocked: true, reason: 'Predecessor dan successor tidak boleh sama.' };
  }

  const pred = getTaskById(predecessor_id);
  const succ = getTaskById(successor_id);
  if (!pred || !succ) {
    return { blocked: true, reason: 'Salah satu tugas tidak ditemukan.' };
  }
  if (pred.project_id !== projectId || succ.project_id !== projectId) {
    return { blocked: true, reason: 'Kedua tugas harus berasal dari proyek yang sama.' };
  }
  if (pred.parent_task_id || succ.parent_task_id) {
    return { blocked: true, reason: 'Dependency hanya didukung untuk tugas utama, bukan sub-tugas.' };
  }

  const lagVal = Math.max(0, Math.floor(Number(lag) || 0));
  const typeVal = type === 'SS' ? 'SS' : 'FS';

  const existing = db
    .prepare(
      'SELECT * FROM dependencies WHERE project_id = ? AND predecessor_id = ? AND successor_id = ?'
    )
    .get(projectId, predecessor_id, successor_id);
  if (existing) {
    return { conflict: true, existing };
  }

  // Cycle detection
  if (wouldCreateCycle(projectId, predecessor_id, successor_id)) {
    return { blocked: true, reason: 'Menambahkan dependency ini akan membentuk siklus.' };
  }

  const info = db
    .prepare(
      'INSERT INTO dependencies (project_id, predecessor_id, successor_id, type, lag) VALUES (?, ?, ?, ?, ?)'
    )
    .run(projectId, predecessor_id, successor_id, typeVal, lagVal);
  return db.prepare('SELECT * FROM dependencies WHERE id = ?').get(info.lastInsertRowid);
}

export function updateDependency(depId, fields) {
  const db = DB();
  const existing = getDependencyById(depId);
  if (!existing) return null;

  const { type, lag, predecessor_id, successor_id } = fields;
  const projectId = existing.project_id;

  const resolvedType = type === 'SS' ? 'SS' : 'FS';
  const resolvedLag = Math.max(0, Math.floor(Number(lag) || 0));

  // If predecessor/successor changed
  let newPredecessor = existing.predecessor_id;
  let newSuccessor = existing.successor_id;
  if (predecessor_id !== undefined && Number(predecessor_id) !== existing.predecessor_id) {
    newPredecessor = Number(predecessor_id);
  }
  if (successor_id !== undefined && Number(successor_id) !== existing.successor_id) {
    newSuccessor = Number(successor_id);
  }

  if (newPredecessor === newSuccessor) {
    return { blocked: true, reason: 'Predecessor dan successor tidak boleh sama.' };
  }

  const pred = getTaskById(newPredecessor);
  const succ = getTaskById(newSuccessor);
  if (!pred || !succ) {
    return { blocked: true, reason: 'Salah satu tugas tidak ditemukan.' };
  }
  if (pred.project_id !== projectId || succ.project_id !== projectId) {
    return { blocked: true, reason: 'Kedua tugas harus berasal dari proyek yang sama.' };
  }
  if (pred.parent_task_id || succ.parent_task_id) {
    return { blocked: true, reason: 'Dependency hanya didukung untuk tugas utama.' };
  }

  // If pairing changed, ensure no duplicate and no cycle
  const existingOther = db
    .prepare(
      'SELECT * FROM dependencies WHERE project_id = ? AND predecessor_id = ? AND successor_id = ? AND id != ?'
    )
    .get(projectId, newPredecessor, newSuccessor, depId);
  if (existingOther) {
    return { conflict: true, existing: existingOther };
  }

  const modified = {
    predecessor_id: newPredecessor,
    successor_id: newSuccessor,
    type: resolvedType,
    lag: resolvedLag,
  };

  if (newPredecessor !== existing.predecessor_id || newSuccessor !== existing.successor_id) {
    if (wouldCreateCycle(projectId, newPredecessor, newSuccessor, depId)) {
      return { blocked: true, reason: 'Mengubah dependency ini akan membentuk siklus.' };
    }
  }

  db.prepare(
    `UPDATE dependencies SET type = ?, lag = ?, predecessor_id = ?, successor_id = ?
     WHERE id = ?`
  ).run(resolvedType, resolvedLag, newPredecessor, newSuccessor, depId);

  return getDependencyById(depId);
}

export function deleteDependency(depId) {
  const db = DB();
  const affected = db.prepare('DELETE FROM dependencies WHERE id = ?').run(depId);
  return affected.changes > 0;
}

export function addTeamMember(projectId, data) {
  const db = DB();
  try {
    const info = db
      .prepare(
        `INSERT INTO team_members (project_id, name, email, phone, role, daily_rate)
         VALUES (?, ?, ?, ?, ?, ?)`
      )
      .run(
        projectId,
        data.name,
        data.email,
        data.phone || '',
        data.role || '',
        Math.max(0, Math.floor(Number(data.daily_rate) || 0))
      );
    return db.prepare('SELECT * FROM team_members WHERE id = ?').get(info.lastInsertRowid);
  } catch (err) {
    if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      const existing = db
        .prepare('SELECT * FROM team_members WHERE project_id = ? AND email = ?')
        .get(projectId, data.email);
      return { conflict: true, existing };
    }
    throw err;
  }
}

export function updateTeamMember(memberId, data) {
  const db = DB();
  const existing = getTeamMemberById(memberId);
  if (!existing) return null;

  const { name, email, phone, role, daily_rate } = data;
  const setClauses = [];
  const values = [];

  if (!isBlank(name)) { setClauses.push('name = ?'); values.push(name); }
  if (!isBlank(email)) { setClauses.push('email = ?'); values.push(email); }
  if (!isBlank(phone)) { setClauses.push('phone = ?'); values.push(phone); }
  if (!isBlank(role)) { setClauses.push('role = ?'); values.push(role); }
  if (daily_rate !== undefined && daily_rate !== null) {
    setClauses.push('daily_rate = ?');
    values.push(Math.max(0, Math.floor(Number(daily_rate) || 0)));
  }

  if (setClauses.length === 0) return existing;

  if (!isBlank(email)) {
    const conflict = db
      .prepare('SELECT * FROM team_members WHERE project_id = ? AND email = ? AND id != ?')
      .get(existing.project_id, email, memberId);
    if (conflict) {
      return { conflict: true, existing: conflict };
    }
  }

  values.push(memberId);
  db.prepare(`UPDATE team_members SET ${setClauses.join(', ')} WHERE id = ?`).run(...values);

  return getTeamMemberById(memberId);
}

export function deleteTeamMember(memberId) {
  const db = DB();
  const affected = db.prepare('DELETE FROM team_members WHERE id = ?').run(memberId);
  return affected.changes > 0;
}

export function addLeave(memberId, data) {
  const db = DB();
  const member = getTeamMemberById(memberId);
  if (!member) return null;

  const startDate = data.start_date;
  const endDate = data.end_date;

  if (startDate > endDate) {
    return { blocked: true, reason: 'Tanggal selesai cuti tidak boleh sebelum tanggal mulai.' };
  }

  const info = db
    .prepare(
      'INSERT INTO leaves (member_id, start_date, end_date, reason) VALUES (?, ?, ?, ?)'
    )
    .run(memberId, startDate, endDate, data.reason || '');
  return db.prepare('SELECT * FROM leaves WHERE id = ?').get(info.lastInsertRowid);
}

export function deleteLeave(leaveId) {
  const db = DB();
  const affected = db.prepare('DELETE FROM leaves WHERE id = ?').run(leaveId);
  return affected.changes > 0;
}

export function addAssignment(taskId, memberId) {
  const db = DB();
  const task = getTaskById(taskId);
  if (!task) return { blocked: true, reason: 'Tugas tidak ditemukan.' };
  const member = getTeamMemberById(memberId);
  if (!member) return { blocked: true, reason: 'Anggota tidak ditemukan.' };

  if (task.project_id !== member.project_id) {
    return { blocked: true, reason: 'Anggota dan tugas harus berasal dari proyek yang sama.' };
  }

  const existing = db
    .prepare('SELECT * FROM assignments WHERE task_id = ? AND member_id = ?')
    .get(taskId, memberId);
  if (existing) {
    return { conflict: true, existing };
  }

  const info = db
    .prepare('INSERT INTO assignments (task_id, member_id) VALUES (?, ?)')
    .run(taskId, memberId);
  return db.prepare('SELECT * FROM assignments WHERE id = ?').get(info.lastInsertRowid);
}

export function deleteAssignment(assignmentId) {
  const db = DB();
  const affected = db.prepare('DELETE FROM assignments WHERE id = ?').run(assignmentId);
  return affected.changes > 0;
}

// ---- Helpers ----

function computeStatusFromProgress(progress) {
  if (progress >= 100) return 'Selesai';
  if (progress > 0) return 'Berjalan';
  return 'Belum Mulai';
}

function computeProgressFromStatus(progress, status) {
  if (status === 'Selesai') return 100;
  if (status === 'Berjalan') {
    if (progress === 0) return 1;
    return progress;
  }
  return 0;
}

/**
 * Check if adding/updating a dependency (predecessor_id -> successor_id) would create a cycle.
 * Uses reachability (DFS) with exclusion of the edge being modified.
 */
function wouldCreateCycle(projectId, predecessorId, successorId, excludeDepId) {
  const db = DB();
  const edges = db
    .prepare(
      `SELECT predecessor_id, successor_id FROM dependencies
       WHERE project_id = ? AND id != ?
       ORDER BY id`
    )
    .all(projectId, excludeDepId);

  const adj = new Map();
  for (const e of edges) {
    if (!adj.has(e.predecessor_id)) adj.set(e.predecessor_id, []);
    adj.get(e.predecessor_id).push(e.successor_id);
  }
  if (!adj.has(predecessorId)) adj.set(predecessorId, []);
  adj.get(predecessorId).push(successorId);

  // DFS from successorId to see if we can reach predecessorId
  const visited = new Set();
  const stack = [successorId];
  while (stack.length) {
    const node = stack.pop();
    if (node === predecessorId) return true;
    if (visited.has(node)) continue;
    visited.add(node);
    for (const next of (adj.get(node) || [])) {
      stack.push(next);
    }
  }
  return false;
}
