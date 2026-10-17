import { useState, useEffect, useMemo } from 'react';
import { Link, useParams, useNavigate, useLocation } from 'react-router-dom';
import { api } from '../api/client';
import {
  ArrowLeft,
  Calendar,
  CheckSquare,
  Users,
  GitBranch,
  ClipboardList,
  BarChart2,
  Flag,
  Settings,
  Edit2,
  X,
  AlertCircle,
  RefreshCw,
  Loader2,
  Plus,
} from 'lucide-react';
import { useConfirm } from '../hooks/useConfirm.jsx';

const TABS = [
  { to: 'calendar', label: 'Kalender Kerja', icon: Calendar },
  { to: 'tasks', label: 'Tugas', icon: CheckSquare },
  { to: 'team', label: 'Tim', icon: Users },
  { to: 'gantt', label: 'Gantt Chart', icon: GitBranch },
  { to: 'pert', label: 'PERT Chart', icon: ClipboardList },
  { to: 'critical', label: 'Critical Path', icon: BarChart2 },
  { to: 'settings', label: 'Pengaturan', icon: Settings },
];

function ProgressBar({ value, size = 'md' }) {
  const heightClass = size === 'sm' ? 'h-1.5' : 'h-2.5';
  const radiusClass = size === 'sm' ? 'rounded-full' : 'rounded-full';

  return (
    <div className={`w-full overflow-hidden rounded-full ${heightClass} ${radiusClass} bg-border`}>
      <div
        className="h-full rounded-full bg-primary transition-all duration-500"
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color = 'primary' }) {
  const colorMap = {
    primary: 'bg-primary/10 text-primary',
    success: 'bg-success/10 text-success',
    warning: 'bg-warning/10 text-warning',
    danger: 'bg-danger/10 text-danger',
  };

  return (
    <div className="rounded-card border border-border bg-surface p-4 shadow-sm">
      <div className="flex items-center gap-3">
        <div className={`flex h-9 w-9 items-center justify-center rounded-full text-sm ${colorMap[color] || colorMap.primary}`}>
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-medium text-text-secondary">{label}</p>
          <p className="text-lg font-semibold text-text-primary tabular-nums">{value}</p>
        </div>
      </div>
    </div>
  );
}

function EmptyModule({ icon: Icon, title, description, actionLabel, actionTo }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full border border-border bg-border/40">
        <Icon className="h-7 w-7 text-text-secondary" />
      </div>
      <div>
        <p className="text-sm font-medium text-text-primary">{title}</p>
        {description && <p className="mt-0.5 text-xs text-text-secondary">{description}</p>}
      </div>
      {actionTo && (
        <Link
          to={actionTo}
          className="inline-flex items-center gap-2 rounded-card bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-hover"
        >
          <Plus className="h-4 w-4" />
          {actionLabel}
        </Link>
      )}
    </div>
  );
}

