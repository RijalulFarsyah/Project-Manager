import { getDb } from '../db.js';

const DB = () => getDb();

export function getAssignmentsForTask(taskId) {
  const db = DB();
  const rows = db
    .prepare(
      `SELECT a.id, a.task_id, a.member_id,
              tm.name AS member_name, tm.email AS member_email, tm.role AS member_role
       FROM assignments a
       JOIN team_members tm ON tm.id = a.member_id
       WHERE a.task_id = ?
       ORDER BY tm.id`
    )
    .all(taskId);
  return rows.map((row) => ({
    id: row.id,
    task_id: row.task_id,
    member_id: row.member_id,
    member_name: row.member_name || '',
    member_email: row.member_email || '',
    member_role: row.member_role || '',
  }));
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

export function addAssignment(taskId, memberId) {
  const db = DB();
  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(taskId);
  if (!task) return { blocked: true, reason: 'Tugas tidak ditemukan.' };
  const member = db.prepare('SELECT * FROM team_members WHERE id = ?').get(memberId);
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
  const row = db.prepare('SELECT a.id, a.task_id, a.member_id, tm.name AS member_name, tm.email AS member_email, tm.role AS member_role FROM assignments a JOIN team_members tm ON tm.id = a.member_id WHERE a.id = ?').get(info.lastInsertRowid);
  return {
    id: row.id,
    task_id: row.task_id,
    member_id: row.member_id,
    member_name: row.member_name || '',
    member_email: row.member_email || '',
    member_role: row.member_role || '',
  };
}

export function deleteAssignment(assignmentId) {
  const db = DB();
  const affected = db.prepare('DELETE FROM assignments WHERE id = ?').run(assignmentId);
  return affected.changes > 0;
}
