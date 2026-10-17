import { Router } from 'express';
import {
  listProjects,
  getProject,
  createProjectHandler,
  updateProjectHandler,
  deleteProjectHandler,
} from '../controllers/projectController.js';
import { requireAuth } from '../middlewares/auth.js';

const router = Router();

router.get('/', requireAuth, listProjects);
router.post('/', requireAuth, createProjectHandler);
router.get('/:id', requireAuth, getProject);
router.put('/:id', requireAuth, updateProjectHandler);
router.delete('/:id', requireAuth, deleteProjectHandler);

// Nested routes — imported after controller definitions
import {
  getCalendarForProject,
  upsertCalendar,
  getHolidaysForProject,
  addHoliday,
  updateHoliday,
  deleteHoliday,
} from '../models/projectModel.js';
import {
  getTasksForProject,
  addTask,
  updateTask,
  deleteTask,
  getTaskById,
  getSubtasksForTask,
  addSubtask,
  updateSubtask,
  deleteSubtask,
} from '../models/taskModel.js';
import {
  getDependenciesForProject,
  getDependencyById,
  addDependency,
  updateDependency,
  deleteDependency,
} from '../models/dependencyModel.js';
import {
  getTeamMembersForProject,
  getTeamMemberById,
  addTeamMember,
  updateTeamMember,
  deleteTeamMember,
  getLeavesForMember,
  addLeave,
  deleteLeave,
  getWorkloadForProject,
} from '../models/teamModel.js';
import {
  getCriticalPathForProject,
  getGanttForProject,
  getPertForProject,
} from '../services/cpmService.js';
import {
  getAssignmentsForTask,
  addAssignment,
  deleteAssignment,
} from '../models/assignmentModel.js';
import { badRequest, notFound, conflict } from '../utils/apiResponse.js';
import { sanitizeString, isBlank, isValidDateYMD } from '../utils/helpers.js';

// Calendar
router.get('/:id/calendar', requireAuth, (req, res) => {
  const id = Number(req.params.id);
  if (!id || id < 1) return notFound(res, 'Proyek tidak ditemukan.');
  const calendar = getCalendarForProject(id);
  if (!calendar) return notFound(res, 'Kalender kerja tidak ditemukan.');
  res.json({ success: true, data: calendar });
});

router.put('/:id/calendar', requireAuth, (req, res) => {
  const id = Number(req.params.id);
  if (!id || id < 1) return notFound(res, 'Proyek tidak ditemukan.');

  let body = {};
  try { body = req.body || {}; } catch { body = {}; }

  const fields = {
    is_working_day_mon: body.is_working_day_mon,
    is_working_day_tue: body.is_working_day_tue,
    is_working_day_wed: body.is_working_day_wed,
    is_working_day_thu: body.is_working_day_thu,
    is_working_day_fri: body.is_working_day_fri,
    is_working_day_sat: body.is_working_day_sat,
    is_working_day_sun: body.is_working_day_sun,
  };
  // Convert truthy/falsy to 1/0
  for (const k of Object.keys(fields)) {
    if (fields[k] === undefined || fields[k] === null) {
      fields[k] = 0;
    } else {
      fields[k] = fields[k] ? 1 : 0;
    }
  }

  const calendar = upsertCalendar(id, fields);
  if (!calendar) return notFound(res, 'Proyek tidak ditemukan.');
  res.json({ success: true, data: calendar, message: 'Kalender kerja berhasil diperbarui.' });
});

// Holidays
router.get('/:id/holidays', requireAuth, (req, res) => {
  const id = Number(req.params.id);
  if (!id || id < 1) return notFound(res, 'Proyek tidak ditemukan.');
  const holidays = getHolidaysForProject(id);
  res.json({ success: true, data: holidays });
});

router.post('/:id/holidays', requireAuth, (req, res) => {
  const id = Number(req.params.id);
  if (!id || id < 1) return notFound(res, 'Proyek tidak ditemukan.');

  let body = {};
  try { body = req.body || {}; } catch { body = {}; }

  const date = (body.date || '').trim();
  if (!isValidDateYMD(date)) return badRequest(res, 'Tanggal holiday tidak valid.');

  const description = sanitizeString(body.description, 300);

  const result = addHoliday(id, { date, description });
  if (result.conflict) {
    const existing = result.existing;
    return conflict(res, 'Hari libur pada tanggal ini sudah ada.', {
      id: existing.id,
      date: existing.date,
      description: existing.description,
    });
  }
  res.status(201).json({ success: true, data: result, message: 'Hari libur berhasil ditambahkan.' });
});

