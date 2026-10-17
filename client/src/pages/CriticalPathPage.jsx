import { useState, useEffect, useCallback } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api/client';
import {
  AlertCircle,
  RefreshCw,
  Loader2,
  TrendingUp,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

const FILTER_OPTIONS = [
  { value: 'all', label: 'Semua' },
  { value: 'critical', label: 'Kritis' },
  { value: 'non-critical', label: 'Non-Kritis' },
];

export default function CriticalPathPage() {
  const { projectId } = useParams();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all');

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get(`/projects/${projectId}/critical-path`);
      setData(res.data);
    } catch (err) {
      setError(err.message || 'Gagal memuat data jalur kritis.');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filteredTasks = data?.tasks?.filter((task) => {
    if (filter === 'critical') return task.is_critical;
    if (filter === 'non-critical') return !task.is_critical;
    return true;
  }) || [];

  const formatDate = (d) => {
    if (!d) return '-';
    const date = new Date(d);
    if (isNaN(date.getTime())) return '-';
    return date.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const criticalCount = data?.criticalPath?.length || 0;

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            <span className="text-sm text-text-secondary">Memuat analisis jalur kritis...</span>
          </div>
        </div>
        <div className="space-y-3">
          <div className="h-8 w-96 animate-pulse rounded-lg bg-border" />
          <div className="grid grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-20 animate-pulse rounded-card bg-border" />
            ))}
          </div>
          <div className="h-12 animate-pulse rounded-lg bg-border" />
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

      {error && !data && (
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
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-text-primary">Jalur Kritis (Critical Path)</h1>
        <p className="mt-1 text-sm text-text-secondary">
          Analisis jalur terpanjang yang menentukan durasi minimum proyek.
        </p>
      </div>

      {/* Error dalam data */}
      {data?.error && (
        <div className="mb-6 rounded-card border border-danger/30 bg-danger/5 p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-danger" />
            <div>
              <p className="text-sm font-medium text-danger">Tidak dapat menghitung</p>
              <p className="mt-0.5 text-sm text-text-secondary">{data.error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Ringkasan */}
      {data && data.tasks?.length > 0 && (
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-card border border-border bg-surface p-4 shadow-sm">
            <p className="text-xs font-medium text-text-secondary uppercase tracking-wide">Total Durasi</p>
            <p className="mt-1 text-2xl font-bold text-text-primary">{data.totalDuration || 0} <span className="text-sm font-medium text-text-secondary">hari</span></p>
          </div>
          <div className="rounded-card border border-border bg-surface p-4 shadow-sm">
            <p className="text-xs font-medium text-text-secondary uppercase tracking-wide">Tanggal Mulai</p>
            <p className="mt-1 text-lg font-semibold text-text-primary">{formatDate(data.scheduleStart)}</p>
          </div>
          <div className="rounded-card border border-border bg-surface p-4 shadow-sm">
            <p className="text-xs font-medium text-text-secondary uppercase tracking-wide">Est. Selesai</p>
            <p className="mt-1 text-lg font-semibold text-text-primary">{formatDate(data.scheduleFinish)}</p>
          </div>
          <div className="rounded-card border border-l-4 border-l-primary bg-primary/5 p-4 shadow-sm">
            <p className="text-xs font-medium text-text-secondary uppercase tracking-wide">Tugas Kritis</p>
            <p className="mt-1 text-2xl font-bold text-primary">{criticalCount} <span className="text-sm font-medium text-text-secondary">dari {data.taskCount || 0}</span></p>
          </div>
        </div>
      )}

      {/* Filter */}
      {data && data.tasks?.length > 0 && (
        <div className="mb-4 flex items-center gap-2">
          <span className="text-sm text-text-secondary">Filter:</span>
          <div className="flex rounded-card border border-border overflow-hidden">
            {FILTER_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setFilter(opt.value)}
                className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                  filter === opt.value
                    ? 'bg-primary text-white'
                    : 'bg-surface text-text-secondary hover:bg-border/60'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <span className="ml-auto text-xs text-text-secondary">
            {filteredTasks.length} dari {data.tasks.length} tugas
          </span>
        </div>
      )}

      {/* Tabel */}
      {data && data.tasks?.length > 0 ? (
        <div className="rounded-card border border-border bg-surface shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-border/40">
                  <th className="px-4 py-3 text-left font-medium text-text-secondary text-xs uppercase tracking-wider">Tugas</th>
                  <th className="px-4 py-3 text-center font-medium text-text-secondary text-xs uppercase tracking-wider">Durasi</th>
                  <th className="px-4 py-3 text-center font-medium text-text-secondary text-xs uppercase tracking-wider">ES (Tanggal)</th>
                  <th className="px-4 py-3 text-center font-medium text-text-secondary text-xs uppercase tracking-wider">EF (Tanggal)</th>
                  <th className="px-4 py-3 text-center font-medium text-text-secondary text-xs uppercase tracking-wider">ES (Hari)</th>
                  <th className="px-4 py-3 text-center font-medium text-text-secondary text-xs uppercase tracking-wider">EF (Hari)</th>
                  <th className="px-4 py-3 text-center font-medium text-text-secondary text-xs uppercase tracking-wider">LS (Hari)</th>
                  <th className="px-4 py-3 text-center font-medium text-text-secondary text-xs uppercase tracking-wider">LF (Hari)</th>
                  <th className="px-4 py-3 text-center font-medium text-text-secondary text-xs uppercase tracking-wider">Slack</th>
                  <th className="px-4 py-3 text-center font-medium text-text-secondary text-xs uppercase tracking-wider">Kritis</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {filteredTasks.map((task) => (
                  <tr
                    key={task.id}
                    className={`transition-colors ${
                      task.is_critical
                        ? 'bg-rose-50/70 hover:bg-rose-100/50'
                        : 'hover:bg-border/40'
                    }`}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {task.is_critical && (
                          <span className="inline-flex h-2 w-2 rounded-full bg-[#DC2626]" />
                        )}
                        <span className="font-medium text-text-primary">{task.name}</span>
                        <span className="ml-auto text-xs text-text-secondary">#{task.id}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center text-text-secondary">{task.duration}h</td>
                    <td className="px-4 py-3 text-center text-text-secondary">{formatDate(task.es_date)}</td>
                    <td className="px-4 py-3 text-center text-text-secondary">{formatDate(task.ef_date)}</td>
                    <td className="px-4 py-3 text-center text-text-secondary tabular-nums">{task.es}</td>
                    <td className="px-4 py-3 text-center text-text-secondary tabular-nums">{task.ef}</td>
                    <td className="px-4 py-3 text-center text-text-secondary tabular-nums">{task.ls}</td>
                    <td className="px-4 py-3 text-center text-text-secondary tabular-nums">{task.lf}</td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                          Math.abs(task.slack) < 0.01
                            ? 'bg-rose-100 text-rose-700'
                            : task.slack < 2
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-success/10 text-success'
                        }`}
                      >
                        {task.slack.toFixed(1)}d
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {task.is_critical ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2 py-0.5 text-xs font-medium text-rose-700">
                          <TrendingUp className="h-3 w-3" />
                          Ya
                        </span>
                      ) : (
                        <span className="text-text-secondary">Tidak</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : data?.tasks?.length === 0 ? (
        <div className="rounded-card border border-border bg-surface shadow-sm p-6">
          <div className="flex flex-col items-center justify-center gap-3 py-16">
            <div className="flex h-14 w-14 items-center justify-center rounded-full border border-border bg-border/40">
              <TrendingUp className="h-7 w-7 text-text-secondary" />
            </div>
            <div>
              <p className="text-sm font-medium text-text-primary">Belum ada data jalur kritis</p>
              <p className="mt-0.5 text-xs text-text-secondary">
                Tambahkan tugas dan dependency untuk melakukan analisis.
              </p>
            </div>
          </div>
        </div>
      ) : null}

      {/* Legenda */}
      {data && data.tasks?.length > 0 && (
        <div className="mt-6 rounded-card border border-border bg-surface p-4 shadow-sm">
          <h3 className="mb-3 text-sm font-semibold text-text-primary uppercase tracking-wide">
            Keterangan Istilah CPM
          </h3>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-3">
            <div className="flex items-start gap-2 text-xs">
              <span className="mt-0.5 font-bold text-text-primary">ES (Early Start)</span>
              <span className="text-text-secondary">: Hari mulai paling awal yang mungkin untuk tugas ini.</span>
            </div>
            <div className="flex items-start gap-2 text-xs">
              <span className="mt-0.5 font-bold text-text-primary">EF (Early Finish)</span>
              <span className="text-text-secondary">: Hari selesai paling awal = ES + Durasi.</span>
            </div>
            <div className="flex items-start gap-2 text-xs">
              <span className="mt-0.5 font-bold text-text-primary">LS (Late Start)</span>
              <span className="text-text-secondary">: Hari mulai terlambat tanpa menunda proyek.</span>
            </div>
            <div className="flex items-start gap-2 text-xs">
              <span className="mt-0.5 font-bold text-text-primary">LF (Late Finish)</span>
              <span className="text-text-secondary">: Hari selesai terlambat tanpa menunda proyek.</span>
            </div>
            <div className="flex items-start gap-2 text-xs">
              <span className="mt-0.5 font-bold text-text-primary">Slack</span>
              <span className="text-text-secondary">: LS - ES. Semakin kecil slack, semakin kritis tugas. Slack = 0 artinya tugas di jalur kritis.</span>
            </div>
            <div className="flex items-start gap-2 text-xs">
              <span className="mt-0.5 font-bold text-text-primary">Critical Path</span>
              <span className="text-text-secondary">: Jalur tugas dengan slack = 0 yang menentukan durasi proyek. Jika satu tugas kritis terlambat, seluruh proyek tertunda.</span>
            </div>
          </div>
        </div>
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
