import {
  getAllProjects,
  getProjectById,
  createProject,
  updateProject,
  deleteProject,
} from '../models/projectModel.js';
import { requireAuth } from '../middlewares/auth.js';
import { badRequest, notFound, conflict, ok } from '../utils/apiResponse.js';
import { isBlank, sanitizeString, isValidDateYMD } from '../utils/helpers.js';

export function listProjects(req, res) {
  requireAuth(req, res, () => {
    const q = (req.query.q || '').trim();
    const rows = getAllProjects();
    if (q) {
      const lower = q.toLowerCase();
      const filtered = rows.filter(
        (p) =>
          p.name.toLowerCase().includes(lower) ||
          (p.organization && p.organization.toLowerCase().includes(lower))
      );
      return res.json({ success: true, data: filtered });
    }
    return res.json({ success: true, data: rows });
  });
}

export function getProject(req, res) {
  requireAuth(req, res, () => {
    const id = Number(req.params.id);
    if (!id || id < 1) return notFound(res, 'Proyek tidak ditemukan.');
    const project = getProjectById(id);
    if (!project) return notFound(res, 'Proyek tidak ditemukan.');
    return res.json({ success: true, data: project });
  });
}

export function createProjectHandler(req, res) {
  requireAuth(req, res, () => {
    let body = {};
    try {
      body = req.body || {};
    } catch {
      body = {};
    }

    const name = sanitizeString(body.name, 200);
    const organization = sanitizeString(body.organization, 200);
    const description = sanitizeString(body.description, 2000);
    const start_date = (body.start_date || '').trim();

    if (isBlank(name)) return badRequest(res, 'Nama proyek wajib diisi.');
    if (!isValidDateYMD(start_date)) return badRequest(res, 'Tanggal mulai tidak valid (format YYYY-MM-DD).');

    const project = createProject({ name, organization, description, start_date });
    return res.status(201).json({ success: true, data: project, message: 'Proyek berhasil dibuat.' });
  });
}

export function updateProjectHandler(req, res) {
  requireAuth(req, res, () => {
    const id = Number(req.params.id);
    if (!id || id < 1) return notFound(res, 'Proyek tidak ditemukan.');

    let body = {};
    try {
      body = req.body || {};
    } catch {
      body = {};
    }

    const name = body.name !== undefined ? sanitizeString(body.name, 200) : undefined;
    const organization = body.organization !== undefined ? sanitizeString(body.organization, 200) : undefined;
    const description = body.description !== undefined ? sanitizeString(body.description, 2000) : undefined;
    const start_date = body.start_date !== undefined ? (body.start_date || '').trim() : undefined;
    const end_date = body.end_date !== undefined ? (body.end_date || '').trim() || null : undefined;

    if (start_date !== undefined && start_date !== null && start_date !== '' && !isValidDateYMD(start_date)) {
      return badRequest(res, 'Tanggal mulai tidak valid (format YYYY-MM-DD).');
    }
    if (end_date !== undefined && end_date !== null && end_date !== '' && !isValidDateYMD(end_date)) {
      return badRequest(res, 'Tanggal selesai tidak valid (format YYYY-MM-DD).');
    }

    const existing = getProjectById(id);
    if (!existing) return notFound(res, 'Proyek tidak ditemukan.');

    if (start_date && end_date && end_date < start_date) {
      return badRequest(res, 'Tanggal selesai tidak boleh lebih awal daripada tanggal mulai.');
    }

    const updated = updateProject(id, { name, organization, description, start_date, end_date });
    return res.json({ success: true, data: updated, message: 'Proyek berhasil diperbarui.' });
  });
}

export function deleteProjectHandler(req, res) {
  requireAuth(req, res, () => {
    const id = Number(req.params.id);
    if (!id || id < 1) return notFound(res, 'Proyek tidak ditemukan.');

    const deleted = deleteProject(id);
    if (!deleted) return notFound(res, 'Proyek tidak ditemukan.');
    return res.json({ success: true, data: null, message: 'Proyek dan seluruh datanya berhasil dihapus.' });
  });
}
