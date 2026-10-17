import { Router } from 'express';
import {
  listTasks,
  getTask,
  createTask,
  updateTaskHandler,
  deleteTaskHandler,
  listSubtasks,
  createSubtask,
  updateSubtaskHandler,
  deleteSubtaskHandler,
} from '../controllers/taskController.js';
import { requireAuth } from '../middlewares/auth.js';

const router = Router();

router.get('/', requireAuth, listTasks);
router.post('/', requireAuth, createTask);
router.get('/:id', requireAuth, getTask);
router.put('/:id', requireAuth, updateTaskHandler);
router.delete('/:id', requireAuth, deleteTaskHandler);

router.get('/:id/subtasks', requireAuth, listSubtasks);
router.post('/:id/subtasks', requireAuth, createSubtask);

// ============= ROUTE TAMBAHAN UNTUK TASK DETAIL =============

// Dependency untuk task tertentu (ambil dari dependencies proyek, filter)
// Note: endpoint ini kompatibel dengan frontend yang panggil:
// GET /api/projects/:projectId/tasks/:taskId/dependencies
// Tapi karena taskRoutes di-mount ke /api/tasks, kita buat versi flat
import { getDb } from '../db.js';

router.get('/:taskId/dependencies', requireAuth, (req, res) => {
  const taskId = Number(req.params.taskId);
  if (!taskId || taskId < 1) {
    return res.status(400).json({ success: false, error: { message: 'ID tugas tidak valid.' } });
  }
  const db = getDb();
  const task = db.prepare('SELECT id, project_id FROM tasks WHERE id = ?').get(taskId);
  if (!task) {
    return res.status(404).json({ success: false, error: { message: 'Tugas tidak ditemukan.' } });
  }
  // Ambil dependency yang predecessor atau successor-nya task ini
  const deps = db.prepare(`
    SELECT d.*, 
           p.name as predecessor_name, p.id as predecessor_id,
           s.name as successor_name, s.id as successor_id
    FROM dependencies d
    JOIN tasks p ON p.id = d.predecessor_id
    JOIN tasks s ON s.id = d.successor_id
    WHERE d.project_id = ? AND (d.predecessor_id = ? OR d.successor_id = ?)
  `).all(task.project_id, taskId, taskId);
  res.json({ success: true, data: deps });
});

// Assignments untuk task tertentu
router.get('/:taskId/assignments', requireAuth, (req, res) => {
  const taskId = Number(req.params.taskId);
  if (!taskId || taskId < 1) {
    return res.status(400).json({ success: false, error: { message: 'ID tugas tidak valid.' } });
  }
  const db = getDb();
  const task = db.prepare('SELECT id, project_id FROM tasks WHERE id = ?').get(taskId);
  if (!task) {
    return res.status(404).json({ success: false, error: { message: 'Tugas tidak ditemukan.' } });
  }
  const rows = db.prepare(`
    SELECT a.id, a.task_id, a.member_id, m.name, m.email, m.role, m.daily_rate
    FROM assignments a
    JOIN team_members m ON m.id = a.member_id
    WHERE a.task_id = ?
  `).all(taskId);
  res.json({ success: true, data: rows });
});

export { router };
export default router;
