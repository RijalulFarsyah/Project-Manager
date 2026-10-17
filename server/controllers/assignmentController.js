import {
  getAssignmentsForTask,
  addAssignment,
  deleteAssignment,
} from '../models/assignmentModel.js';
import { requireAuth } from '../middlewares/auth.js';
import { badRequest, notFound, conflict, ok } from '../utils/apiResponse.js';

export function listAssignments(req, res) {
  requireAuth(req, res, () => {
    const taskId = Number(req.params.id);
    if (!taskId || taskId < 1) return badRequest(res, 'ID tugas tidak valid.');
    const assignments = getAssignmentsForTask(taskId);
    res.json({ success: true, data: assignments });
  });
}

export function createAssignment(req, res) {
  requireAuth(req, res, () => {
    const taskId = Number(req.params.id);
    if (!taskId || taskId < 1) return badRequest(res, 'ID tugas tidak valid.');

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
}

export function deleteAssignmentHandler(req, res) {
  requireAuth(req, res, () => {
    const assignmentId = Number(req.params.id);
    if (!assignmentId || assignmentId < 1) return badRequest(res, 'ID penugasan tidak valid.');

    const deleted = deleteAssignment(assignmentId);
    if (!deleted) return notFound(res, 'Penugasan tidak ditemukan.');
    res.json({ success: true, data: null, message: 'Penugasan berhasil dihapus.' });
  });
}
