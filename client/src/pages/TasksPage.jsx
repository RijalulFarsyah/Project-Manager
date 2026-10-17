import { useState, useEffect, useMemo, useCallback } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import {
  Plus,
  ChevronDown,
  ChevronRight,
  Edit2,
  Trash2,
  AlertCircle,
  RefreshCw,
  Loader2,
  CheckCircle,
  Clock,
  Circle,
  ArrowLeft,
  Calendar,
  X,
} from 'lucide-react';
import { useConfirm } from '../hooks/useConfirm.jsx';

const PRIORITY_COLORS = {
  Low: 'bg-success/10 text-success border-success/30',
  Medium: 'bg-warning/10 text-warning border-warning/30',
  High: 'bg-danger/10 text-danger border-danger/30',
};

const STATUS_ICONS = {
  'Belum Mulai': Circle,
  'Berjalan': Clock,
  'Selesai': CheckCircle,
};

const STATUS_COLORS = {
  'Belum Mulai': 'text-text-secondary',
  'Berjalan': 'text-warning',
  'Selesai': 'text-success',
};

function TaskRow({ projectId, task, onUpdate, onDelete, onEdit, allTasks, expanded, onToggle }) {
  const hasSubtasks = allTasks.some((t) => t.parent_task_id === task.id);
  const subtasks = allTasks.filter((t) => t.parent_task_id === task.id);
  const showSub = expanded && hasSubtasks;

  const priorityClass = PRIORITY_COLORS[task.priority] || PRIORITY_COLORS.Medium;
  const StatusIcon = STATUS_ICONS[task.status] || Circle;
  const statusColor = STATUS_COLORS[task.status] || 'text-text-secondary';

  const handleProgressChange = (e) => {
    const val = Math.max(0, Math.min(100, Number(e.target.value)));
    onUpdate(task.id, { progress: val });
  };

  const handleStatusChange = (e) => {
    onUpdate(task.id, { status: e.target.value });
  };

  return (
    <>
      <div className="flex items-start gap-3 rounded-card border border-border/80 bg-surface px-4 py-3 hover:bg-border/40 transition-colors">
        {/* Indentasi & toggle */}
        <div className="mt-1 flex shrink-0 flex-col items-center gap-0.5">
          <button
            onClick={onToggle}
            className={`rounded-full p-0.5 text-text-secondary transition-colors hover:bg-border hover:text-text-primary ${hasSubtasks ? 'visible' : 'invisible'}`}
          >
            {showSub ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </button>
          {!hasSubtasks && (
            <div className="h-4 w-4" />
          )}
        </div>

        {/* Badge indentasi visual */}
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm text-text-secondary">#{task.id}</span>              <Link
              to={`/projects/${projectId}/tasks/${task.id}`}
              className="min-w-0 flex-1 truncate font-medium text-text-primary hover:text-primary transition-colors"
              title={task.name}
            >
              {task.name || '-'}
            </Link>
            <span className={`rounded-full border px-2 py-0.5 text-xs font-medium ${priorityClass}`}>
              {task.priority}
            </span>
            <span className={`flex items-center gap-1 text-xs ${statusColor}`}>
              <StatusIcon className="h-3.5 w-3.5" />
              {task.status}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-text-secondary">
            <span className="flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" />
              {task.start_date || '-'}
            </span>
            <span className="tabular-nums">{task.duration}d</span>
            <div className="flex items-center gap-2 min-w-[120px]">
              <input
                type="number"
                min={0}
                max={100}
                value={task.progress}
                onChange={handleProgressChange}
                className="h-5 w-14 rounded border border-border bg-surface px-2 text-center text-xs text-text-primary text-center focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/20"
              />
              <div className="flex-1 h-1.5 overflow-hidden rounded-full bg-border">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{ width: `${task.progress}%` }}
                />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 mt-1">
            <select
              value={task.status}
              onChange={handleStatusChange}
              className="h-7 rounded border border-border bg-surface px-2 text-xs text-text-secondary focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/20"
            >
              <option value="Belum Mulai">Belum Mulai</option>
              <option value="Berjalan">Berjalan</option>
              <option value="Selesai">Selesai</option>
            </select>
            <Link
              to={`/projects/${projectId}/tasks/${task.id}`}
              className="text-xs text-primary hover:text-primary/80 transition-colors"
            >
              Detail
            </Link>
            <button
              onClick={() => onEdit(task)}
              className="text-xs text-text-secondary hover:text-text-primary transition-colors"
              title="Edit"
            >
              <Edit2 className="h-4 w-4 inline" />
            </button>
            <button
              onClick={() => onDelete(task)}
              className="text-xs text-danger hover:text-danger/80 transition-colors"
              title="Hapus"
            >
              <Trash2 className="h-4 w-4 inline" />
            </button>
          </div>
        </div>
      </div>

      {/* Sub-tugas */}
      {showSub && (
        <div className="ml-6 border-l-2 border-border/60 pl-4 space-y-2">
          {subtasks.length === 0 && (
            <p className="text-xs text-text-secondary py-1">Belum ada sub-tugas.</p>
          )}
          {subtasks.map((st) => (
            <TaskRow
              key={st.id}
              projectId={projectId}
              task={st}
              allTasks={allTasks}
              onUpdate={onUpdate}
              onDelete={onDelete}
              onEdit={onEdit}
              onToggle={() => {}}
              expanded={true}
            />
          ))}
        </div>
      )}
    </>
  );
}