router.put('/:id/holidays/:holidayId', requireAuth, (req, res) => {
  const id = Number(req.params.id);
  const holidayId = Number(req.params.holidayId);
  if (!id || id < 1) return notFound(res, 'Proyek tidak ditemukan.');
  if (!holidayId || holidayId < 1) return badRequest(res, 'ID hari libur tidak valid.');

  let body = {};
  try { body = req.body || {}; } catch { body = {}; }

  const date = body.date !== undefined ? (body.date || '').trim() : undefined;
  if (date !== undefined && date !== null && date !== '' && !isValidDateYMD(date)) {
    return badRequest(res, 'Tanggal holiday tidak valid.');
  }

  const description = body.description !== undefined ? sanitizeString(body.description, 300) : undefined;

  const result = updateHoliday(holidayId, { date, description });
  if (!result) return notFound(res, 'Hari libur tidak ditemukan.');
  if (result.conflict) {
    const existing = result.existing;
    return conflict(res, 'Hari libur pada tanggal ini sudah digunakan untuk hari libur lain.', {
      id: existing.id,
      date: existing.date,
      description: existing.description,
    });
  }
  res.json({ success: true, data: result, message: 'Hari libur berhasil diperbarui.' });
});

router.delete('/:id/holidays/:holidayId', requireAuth, (req, res) => {
  const holidayId = Number(req.params.holidayId);
  if (!holidayId || holidayId < 1) return badRequest(res, 'ID hari libur tidak valid.');
  const deleted = deleteHoliday(holidayId);
  if (!deleted) return notFound(res, 'Hari libur tidak ditemukan.');
  res.json({ success: true, data: null, message: 'Hari libur berhasil dihapus.' });
});

// Tasks
router.get('/:id/tasks', requireAuth, (req, res) => {
  const id = Number(req.params.id);
  if (!id || id < 1) return notFound(res, 'Proyek tidak ditemukan.');
  const tasks = getTasksForProject(id);
  res.json({ success: true, data: tasks });
});

router.post('/:id/tasks', requireAuth, (req, res) => {
  const id = Number(req.params.id);
  if (!id || id < 1) return notFound(res, 'Proyek tidak ditemukan.');

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

  const task = addTask(id, { name, description, start_date, duration, priority, progress });
  if (!task) return badRequest(res, 'Gagal membuat tugas.');
  res.status(201).json({ success: true, data: task, message: 'Tugas berhasil dibuat.' });
});

router.get('/:id/tasks/:taskId', requireAuth, (req, res) => {
  const id = Number(req.params.id);
  const taskId = Number(req.params.taskId);
  if (!id || id < 1) return notFound(res, 'Proyek tidak ditemukan.');
  if (!taskId || taskId < 1) return badRequest(res, 'ID tugas tidak valid.');

  const task = getTaskById(taskId);
  if (!task || task.project_id !== id) return notFound(res, 'Tugas tidak ditemukan.');
  res.json({ success: true, data: task });
});

router.put('/:id/tasks/:taskId', requireAuth, (req, res) => {
  const id = Number(req.params.id);
  const taskId = Number(req.params.taskId);
  if (!id || id < 1) return notFound(res, 'Proyek tidak ditemukan.');
  if (!taskId || taskId < 1) return badRequest(res, 'ID tugas tidak valid.');

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

  const updated = updateTask(taskId, { name, description, start_date, duration, priority, progress, status });
  if (!updated) return notFound(res, 'Tugas tidak ditemukan.');
  res.json({ success: true, data: updated, message: 'Tugas berhasil diperbarui.' });
});

router.delete('/:id/tasks/:taskId', requireAuth, (req, res) => {
  const taskId = Number(req.params.taskId);
  if (!taskId || taskId < 1) return badRequest(res, 'ID tugas tidak valid.');

  const result = deleteTask(taskId);
  if (!result) return notFound(res, 'Tugas tidak ditemukan.');
  if (result && typeof result === 'object' && result.blocked) {
    return badRequest(res, result.reason);
  }
  res.json({ success: true, data: null, message: 'Tugas berhasil dihapus.' });
});

