import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../api/client';
import { useConfirm } from '../hooks/useConfirm.jsx';
import {
  ArrowLeft,
  Save,
  Trash2,
  AlertCircle,
  Loader2,
  Calendar,
} from 'lucide-react';

const isBlank = (x) => !x || String(x).trim() === '';

export default function ProjectSettingsPage() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { confirm } = useConfirm();

  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saveLoading, setSaveLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [error, setError] = useState(null);
  const [saveError, setSaveError] = useState(null);
  const [deleteError, setDeleteError] = useState(null);

  const [name, setName] = useState('');
  const [organization, setOrganization] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    const fetchProject = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await api.get(`/projects/${projectId}`);
        const data = res.data;
        setProject(data);
        setName(data.name || '');
        setOrganization(data.organization || '');
        setDescription(data.description || '');
        setStartDate(data.start_date || '');
        setEndDate(data.end_date || '');
      } catch (err) {
        setError(err.message || 'Gagal memuat proyek.');
      } finally {
        setLoading(false);
      }
    };
    fetchProject();
  }, [projectId]);

  const isBlank = (x) => !x || x.trim() === '';

  const nameErr = isBlank(name);
  const orgErr = isBlank(organization);
  const dateErr = startDate && endDate && endDate < startDate;

  const fieldInvalid = (err) =>
    err ? 'border-danger focus:border-danger focus:ring-danger/20' : '';

  const handleSave = async (e) => {
    e.preventDefault();
    setSaveError(null);

    if (nameErr) return;
    if (orgErr) return;
    if (!startDate) return;
    if (dateErr) {
      setSaveError('Tanggal selesai tidak boleh lebih awal dari tanggal mulai.');
      return;
    }

    setSaveLoading(true);
    try {
      const res = await api.put(`/projects/${projectId}`, {
        name: name.trim(),
        organization: organization.trim(),
        description: description.trim(),
        start_date: startDate,
        end_date: endDate || null,
      });
      setProject(res.data);
      setSaveError(null);
    } catch (err) {
      setSaveError(err.message || 'Gagal menyimpan perubahan.');
    } finally {
      setSaveLoading(false);
    }
  };

  const handleDelete = async () => {
    const ok = await confirm({
      title: 'Hapus proyek?',
      description: `\"${name || 'Proyek ini'}\" akan dihapus beserta seluruh datanya. Tindakan ini tidak dapat dibatalkan.`,
      confirmLabel: 'Hapus',
      variant: 'danger',
    });
    if (!ok) return;

    setDeleteLoading(true);
    setDeleteError(null);
    try {
      await api.del(`/projects/${projectId}`);
      navigate('/projects');
    } catch (err) {
      setDeleteError(err.message || 'Gagal menghapus proyek.');
      setDeleteLoading(false);
    }
  };

  const formatDate = (d) => {
    if (!d) return '-';
    const date = new Date(d);
    if (isNaN(date)) return '-';
    return date.toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            <span className="text-sm text-text-secondary">Memuat pengaturan...</span>
          </div>
        </div>
        <div className="space-y-6">
          <div className="h-8 w-72 animate-pulse rounded-lg bg-border" />
          <div className="grid grid-cols-2 gap-4">
            <div className="h-10 animate-pulse rounded-input bg-border" />
            <div className="h-10 animate-pulse rounded-input bg-border" />
          </div>
          <div className="h-24 animate-pulse rounded-input bg-border" />
          <div className="grid grid-cols-2 gap-4">
            <div className="h-10 animate-pulse rounded-input bg-border" />
            <div className="h-10 animate-pulse rounded-input bg-border" />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-2xl">
        <Link
          to="/projects"
          className="mb-6 inline-flex items-center gap-1.5 text-sm text-text-secondary transition-colors hover:text-text-primary"
        >
          <ArrowLeft className="h-4 w-4" /> Kembali ke Semua Proyek
        </Link>
        <div className="flex items-start gap-3 rounded-card border border-danger/30 bg-danger/5 p-4">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-danger" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-danger">Gagal memuat proyek</p>
            <p className="mt-0.5 text-sm text-text-secondary">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!project) return null;

  return (
    <div className="mx-auto max-w-2xl">
      {/* Breadcrumb */}
      <Link
        to={`/projects/${projectId}`}
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-text-secondary transition-colors hover:text-text-primary"
      >
        <ArrowLeft className="h-4 w-4" /> Kembali ke Overview Proyek
      </Link>

      {/* Error banner (top-level) */}
      {(error || saveError || deleteError) && (
        <div className="mb-5 flex items-start gap-3 rounded-card border border-danger/30 bg-danger/5 p-4">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-danger" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-danger">Error</p>
            <p className="mt-0.5 text-sm text-text-secondary">
              {error || saveError || deleteError}
            </p>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="shrink-0 rounded-card border border-border bg-surface px-3 py-1.5 text-xs font-medium text-text-secondary transition-colors hover:bg-border/60"
          >
            <Loader2 className="mr-1 h-4 w-4" /> Refresh
          </button>
        </div>
      )}

      <h1 className="mb-6 text-xl font-semibold text-text-primary">
        Pengaturan Proyek
      </h1>

      {/* Form */}
      <form onSubmit={handleSave} className="rounded-card border border-border bg-surface p-6 shadow-sm space-y-5">
        <div className="space-y-1.5">
          <label htmlFor="settings-name" className="text-sm font-medium text-text-primary">
            Nama proyek
          </label>
          <input
            id="settings-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={`h-10 w-full rounded-input border bg-surface px-3 text-sm text-text-primary focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-colors ${fieldInvalid(nameErr)}`}
          />
          {nameErr && <p className="text-xs text-danger">Nama proyek wajib diisi.</p>}
        </div>

        <div className="space-y-1.5">
          <label htmlFor="settings-org" className="text-sm font-medium text-text-primary">
            Organisasi
          </label>
          <input
            id="settings-org"
            type="text"
            value={organization}
            onChange={(e) => setOrganization(e.target.value)}
            className={`h-10 w-full rounded-input border bg-surface px-3 text-sm text-text-primary focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-colors ${fieldInvalid(orgErr)}`}
          />
          {orgErr && <p className="text-xs text-danger">Organisasi wajib diisi.</p>}
        </div>

        <div className="space-y-1.5">
          <label htmlFor="settings-desc" className="text-sm font-medium text-text-primary">
            Deskripsi
          </label>
          <textarea
            id="settings-desc"
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="h-auto min-h-[90px] w-full resize-y rounded-input border border-border bg-surface px-3 py-2 text-sm text-text-primary focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-colors"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label htmlFor="settings-start" className="text-sm font-medium text-text-primary">
              Tanggal mulai
            </label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary" />
              <input
                id="settings-start"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className={`h-10 w-full rounded-input border bg-surface pl-9 pr-3 text-sm text-text-primary focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-colors ${fieldInvalid(!startDate)}`}
              />
              {!startDate && <p className="text-xs text-danger">Tanggal mulai wajib diisi.</p>}
            </div>
          </div>
          <div className="space-y-1.5">
            <label htmlFor="settings-end" className="text-sm font-medium text-text-primary">
              Tanggal selesai
            </label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary" />
              <input
                id="settings-end"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                min={startDate}
                className={`h-10 w-full rounded-input border bg-surface pl-9 pr-3 text-sm text-text-primary focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-colors ${fieldInvalid(dateErr)}`}
              />
              {dateErr && <p className="text-xs text-danger">{dateErr}</p>}
            </div>
          </div>
        </div>

        {/* Read-only display of current values */}
        <div className="rounded-card border border-border/60 bg-border/30 p-4 text-sm text-text-secondary">
          <p className="mb-1 font-medium text-text-primary">Nilai saat ini:</p>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
            <span>Nama: <span className="font-medium text-text-primary">{project.name || '-'}</span></span>
            <span>Organisasi: <span className="font-medium text-text-primary">{project.organization || '-'}</span></span>
            <span className="col-span-2">
              Mulai: <span className="font-medium text-text-primary">{formatDate(project.start_date)}</span>
            </span>
            {project.end_date && (
              <span className="col-span-2">
                Selesai: <span className="font-medium text-text-primary">{formatDate(project.end_date)}</span>
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 pt-2 border-t border-border">
          <button
            type="button"
            onClick={() => navigate(`/projects/${projectId}`)}
            className="rounded-input border border-border bg-surface px-4 py-2 text-sm font-medium text-text-secondary transition-colors hover:bg-border/60"
          >
            Batal
          </button>
          <button
            type="submit"
            disabled={saveLoading || nameErr || orgErr || !startDate}
            className="inline-flex items-center gap-2 rounded-input bg-primary px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saveLoading && <><Loader2 className="h-4 w-4 animate-spin" />Menyimpan...</>}
            {!saveLoading && <><Save className="h-4 w-4" />Simpan Perubahan</>}
          </button>
        </div>
      </form>

      {/* Delete section */}
      <div className="mt-6 rounded-card border border-danger/30 bg-danger/5 p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-danger">Hapus Proyek</h2>
            <p className="mt-1 text-sm text-text-secondary">
              Hapus proyek ini beserta seluruh tugas, anggota tim, dan data terkait. Tindakan ini tidak dapat dibatalkan.
            </p>
          </div>
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleteLoading}
            className="shrink-0 rounded-input bg-danger px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-danger/90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {deleteLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Menghapus...
              </>
            ) : (
              <>
                <Trash2 className="h-4 w-4" /> Hapus Proyek
              </>
            )}
          </button>
        </div>
        {deleteError && (
          <div className="mt-3 flex items-start gap-2 rounded bg-danger/10 p-3 text-sm text-danger">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 flex-none" />
            <span>{deleteError}</span>
          </div>
        )}
      </div>
    </div>
  );
}
