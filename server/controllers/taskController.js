import {
  getTasksForProject,
  getTaskById,
  addTask,
  updateTask,
  deleteTask,
  getSubtasksForTask,
  addSubtask,
  updateSubtask,
  deleteSubtask,
} from '../models/taskModel.js';
import { requireAuth } from '../middlewares/auth.js';
import { badRequest, notFound, conflict, ok } from '../utils/apiResponse.js';
import { sanitizeString, isBlank, isValidDateYMD } from '../utils/helpers.js';

export function listTasks(req, res) {
  requireAuth(req, res, () => {
    const projectId = Number(req.params.id);
    if (!projectId || projectId < 1) return notFound(res, 'Proyek tidak ditemukan.');
    const tasks = getTasksForProject(projectId);
    res.json({ success: true, data: tasks });
  });
}

export function getTask(req, res) {
  requireAuth(req, res, () => {
    const taskId = Number(req.params.id);
    if (!taskId || taskId < 1) return notFound(res, 'Tugas tidak ditemukan.');
    const task = getTaskById(taskId);
    if (!task) return notFound(res, 'Tugas tidak ditemukan.');
    res.json({ success: true, data: task });
  });
}

export function createTask(req, res) {
  requireAuth(req, res, () => {
    const projectId = Number(req.params.id);
    if (!projectId || projectId < 1) return notFound(res, 'Proyek tidak ditemukan.');

    let body = {};
    try { body = req.body || {}; } catch { body = {}; }

    const name = sanitizeString(body.name, 200);
    if (isBlank(name)) return badRequest(res, 'Nama tugas wajib diisi.');

    const description = sanitizeString(body.description, 2000);
    const start_date = (body.start_date || '').trim();
    if (!isValidDateYMD(start_date)) return badRequest(res, 'Tanggal mulai tidak valid (YYYY-MM-DD).');

    const duration = Math.max(1, Math.floor(Number(body.duration) || 1));
    const priority = ['Low', 'Medium', 'High'].includes(body.priority) ? body.priority : 'Medium';
    const progress = Math.max(0, Math.min(100, Number(body.progress) || 0));

    const task = addTask(projectId, { name, description, start_date, duration, priority, progress });
    res.status(201).json({ success: true, data: task, message: 'Tugas berhasil dibuat.' });
  });
}

export function updateTaskHandler(req, res) {
  requireAuth(req, res, () => {
    const taskId = Number(req.params.id);
    if (!taskId || taskId < 1) return notFound(res, 'Tugas tidak ditemukan.');

    let body = {};
    try { body = req.body || {}; } catch { body = {}; }

    const name = body.name !== undefined ? sanitizeString(body.name, 200) : undefined;
    const description = body.description !== undefined ? sanitizeString(body.description, 2000) : undefined;
    const start_date = body.start_date !== undefined ? (body.start_date || '').trim() : undefined;
    const duration = body.duration !== undefined ? Math.max(1, Math.floor(Number(body.duration) || 1)) : undefined;
    const priority = body.priority !== undefined ? body.priority : undefined;
    const progress = body.progress !== undefined ? Math.max(0, Math.min(100, Number(body.progress) || 0)) : undefined;
    const status = body.status !== undefined ? body.status : undefined;
    const parent_task_id = body.parent_task_id !== undefined ? body.parent_task_id : undefined;

    if (start_date !== undefined && start_date !== null && start_date !== '' && !isValidDateYMD(start_date)) {
      return badRequest(res, 'Tanggal mulai tidak valid (YYYY-MM-DD).');
    }

    const updated = updateTask(taskId, {
      name,
      description,
      start_date,
      duration,
      priority,
      progress,
      status,
      parent_task_id,
    });
    if (!updated) return notFound(res, 'Tugas tidak ditemukan.');
    res.json({ success: true, data: updated, message: 'Tugas berhasil diperbarui.' });
  });
}

