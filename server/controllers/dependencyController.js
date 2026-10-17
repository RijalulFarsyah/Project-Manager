import {
  getDependenciesForProject,
  getDependencyById,
  addDependency,
  updateDependency,
  deleteDependency,
} from '../models/dependencyModel.js';
import { requireAuth } from '../middlewares/auth.js';
import { badRequest, notFound, conflict, ok } from '../utils/apiResponse.js';

export function listDependencies(req, res) {
  requireAuth(req, res, () => {
    const projectId = Number(req.params.id);
    if (!projectId || projectId < 1) return notFound(res, 'Proyek tidak ditemukan.');
    const deps = getDependenciesForProject(projectId);
    res.json({ success: true, data: deps });
  });
}

export function getDependency(req, res) {
  requireAuth(req, res, () => {
    const depId = Number(req.params.id);
    if (!depId || depId < 1) return badRequest(res, 'ID dependency tidak valid.');
    const dep = getDependencyById(depId);
    if (!dep) return notFound(res, 'Dependency tidak ditemukan.');
    res.json({ success: true, data: dep });
  });
}

export function createDependency(req, res) {
  requireAuth(req, res, () => {
    const projectId = Number(req.params.id);
    if (!projectId || projectId < 1) return notFound(res, 'Proyek tidak ditemukan.');

    let body = {};
    try { body = req.body || {}; } catch { body = {}; }

    const predecessor_id = Number(body.predecessor_id);
    const successor_id = Number(body.successor_id);
    const type = body.type === 'SS' ? 'SS' : 'FS';
    const lag = Math.max(0, Math.floor(Number(body.lag) || 0));

    if (!predecessor_id || !successor_id) {
      return badRequest(res, 'Predecessor dan successor wajib diisi.');
    }

    const result = addDependency(projectId, { predecessor_id, successor_id, type, lag });
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
}

export function updateDependencyHandler(req, res) {
  requireAuth(req, res, () => {
    const depId = Number(req.params.id);
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
}

export function deleteDependencyHandler(req, res) {
  requireAuth(req, res, () => {
    const depId = Number(req.params.id);
    if (!depId || depId < 1) return badRequest(res, 'ID dependency tidak valid.');

    const deleted = deleteDependency(depId);
    if (!deleted) return notFound(res, 'Dependency tidak ditemukan.');
    res.json({ success: true, data: null, message: 'Dependency berhasil dihapus.' });
  });
}
