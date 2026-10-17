import { useState, useEffect, useRef } from 'react';
import { Link, useParams } from 'react-router-dom';
import api from '../api/client';
import { AlertCircle, RefreshCw, Loader2, GanttChart, ArrowLeft } from 'lucide-react';
import Gantt from 'frappe-gantt';
import 'frappe-gantt/dist/frappe-gantt.css';

const PRIORITY_COLORS = {
  Low: '#2563EB',
  Medium: '#F59E0B',
  High: '#EA580C',
  default: '#64748B',
};

const CRITICAL_COLOR = '#DC2626';

export default function GanttPage() {
  const { projectId } = useParams();
  const ganttRef = useRef(null);
  const ganttInstanceRef = useRef(null);
  const [tasks, setTasks] = useState([]);
  const [dependencies, setDependencies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  async function fetchData() {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get(`/projects/${projectId}/gantt`);
      const data = res?.data || {};
      setTasks(Array.isArray(data.tasks) ? data.tasks : []);
      setDependencies(Array.isArray(data.dependencies) ? data.dependencies : []);
    } catch (err) {
      setError(err?.message || 'Gagal memuat data Gantt.');
      setTasks([]);
      setDependencies([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  useEffect(() => {
    if (loading) return;
    if (!ganttRef.current) return;
    if (tasks.length === 0) return;

    // Destroy instance lama
    if (ganttInstanceRef.current) {
      try { ganttInstanceRef.current.destroy(); } catch (_) {}
      ganttInstanceRef.current = null;
    }

    // Bersihkan container
    ganttRef.current.innerHTML = '';

    // Map dependency: from -> [to...]
    const depMap = new Map();
    dependencies.forEach((dep) => {
      const from = String(dep.predecessor_id ?? dep.from ?? '');
      const to = String(dep.successor_id ?? dep.to ?? '');
      if (!from || !to) return;
      if (!depMap.has(from)) depMap.set(from, []);
      depMap.get(from).push(to);
    });

    const ganttTasks = tasks.map((task) => {
      const priorityColor = PRIORITY_COLORS[task.priority] || PRIORITY_COLORS.default;
      const barColor = task.is_critical ? CRITICAL_COLOR : priorityColor;

      // Pastikan ada start & end
      const start = task.es_date || task.start_date || task.start;
      let end = task.ef_date || task.end_date || task.end;

      // Kalau end kosong, hitung dari start + durasi
      if (!end && start && task.duration) {
        const d = new Date(start);
        d.setDate(d.getDate() + Math.max(1, Number(task.duration)) - 1);
        end = d.toISOString().slice(0, 10);
      }

      return {
        id: String(task.id),
        name: task.name || '-',
        start: start || new Date().toISOString().slice(0, 10),
        end: end || start || new Date().toISOString().slice(0, 10),
        progress: Number(task.progress) || 0,
        dependencies: (depMap.get(String(task.id)) || []).join(','),
        custom_class: task.is_critical ? 'bar-critical' : 'bar-normal',
        _color: barColor,
      };
    });

    try {
      const gantt = new Gantt(ganttRef.current, ganttTasks, {
        view_mode: 'Day',
        on_click: (task) => {
          window.location.href = `/projects/${projectId}/tasks/${task.id}`;
        },
      });

      // Terapkan warna bar secara manual
      ganttTasks.forEach((t) => {
        const el = ganttRef.current.querySelector(`.bar-wrapper[data-id="${t.id}"] .bar`);
        if (el) {
          el.style.fill = t._color;
        }
      });

      ganttInstanceRef.current = gantt;
    } catch (err) {
      console.error('[Gantt] render error:', err);
      setError('Gagal menampilkan Gantt Chart.');
    }

    return () => {
      if (ganttInstanceRef.current) {
        try { ganttInstanceRef.current.destroy(); } catch (_) {}
        ganttInstanceRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tasks, dependencies, loading]);

  return (
    <div className="mx-auto max-w-6xl">
      <Link
        to={`/projects/${projectId}`}
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-text-secondary transition-colors hover:text-text-primary"
      >
        <ArrowLeft className="h-4 w-4" />
        Kembali ke Overview
      </Link>

      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-xl font-semibold text-text-primary">Gantt Chart</h1>
      </div>

      {/* Legend */}
      <div className="mb-4 flex flex-wrap items-center gap-4 text-xs">
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-full" style={{ background: CRITICAL_COLOR }} />
          <span className="text-text-secondary">Critical Path</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-full" style={{ background: PRIORITY_COLORS.Low }} />
          <span className="text-text-secondary">Low</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-full" style={{ background: PRIORITY_COLORS.Medium }} />
          <span className="text-text-secondary">Medium</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-full" style={{ background: PRIORITY_COLORS.High }} />
          <span className="text-text-secondary">High</span>
        </div>
      </div>

      {error && (
        <div className="mb-5 flex items-start gap-3 rounded-card border border-danger/30 bg-danger/5 p-4">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-danger" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-danger">Error</p>
            <p className="mt-0.5 text-sm text-text-secondary">{error}</p>
          </div>
          <button
            onClick={fetchData}
            className="shrink-0 rounded-card border border-border bg-surface px-3 py-1.5 text-xs font-medium text-text-secondary transition-colors hover:bg-border/60"
          >
            <RefreshCw className="mr-1 h-4 w-4 inline" /> Refresh
          </button>
        </div>
      )}

      <div className="rounded-card border border-border bg-surface shadow-sm overflow-hidden">
        {loading && (
          <div className="flex items-center justify-center gap-3 py-20">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            <span className="text-sm text-text-secondary">Memuat Gantt...</span>
          </div>
        )}

        {!loading && tasks.length === 0 && !error && (
          <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full border border-border bg-border/40">
              <GanttChart className="h-7 w-7 text-text-secondary" />
            </div>
            <div>
              <p className="text-sm font-medium text-text-primary">Belum ada tugas</p>
              <p className="mt-0.5 text-xs text-text-secondary">
                Tambahkan tugas untuk melihat Gantt Chart.
              </p>
            </div>
          </div>
        )}

        {!loading && tasks.length > 0 && (
          <div className="relative overflow-auto" style={{ minHeight: 400 }}>
            <div ref={ganttRef} className="gantt-chart" />
          </div>
        )}
      </div>
    </div>
  );
}