export function deleteTaskHandler(req, res) {
  requireAuth(req, res, () => {
    const taskId = Number(req.params.id);
    if (!taskId || taskId < 1) return badRequest(res, 'ID tugas tidak valid.');

    const result = deleteTask(taskId);
    if (!result) return notFound(res, 'Tugas tidak ditemukan.');
    if (result && typeof result === 'object' && result.blocked) {
      return badRequest(res, result.reason);
    }
    res.json({ success: true, data: null, message: 'Tugas berhasil dihapus.' });
  });
}

export function listSubtasks(req, res) {
  requireAuth(req, res, () => {
    const taskId = Number(req.params.id);
    if (!taskId || taskId < 1) return notFound(res, 'Tugas tidak ditemukan.');
    const subtasks = getSubtasksForTask(taskId);
    res.json({ success: true, data: subtasks });
  });
}

export function createSubtask(req, res) {
  requireAuth(req, res, () => {
    const parentTaskId = Number(req.params.id);
    if (!parentTaskId || parentTaskId < 1) return notFound(res, 'Tugas induk tidak ditemukan.');

    let body = {};
    try { body = req.body || {}; } catch { body = {}; }

    const name = sanitizeString(body.name, 200);
    if (isBlank(name)) return badRequest(res, 'Nama sub-tugas wajib diisi.');

    const description = sanitizeString(body.description, 2000);
    const start_date = (body.start_date || '').trim();
    if (!isValidDateYMD(start_date)) return badRequest(res, 'Tanggal mulai tidak valid (YYYY-MM-DD).');

    const duration = Math.max(1, Math.floor(Number(body.duration) || 1));
    const priority = body.priority || 'Medium';
    const progress = Math.max(0, Math.min(100, Number(body.progress) || 0));

    const task = addSubtask(parentTaskId, body.project_id || null, {
      name,
      description,
      start_date,
      duration,
      priority,
      progress,
    });
    if (!task) return badRequest(res, 'Gagal menambahkan sub-tugas.');
    res.status(201).json({ success: true, data: task, message: 'Sub-tugas berhasil dibuat.' });
  });
}

export function updateSubtaskHandler(req, res) {
  requireAuth(req, res, () => {
    const taskId = Number(req.params.id);
    if (!taskId || taskId < 1) return notFound(res, 'Sub-tugas tidak ditemukan.');

    let body = {};
    try { body = req.body || {}; } catch { body = {}; }

    const name = body.name !== undefined ? sanitizeString(body.name, 200) : undefined;
    const description = body.description !== undefined ? sanitizeString(body.description, 2000) : undefined;
    const start_date = body.start_date !== undefined ? (body.start_date || '').trim() : undefined;
    const duration = body.duration !== undefined ? Math.max(1, Math.floor(Number(body.duration) || 1)) : undefined;
    const priority = body.priority !== undefined ? body.priority : undefined;
    const progress = body.progress !== undefined ? Math.max(0, Math.min(100, Number(body.progress) || 0)) : undefined;
    const status = body.status !== undefined ? body.status : undefined;

    if (start_date !== undefined && start_date !== null && start_date !== '' && !isValidDateYMD(start_date)) {
      return badRequest(res, 'Tanggal mulai tidak valid (YYYY-MM-DD).');
    }

    const updated = updateSubtask(taskId, { name, description, start_date, duration, priority, progress, status });
    if (!updated) return notFound(res, 'Sub-tugas tidak ditemukan.');
    res.json({ success: true, data: updated, message: 'Sub-tugas berhasil diperbarui.' });
  });
}

export function deleteSubtaskHandler(req, res) {
  requireAuth(req, res, () => {
    const taskId = Number(req.params.id);
    if (!taskId || taskId < 1) return badRequest(res, 'ID sub-tugas tidak valid.');

    const result = deleteSubtask(taskId);
    if (!result) return notFound(res, 'Sub-tugas tidak ditemukan.');
    if (result && typeof result === 'object' && result.blocked) {
      return badRequest(res, result.reason);
    }
    res.json({ success: true, data: null, message: 'Sub-tugas berhasil dihapus.' });
  });
}