// Sub-tasks
router.get('/:id/tasks/:taskId/subtasks', requireAuth, (req, res) => {
  const taskId = Number(req.params.taskId);
  if (!taskId || taskId < 1) return badRequest(res, 'ID tugas tidak valid.');
  const subtasks = getSubtasksForTask(taskId);
  res.json({ success: true, data: subtasks });
});

router.post('/:id/tasks/:taskId/subtasks', requireAuth, (req, res) => {
  const parentTaskId = Number(req.params.taskId);
  if (!parentTaskId || parentTaskId < 1) return badRequest(res, 'ID tugas induk tidak valid.');

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

  const task = addSubtask(parentTaskId, body.project_id || null, { name, description, start_date, duration, priority, progress });
  if (!task) return badRequest(res, 'Gagal menambahkan sub-tugas.');
  res.status(201).json({ success: true, data: task, message: 'Sub-tugas berhasil dibuat.' });
});

router.put('/:id/tasks/:taskId/subtasks/:subtaskId', requireAuth, (req, res) => {
  const subtaskId = Number(req.params.subtaskId);
  if (!subtaskId || subtaskId < 1) return badRequest(res, 'ID sub-tugas tidak valid.');

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

  const updated = updateSubtask(subtaskId, { name, description, start_date, duration, priority, progress, status });
  if (!updated) return notFound(res, 'Sub-tugas tidak ditemukan.');
  res.json({ success: true, data: updated, message: 'Sub-tugas berhasil diperbarui.' });
});

router.delete('/:id/tasks/:taskId/subtasks/:subtaskId', requireAuth, (req, res) => {
  const subtaskId = Number(req.params.subtaskId);
  if (!subtaskId || subtaskId < 1) return badRequest(res, 'ID sub-tugas tidak valid.');

  const result = deleteSubtask(subtaskId);
  if (!result) return notFound(res, 'Sub-tugas tidak ditemukan.');
  if (result && typeof result === 'object' && result.blocked) {
    return badRequest(res, result.reason);
  }
  res.json({ success: true, data: null, message: 'Sub-tugas berhasil dihapus.' });
});

// Dependencies (project-level)
router.get('/:id/dependencies', requireAuth, (req, res) => {
  const id = Number(req.params.id);
  if (!id || id < 1) return notFound(res, 'Proyek tidak ditemukan.');
  const deps = getDependenciesForProject(id);
  res.json({ success: true, data: deps });
});

router.post('/:id/dependencies', requireAuth, (req, res) => {
  const id = Number(req.params.id);
  if (!id || id < 1) return notFound(res, 'Proyek tidak ditemukan.');

  let body = {};
  try { body = req.body || {}; } catch { body = {}; }

  const predecessor_id = Number(body.predecessor_id);
  const successor_id = Number(body.successor_id);
  const type = body.type === 'SS' ? 'SS' : 'FS';
  const lag = Math.max(0, Math.floor(Number(body.lag) || 0));

  if (!predecessor_id || !successor_id) {
    return badRequest(res, 'Predecessor dan successor wajib diisi.');
  }

  const result = addDependency(id, { predecessor_id, successor_id, type, lag });
  if (!result) {
    return badRequest(res, 'Gagal menambahkan dependency.');
  }
  if (result.blocked) {
    return badRequest(res, result.reason);
  }
  if (result.conflict) {
    const existing = result.existing;
    return conflict(res, 'Pasangan predecessor-successor sudah ada.', {
      id: existing.id,
      predecessor_id: existing.predecessor_id,
      successor_id: existing.successor_id,
    });
  }

  res.status(201).json({ success: true, data: result, message: 'Dependency berhasil ditambahkan.' });
});

router.get('/:id/dependencies/:depId', requireAuth, (req, res) => {
  const depId = Number(req.params.depId);
  if (!depId || depId < 1) return badRequest(res, 'ID dependency tidak valid.');
  const dep = getDependencyById(depId);
  if (!dep) return notFound(res, 'Dependency tidak ditemukan.');
  res.json({ success: true, data: dep });
});

