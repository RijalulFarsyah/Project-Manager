import { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import {
  Plus,
  Briefcase,
  CheckSquare,
  Clock,
  Circle,
  Users,
  AlertCircle,
  RefreshCw,
  Loader2,
  TrendingUp,
} from 'lucide-react';

const STATUS_COLORS = {
  'Belum Mulai': { bg: 'bg-text-secondary/10', text: 'text-text-secondary', icon: Circle },
  'Berjalan': { bg: 'bg-warning/10', text: 'text-warning', icon: Clock },
  'Selesai': { bg: 'bg-success/10', text: 'text-success', icon: CheckSquare },
};

function StatCard({ icon: Icon, label, value, subtext, color = 'primary' }) {
  const colorMap = {
    primary: { bg: 'bg-primary/10', text: 'text-primary', iconBg: 'bg-primary/10 text-primary' },
    success: { bg: 'bg-success/10', text: 'text-success', iconBg: 'bg-success/10 text-success' },
    warning: { bg: 'bg-warning/10', text: 'text-warning', iconBg: 'bg-warning/10 text-warning' },
    danger: { bg: 'bg-danger/10', text: 'text-danger', iconBg: 'bg-danger/10 text-danger' },
  };

  const c = colorMap[color] || colorMap.primary;

  return (
    <div className="rounded-card border border-border bg-surface p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <div className={`flex h-10 w-10 items-center justify-center rounded-full ${c.iconBg}`}>
          <Icon className="h-5 w-5" />
        </div>
        {subtext && (
          <span className="text-xs text-text-secondary">{subtext}</span>
        )}
      </div>
      <p className="mt-3 text-2xl font-bold text-text-primary tabular-nums">{value}</p>
      <p className="mt-0.5 text-sm text-text-secondary">{label}</p>
    </div>
  );
}

function ProjectSummaryCard({ project, onDelete }) {
  const progress = project.progress || 0;
  const taskCount = project.task_count || 0;
  const memberCount = project.member_count || 0;

  const formatDate = (d) => {
    if (!d) return '-';
    const date = new Date(d);
    if (isNaN(date)) return '-';
    return date.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  return (
    <div className="rounded-card border border-border bg-surface p-4 shadow-sm hover:bg-border/40 transition-colors">
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <Link
            to={`/projects/${project.id}`}
            className="block truncate font-semibold text-text-primary hover:text-primary transition-colors"
          >
            {project.name || '-'}
          </Link>
          <p className="truncate text-xs text-text-secondary">{project.organization || '-'}</p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <span className="text-xs text-text-secondary">
            {taskCount} tugas · {memberCount} anggota
          </span>
        </div>
      </div>

      {project.description && (
        <p className="mb-3 text-xs text-text-secondary line-clamp-2">{project.description}</p>
      )}

      <div className="mb-2 flex items-center justify-between text-xs">
        <span className="text-text-secondary">
          Mulai: {formatDate(project.start_date)}
        </span>
        <span className="font-medium text-text-primary tabular-nums">{Math.round(progress)}%</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-border">
        <div
          className="h-full rounded-full bg-primary transition-all duration-500"
          style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
        />
      </div>
    </div>
  );
}

function EmptyDashboard() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full border border-border bg-border/40">
        <Briefcase className="h-7 w-7 text-text-secondary" />
      </div>
      <div>
        <p className="text-sm font-medium text-text-primary">Selamat datang di ProMan</p>
        <p className="mt-0.5 text-xs text-text-secondary">Anda belum memiliki proyek. Buat proyek pertama Anda sekarang.</p>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [taskStatus, setTaskStatus] = useState({ belumMulai: 0, berjalan: 0, selesai: 0, total: 0 });
  const [totalMembers, setTotalMembers] = useState(0);

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch all projects
      const projectsRes = await api.get('/projects');
      const projectsData = projectsRes.data || [];

      setProjects(projectsData);

      // Calculate total members
      const totalMem = projectsData.reduce((sum, p) => sum + (p.member_count || 0), 0);
      setTotalMembers(totalMem);

      // Fetch tasks for each project to calculate status breakdown
      let totalTasks = 0;
      let belumMulai = 0;
      let berjalan = 0;
      let selesai = 0;

      // Fetch tasks for each project in parallel
      const taskPromises = projectsData.map(async (project) => {
        try {
          const tasksRes = await api.get(`/projects/${project.id}/tasks`);
          const tasks = tasksRes.data || [];
          totalTasks += tasks.length;
          tasks.forEach((t) => {
            if (t.status === 'Belum Mulai') belumMulai++;
            else if (t.status === 'Berjalan') berjalan++;
            else if (t.status === 'Selesai') selesai++;
          });
        } catch {
          // Ignore errors for individual projects
        }
      });

      await Promise.all(taskPromises);

      setTaskStatus({
        belumMulai,
        berjalan,
        selesai,
        total: totalTasks,
      });
    } catch (err) {
      setError(err.message || 'Gagal memuat data dashboard.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  const stats = useMemo(() => {
    return {
      projectCount: projects.length,
      taskCount: taskStatus.total,
      belumMulai: taskStatus.belumMulai,
      berjalan: taskStatus.berjalan,
      selesai: taskStatus.selesai,
      totalMembers,
    };
  }, [projects, taskStatus, totalMembers]);

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            <span className="text-sm text-text-secondary">Memuat dashboard...</span>
          </div>
        </div>
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-card bg-border" />
          ))}
        </div>
        <div className="h-64 animate-pulse rounded-card bg-border" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-text-primary">Dashboard</h1>
          <p className="mt-1 text-sm text-text-secondary">
            Ringkasan-overview proyek dan kemajuan Anda.
          </p>
        </div>
        <Link
          to="/projects/new"
          className="inline-flex items-center gap-2 rounded-card bg-primary px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-primary-hover"
        >
          <Plus className="h-4 w-4" />
          Buat Proyek Baru
        </Link>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-5 flex items-start gap-3 rounded-card border border-danger/30 bg-danger/5 p-4">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-danger" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-danger">Gagal memuat data</p>
            <p className="mt-0.5 text-sm text-text-secondary">{error}</p>
          </div>
          <button onClick={fetchDashboard} className="shrink-0 rounded-card border border-border bg-surface px-3 py-1.5 text-xs font-medium text-text-secondary transition-colors hover:bg-border/60">
            <RefreshCw className="mr-1 h-4 w-4" /> Refresh
          </button>
        </div>
      )}

      {/* Stats */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={Briefcase}
          label="Total Proyek"
          value={stats.projectCount}
          color="primary"
        />
        <StatCard
          icon={CheckSquare}
          label="Total Tugas"
          value={stats.taskCount}
          subtext={stats.projectCount > 0 ? `${Math.round((stats.taskCount / stats.projectCount) || 0)} tugas/proyek` : undefined}
          color="primary"
        />
        <StatCard
          icon={Users}
          label="Total Anggota Tim"
          value={stats.totalMembers}
          subtext={stats.projectCount > 0 ? `${Math.round((stats.totalMembers / stats.projectCount) || 0)} orang/proyek` : undefined}
          color="success"
        />
      </div>

      {/* Task Status Breakdown */}
      {stats.taskCount > 0 && (
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-card border border-border bg-surface p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-text-secondary/10 text-text-secondary">
                <Circle className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-lg font-bold text-text-primary tabular-nums">{stats.belumMulai}</p>
                <p className="text-xs text-text-secondary">Belum Mulai</p>
              </div>
            </div>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-border">
              <div
                className="h-full rounded-full bg-text-secondary/30 transition-all"
                style={{ width: `${stats.taskCount > 0 ? (stats.belumMulai / stats.taskCount) * 100 : 0}%` }}
              />
            </div>
          </div>
          <div className="rounded-card border border-border bg-surface p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-warning/10 text-warning">
                <Clock className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-lg font-bold text-text-primary tabular-nums">{stats.berjalan}</p>
                <p className="text-xs text-text-secondary">Berjalan</p>
              </div>
            </div>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-border">
              <div
                className="h-full rounded-full bg-warning/50 transition-all"
                style={{ width: `${stats.taskCount > 0 ? (stats.berjalan / stats.taskCount) * 100 : 0}%` }}
              />
            </div>
          </div>
          <div className="rounded-card border border-border bg-surface p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-success/10 text-success">
                <CheckSquare className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-lg font-bold text-text-primary tabular-nums">{stats.selesai}</p>
                <p className="text-xs text-text-secondary">Selesai</p>
              </div>
            </div>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-border">
              <div
                className="h-full rounded-full bg-success/50 transition-all"
                style={{ width: `${stats.taskCount > 0 ? (stats.selesai / stats.taskCount) * 100 : 0}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Recent Projects */}
      <div className="mb-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-text-primary">Proyek Terbaru</h2>
          <Link
            to="/projects"
            className="text-xs font-medium text-primary hover:text-primary/80 transition-colors"
          >
            Lihat semua
          </Link>
        </div>

        {projects.length === 0 ? (
          <EmptyDashboard />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {projects.slice(0, 5).map((project) => (
              <ProjectSummaryCard key={project.id} project={project} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