function ProgressBar({ value }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-2 overflow-hidden rounded-full bg-border">
        <div
          className="h-full rounded-full bg-primary transition-all duration-300"
          style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
        />
      </div>
      <span className="text-xs font-medium text-text-secondary tabular-nums w-8 text-right">
        {Math.round(value || 0)}%
      </span>
    </div>
  );
}

function EmptyTasks() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full border border-border bg-border/40">
        <Clock className="h-7 w-7 text-text-secondary" />
      </div>
      <div>
        <p className="text-sm font-medium text-text-primary">Belum ada tugas</p>
        <p className="mt-0.5 text-xs text-text-secondary">Tambahkan tugas pertama untuk proyek ini.</p>
      </div>
    </div>
  );
}

function TaskFormModal({ task, projectId, parentTasks, onSave, onClose, title }) {
  const [name, setName] = useState(task?.name || '');
  const [description, setDescription] = useState(task?.description || '');
  const [startDate, setStartDate] = useState(task?.start_date || '');
  const [duration, setDuration] = useState(task?.duration || 1);
  const [priority, setPriority] = useState(task?.priority || 'Medium');
  const [progress, setProgress] = useState(task?.progress || 0);
  const [parentTaskId, setParentTaskId] = useState(task?.parent_task_id || '');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const nameErr = !name.trim();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (nameErr) return;
    if (!startDate) {
      setError('Tanggal mulai wajib diisi.');
      return;
    }

    setLoading(true);
    try {
      await onSave({
        name: name.trim(),
        description: description.trim(),
        start_date: startDate,
        duration: Math.max(1, Math.floor(Number(duration) || 1)),
        priority: ['Low', 'Medium', 'High'].includes(priority) ? priority : 'Medium',
        progress: Math.max(0, Math.min(100, Number(progress) || 0)),
        parent_task_id: parentTaskId || null,
      });
      onClose();
    } catch (err) {
      setError(err.message || 'Gagal menyimpan tugas.');
    } finally {
      setLoading(false);
    }
  };

  const fieldInvalid = (err) => (err ? 'border-danger focus:border-danger focus:ring-danger/20' : '');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="w-full max-w-lg rounded-card border border-border bg-surface p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-text-primary">{title}</h2>
          <button onClick={onClose} className="rounded-full p-1 text-text-secondary transition-colors hover:bg-border hover:text-text-primary">
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-text-primary">Nama tugas <span className="text-danger">*</span></label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Contoh: Desain UI"
              className={`h-10 w-full rounded-input border bg-surface px-3 text-sm text-text-primary placeholder:text-text-secondary focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-colors ${fieldInvalid(nameErr)}`}
            />
            {nameErr && <p className="text-xs text-danger">Nama tugas wajib diisi.</p>}
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-text-primary">Deskripsi</label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Deskripsi singkat..."
              className="h-auto min-h-[60px] w-full resize-y rounded-input border border-border bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-secondary focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-colors"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-text-primary">Tanggal mulai <span className="text-danger">*</span></label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className={`h-10 w-full rounded-input border bg-surface px-3 text-sm text-text-primary focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-colors ${fieldInvalid(!startDate)}`}
              />
              {!startDate && <p className="text-xs text-danger">Wajib diisi.</p>}
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-text-primary">Durasi (hari)</label>
              <input
                type="number"
                min={1}
                value={duration}
                onChange={(e) => setDuration(Math.max(1, Math.floor(Number(e.target.value) || 1)))}
                className="h-10 w-full rounded-input border bg-surface px-3 text-sm text-text-primary focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-colors"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-text-primary">Prioritas</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="h-10 w-full rounded-input border border-border bg-surface px-3 text-sm text-text-primary focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-colors"
              >
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-text-primary">Progress (%)</label>
              <input
                type="number"
                min={0}
                max={100}
                value={progress}
                onChange={(e) => setProgress(Math.max(0, Math.min(100, Number(e.target.value) || 0)))}
                className="h-10 w-full rounded-input border bg-surface px-3 text-sm text-text-primary focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-colors"
              />
            </div>
          </div>

          {task && !task.parent_task_id && (
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-text-primary">Parent tugas (opsional — untuk sub-tugas)</label>
              <select
                value={parentTaskId}
                onChange={(e) => setParentTaskId(e.target.value)}
                className="h-10 w-full rounded-input border border-border bg-surface px-3 text-sm text-text-primary focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-colors"
              >
                <option value="">— Tanpa induk (tugas utama) —</option>
                {parentTasks
                  .filter((t) => !t.parent_task_id)
                  .map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} (#{t.id})
                    </option>
                  ))}
              </select>
            </div>
          )}

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
            <button type="submit" disabled={loading || nameErr || !startDate} className="inline-flex items-center gap-2 rounded-input bg-primary px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60">
              {loading && <><Loader2 className="h-4 w-4 animate-spin" />Simpan...</>}
              {!loading && <><CheckCircle className="h-4 w-4" />Simpan</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function TasksPage() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { confirm } = useConfirm();

  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [showAddModal, setShowAddModal] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [expandedIds, setExpandedIds] = useState(new Set());

  // Fetch tasks
  const fetchTasks = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get(`/projects/${projectId}/tasks`);
      setTasks(res.data || []);
    } catch (err) {
      setError(err.message || 'Gagal memuat daftar tugas.');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  // Optimistic update helper
  const updateTask = useCallback(async (taskId, fields) => {
    try {
      const res = await api.put(`/projects/${projectId}/tasks/${taskId}`, fields);
      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? res.data : t))
      );
      return res.data;
    } catch (err) {
      setError(`Gagal memperbarui: ${err.message}`);
      setTimeout(fetchTasks, 1000);
      throw err;
    }
  }, [fetchTasks, projectId]);

  const deleteTask = useCallback(async (task) => {
    const ok = await confirm({
      title: 'Hapus tugas?',
      description: `"${task.name}" akan dihapus. ${task.parent_task_id ? 'Ini adalah sub-tugas.' : 'Tugas ini memiliki sub-tugas: ' + tasks.filter(t => t.parent_task_id === task.id).map(t => t.name).join(', ') || 'Tidak ada.'}`,
      confirmLabel: 'Hapus',
      variant: 'danger',
    });
    if (!ok) return;

    try {
      await api.del(`/projects/${projectId}/tasks/${task.id}`);
      setTasks((prev) => prev.filter((t) => t.id !== task.id));
    } catch (err) {
      if (err.message.includes('sub-tugas')) {
        setError(err.message);
      } else {
        setError(`Gagal menghapus: ${err.message}`);
      }
      setTimeout(fetchTasks, 1000);
    }
  }, [confirm, fetchTasks, tasks, projectId]);

  const createTask = useCallback(async (data) => {
    const res = await api.post(`/projects/${projectId}/tasks`, data);
    setTasks((prev) => [...prev, res.data]);
    return res.data;
  }, [projectId]);

  const updateParentTasks = useMemo(() => {
    return tasks.filter((t) => !t.parent_task_id);
  }, [tasks]);

  const handleEdit = async (task) => {
    setEditingTask(task);
  };

  const handleEditSave = async (data) => {
    await updateTask(editingTask.id, data);
    setEditingTask(null);
  };

  const handleAdd = async (data) => {
    await createTask(data);
    setShowAddModal(false);
  };

  const toggleExpand = useCallback((taskId) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(taskId)) next.delete(taskId);
      else next.add(taskId);
      return next;
    });
  }, []);

  // Root tasks (parent_task_id is null)
  const rootTasks = tasks.filter((t) => !t.parent_task_id);

  if (loading && tasks.length === 0) {
    return (
      <div className="mx-auto max-w-4xl">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            <span className="text-sm text-text-secondary">Memuat tugas...</span>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-card bg-primary px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Plus className="h-4 w-4" />
            Tambah Tugas
          </button>
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-14 animate-pulse rounded-card bg-border" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            to={`/projects/${projectId}`}
            className="inline-flex items-center gap-1.5 text-sm text-text-secondary transition-colors hover:text-text-primary"
          >
            <ArrowLeft className="h-4 w-4" />
            Kembali ke Overview
          </Link>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center gap-2 rounded-card bg-primary px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-primary-hover"
        >
          <Plus className="h-4 w-4" />
          Tambah Tugas
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-5 flex items-start gap-3 rounded-card border border-danger/30 bg-danger/5 p-4">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-danger" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-danger">Gagal Memproses</p>
            <p className="mt-0.5 text-sm text-text-secondary">{error}</p>
          </div>
          <button onClick={fetchTasks} className="shrink-0 rounded-card border border-border bg-surface px-3 py-1.5 text-xs font-medium text-text-secondary transition-colors hover:bg-border/60">
            <RefreshCw className="mr-1 h-4 w-4" /> Coba lagi
          </button>
        </div>
      )}

      {/* Task list */}
      <div className="rounded-card border border-border bg-surface shadow-sm overflow-hidden">
        {/* Header tabel */}
        <div className="flex items-center gap-3 border-b border-border bg-border/40 px-4 py-3 text-xs font-medium uppercase tracking-wider text-text-secondary">
          <div className="flex-1" />
          <div className="w-20 text-center">Progress</div>
          <div className="w-40 text-right">Aksi</div>
        </div>

        <div className="divide-y divide-border/60">
          {rootTasks.length === 0 && !loading && (
            <EmptyTasks />
          )}

          {rootTasks.map((task) => (
            <TaskRow
              key={task.id}
              projectId={projectId}
              task={task}
              allTasks={tasks}
              onUpdate={updateTask}
              onDelete={deleteTask}
              onEdit={handleEdit}
              onToggle={() => toggleExpand(task.id)}
              expanded={expandedIds.has(task.id)}
            />
          ))}
        </div>
      </div>

      {/* Modal tambah */}
      {showAddModal && (
        <TaskFormModal
          projectId={projectId}
          parentTasks={updateParentTasks}
          onSave={handleAdd}
          onClose={() => setShowAddModal(false)}
          title="Tambah Tugas Baru"
        />
      )}

      {/* Modal edit */}
      {editingTask && (
        <TaskFormModal
          task={editingTask}
          projectId={projectId}
          parentTasks={updateParentTasks}
          onSave={handleEditSave}
          onClose={() => setEditingTask(null)}
          title="Edit Tugas"
        />
      )}
    </div>
  );
}