router.put('/:id/dependencies/:depId', requireAuth, (req, res) => {
  const depId = Number(req.params.depId);
  if (!depId || depId < 1) return badRequest(res, 'ID dependency tidak valid.');

  let body = {};
  try { body = req.body || {}; } catch { body = {}; }

  const type = body.type === 'SS' ? 'SS' : (body.type === 'FS' ? 'FS' : undefined);
  const lag = body.lag !== undefined ? Math.max(0, Math.floor(Number(body.lag) || 0)) : undefined;
  const predecessor_id = body.predecessor_id !== undefined ? Number(body.predecessor_id) : undefined;
  const successor_id = body.successor_id !== undefined ? Number(body.successor_id) : undefined;

  const result = updateDependency(depId, { type, lag, predecessor_id, successor_id });
  if (!result) return notFound(res, 'Dependency tidak ditemukan.');
  if (result.blocked) {
    return badRequest(res, result.reason);
  }
  if (result.conflict) {
    const existing = result.existing;
    return conflict(res, 'Pasangan predecessor-successor sudah digunakan dependency lain.', {
      id: existing.id,
      predecessor_id: existing.predecessor_id,
      successor_id: existing.successor_id,
    });
  }

  res.json({ success: true, data: result, message: 'Dependency berhasil diperbarui.' });
});

router.delete('/:id/dependencies/:depId', requireAuth, (req, res) => {
  const depId = Number(req.params.depId);
  if (!depId || depId < 1) return badRequest(res, 'ID dependency tidak valid.');

  const deleted = deleteDependency(depId);
  if (!deleted) return notFound(res, 'Dependency tidak ditemukan.');
  res.json({ success: true, data: null, message: 'Dependency berhasil dihapus.' });
});

// Dependencies (task-level) — nested under /projects/:projectId/tasks/:taskId/dependencies
router.get('/:id/tasks/:taskId/dependencies', requireAuth, (req, res) => {
  const projectId = Number(req.params.id);
  const taskId = Number(req.params.taskId);
  if (!projectId || projectId < 1) return notFound(res, 'Proyek tidak ditemukan.');
  if (!taskId || taskId < 1) return badRequest(res, 'ID tugas tidak valid.');

  const task = getTaskById(taskId);
  if (!task || task.project_id !== projectId) return notFound(res, 'Tugas tidak ditemukan.');

  const deps = getDependenciesForProject(projectId).filter((d) => d.predecessor_id === taskId || d.successor_id === taskId);
  res.json({ success: true, data: deps });
});

// Team
router.get('/:id/team', requireAuth, (req, res) => {
  const id = Number(req.params.id);
  if (!id || id < 1) return notFound(res, 'Proyek tidak ditemukan.');
  const members = getTeamMembersForProject(id);
  res.json({ success: true, data: members });
});

router.post('/:id/team', requireAuth, (req, res) => {
  const id = Number(req.params.id);
  if (!id || id < 1) return notFound(res, 'Proyek tidak ditemukan.');

  let body = {};
  try { body = req.body || {}; } catch { body = {}; }

  const name = sanitizeString(body.name, 200);
  if (isBlank(name)) return badRequest(res, 'Nama anggota wajib diisi.');

  const email = sanitizeString(body.email, 200);
  if (isBlank(email) || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return badRequest(res, 'Email tidak valid.');
  }

  const phone = sanitizeString(body.phone, 50);
  const role = sanitizeString(body.role, 100);
  const daily_rate = Math.max(0, Math.floor(Number(body.daily_rate) || 0));

  const member = addTeamMember(id, { name, email, phone, role, daily_rate });
  if (!member) {
    return badRequest(res, 'Gagal menambahkan anggota.');
  }
  if (member.conflict) {
    const existing = member.existing;
    return conflict(res, 'Email sudah digunakan oleh anggota lain di proyek ini.', {
      id: existing.id,
      name: existing.name,
    });
  }

  res.status(201).json({ success: true, data: member, message: 'Anggota berhasil ditambahkan.' });
});

router.get('/:id/team/:memberId', requireAuth, (req, res) => {
  const memberId = Number(req.params.memberId);
  if (!memberId || memberId < 1) return badRequest(res, 'ID anggota tidak valid.');
  const member = getTeamMemberById(memberId);
  if (!member) return notFound(res, 'Anggota tidak ditemukan.');
  res.json({ success: true, data: member });
});

