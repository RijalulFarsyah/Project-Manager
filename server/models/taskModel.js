import { getDb } from '../db.js';
import { computeStatusFromProgress } from '../utils/statusUtils.js';

const DB = () => getDb();

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

export function getSubtasksForTask(parentTaskId) {
  const db = DB();
  return db
    .prepare('SELECT * FROM tasks WHERE parent_task_id = ? ORDER BY created_at ASC')
    .all(parentTaskId);
}

export function getSubtasksByParent(parentTaskId) {
  return getSubtasksForTask(parentTaskId);
}

export function addTask(projectId, data) {
  const db = DB();
  const status = computeStatusFromProgress(data.progress ?? 0);
  const info = db
    .prepare(
      `INSERT INTO tasks (project_id, name, description, start_date, duration,
        priority, progress, status, parent_task_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      projectId,
      data.name,
      data.description || '',
      data.start_date,
      data.duration ?? 1,
      data.priority || 'Medium',
      data.progress ?? 0,
      status,
      data.parent_task_id || null
    );
  return db.prepare('SELECT * FROM tasks WHERE id = ?').get(info.lastInsertRowid);
}

export function addSubtask(parentTaskId, projectId, data) {
  const db = DB();
  const parent = getTaskById(parentTaskId);
  if (!parent) return null;
  if (parent.project_id !== projectId) return null;
  if (parent.parent_task_id) return null; // cannot add subtask to a subtask

  const status = computeStatusFromProgress(data.progress ?? 0);
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
      data.duration ?? 1,
      data.priority || parent.priority || 'Medium',
      data.progress ?? 0,
      status
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
    parent_task_id,
  } = fields;

  const setClauses = [];
  const values = [];

  if (!isUndefinedOrBlank(name)) {
    setClauses.push('name = ?');
    values.push(name);
  }
  if (!isUndefinedOrBlank(description)) {
    setClauses.push('description = ?');
    values.push(description);
  }
  if (start_date !== undefined && String(start_date).trim() !== '') {
    setClauses.push('start_date = ?');
    values.push(start_date);
  }
  if (duration !== undefined && Number.isFinite(duration)) {
    setClauses.push('duration = ?');
    values.push(Math.max(1, Math.floor(Number(duration))));
  }
  if (!isUndefinedOrBlank(priority)) {
    setClauses.push('priority = ?');
    values.push(priority);
  }

  let resolvedProgress = existing.progress;
  let resolvedStatus = existing.status;

  if (progress !== undefined && Number.isFinite(progress)) {
    resolvedProgress = Math.max(0, Math.min(100, Number(progress)));
    setClauses.push('progress = ?');
    values.push(resolvedProgress);
  }
  if (status !== undefined && ['Belum Mulai', 'Berjalan', 'Selesai'].includes(status)) {
    resolvedStatus = status;
  }

  // Keep progress/status synchronized
  if (setClauses.length > 0) {
    // Sync: if status set explicitly, adjust progress; if progress set, sync status
    if (status !== undefined && status !== existing.status) {
      resolvedProgress = computeProgressForStatus(status, resolvedProgress);
      values[values.length - 1] = resolvedProgress;
      setClauses.push('progress = ?');
    } else if (progress !== undefined && progress !== existing.progress) {
      resolvedStatus = computeStatusFromProgress(resolvedProgress);
      setClauses.push('status = ?');
      values.push(resolvedStatus);
    }
  } else {
    // Nothing changed
    return existing;
  }

  // parent_task_id change only allowed if moving to root (null)
  if (parent_task_id !== undefined && parent_task_id === null) {
    // moving subtask to root: ensure it's currently a subtask
    if (existing.parent_task_id) {
      setClauses.push('parent_task_id = NULL');
    }
  }

  values.push(taskId);
  const sql = `UPDATE tasks SET ${setClauses.join(', ')} WHERE id = ?`;
  db.prepare(sql).run(...values);

  return getTaskById(taskId);
}

export function updateSubtask(taskId, fields) {
  const db = DB();
  const existing = getTaskById(taskId);
  if (!existing) return null;
  if (!existing.parent_task_id) {
    // Not a subtask — delegate to general update
    return updateTask(taskId, fields);
  }
  return updateTask(taskId, fields);
}

export function deleteTask(taskId) {
  const db = DB();
  const existing = getTaskById(taskId);
  if (!existing) return null;
  if (existing.parent_task_id) {
    // Subtask: allow deletion
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

export function deleteSubtask(taskId) {
  const db = DB();
  const existing = getTaskById(taskId);
  if (!existing) return null;
  if (!existing.parent_task_id) {
    return { blocked: true, reason: 'Hanya sub-tugas yang dapat dihapus melalui endpoint ini.' };
  }
  const affected = db.prepare('DELETE FROM tasks WHERE id = ?').run(taskId);
  return affected.changes > 0;
}

function isUndefinedOrBlank(v) {
  return v === undefined || v === null || (typeof v === 'string' && v.trim() === '');
}

export function computeProgressForStatus(status, currentProgress) {
  if (status === 'Selesai') return 100;
  if (status === 'Berjalan') return currentProgress > 0 ? currentProgress : 1;
  return 0;
}
