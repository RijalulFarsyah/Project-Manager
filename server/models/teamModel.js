import { getDb } from '../db.js';

const DB = () => getDb();

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
    if (err && err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
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

  if (name !== undefined && String(name).trim() !== '') {
    setClauses.push('name = ?');
    values.push(name);
  }
  if (email !== undefined && String(email).trim() !== '') {
    setClauses.push('email = ?');
    values.push(email);
  }
  if (phone !== undefined) {
    setClauses.push('phone = ?');
    values.push(phone || '');
  }
  if (role !== undefined) {
    setClauses.push('role = ?');
    values.push(role || '');
  }
  if (daily_rate !== undefined && Number.isFinite(daily_rate)) {
    setClauses.push('daily_rate = ?');
    values.push(Math.max(0, Math.floor(Number(daily_rate))));
  }

  if (setClauses.length === 0) return existing;

  // If email changed, ensure uniqueness
  if (email !== undefined && email !== existing.email) {
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

export function getLeavesForMember(memberId) {
  const db = DB();
  return db
    .prepare(
      `SELECT l.*, tm.name AS member_name FROM leaves l
       JOIN team_members tm ON tm.id = l.member_id
       WHERE l.member_id = ?
       ORDER BY l.start_date ASC`
    )
    .all(memberId);
}

export function addLeave(memberId, data) {
  const db = DB();
  const member = getTeamMemberById(memberId);
  if (!member) return null;

  const startDate = data.start_date;
  const endDate = data.end_date;
  if (!startDate || !endDate) {
    return { blocked: true, reason: 'Tanggal mulai dan selesai cuti wajib diisi.' };
  }
  if (endDate < startDate) {
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

export function getWorkloadForProject(projectId) {
  const db = DB();
  const members = db
    .prepare('SELECT * FROM team_members WHERE project_id = ? ORDER BY name ASC')
    .all(projectId);

  const result = [];
  for (const m of members) {
    const tasks = db
      .prepare(
        `SELECT a.task_id, t.name, t.status, t.start_date, t.duration, t.priority,
                GROUP_CONCAT(DISTINCT tm.name) AS other_members
         FROM assignments a
         JOIN tasks t ON t.id = a.task_id
         LEFT JOIN assignments a2 ON a2.task_id = a.task_id AND a2.member_id != a.member_id
         LEFT JOIN team_members tm ON tm.id = a2.member_id
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