router.put('/:id/team/:memberId', requireAuth, (req, res) => {
  const memberId = Number(req.params.memberId);
  if (!memberId || memberId < 1) return badRequest(res, 'ID anggota tidak valid.');

  let body = {};
  try { body = req.body || {}; } catch { body = {}; }

  const name = body.name !== undefined ? sanitizeString(body.name, 200) : undefined;
  const email = body.email !== undefined ? sanitizeString(body.email, 200) : undefined;
  const phone = body.phone !== undefined ? sanitizeString(body.phone, 50) : undefined;
  const role = body.role !== undefined ? sanitizeString(body.role, 100) : undefined;
  const daily_rate = body.daily_rate !== undefined ? Math.max(0, Math.floor(Number(body.daily_rate) || 0)) : undefined;

  if (email !== undefined && isBlank(email)) {
    return badRequest(res, 'Email tidak boleh kosong.');
  }
  if (email !== undefined && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return badRequest(res, 'Email tidak valid.');
  }

  const updated = updateTeamMember(memberId, { name, email, phone, role, daily_rate });
  if (!updated) return notFound(res, 'Anggota tidak ditemukan.');
  if (updated.conflict) {
    const existing = updated.existing;
    return conflict(res, 'Email sudah digunakan oleh anggota lain di proyek ini.', {
      id: existing.id,
      name: existing.name,
    });
  }

  res.json({ success: true, data: updated, message: 'Anggota berhasil diperbarui.' });
});

router.delete('/:id/team/:memberId', requireAuth, (req, res) => {
  const memberId = Number(req.params.memberId);
  if (!memberId || memberId < 1) return badRequest(res, 'ID anggota tidak valid.');

  const deleted = deleteTeamMember(memberId);
  if (!deleted) return notFound(res, 'Anggota tidak ditemukan.');
  res.json({ success: true, data: null, message: 'Anggota berhasil dihapus.' });
});

// Leaves
router.get('/:id/team/:memberId/leaves', requireAuth, (req, res) => {
  const memberId = Number(req.params.memberId);
  if (!memberId || memberId < 1) return badRequest(res, 'ID anggota tidak valid.');
  const member = getTeamMemberById(memberId);
  if (!member) return notFound(res, 'Anggota tidak ditemukan.');
  const leaves = getLeavesForMember(memberId);
  res.json({ success: true, data: leaves });
});

router.post('/:id/team/:memberId/leaves', requireAuth, (req, res) => {
  const memberId = Number(req.params.memberId);
  if (!memberId || memberId < 1) return badRequest(res, 'ID anggota tidak valid.');

  let body = {};
  try { body = req.body || {}; } catch { body = {}; }

  const start_date = (body.start_date || '').trim();
  const end_date = (body.end_date || '').trim();
  if (!isValidDateYMD(start_date)) return badRequest(res, 'Tanggal mulai tidak valid (YYYY-MM-DD).');
  if (!isValidDateYMD(end_date)) return badRequest(res, 'Tanggal selesai tidak valid (YYYY-MM-DD).');

  const reason = sanitizeString(body.reason, 500);

  const leave = addLeave(memberId, { start_date, end_date, reason });
  if (!leave) return badRequest(res, 'Gagal menambahkan cuti.');
  if (leave.blocked) {
    return badRequest(res, leave.reason);
  }

  res.status(201).json({ success: true, data: leave, message: 'Cuti berhasil ditambahkan.' });
});

router.delete('/:id/team/:memberId/leaves/:leaveId', requireAuth, (req, res) => {
  const leaveId = Number(req.params.leaveId);
  if (!leaveId || leaveId < 1) return badRequest(res, 'ID cuti tidak valid.');

  const deleted = deleteLeave(leaveId);
  if (!deleted) return notFound(res, 'Cuti tidak ditemukan.');
  res.json({ success: true, data: null, message: 'Cuti berhasil dihapus.' });
});

// Analysis
router.get('/:id/critical-path', requireAuth, (req, res) => {
  const id = Number(req.params.id);
  if (!id || id < 1) return notFound(res, 'Proyek tidak ditemukan.');
  try {
    const result = getCriticalPathForProject(id);
    res.json({ success: true, data: result });
  } catch (err) {
    console.error('[cpm]', err);
    res.status(500).json({ success: false, error: { message: 'Gagal menghitung jalur kritis.' } });
  }
});

