import { getDb } from '../db.js';

const DB = () => getDb();

export function getDependenciesForProject(projectId) {
  const db = DB();
  return db
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
}

export function getDependencyById(depId) {
  const db = DB();
  const d = db.prepare('SELECT * FROM dependencies WHERE id = ?').get(depId);
  if (!d) return null;
  const pred = db.prepare('SELECT * FROM tasks WHERE id = ?').get(d.predecessor_id);
  const succ = db.prepare('SELECT * FROM tasks WHERE id = ?').get(d.successor_id);
  return { ...d, predecessor: pred, successor: succ };
}

export function addDependency(projectId, data) {
  const db = DB();
  const predecessor_id = Number(data.predecessor_id);
  const successor_id = Number(data.successor_id);
  const type = data.type === 'SS' ? 'SS' : 'FS';
  const lag = Math.max(0, Math.floor(Number(data.lag) || 0));

  if (!predecessor_id || !successor_id || predecessor_id === successor_id) {
    return { blocked: true, reason: 'Predecessor dan successor harus berbeda.' };
  }

  const pred = db.prepare('SELECT * FROM tasks WHERE id = ?').get(predecessor_id);
  const succ = db.prepare('SELECT * FROM tasks WHERE id = ?').get(successor_id);
  if (!pred || !succ) {
    return { blocked: true, reason: 'Salah satu tugas tidak ditemukan.' };
  }
  if (pred.project_id !== projectId || succ.project_id !== projectId) {
    return { blocked: true, reason: 'Kedua tugas harus berasal dari proyek yang sama.' };
  }
  if (pred.parent_task_id != null || succ.parent_task_id != null) {
    return { blocked: true, reason: 'Dependency hanya didukung untuk tugas utama, bukan sub-tugas.' };
  }

  const existing = db
    .prepare(
      'SELECT * FROM dependencies WHERE project_id = ? AND predecessor_id = ? AND successor_id = ?'
    )
    .get(projectId, predecessor_id, successor_id);
  if (existing) {
    return { conflict: true, existing };
  }

  // Cycle detection
  if (wouldCreateCycle(projectId, predecessor_id, successor_id, null)) {
    return { blocked: true, reason: 'Menambahkan dependency ini akan membentuk siklus.' };
  }

  const info = db
    .prepare(
      'INSERT INTO dependencies (project_id, predecessor_id, successor_id, type, lag) VALUES (?, ?, ?, ?, ?)'
    )
    .run(projectId, predecessor_id, successor_id, type, lag);
  return db.prepare('SELECT * FROM dependencies WHERE id = ?').get(info.lastInsertRowid);
}

export function updateDependency(depId, data) {
  const db = DB();
  const existing = getDependencyById(depId);
  if (!existing) return null;

  const projectId = existing.project_id;
  const predecessor_id = data.predecessor_id !== undefined ? Number(data.predecessor_id) : existing.predecessor_id;
  const successor_id = data.successor_id !== undefined ? Number(data.successor_id) : existing.successor_id;
  const type = data.type === 'SS' ? 'SS' : (data.type === 'FS' ? 'FS' : existing.type);
  const lag = data.lag !== undefined ? Math.max(0, Math.floor(Number(data.lag) || 0)) : existing.lag;

  if (predecessor_id === successor_id) {
    return { blocked: true, reason: 'Predecessor dan successor tidak boleh sama.' };
  }

  const pred = db.prepare('SELECT * FROM tasks WHERE id = ?').get(predecessor_id);
  const succ = db.prepare('SELECT * FROM tasks WHERE id = ?').get(successor_id);
  if (!pred || !succ) {
    return { blocked: true, reason: 'Salah satu tugas tidak ditemukan.' };
  }
  if (pred.project_id !== projectId || succ.project_id !== projectId) {
    return { blocked: true, reason: 'Kedua tugas harus berasal dari proyek yang sama.' };
  }
  if (pred.parent_task_id != null || succ.parent_task_id != null) {
    return { blocked: true, reason: 'Dependency hanya didukung untuk tugas utama.' };
  }

  // Duplicate pairing check (excluding self)
  const dup = db
    .prepare(
      'SELECT * FROM dependencies WHERE project_id = ? AND predecessor_id = ? AND successor_id = ? AND id != ?'
    )
    .get(projectId, predecessor_id, successor_id, depId);
  if (dup) {
    return { conflict: true, existing: dup };
  }

  // Cycle detection: temporarily consider the new edge
  if (predecessor_id !== existing.predecessor_id || successor_id !== existing.successor_id) {
    if (wouldCreateCycle(projectId, predecessor_id, successor_id, depId)) {
      return { blocked: true, reason: 'Mengubah dependency ini akan membentuk siklus.' };
    }
  }

  db.prepare(
    'UPDATE dependencies SET type = ?, lag = ?, predecessor_id = ?, successor_id = ? WHERE id = ?'
  ).run(type, lag, predecessor_id, successor_id, depId);

  return getDependencyById(depId);
}

export function deleteDependency(depId) {
  const db = DB();
  const affected = db.prepare('DELETE FROM dependencies WHERE id = ?').run(depId);
  return affected.changes > 0;
}

/**
 * Return true if adding/removing an edge would create a cycle.
 * We check by temporarily removing the excluded edge (if any) and testing
 * reachability from successor back to predecessor.
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

  // Build adjacency list
  const adj = new Map();
  for (const e of edges) {
    if (!adj.has(e.predecessor_id)) adj.set(e.predecessor_id, []);
    adj.get(e.predecessor_id).push(e.successor_id);
  }
  // Temporarily add the edge being modified/added
  if (!adj.has(predecessorId)) adj.set(predecessorId, []);
  adj.get(predecessorId).push(successorId);

  // DFS from successorId to see if we can reach predecessorId (cycle check)
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
