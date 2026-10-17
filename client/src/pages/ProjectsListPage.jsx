import { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { api } from '../api/client';
import {
  Plus,
  Search,
  Eye,
  Edit2,
  Trash2,
  X,
  AlertCircle,
  RefreshCw,
  Briefcase,
  Users,
} from 'lucide-react';
import { useConfirm } from '../hooks/useConfirm';

function ProjectRow({ project, onDelete }) {
  const navigate = useNavigate();
  const { confirm, cancel } = useConfirm();

  const handleDelete = async () => {
    const ok = await confirm({
      title: 'Hapus proyek?',
      description: `"${project.name}" akan dihapus beserta seluruh datanya (tugas, anggota, cuti, dll.). Tindakan ini tidak dapat dibatalkan.`,
      confirmLabel: 'Hapus',
      variant: 'danger',
    });
    if (!ok) return;
    try {
      await api.del(`/projects/${project.id}`);
      onDelete(project.id);
    } catch (err) {
      cancel(`Gagal menghapus proyek: ${err.message}`);
    }
  };

  const start = project.start_date ? new Date(project.start_date) : null;
  const end = project.end_date ? new Date(project.end_date) : null;

  const fmt = (d) => {
    if (!d || isNaN(d)) return '-';
    return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  return (
    <tr className="border-b border-border/60 hover:bg-border/40 transition-colors">
      <td className="px-4 py-3 align-top">
        <div className="min-w-0">
          <Link
            to={`/projects/${project.id}`}
            className="font-medium text-text-primary hover:text-primary truncate"
          >
            {project.name || '-'}
          </Link>
        </div>
      </td>
      <td className="px-4 py-3 align-top text-text-secondary">
        <span className="truncate block max-w-[200px]">{project.organization || '-'}</span>
      </td>
      <td className="px-4 py-3 align-top text-text-secondary whitespace-nowrap">
        {fmt(start)}
      </td>
      <td className="px-4 py-3 align-top text-text-secondary whitespace-nowrap">
        {fmt(end)}
      </td>
      <td className="px-4 py-3 align-top">
        <ProgressCell project={project} />
      </td>
      <td className="px-4 py-3 align-top">
        <div className="flex items-center gap-2">
          <Link
            to={`/projects/${project.id}`}
            className="inline-flex items-center gap-1.5 rounded-card bg-primary text-white px-2.5 py-1.5 text-xs font-medium transition-colors hover:bg-primary-hover"
          >
            <Eye className="h-[14px] w-[14px]" />
            Detail
          </Link>
          <button
            onClick={() => navigate(`/projects/${project.id}/settings`)}
            className="inline-flex items-center gap-1.5 rounded-card border border-border bg-surface px-2.5 py-1.5 text-xs font-medium text-text-secondary transition-colors hover:bg-border/60 hover:text-text-primary"
          >
            <Edit2 className="h-[14px] w-[14px]" />
            Edit
          </button>
          <button
            onClick={handleDelete}
            className="inline-flex items-center gap-1.5 rounded-card border border-danger/30 bg-danger/5 px-2.5 py-1.5 text-xs font-medium text-danger transition-colors hover:bg-danger/10"
          >
            <Trash2 className="h-[14px] w-[14px]" />
            Hapus
          </button>
        </div>
      </td>
    </tr>
  );
}

function ProgressCell({ project }) {
  const taskCount = project.task_count || 0;
  const memberCount = project.member_count || 0;
  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-2 text-xs text-text-secondary">
        <Briefcase className="h-4 w-4" />
        <span className="tabular-nums">{taskCount}</span>
        <span className="text-[11px]">tugas</span>
      </div>
      <div className="flex items-center gap-2 text-xs text-text-secondary">
        <Users className="h-4 w-4" />
        <span className="tabular-nums">{memberCount}</span>
        <span className="text-[11px]">orang</span>
      </div>
    </div>
  );
}

export default function ProjectsListPage() {
  const [query, setQuery] = useState('');
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  const location = useLocation();
  const navigate = useNavigate();

  const load = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return (params.get('q') || '').trim();
  }, [location.search]);

  useEffect(() => {
    setQuery(load);
  }, [load]);

  const fetchProjects = async (q = query) => {
    if (deletingId !== null) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.get(`/projects?q=${encodeURIComponent(q)}`);
      setProjects(res.data || []);
    } catch (err) {
      setError(err.message || 'Gagal memuat daftar proyek.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    fetchProjects(query);
  };

  const handleRetry = () => fetchProjects();

  return (
    <div className="mx-auto max-w-6xl">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <p className="text-sm text-text-secondary">
          Kelola semua proyek yang Anda miliki.
        </p>
        <Link
          to="/projects/new"
          className="inline-flex items-center gap-2 rounded-card bg-primary px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-primary-hover"
        >
          <Plus className="h-[16px] w-[16px]" />
          Buat Proyek Baru
        </Link>
      </div>

      {/* Search */}
      <form onSubmit={handleSearch} className="mb-5">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cari nama atau organisasi..."
            className="h-10 w-full rounded-input border border-border bg-surface pl-10 pr-4 text-sm text-text-primary placeholder:text-text-secondary focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
          {query && (
            <button
              type="button"
              onClick={() => {
                setQuery('');
                fetchProjects('');
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-text-secondary transition-colors hover:bg-border hover:text-text-primary"
              aria-label="Hapus filter"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </form>

      {/* Error */}
      {error && (
        <div className="mb-5 flex items-start gap-3 rounded-card border border-danger/30 bg-danger/5 p-4">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-danger" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-danger">Gagal memuat data</p>
            <p className="mt-0.5 text-sm text-text-secondary">{error}</p>
          </div>
          <button
            onClick={handleRetry}
            className="shrink-0 rounded-card border border-border bg-surface px-3 py-1.5 text-xs font-medium text-text-secondary transition-colors hover:bg-border/60"
          >
            <RefreshCw className="mr-1 h-4 w-4" />
            Coba lagi
          </button>
        </div>
      )}

      {/* Table */}
      <div className="rounded-card border border-border bg-surface shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-border/40">
                <th className="px-4 py-3 text-left font-medium text-text-secondary text-xs uppercase tracking-wider">
                  Nama
                </th>
                <th className="px-4 py-3 text-left font-medium text-text-secondary text-xs uppercase tracking-wider">
                  Organisasi
                </th>
                <th className="px-4 py-3 text-left font-medium text-text-secondary text-xs uppercase tracking-wider whitespace-nowrap">
                  Tanggal Mulai
                </th>
                <th className="px-4 py-3 text-left font-medium text-text-secondary text-xs uppercase tracking-wider whitespace-nowrap">
                  Tanggal Selesai
                </th>
                <th className="px-4 py-3 text-center font-medium text-text-secondary text-xs uppercase tracking-wider">
                  Progress
                </th>
                <th className="px-4 py-3 text-left font-medium text-text-secondary text-xs uppercase tracking-wider">
                  Aksi
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {loading && projects.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-16">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <div className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-primary" />
                      <p className="text-sm text-text-secondary">Memuat proyek...</p>
                    </div>
                  </td>
                </tr>
              )}

              {!loading && projects.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-16">
                    <div className="flex flex-col items-center justify-center gap-3 text-center">
                      <div className="flex h-14 w-14 items-center justify-center rounded-full border border-border bg-border/40">
                        <svg
                          className="h-7 w-7 text-text-secondary"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={1.5}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
                          />
                        </svg>
                      </div>
                      <p className="text-sm font-medium text-text-primary">
                        Belum ada proyek. Buat proyek pertama Anda.
                      </p>
                      <Link
                        to="/projects/new"
                        className="inline-flex items-center gap-2 rounded-card bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-hover"
                      >
                        <Plus className="h-[16px] w-[16px]" />
                        Buat Proyek Baru
                      </Link>
                    </div>
                  </td>
                </tr>
              )}

              {projects.map((p) => (
                <ProjectRow key={p.id} project={p} onDelete={setDeletingId} />
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