router.get('/:id/gantt', requireAuth, (req, res) => {
  const id = Number(req.params.id);
  if (!id || id < 1) return notFound(res, 'Proyek tidak ditemukan.');
  try {
    const result = getGanttForProject(id);
    res.json({ success: true, data: result });
  } catch (err) {
    console.error('[gantt]', err);
    res.status(500).json({ success: false, error: { message: 'Gagal menyiapkan data Gantt.' } });
  }
});

router.get('/:id/pert', requireAuth, (req, res) => {
  const id = Number(req.params.id);
  if (!id || id < 1) return notFound(res, 'Proyek tidak ditemukan.');
  try {
    const result = getPertForProject(id);
    res.json({ success: true, data: result });
  } catch (err) {
    console.error('[pert]', err);
    res.status(500).json({ success: false, error: { message: 'Gagal menyiapkan data PERT.' } });
  }
});

// Workload
router.get('/:id/workload', requireAuth, (req, res) => {
  const id = Number(req.params.id);
  if (!id || id < 1) return notFound(res, 'Proyek tidak ditemukan.');
  const workload = getWorkloadForProject(id);
  res.json({ success: true, data: workload });
});

// Assignments (task-level nested under /projects/:projectId/tasks/:taskId/assignments)
router.get('/:id/tasks/:taskId/assignments', requireAuth, (req, res) => {
  const projectId = Number(req.params.id);
  const taskId = Number(req.params.taskId);
  if (!projectId || projectId < 1) return notFound(res, 'Proyek tidak ditemukan.');
  if (!taskId || taskId < 1) return badRequest(res, 'ID tugas tidak valid.');

  const task = getTaskById(taskId);
  if (!task || task.project_id !== projectId) return notFound(res, 'Tugas tidak ditemukan.');

  const assignments = getAssignmentsForTask(taskId);
  res.json({ success: true, data: assignments });
});

router.post('/:id/tasks/:taskId/assignments', requireAuth, (req, res) => {
  const projectId = Number(req.params.id);
  const taskId = Number(req.params.taskId);
  if (!projectId || projectId < 1) return notFound(res, 'Proyek tidak ditemukan.');
  if (!taskId || taskId < 1) return badRequest(res, 'ID tugas tidak valid.');

  const task = getTaskById(taskId);
  if (!task || task.project_id !== projectId) return notFound(res, 'Tugas tidak ditemukan.');

  let body = {};
  try { body = req.body || {}; } catch { body = {}; }

  const member_id = Number(body.member_id);
  if (!member_id || member_id < 1) {
    return badRequest(res, 'ID anggota wajib diisi.');
  }

  const result = addAssignment(taskId, member_id);
  if (!result) return badRequest(res, 'Gagal menambahkan penugasan.');
  if (result.blocked) {
    return badRequest(res, result.reason);
  }
  if (result.conflict) {
    const existing = result.existing;
    return conflict(res, 'Anggota ini sudah ditugaskan ke tugas ini.', {
      id: existing.id,
      task_id: existing.task_id,
      member_id: existing.member_id,
    });
  }

  res.status(201).json({ success: true, data: result, message: 'Penugasan berhasil ditambahkan.' });
});

router.delete('/:id/tasks/:taskId/assignments/:assignmentId', requireAuth, (req, res) => {
  const projectId = Number(req.params.id);
  const taskId = Number(req.params.taskId);
  const assignmentId = Number(req.params.assignmentId);
  if (!projectId || projectId < 1) return notFound(res, 'Proyek tidak ditemukan.');
  if (!taskId || taskId < 1) return badRequest(res, 'ID tugas tidak valid.');
  if (!assignmentId || assignmentId < 1) return badRequest(res, 'ID penugasan tidak valid.');

  const task = getTaskById(taskId);
  if (!task || task.project_id !== projectId) return notFound(res, 'Tugas tidak ditemukan.');

  const deleted = deleteAssignment(assignmentId);
  if (!deleted) return notFound(res, 'Penugasan tidak ditemukan.');
  res.json({ success: true, data: null, message: 'Penugasan berhasil dihapus.' });
});

export default router;
