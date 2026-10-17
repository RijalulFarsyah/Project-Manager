import { useState, useEffect, useCallback } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api/client';
import {
  Plus,
  Trash2,
  Edit2,
  Users,
  Calendar,
  AlertCircle,
  RefreshCw,
  Loader2,
  CheckCircle,
  X,
  Phone,
  Mail,
  Briefcase,
  DollarSign,
} from 'lucide-react';
import { useConfirm } from '../hooks/useConfirm.jsx';

const DAY_LABELS = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];

function MemberCard({ member, onEdit, onDelete }) {
  return (
    <div className="rounded-card border border-border bg-surface p-4 shadow-sm transition-colors hover:bg-border/40">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate font-semibold text-text-primary">{member.name}</h3>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-text-secondary">
            <span className="flex items-center gap-1">
              <Mail className="h-3.5 w-3.5" />
              {member.email}
            </span>
            {member.phone && (
              <span className="flex items-center gap-1">
                <Phone className="h-3.5 w-3.5" />
                {member.phone}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => onEdit(member)}
            className="rounded-full p-1.5 text-text-secondary transition-colors hover:bg-border hover:text-text-primary"
            title="Edit"
          >
            <Edit2 className="h-4 w-4" />
          </button>
          <button
            onClick={() => onDelete(member)}
            className="rounded-full p-1.5 text-danger transition-colors hover:bg-danger/10 hover:text-danger"
            title="Hapus"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-text-secondary">
        <span className="flex items-center gap-1">
          <Briefcase className="h-3.5 w-3.5" />
          {member.role || '-'}
        </span>
        <span className="flex items-center gap-1">
          <DollarSign className="h-3.5 w-3.5" />
          Rp {Number(member.daily_rate || 0).toLocaleString('id-ID')}
        </span>
      </div>
    </div>
  );
}

function MemberFormModal({ member, projectId, onSave, onClose, title }) {
  const [name, setName] = useState(member?.name || '');
  const [email, setEmail] = useState(member?.email || '');
  const [phone, setPhone] = useState(member?.phone || '');
  const [role, setRole] = useState(member?.role || '');
  const [dailyRate, setDailyRate] = useState(member?.daily_rate || 0);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const nameErr = !name.trim();
  const emailErr = !email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const emailErrText = email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? 'Format email tidak valid.' : !email.trim() ? 'Email wajib diisi.' : '';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    if (nameErr) return;
    if (emailErr) return;

    setLoading(true);
    try {
      const payload = {
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        role: role.trim(),
        daily_rate: Math.max(0, Math.floor(Number(dailyRate) || 0)),
      };
      await onSave(payload);
      onClose();
    } catch (err) {
      setError(err.message || 'Gagal menyimpan anggota.');
    } finally {
      setLoading(false);
    }
  };

  const fieldInvalid = (err) => (err ? 'border-danger focus:border-danger focus:ring-danger/20' : '');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="w-full max-w-md rounded-card border border-border bg-surface p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-text-primary">{title}</h2>
          <button onClick={onClose} className="rounded-full p-1 text-text-secondary transition-colors hover:bg-border hover:text-text-primary">
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-text-primary">Nama <span className="text-danger">*</span></label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Nama lengkap" className={`h-10 w-full rounded-input border bg-surface px-3 text-sm text-text-primary placeholder:text-text-secondary focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-colors ${fieldInvalid(nameErr)}`} />
            {nameErr && <p className="text-xs text-danger">Nama wajib diisi.</p>}
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-text-primary">Email <span className="text-danger">*</span></label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@contoh.com" className={`h-10 w-full rounded-input border bg-surface px-3 text-sm text-text-primary placeholder:text-text-secondary focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-colors ${fieldInvalid(emailErr)}`} />
            {emailErrText && <p className="text-xs text-danger">{emailErrText}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-text-primary">Telepon</label>
              <input type="text" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="0812..." className="h-10 w-full rounded-input border border-border bg-surface px-3 text-sm text-text-primary placeholder:text-text-secondary focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-colors" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-text-primary">Peran</label>
              <input type="text" value={role} onChange={(e) => setRole(e.target.value)} placeholder="Project Manager" className="h-10 w-full rounded-input border border-border bg-surface px-3 text-sm text-text-primary placeholder:text-text-secondary focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-colors" />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-text-primary">Gaji harian (Rp)</label>
            <input type="number" min={0} value={dailyRate} onChange={(e) => setDailyRate(Math.max(0, Math.floor(Number(e.target.value) || 0)))} className="h-10 w-full rounded-input border border-border bg-surface px-3 text-sm text-text-primary focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-colors" />
          </div>

          {error && (
            <div className="flex items-start gap-3 rounded-card border border-danger/30 bg-danger/5 p-3">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-danger" />
              <p className="text-sm text-danger">{error}</p>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="rounded-input border border-border bg-surface px-4 py-2 text-sm font-medium text-text-secondary transition-colors hover:bg-border/60">
              Batal
            </button>
            <button type="submit" disabled={loading || nameErr || emailErr} className="inline-flex items-center gap-2 rounded-input bg-primary px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60">
              {loading && <><Loader2 className="h-4 w-4 animate-spin" />Simpan...</>}
              {!loading && <><CheckCircle className="h-4 w-4" />Simpan</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function LeaveModal({ member, projectId, onClose, existingLeaves }) {
  const [leaves, setLeaves] = useState(existingLeaves || []);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  const handleAddLeave = async (e) => {
    e.preventDefault();
    setError(null);
    if (!startDate || !endDate) {
      setError('Tanggal mulai dan selesai wajib diisi.');
      return;
    }
    if (endDate < startDate) {
      setError('Tanggal selesai tidak boleh sebelum tanggal mulai.');
      return;
    }

    setSaving(true);
    try {
      await api.post(`/projects/${projectId}/team/${member.id}/leaves`, {
        start_date: startDate,
        end_date: endDate,
        reason: reason.trim(),
      });
      await fetchDataLeaves();
      setStartDate('');
      setEndDate('');
      setReason('');
    } catch (err) {
      setError(err.message || 'Gagal menambah cuti.');
    } finally {
      setSaving(false);
    }
  };

  const deleteLeave = async (leave) => {
    const ok = await confirm({
      title: 'Hapus cuti?',
      description: `Cuti ${leave.start_date} s/d ${leave.end_date}${leave.reason ? ' — ' + leave.reason : ''}`,
      confirmLabel: 'Hapus',
      variant: 'danger',
    });
    if (!ok) return;
    try {
      await api.del(`/projects/${projectId}/team/${member.id}/leaves/${leave.id}`);
      await fetchDataLeaves();
    } catch (err) {
      setError(`Gagal menghapus: ${err.message}`);
    }
  };

  const fetchDataLeaves = useCallback(async () => {
    try {
      const res = await api.get(`/projects/${projectId}/team/${member.id}/leaves`);
      setLeaves(res.data || []);
    } catch {
      setLeaves([]);
    }
  }, [member.id, projectId]);

  useEffect(() => {
    fetchDataLeaves();
  }, [fetchDataLeaves]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="w-full max-w-lg rounded-card border border-border bg-surface p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-text-primary">
            Cuti — {member.name}
          </h2>
          <button onClick={onClose} className="rounded-full p-1 text-text-secondary transition-colors hover:bg-border hover:text-text-primary">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mb-4">
          <h3 className="mb-3 text-sm font-medium text-text-primary">Tambah Cuti Baru</h3>
          <form onSubmit={handleAddLeave} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-text-secondary">Tanggal mulai</label>
                <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="h-9 w-full rounded-input border border-border bg-surface px-3 text-sm text-text-primary focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-text-secondary">Tanggal selesai</label>
                <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} min={startDate} className="h-9 w-full rounded-input border border-border bg-surface px-3 text-sm text-text-primary focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20" />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-text-secondary">Alasan</label>
              <input type="text" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Opsional" className="h-9 w-full rounded-input border border-border bg-surface px-3 text-sm text-text-primary placeholder:text-text-secondary focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20" />
            </div>
            {error && (
              <div className="flex items-start gap-3 rounded-card border border-danger/30 bg-danger/5 p-3">
                <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-danger" />
                <p className="text-sm text-danger">{error}</p>
              </div>
            )}
            <div className="flex justify-end">
              <button type="submit" disabled={saving || !startDate || !endDate} className="inline-flex items-center gap-2 rounded-input bg-primary px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60">
                {saving && <><Loader2 className="h-4 w-4 animate-spin" />Tambah...</>}
                {!saving && <><Plus className="h-4 w-4" />Tambah Cuti</>}
              </button>
            </div>
          </form>
        </div>

        {leaves.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-6 text-center">
            <Calendar className="h-6 w-6 text-text-secondary" />
            <p className="text-sm text-text-secondary">Belum ada cuti untuk anggota ini.</p>
          </div>
        ) : (
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-text-primary">Daftar Cuti</h3>
            {leaves.map((leave) => (
              <div key={leave.id} className="flex items-center justify-between gap-3 rounded-card border border-border/80 bg-surface/50 px-4 py-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-text-secondary" />
                    <span className="text-sm font-medium text-text-primary">{leave.start_date} s/d {leave.end_date}</span>
                  </div>
                  {leave.reason && <p className="truncate text-xs text-text-secondary">{leave.reason}</p>}
                </div>
                <button onClick={() => deleteLeave(leave)} className="shrink-0 rounded-full p-1.5 text-danger transition-colors hover:bg-danger/10">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function TeamPage() {
  const { projectId } = useParams();
  const { confirm } = useConfirm();

  const [members, setMembers] = useState([]);
  const [workload, setWorkload] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Modal state
  const [showMemberForm, setShowMemberForm] = useState(false);
  const [editingMember, setEditingMember] = useState(null);
  const [leaveModal, setLeaveModal] = useState(null); // { member }

  // Fetch
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [memRes, wlRes] = await Promise.all([
        api.get(`/projects/${projectId}/team`),
        api.get(`/projects/${projectId}/workload`),
      ]);
      setMembers(memRes.data || []);
      setWorkload(wlRes.data || []);
    } catch (err) {
      setError(err.message || 'Gagal memuat data tim.');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const createMember = useCallback(async (data) => {
    const res = await api.post(`/projects/${projectId}/team`, data);
    setMembers((prev) => [...prev, res.data]);
    return res.data;
  }, [projectId]);

  const updateMember = useCallback(async (payload) => {
    const res = await api.put(`/projects/${projectId}/team/${editingMember.id}`, payload);
    setMembers((prev) => prev.map((m) => (m.id === res.data.id ? res.data : m)));
  }, [projectId, editingMember]);

  const deleteMember = useCallback(async (member) => {
    const ok = await confirm({
      title: 'Hapus anggota?',
      description: `"${member.name}" akan dihapus dari proyek ini.`,
      confirmLabel: 'Hapus',
      variant: 'danger',
    });
    if (!ok) return;
    try {
      await api.del(`/projects/${projectId}/team/${member.id}`);
      setMembers((prev) => prev.filter((m) => m.id !== member.id));
    } catch (err) {
      setError(`Gagal menghapus: ${err.message}`);
      setTimeout(fetchData, 1000);
    }
  }, [projectId, confirm, fetchData]);

  const openAddMember = () => {
    setEditingMember(null);
    setShowMemberForm(true);
  };

  const openEditMember = (member) => {
    setEditingMember(member);
    setShowMemberForm(true);
  };

  const openLeaveModal = (member) => {
    setLeaveModal({ member });
  };

  const workloadMap = {};
  workload.forEach((w) => {
    workloadMap[w.member.id] = w;
  });

  if (loading && members.length === 0) {
    return (
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            <span className="text-sm text-text-secondary">Memuat tim...</span>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-28 animate-pulse rounded-card bg-border" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl">
      {/* Breadcrumb */}
      <Link to={`/projects/${projectId}`} className="mb-6 inline-flex items-center gap-1.5 text-sm text-text-secondary transition-colors hover:text-text-primary">
        <ArrowLeft className="h-4 w-4" />
        Kembali ke Overview
      </Link>

      {error && (
        <div className="mb-5 flex items-start gap-3 rounded-card border border-danger/30 bg-danger/5 p-4">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-danger" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-danger">Error</p>
            <p className="mt-0.5 text-sm text-text-secondary">{error}</p>
          </div>
          <button onClick={fetchData} className="shrink-0 rounded-card border border-border bg-surface px-3 py-1.5 text-xs font-medium text-text-secondary transition-colors hover:bg-border/60">
            <RefreshCw className="mr-1 h-4 w-4" /> Refresh
          </button>
        </div>
      )}

      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-text-primary">Tim & Anggota</h1>
        <button onClick={openAddMember} className="inline-flex items-center gap-2 rounded-card bg-primary px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-primary-hover">
          <Plus className="h-4 w-4" />
          Tambah Anggota
        </button>
      </div>

      {/* Workload summary */}
      {workload.length > 0 && (
        <div className="mb-6 rounded-card border border-border bg-surface p-4 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold text-text-primary uppercase tracking-wide">Beban Kerja Tim</h2>
          <div className="flex flex-wrap gap-3">
            {workload.map((wl) => (
              <div key={wl.member.id} className="flex items-center gap-3 rounded-card border border-border/80 bg-surface/60 px-4 py-2">
                <div className={`flex h-9 w-9 items-center justify-center rounded-full ${wl.active_task_count > 0 ? 'bg-warning/10 text-warning' : 'bg-success/10 text-success'}`}>
                  <Briefcase className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-text-primary">{wl.member.name}</p>
                  <p className="text-xs text-text-secondary">
                    {wl.active_task_count > 0
                      ? `${wl.active_task_count} tugas aktif`
                      : 'Tidak ada tugas aktif'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Member list */}
      {members.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 py-16">
          <div className="flex h-14 w-14 items-center justify-center rounded-full border border-border bg-border/40">
            <Users className="h-7 w-7 text-text-secondary" />
          </div>
          <div>
            <p className="text-sm font-medium text-text-primary">Belum ada anggota tim</p>
            <p className="mt-0.5 text-xs text-text-secondary">Tambahkan anggota untuk memulai kolaborasi.</p>
          </div>
          <button onClick={openAddMember} className="mt-2 inline-flex items-center gap-2 rounded-card bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-hover">
            <Plus className="h-4 w-4" />
            Tambah Anggota
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {members.map((member) => (
            <div key={member.id} className="group">
              <MemberCard
                member={member}
                onEdit={openEditMember}
                onDelete={deleteMember}
              />
              <div className="mt-2 flex justify-end">
                <button
                  onClick={() => openLeaveModal(member)}
                  className="inline-flex items-center gap-1.5 rounded-card border border-border bg-surface px-3 py-1.5 text-xs font-medium text-text-secondary transition-colors hover:bg-border/60 hover:text-text-primary"
                >
                  <Calendar className="h-3.5 w-3.5" />
                  Lihat Cuti
                </button>
              </div>
              {workloadMap[member.id] && (
                <div className="mt-2 flex items-center gap-2 text-xs text-text-secondary">
                  <Briefcase className="h-3.5 w-3.5" />
                  {workloadMap[member.id].active_task_count > 0
                    ? `${workloadMap[member.id].active_task_count} tugas aktif`
                    : 'Belum ada tugas'}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Member form modal */}
      {showMemberForm && (
        <MemberFormModal
          member={editingMember}
          projectId={projectId}
          onSave={editingMember ? updateMember : createMember}
          onClose={() => setShowMemberForm(false)}
          title={editingMember ? 'Edit Anggota' : 'Tambah Anggota Baru'}
        />
      )}

      {/* Leave modal */}
      {leaveModal && (
        <LeaveModal
          member={leaveModal.member}
          projectId={projectId}
          onClose={() => setLeaveModal(null)}
        />
      )}
    </div>
  );
}

function ArrowLeft({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
    </svg>
  );
}