function EditProjectModal({ project, onSave, onClose }) {
  const [name, setName] = useState(project?.name || '');
  const [organization, setOrganization] = useState(project?.organization || '');
  const [description, setDescription] = useState(project?.description || '');
  const [startDate, setStartDate] = useState(project?.start_date || '');
  const [endDate, setEndDate] = useState(project?.end_date || '');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const nameErr = !name.trim();
  const orgErr = !organization.trim();
  const dateErr = startDate && endDate && endDate < startDate;

  const fieldInvalid = (err) => (err ? 'border-danger focus:border-danger focus:ring-danger/20' : '');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (nameErr) return;
    if (orgErr) return;
    if (!startDate) return;
    if (dateErr) {
      setError('Tanggal selesai tidak boleh lebih awal dari tanggal mulai.');
      return;
    }

    setLoading(true);
    try {
      await onSave({
        name: name.trim(),
        organization: organization.trim(),
        description: description.trim(),
        start_date: startDate,
        end_date: endDate || null,
      });
      onClose();
    } catch (err) {
      setError(err.message || 'Gagal memperbarui proyek.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="w-full max-w-lg rounded-card border border-border bg-surface p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-text-primary">Edit Proyek</h2>
          <button onClick={onClose} className="rounded-full p-1 text-text-secondary transition-colors hover:bg-border hover:text-text-primary">
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="edit-name" className="text-sm font-medium text-text-primary">Nama proyek</label>
            <input id="edit-name" type="text" value={name} onChange={(e) => setName(e.target.value)} className={`h-10 w-full rounded-input border bg-surface px-3 text-sm text-text-primary focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-colors ${fieldInvalid(nameErr)}`} />
            {nameErr && <p className="text-xs text-danger">Nama proyek wajib diisi.</p>}
          </div>

          <div className="space-y-1.5">
            <label htmlFor="edit-org" className="text-sm font-medium text-text-primary">Organisasi</label>
            <input id="edit-org" type="text" value={organization} onChange={(e) => setOrganization(e.target.value)} className={`h-10 w-full rounded-input border bg-surface px-3 text-sm text-text-primary focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-colors ${fieldInvalid(orgErr)}`} />
            {orgErr && <p className="text-xs text-danger">Organisasi wajib diisi.</p>}
          </div>

          <div className="space-y-1.5">
            <label htmlFor="edit-desc" className="text-sm font-medium text-text-primary">Deskripsi</label>
            <textarea id="edit-desc" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} className="h-auto min-h-[60px] w-full resize-y rounded-input border border-border bg-surface px-3 py-2 text-sm text-text-primary focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-colors" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label htmlFor="edit-start" className="text-sm font-medium text-text-primary">Tanggal mulai</label>
              <input id="edit-start" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className={`h-10 w-full rounded-input border bg-surface px-3 text-sm text-text-primary focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-colors ${fieldInvalid(!startDate)}`} />
              {!startDate && <p className="text-xs text-danger">Tanggal mulai wajib diisi.</p>}
            </div>
            <div className="space-y-1.5">
              <label htmlFor="edit-end" className="text-sm font-medium text-text-primary">Tanggal selesai</label>
              <input id="edit-end" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} min={startDate} className={`h-10 w-full rounded-input border bg-surface px-3 text-sm text-text-primary focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-colors ${fieldInvalid(dateErr)}`} />
              {dateErr && <p className="text-xs text-danger">{dateErr}</p>}
            </div>
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
            <button type="submit" disabled={loading || nameErr || orgErr || !startDate} className="inline-flex items-center gap-2 rounded-input bg-primary px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60">
              {loading && <><Loader2 className="h-4 w-4 animate-spin" />Simpan...</>}
              {!loading && <><CheckSquare className="h-4 w-4" />Simpan</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function ProjectDetailPage() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { confirm } = useConfirm();

  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);

  const activeTab = useMemo(() => {
    const tab = location.pathname.match(new RegExp(`^/projects/${projectId}/([^/]+)`))?.[1];
    return tab || 'tasks';
  }, [location.pathname, projectId]);

  useEffect(() => {
    const fetchProject = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await api.get(`/projects/${projectId}`);
        setProject(res.data);
      } catch (err) {
        setError(err.message || 'Gagal memuat detail proyek.');
      } finally {
        setLoading(false);
      }
    };
    fetchProject();
  }, [projectId]);

  const handleEdit = async (data) => {
    setEditLoading(true);
    setEditError(null);
    try {
      const res = await api.put(`/projects/${projectId}`, data);
      setProject(res.data);
    } catch (err) {
      setEditError(err.message || 'Gagal memperbarui proyek.');
      throw err;
    } finally {
      setEditLoading(false);
    }
  };

  const handleDelete = async () => {
    const ok = await confirm({
      title: 'Hapus proyek?',
      description: `"${project?.name || 'Proyek ini'}" akan dihapus beserta seluruh datanya. Tindakan ini tidak dapat dibatalkan.`,
      confirmLabel: 'Hapus',
      variant: 'danger',
    });
    if (!ok) return;
    try {
      await api.del(`/projects/${projectId}`);
      navigate('/projects');
    } catch (err) {
      setError(`Gagal menghapus: ${err.message}`);
    }
  };

  const calcProgress = () => {
    if (!project?.tasks) return 0;
    const tasks = project.tasks;
    if (tasks.length === 0) return 0;
    const total = tasks.reduce((s, t) => s + (t.progress || 0), 0);
    return Math.round(total / tasks.length);
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            <span className="text-sm text-text-secondary">Memuat proyek...</span>
          </div>
        </div>
        <div className="space-y-6">
          <div className="h-8 w-64 animate-pulse rounded-lg bg-border" />
          <div className="grid grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 animate-pulse rounded-card bg-border" />
            ))}
          </div>
          <div className="h-12 animate-pulse rounded-lg bg-border" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-5xl">
        <Link to="/projects" className="mb-6 inline-flex items-center gap-1.5 text-sm text-text-secondary transition-colors hover:text-text-primary">
          <ArrowLeft className="h-4 w-4" /> Kembali ke Semua Proyek
        </Link>
        <div className="flex items-start gap-3 rounded-card border border-danger/30 bg-danger/5 p-4">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-danger" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-danger">Gagal memuat proyek</p>
            <p className="mt-0.5 text-sm text-text-secondary">{error}</p>
          </div>
          <button onClick={() => window.location.reload()} className="shrink-0 rounded-card border border-border bg-surface px-3 py-1.5 text-xs font-medium text-text-secondary transition-colors hover:bg-border/60">
            <RefreshCw className="mr-1 h-4 w-4" /> Coba lagi
          </button>
        </div>
      </div>
    );
  }

  if (!project) return null;

  const progress = calcProgress();
  const taskCount = project.tasks?.length || 0;
  const memberCount = project.team_members?.length || 0;

  const formatDate = (d) => {
    if (!d) return '-';
    const date = new Date(d);
    if (isNaN(date)) return '-';
    return date.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  return (
    <div className="mx-auto max-w-5xl">
      {/* Breadcrumb */}
      <Link to="/projects" className="mb-6 inline-flex items-center gap-1.5 text-sm text-text-secondary transition-colors hover:text-text-primary">
        <ArrowLeft className="h-4 w-4" /> Kembali ke Semua Proyek
      </Link>

      {/* Error banner (top-level) */}
      {error && (
        <div className="mb-5 flex items-start gap-3 rounded-card border border-danger/30 bg-danger/5 p-4">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-danger" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-danger">Error</p>
            <p className="mt-0.5 text-sm text-text-secondary">{error}</p>
          </div>
          <button onClick={() => window.location.reload()} className="shrink-0 rounded-card border border-border bg-surface px-3 py-1.5 text-xs font-medium text-text-secondary transition-colors hover:bg-border/60">
            <RefreshCw className="mr-1 h-4 w-4" /> Refresh
          </button>
        </div>
      )}

      {/* Header */}
      <div className="mb-6 rounded-card border border-border bg-surface p-6 shadow-sm">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-xl font-semibold text-text-primary truncate">{project.name || '-'}</h1>
            <p className="mt-0.5 text-sm text-text-secondary">{project.organization || '-'}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Link
              to={`/projects/${projectId}/settings`}
              className="inline-flex items-center gap-1.5 rounded-card border border-border bg-surface px-3 py-1.5 text-xs font-medium text-text-secondary transition-colors hover:bg-border/60 hover:text-text-primary"
            >
              <Settings className="h-4 w-4" />
              Pengaturan
            </Link>
            <button
              onClick={() => setShowEditModal(true)}
              className="inline-flex items-center gap-1.5 rounded-card bg-primary text-white px-3 py-1.5 text-xs font-medium transition-colors hover:bg-primary-hover"
            >
              <Edit2 className="h-4 w-4" />
              Edit
            </button>
          </div>
        </div>

        {project.description && (
          <p className="mb-4 text-sm text-text-secondary">{project.description}</p>
        )}

        <div className="flex flex-wrap items-center gap-4 text-sm text-text-secondary">
          <span className="flex items-center gap-1.5">
            <Calendar className="h-4 w-4" />
            Mulai: <span className="font-medium text-text-primary">{formatDate(project.start_date)}</span>
          </span>
          {project.end_date && (
            <span className="flex items-center gap-1.5">
              Selesai: <span className="font-medium text-text-primary">{formatDate(project.end_date)}</span>
            </span>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="mb-6 grid grid-cols-3 gap-4">
        <StatCard icon={CheckSquare} label="Total Tugas" value={taskCount} color="primary" />
        <StatCard icon={Users} label="Jumlah Anggota" value={memberCount} color="success" />
        <StatCard icon={BarChart2} label="Progress" value={`${progress}%`} color={progress === 100 ? 'success' : progress > 0 ? 'warning' : 'primary'} />
      </div>

      {/* Overall Progress */}
      <div className="mb-6 rounded-card border border-border bg-surface p-4 shadow-sm">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-sm font-medium text-text-primary">Progress keseluruhan</p>
          <span className="text-sm font-semibold text-text-primary tabular-nums">{progress}%</span>
        </div>
        <ProgressBar value={progress} />
      </div>

      {/* Tabs */}
      <div className="mb-4 flex flex-wrap gap-1 border-b border-border">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const href = `/projects/${projectId}/${tab.to}`;
          const active = activeTab === tab.to;

          return (
            <Link
              key={tab.to}
              to={href}
              className={`flex items-center gap-2 rounded-t-[0px] px-3 py-2 text-sm font-medium transition-colors ${
                active
                  ? 'border-b-2 border-primary text-primary'
                  : 'border-b-2 border-transparent text-text-secondary hover:text-text-primary'
              }`}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </Link>
          );
        })}
      </div>

      {/* Tab content placeholder */}
      <div className="rounded-card border border-border bg-surface p-6 shadow-sm">
        <EmptyModule
          icon={TABS.find((t) => t.to === activeTab)?.icon || ClipboardList}
          title="Modul ini sedang dikerjakan"
          description={`Fitur "${activeTab}" akan segera tersedia.`}
          actionLabel="Kembali ke daftar"
          actionTo={`/projects/${projectId}/tasks`}
        />
      </div>

      {/* Edit modal */}
      {showEditModal && (
        <EditProjectModal
          project={project}
          onSave={handleEdit}
          onClose={() => setShowEditModal(false)}
        />
      )}
    </div>
  );
}
