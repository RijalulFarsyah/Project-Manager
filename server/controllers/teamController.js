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
import { requireAuth } from '../middlewares/auth.js';
import { badRequest, notFound, conflict, ok } from '../utils/apiResponse.js';
import { sanitizeString, isBlank, isValidDateYMD } from '../utils/helpers.js';

export function listTeam(req, res) {
  requireAuth(req, res, () => {
    const projectId = Number(req.params.id);
    if (!projectId || projectId < 1) return notFound(res, 'Proyek tidak ditemukan.');
    const members = getTeamMembersForProject(projectId);
    res.json({ success: true, data: members });
  });
}

export function getTeamMember(req, res) {
  requireAuth(req, res, () => {
    const memberId = Number(req.params.id);
    if (!memberId || memberId < 1) return badRequest(res, 'ID anggota tidak valid.');
    const member = getTeamMemberById(memberId);
    if (!member) return notFound(res, 'Anggota tidak ditemukan.');
    res.json({ success: true, data: member });
  });
}

export function createTeamMember(req, res) {
  requireAuth(req, res, () => {
    const projectId = Number(req.params.id);
    if (!projectId || projectId < 1) return notFound(res, 'Proyek tidak ditemukan.');

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

    const member = addTeamMember(projectId, { name, email, phone, role, daily_rate });
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
}

export function updateTeamMemberHandler(req, res) {
  requireAuth(req, res, () => {
    const memberId = Number(req.params.id);
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
}

export function deleteTeamMemberHandler(req, res) {
  requireAuth(req, res, () => {
    const memberId = Number(req.params.id);
    if (!memberId || memberId < 1) return badRequest(res, 'ID anggota tidak valid.');

    const deleted = deleteTeamMember(memberId);
    if (!deleted) return notFound(res, 'Anggota tidak ditemukan.');
    res.json({ success: true, data: null, message: 'Anggota berhasil dihapus.' });
  });
}

export function listLeaves(req, res) {
  requireAuth(req, res, () => {
    const memberId = Number(req.params.id);
    if (!memberId || memberId < 1) return badRequest(res, 'ID anggota tidak valid.');
    const member = getTeamMemberById(memberId);
    if (!member) return notFound(res, 'Anggota tidak ditemukan.');
    const leaves = getLeavesForMember(memberId);
    res.json({ success: true, data: leaves });
  });
}

export function createLeave(req, res) {
  requireAuth(req, res, () => {
    const memberId = Number(req.params.id);
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
}

export function deleteLeaveHandler(req, res) {
  requireAuth(req, res, () => {
    const leaveId = Number(req.params.id);
    if (!leaveId || leaveId < 1) return badRequest(res, 'ID cuti tidak valid.');

    const deleted = deleteLeave(leaveId);
    if (!deleted) return notFound(res, 'Cuti tidak ditemukan.');
    res.json({ success: true, data: null, message: 'Cuti berhasil dihapus.' });
  });
}

export function getWorkload(req, res) {
  requireAuth(req, res, () => {
    const projectId = Number(req.params.id);
    if (!projectId || projectId < 1) return notFound(res, 'Proyek tidak ditemukan.');
    const workload = getWorkloadForProject(projectId);
    res.json({ success: true, data: workload });
  });
}
