import { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api/client';
import { useConfirm } from '../hooks/useConfirm.jsx';
import {
  ArrowLeft,
  AlertCircle,
  RefreshCw,
  Loader2,
  Plus,
  Trash2,
  Edit2,
  X,
  CheckCircle,
  Clock,
  Circle,
  Calendar,
  User,
} from 'lucide-react';

const PRIORITY_COLORS = {
  Low: 'bg-success/10 text-success border-success/30',
  Medium: 'bg-warning/10 text-warning border-warning/30',
  High: 'bg-danger/10 text-danger border-danger/30',
};

function PriorityBadge({ priority }) {
  const cls = PRIORITY_COLORS[priority] || PRIORITY_COLORS.Medium;
  return <span className={`rounded-full border px-2 py-0.5 text-xs font-medium ${cls}`}>{priority}</span>;
}

function StatusBadge({ status }) {
  const iconMap = {
    'Belum Mulai': Circle,
    'Berjalan': Clock,
    'Selesai': CheckCircle,
  };
  const colorMap = {
    'Belum Mulai': 'text-text-secondary',
    'Berjalan': 'text-warning',
    'Selesai': 'text-success',
  };
  const Icon = iconMap[status] || Circle;
  return (
    <span className={`inline-flex items-center gap-1 text-xs ${colorMap[status] || 'text-text-secondary'}`}>
      <Icon className="h-3.5 w-3.5" />
      {status}
    </span>
  );
}

function ProgressBar({ value, size = 'md' }) {
  const height = size === 'sm' ? 'h-1.5' : 'h-2';
  return (
    <div className="flex items-center gap-3">
      <div className={`flex-1 overflow-hidden rounded-full bg-border ${height}`}>
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

function SubtaskRow({ subtask, onEdit, onDelete }) {
  const priorityClass = PRIORITY_COLORS[subtask.priority] || PRIORITY_COLORS.Medium;

  return (
    <div className="flex items-center gap-3 rounded-lg border border-border/60 bg-border/30 px-3 py-2 transition-colors hover:bg-border/50">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-xs text-text-secondary">#{subtask.id}</span>
          <span className="truncate font-medium text-sm text-text-primary">{subtask.name || '-'}</span>
        </div>
        <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-text-secondary">
          <span className="tabular-nums">{subtask.duration}d</span>
          <span className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            {subtask.start_date || '-'}
          </span>
          <div className="flex-1 min-w-[100px]">
            <ProgressBar value={subtask.progress} size="sm" />
          </div>
        </div>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        <PriorityBadge priority={subtask.priority} />
        <StatusBadge status={subtask.status} />
        <button
          onClick={() => onEdit(subtask)}
          className="text-text-secondary hover:text-text-primary transition-colors p-1"
          title="Edit sub-tugas"
        >
          <Edit2 className="h-4 w-4" />
        </button>
        <button
          onClick={() => onDelete(subtask.id)}
          className="text-danger hover:text-danger/80 transition-colors p-1"
          title="Hapus sub-tugas"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function DependencyRow({ dep, onDelete }) {
  const typeLabel = dep.type === 'SS' ? 'SS (Start-Start)' : 'FS (Finish-Start)';
  const lagLabel = dep.lag > 0 ? ` +${dep.lag}h lag` : '';

  return (
    <div className="flex items-center gap-3 rounded-lg border border-border/60 bg-border/30 px-3 py-2 transition-colors hover:bg-border/50">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-xs text-text-secondary">#{dep.id}</span>
          <span className="truncate font-medium text-sm text-text-primary">
            {dep.predecessor_name || '-'} → {dep.successor_name || '-'}
          </span>
        </div>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-text-secondary">
          <span>Ketertiban: {typeLabel}{lagLabel}</span>
          <span>Mulai: {dep.predecessor_start || '-'} → {dep.successor_start || '-'}</span>
        </div>
      </div>
      <button
        onClick={() => onDelete(dep.id)}
        className="text-danger hover:text-danger/80 transition-colors p-1 shrink-0"
        title="Hapus dependency"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );
}

function AssignmentRow({ assignment, onRemove }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-border/60 bg-border/30 px-3 py-2 transition-colors hover:bg-border/50">
      <User className="h-4 w-4 text-text-secondary shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="font-medium text-sm text-text-primary">{assignment.member_name || '-'}</p>
        <p className="text-xs text-text-secondary">
          {assignment.member_email || ''}
          {assignment.member_role ? ` · ${assignment.member_role}` : ''}
        </p>
      </div>
      <button
        onClick={() => onRemove(assignment.id, assignment.member_name)}
        className="text-danger hover:text-danger/80 transition-colors p-1 shrink-0"
        title="Hapus penugasan"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );
}

function EmptySubtasks() {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-6 text-center text-sm text-text-secondary">
      <div className="flex h-8 w-8 items-center justify-center rounded-full border border-border/60 bg-border/30">
        <Circle className="h-4 w-4" />
      </div>
      <span>Belum ada sub-tugas.</span>
    </div>
  );
}

function EmptyDependencies() {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-6 text-center text-sm text-text-secondary">
      <div className="flex h-8 w-8 items-center justify-center rounded-full border border-border/60 bg-border/30">
        <Clock className="h-4 w-4" />
      </div>
      <span>Belum ada dependency.</span>
    </div>
  );
}

function EmptyAssignments() {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-6 text-center text-sm text-text-secondary">
      <div className="flex h-8 w-8 items-center justify-center rounded-full border border-border/60 bg-border/30">
        <User className="h-4 w-4" />
      </div>
      <span>Belum ada anggota yang ditugaskan.</span>
    </div>
  );
}

function TaskFormModal({ task, projectId, onSave, onClose, title }) {
  const [name, setName] = useState(task?.name || '');
  const [description, setDescription] = useState(task?.description || '');
  const [startDate, setStartDate] = useState(task?.start_date || '');
  const [duration, setDuration] = useState(task?.duration || 1);
  const [priority, setPriority] = useState(task?.priority || 'Medium');
  const [progress, setProgress] = useState(task?.progress || 0);
  const [status, setStatus] = useState(task?.status || 'Belum Mulai');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const nameErr = !name.trim();
  const startDateErr = !startDate;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (nameErr) return;
    if (startDateErr) {
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
        status,
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
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="w-full max-w-lg rounded-card border border-border bg-surface p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-text-primary">{title}</h2>
          <button
            onClick={onClose}
            className="rounded-full p-1 text-text-secondary transition-colors hover:bg-border hover:text-text-primary"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-text-primary">
              Nama tugas <span className="text-danger">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Contoh: Desain UI"
              className={`h-10 w-full rounded-input border bg-surface px-3 text-sm text-text-primary placeholder:text-text-secondary focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-colors ${
                fieldInvalid(nameErr)
              }`}
            />
            {nameErr && <p className="text-xs text-danger">Nama tugas wajib diisi.</p>}
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-text-primary">Deskripsi</label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Deskripsi singkat..."
              className="min-h-[80px] w-full resize-y rounded-input border border-border bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-secondary focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-colors"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-text-primary">
                Tanggal mulai <span className="text-danger">*</span>
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className={`h-10 w-full rounded-input border bg-surface px-3 text-sm text-text-primary focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-colors ${
                  fieldInvalid(startDateErr)
                }`}
              />
              {startDateErr && <p className="text-xs text-danger">Wajib diisi.</p>}
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
              <label className="text-sm font-medium text-text-primary">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="h-10 w-full rounded-input border border-border bg-surface px-3 text-sm text-text-primary focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-colors"
              >
                <option value="Belum Mulai">Belum Mulai</option>
                <option value="Berjalan">Berjalan</option>
                <option value="Selesai">Selesai</option>
              </select>
            </div>
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

          {error && (
            <div className="flex items-start gap-3 rounded-card border border-danger/30 bg-danger/5 p-3">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-danger" />
              <p className="text-sm text-danger">{error}</p>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-input border border-border bg-surface px-4 py-2 text-sm font-medium text-text-secondary transition-colors hover:bg-border/60"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={loading || nameErr || startDateErr}
              className="inline-flex items-center gap-2 rounded-input bg-primary px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading && <><Loader2 className="h-4 w-4 animate-spin" />Simpan...</>}
              {!loading && <><CheckCircle className="h-4 w-4" />Simpan</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function SubtaskFormModal({ subtask, taskId, projectId, onSave, onClose, title }) {
  const [name, setName] = useState(subtask?.name || '');
  const [description, setDescription] = useState(subtask?.description || '');
  const [startDate, setStartDate] = useState(subtask?.start_date || '');
  const [duration, setDuration] = useState(subtask?.duration || 1);
  const [priority, setPriority] = useState(subtask?.priority || 'Medium');
  const [progress, setProgress] = useState(subtask?.progress || 0);
  const [status, setStatus] = useState(subtask?.status || 'Belum Mulai');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const nameErr = !name.trim();
  const startDateErr = !startDate;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (nameErr) return;
    if (startDateErr) {
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
        status,
      });
      onClose();
    } catch (err) {
      setError(err.message || 'Gagal menyimpan sub-tugas.');
    } finally {
      setLoading(false);
    }
  };

  const fieldInvalid = (err) => (err ? 'border-danger focus:border-danger focus:ring-danger/20' : '');

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="w-full max-w-lg rounded-card border border-border bg-surface p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-text-primary">{title}</h2>
          <button
            onClick={onClose}
            className="rounded-full p-1 text-text-secondary transition-colors hover:bg-border hover:text-text-primary"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-text-primary">
              Nama sub-tugas <span className="text-danger">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Contoh: Desain Homepage"
              className={`h-10 w-full rounded-input border bg-surface px-3 text-sm text-text-primary placeholder:text-text-secondary focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-colors ${
                fieldInvalid(nameErr)
              }`}
            />
            {nameErr && <p className="text-xs text-danger">Nama sub-tugas wajib diisi.</p>}
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-text-primary">Deskripsi</label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Deskripsi singkat..."
              className="min-h-[60px] w-full resize-y rounded-input border border-border bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-secondary focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-colors"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-text-primary">
                Tanggal mulai <span className="text-danger">*</span>
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className={`h-10 w-full rounded-input border bg-surface px-3 text-sm text-text-primary focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-colors ${
                  fieldInvalid(startDateErr)
                }`}
              />
              {startDateErr && <p className="text-xs text-danger">Wajib diisi.</p>}
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
              <label className="text-sm font-medium text-text-primary">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="h-10 w-full rounded-input border border-border bg-surface px-3 text-sm text-text-primary focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-colors"
              >
                <option value="Belum Mulai">Belum Mulai</option>
                <option value="Berjalan">Berjalan</option>
                <option value="Selesai">Selesai</option>
              </select>
            </div>
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

          {error && (
            <div className="flex items-start gap-3 rounded-card border border-danger/30 bg-danger/5 p-3">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-danger" />
              <p className="text-sm text-danger">{error}</p>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-input border border-border bg-surface px-4 py-2 text-sm font-medium text-text-secondary transition-colors hover:bg-border/60"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={loading || nameErr || startDateErr}
              className="inline-flex items-center gap-2 rounded-input bg-primary px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading && <><Loader2 className="h-4 w-4 animate-spin" />Simpan...</>}
              {!loading && <><CheckCircle className="h-4 w-4" />Simpan</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function DependencyFormModal({
  task,
  allTasks,
  onSave,
  onClose,
  title,
  initial = {},
}) {
  const [predecessorId, setPredecessorId] = useState(String(initial.predecessor_id || ''));
  const [successorId, setSuccessorId] = useState(String(initial.successor_id || ''));
  const [type, setType] = useState(initial.type || 'FS');
  const [lag, setLag] = useState(String(initial.lag ?? 0));

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const predecessorErr = !predecessorId;
  const successorErr = !successorId;
  const sameErr = predecessorId && successorId && Number(predecessorId) === Number(successorId);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (predecessorErr || successorErr) {
      setError('Predecessor dan successor wajib diisi.');
      return;
    }
    if (sameErr) {
      setError('Predecessor dan successor tidak boleh sama.');
      return;
    }

    setLoading(true);
    try {
      await onSave({
        predecessor_id: Number(predecessorId),
        successor_id: Number(successorId),
        type,
        lag: Math.max(0, Math.floor(Number(lag) || 0)),
      });
      onClose();
    } catch (err) {
      setError(err.message || 'Gagal menambahkan dependency.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="w-full max-w-lg rounded-card border border-border bg-surface p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-text-primary">{title}</h2>
          <button
            onClick={onClose}
            className="rounded-full p-1 text-text-secondary transition-colors hover:bg-border hover:text-text-primary"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-text-primary">
                Predecessor (tugas yang mendahului) <span className="text-danger">*</span>
              </label>
              <select
                value={predecessorId}
                onChange={(e) => setPredecessorId(e.target.value)}
                className={`h-10 w-full rounded-input border bg-surface px-3 text-sm text-text-primary focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-colors ${
                  predecessorErr ? 'border-danger focus:border-danger focus:ring-danger/20' : ''
                }`}
              >
                <option value="">-- Pilih tugas --</option>
                {allTasks
                  .filter((t) => t.id !== task?.id && !t.parent_task_id)
                  .map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} (#{t.id})
                    </option>
                  ))}
              </select>
              {predecessorErr && <p className="text-xs text-danger">Wajib diisi.</p>}
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-text-primary">
                Successor (tugas yang diseusai) <span className="text-danger">*</span>
              </label>
              <select
                value={successorId}
                onChange={(e) => setSuccessorId(e.target.value)}
                className={`h-10 w-full rounded-input border bg-surface px-3 text-sm text-text-primary focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-colors ${
                  successorErr ? 'border-danger focus:border-danger focus:ring-danger/20' : ''
                }`}
              >
                <option value="">-- Pilih tugas --</option>
                {allTasks
                  .filter((t) => t.id !== task?.id && !t.parent_task_id)
                  .map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} (#{t.id})
                    </option>
                  ))}
              </select>
              {successorErr && <p className="text-xs text-danger">Wajib diisi.</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-text-primary">Tipe dependency</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="h-10 w-full rounded-input border border-border bg-surface px-3 text-sm text-text-primary focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-colors"
              >
                <option value="FS">FS — Finish-to-Start</option>
                <option value="SS">SS — Start-to-Start</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-text-primary">Lag (hari, opsional)</label>
              <input
                type="number"
                min={0}
                value={lag}
                onChange={(e) => setLag(e.target.value)}
                placeholder="0"
                className="h-10 w-full rounded-input border border-border bg-surface px-3 text-sm text-text-primary focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-colors"
              />
            </div>
          </div>

          {error && (
            <div className="flex items-start gap-3 rounded-card border border-danger/30 bg-danger/5 p-3">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-danger" />
              <p className="text-sm text-danger">{error}</p>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-input border border-border bg-surface px-4 py-2 text-sm font-medium text-text-secondary transition-colors hover:bg-border/60"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={loading || predecessorErr || successorErr || sameErr}
              className="inline-flex items-center gap-2 rounded-input bg-primary px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading && <><Loader2 className="h-4 w-4 animate-spin" />Tambah...</>}
              {!loading && <><Plus className="h-4 w-4" />Tambah Dependency</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function AssignmentFormModal({
  task,
  teamMembers,
  onSave,
  onClose,
  title,
}) {
  const [memberId, setMemberId] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const memberErr = !memberId;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (memberErr) {
      setError('Anggota wajib diisi.');
      return;
    }

    setLoading(true);
    try {
      await onSave({ member_id: Number(memberId) });
      onClose();
    } catch (err) {
      setError(err.message || 'Gagal menugaskan anggota.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="w-full max-w-md rounded-card border border-border bg-surface p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-text-primary">{title}</h2>
          <button
            onClick={onClose}
            className="rounded-full p-1 text-text-secondary transition-colors hover:bg-border hover:text-text-primary"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-text-primary">
              Anggota tim <span className="text-danger">*</span>
            </label>
            <select
              value={memberId}
              onChange={(e) => setMemberId(e.target.value)}
              className={`h-10 w-full rounded-input border bg-surface px-3 text-sm text-text-primary focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-colors ${
                memberErr ? 'border-danger focus:border-danger focus:ring-danger/20' : ''
              }`}
            >
              <option value="">-- Pilih anggota --</option>
              {teamMembers.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} ({m.email})
                </option>
              ))}
            </select>
            {memberErr && <p className="text-xs text-danger">Wajib diisi.</p>}
          </div>

          {error && (
            <div className="flex items-start gap-3 rounded-card border border-danger/30 bg-danger/5 p-3">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-danger" />
              <p className="text-sm text-danger">{error}</p>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-input border border-border bg-surface px-4 py-2 text-sm font-medium text-text-secondary transition-colors hover:bg-border/60"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={loading || memberErr}
              className="inline-flex items-center gap-2 rounded-input bg-primary px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading && <><Loader2 className="h-4 w-4 animate-spin" />Tambah...</>}
              {!loading && <><Plus className="h-4 w-4" />Tambah</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function SectionHeader({ title, actionLabel, action }) {
  if (!actionLabel) {
    return (
      <div className="mb-3 flex items-center gap-2">
        <h3 className="text-base font-semibold text-text-primary">{title}</h3>
      </div>
    );
  }
  return (
    <div className="mb-3 flex items-center justify-between gap-2">
      <h3 className="text-base font-semibold text-text-primary">{title}</h3>
      {action ? (
        <button
          onClick={action}
          className="inline-flex items-center gap-1.5 rounded-card bg-primary text-white px-3 py-1.5 text-xs font-medium transition-colors hover:bg-primary-hover"
        >
          <Plus className="h-3.5 w-3.5" />
          {actionLabel}
        </button>
      ) : null}
    </div>
  );
}

export default function TaskDetailPage() {
  const { projectId, taskId } = useParams();
  const { confirm } = useConfirm();

  const [task, setTask] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [subtasks, setSubtasks] = useState([]);
  const [subtasksLoading, setSubtasksLoading] = useState(false);
  const [subtasksError, setSubtasksError] = useState(null);

  const [dependencies, setDependencies] = useState([]);
  const [dependenciesLoading, setDependenciesLoading] = useState(false);
  const [dependenciesError, setDependenciesError] = useState(null);

  const [assignments, setAssignments] = useState([]);
  const [assignmentsLoading, setAssignmentsLoading] = useState(false);
  const [assignmentsError, setAssignmentsError] = useState(null);

  const [teamMembers, setTeamMembers] = useState([]);

  const [editingTask, setEditingTask] = useState(null);
  const [showSubtaskModal, setShowSubtaskModal] = useState(false);
  const [editingSubtask, setEditingSubtask] = useState(null);
  const [showDependencyModal, setShowDependencyModal] = useState(false);
  const [deletingDepId, setDeletingDepId] = useState(null);
  const [deletingSubtaskId, setDeletingSubtaskId] = useState(null);
  const [showAssignmentModal, setShowAssignmentModal] = useState(false);

  const fetchTask = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get(`/projects/${projectId}/tasks/${taskId}`);
      setTask(Array.isArray(res.data) ? res.data[0] : res.data);
    } catch (err) {
      setError(err.message || 'Gagal memuat detail tugas.');
    } finally {
      setLoading(false);
    }
  }, [projectId, taskId]);

  const fetchSubtasks = useCallback(async () => {
    setSubtasksLoading(true);
    setSubtasksError(null);
    try {
      const res = await api.get(`/projects/${projectId}/tasks/${taskId}/subtasks`);
      setSubtasks(res.data || []);
    } catch (err) {
      setSubtasksError(err.message || 'Gagal memuat sub-tugas.');
    } finally {
      setSubtasksLoading(false);
    }
  }, [projectId, taskId]);

  const fetchDependencies = useCallback(async () => {
    setDependenciesLoading(true);
    setDependenciesError(null);
    try {
      const res = await api.get(`/projects/${projectId}/tasks/${taskId}/dependencies`);
      const deps = res.data || [];
      setDependencies(deps.filter((d) => d.successor_id === Number(taskId)));
    } catch (err) {
      setDependenciesError(err.message || 'Gagal memuat dependency.');
    } finally {
      setDependenciesLoading(false);
    }
  }, [projectId, taskId]);

  const fetchAssignments = useCallback(async () => {
    setAssignmentsLoading(true);
    setAssignmentsError(null);
    try {
      const res = await api.get(`/projects/${projectId}/tasks/${taskId}/assignments`);
      setAssignments(res.data || []);
    } catch (err) {
      setAssignmentsError(err.message || 'Gagal memuat penugasan.');
    } finally {
      setAssignmentsLoading(false);
    }
  }, [projectId, taskId]);

  const fetchTeamMembers = useCallback(async () => {
    try {
      const res = await api.get(`/projects/${projectId}/team`);
      setTeamMembers(res.data || []);
    } catch (err) {
      console.warn('Gagal memuat tim:', err.message);
    }
  }, [projectId]);

  useEffect(() => {
    fetchTask();
  }, [fetchTask]);

  useEffect(() => {
    if (task) {
      fetchSubtasks();
      fetchDependencies();
      fetchAssignments();
      fetchTeamMembers();
    }
  }, [task, fetchSubtasks, fetchDependencies, fetchAssignments, fetchTeamMembers]);

  const formatDate = (d) => {
    if (!d) return '-';
    const date = new Date(d);
    if (isNaN(date.getTime())) return '-';
    return date.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const handleEditTask = async (data) => {
    try {
      const res = await api.put(`/projects/${projectId}/tasks/${taskId}`, data);
      setTask(res.data);
      return res.data;
    } catch (err) {
      setError(err.message || 'Gagal memperbarui tugas.');
      throw err;
    }
  };

  const handleAddSubtask = async (data) => {
    try {
      const res = await api.post(`/projects/${projectId}/tasks/${taskId}/subtasks`, data);
      setSubtasks((prev) => [...prev, res.data]);
      return res.data;
    } catch (err) {
      setSubtasksError(err.message || 'Gagal menambahkan sub-tugas.');
      throw err;
    }
  };

  const handleUpdateSubtask = async (data) => {
    try {
      const res = await api.put(`/projects/${projectId}/tasks/${taskId}/subtasks/${editingSubtask.id}`, data);
      setSubtasks((prev) => prev.map((s) => (s.id === editingSubtask.id ? res.data : s)));
      return res.data;
    } catch (err) {
      setSubtasksError(err.message || 'Gagal mengupdate sub-tugas.');
      throw err;
    }
  };

  const handleDeleteSubtask = async () => {
    const subtask = subtasks.find((s) => s.id === deletingSubtaskId);
    if (!subtask) return;
    const ok = await confirm({
      title: 'Hapus sub-tugas?',
      description: `"${subtask.name}" akan dihapus.`,
      confirmLabel: 'Hapus',
      variant: 'danger',
    });
    if (!ok) {
      setDeletingSubtaskId(null);
      return;
    }
    try {
      await api.del(`/projects/${projectId}/tasks/${taskId}/subtasks/${deletingSubtaskId}`);
      setSubtasks((prev) => prev.filter((s) => s.id !== deletingSubtaskId));
    } catch (err) {
      setSubtasksError(err.message || 'Gagal menghapus sub-tugas.');
    } finally {
      setDeletingSubtaskId(null);
    }
  };

  const handleAddDependency = async (data) => {
    try {
      await api.post(`/projects/${projectId}/dependencies`, data);
      await fetchDependencies();
    } catch (err) {
      setDependenciesError(err.message || 'Gagal menambahkan dependency.');
      throw err;
    }
  };

  const handleDeleteDependency = async () => {
    if (!deletingDepId) return;
    const dep = dependencies.find((d) => d.id === deletingDepId);
    if (!dep) {
      setDeletingDepId(null);
      return;
    }
    const ok = await confirm({
      title: 'Hapus dependency?',
      description: `Dependency "${dep.predecessor_name || '#'+dep.predecessor_id} → ${dep.successor_name || '#'+dep.successor_id}" akan dihapus.`,
      confirmLabel: 'Hapus',
      variant: 'danger',
    });
    if (!ok) {
      setDeletingDepId(null);
      return;
    }
    try {
      await api.del(`/projects/${projectId}/dependencies/${deletingDepId}`);
      setDependencies((prev) => prev.filter((d) => d.id !== deletingDepId));
    } catch (err) {
      setDependenciesError(err.message || 'Gagal menghapus dependency.');
    } finally {
      setDeletingDepId(null);
    }
  };

  const handleAddAssignment = async (data) => {
    try {
      const res = await api.post(`/projects/${projectId}/tasks/${taskId}/assignments`, data);
      setAssignments((prev) => [...prev, res.data]);
      return res.data;
    } catch (err) {
      setAssignmentsError(err.message || 'Gagal menugaskan anggota.');
      throw err;
    }
  };

  const handleDeleteAssignment = async (assignmentId, memberName) => {
    const ok = await confirm({
      title: 'Hapus penugasan?',
      description: `"${memberName}" akan dihapus dari tugas ini.`,
      confirmLabel: 'Hapus',
      variant: 'danger',
    });
    if (!ok) return;
    try {
      await api.del(`/projects/${projectId}/tasks/${taskId}/assignments/${assignmentId}`);
      setAssignments((prev) => prev.filter((a) => a.id !== assignmentId));
    } catch (err) {
      setAssignmentsError(err.message || 'Gagal menghapus penugasan.');
    }
  };

  const [allTasks, setAllTasks] = useState([]);

  // Fetch all tasks for the project for dependency modal
  useEffect(() => {
    if (!projectId) return;
    let cancelled = false;
    api
      .get(`/projects/${projectId}/tasks`)
      .then((res) => {
        if (!cancelled) setAllTasks(res.data || []);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  const assignedMemberIds = useMemo(
    () => new Set(assignments.map((a) => Number(a.member_id))),
    [assignments]
  );

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl">
        <div className="mb-6 flex items-center gap-2">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
          <span className="text-sm text-text-secondary">Memuat detail tugas...</span>
        </div>
        <div className="space-y-4">
          <div className="h-8 w-72 animate-pulse rounded-lg bg-border" />
          <div className="grid grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 animate-pulse rounded-card bg-border" />
            ))}
          </div>
          <div className="h-24 animate-pulse rounded-card bg-border" />
        </div>
      </div>
    );
  }

  if (!task) {
    if (error) {
      return (
        <div className="mx-auto max-w-4xl">
          <Link
            to={`/projects/${projectId}/tasks`}
            className="mb-6 inline-flex items-center gap-1.5 text-sm text-text-secondary transition-colors hover:text-text-primary"
          >
            <ArrowLeft className="h-4 w-4" />
            Kembali ke Daftar Tugas
          </Link>
          <div className="flex items-start gap-3 rounded-card border border-danger/30 bg-danger/5 p-4">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-danger" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-danger">Gagal Memuat</p>
              <p className="mt-0.5 text-sm text-text-secondary">{error}</p>
            </div>
            <button
              onClick={fetchTask}
              className="shrink-0 rounded-card border border-border bg-surface px-3 py-1.5 text-xs font-medium text-text-secondary transition-colors hover:bg-border/60"
            >
              <RefreshCw className="mr-1 h-4 w-4" /> Coba lagi
            </button>
          </div>
        </div>
      );
    }
    return null;
  }

  return (
    <div className="mx-auto max-w-4xl">
      {/* Breadcrumb */}
      <Link
        to={`/projects/${projectId}/tasks`}
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-text-secondary transition-colors hover:text-text-primary"
      >
        <ArrowLeft className="h-4 w-4" />
        Kembali ke Daftar Tugas
      </Link>

      {/* Error */}
      {error && (
        <div className="mb-5 flex items-start gap-3 rounded-card border border-danger/30 bg-danger/5 p-4">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-danger" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-danger">Gagal Memproses</p>
            <p className="mt-0.5 text-sm text-text-secondary">{error}</p>
          </div>
          <button
            onClick={fetchTask}
            className="shrink-0 rounded-card border border-border bg-surface px-3 py-1.5 text-xs font-medium text-text-secondary transition-colors hover:bg-border/60"
          >
            <RefreshCw className="mr-1 h-4 w-4" /> Refresh
          </button>
        </div>
      )}

      {/* Header */}
      <div className="mb-6 rounded-card border border-border bg-surface p-6 shadow-sm">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-semibold text-text-primary">{task.name || '-'}</h1>
              <span className="text-xs text-text-secondary">#{task.id}</span>
              <PriorityBadge priority={task.priority} />
              <StatusBadge status={task.status} />
            </div>
            {task.description && (
              <p className="mt-2 text-sm text-text-secondary line-clamp-3">{task.description}</p>
            )}
          </div>
          <button
            onClick={() => setEditingTask(task)}
            className="inline-flex items-center gap-1.5 rounded-card bg-primary text-white px-3 py-1.5 text-xs font-medium transition-colors hover:bg-primary-hover shrink-0"
          >
            <Edit2 className="h-4 w-4" />
            Edit
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
          <div>
            <p className="text-xs text-text-secondary">Tanggal Mulai</p>
            <p className="mt-0.5 font-medium text-text-primary">{formatDate(task.start_date)}</p>
          </div>
          <div>
            <p className="text-xs text-text-secondary">Durasi</p>
            <p className="mt-0.5 font-medium text-text-primary tabular-nums">{task.duration} hari</p>
          </div>
          <div>
            <p className="text-xs text-text-secondary">Progress</p>
            <div className="mt-1">
              <ProgressBar value={task.progress} />
            </div>
          </div>
          <div>
            <p className="text-xs text-text-secondary">Status</p>
            <p className="mt-0.5 font-medium text-text-primary">{task.status}</p>
          </div>
        </div>
      </div>

      {/* Sub-tugas */}
      <div className="mb-6 rounded-card border border-border bg-surface shadow-sm">
        <SectionHeader
          title="Sub-Tugas"
          actionLabel={!task.parent_task_id ? 'Tambah Sub-Tugas' : undefined}
          action={task.parent_task_id ? undefined : () => setShowSubtaskModal(true)}
        />

        {subtasksLoading ? (
          <div className="space-y-2 p-3">
            {[1, 2].map((i) => (
              <div key={i} className="h-14 animate-pulse rounded-lg bg-border" />
            ))}
          </div>
        ) : subtasksError ? (
          <div className="flex items-start gap-3 rounded-card border border-danger/30 bg-danger/5 p-4">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-danger" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-danger">Gagal Memuat</p>
              <p className="mt-0.5 text-sm text-text-secondary">{subtasksError}</p>
            </div>
            <button
              onClick={fetchSubtasks}
              className="shrink-0 rounded-card border border-border bg-surface px-3 py-1.5 text-xs font-medium text-text-secondary transition-colors hover:bg-border/60"
            >
              <RefreshCw className="mr-1 h-4 w-4" /> Coba lagi
            </button>
          </div>
        ) : (
          <div className="space-y-2 p-3">
            {subtasks.length === 0 ? (
              <EmptySubtasks />
            ) : (
              subtasks.map((st) => (
                <SubtaskRow
                  key={st.id}
                  subtask={st}
                  onEdit={(s) => setEditingSubtask(s)}
                  onDelete={() => setDeletingSubtaskId(st.id)}
                />
              ))
            )}
          </div>
        )}
      </div>

      {/* Dependencies */}
      <div className="mb-6 rounded-card border border-border bg-surface shadow-sm">
        <SectionHeader
          title="Dependency"
          actionLabel="Tambah Dependency"
          action={() => setShowDependencyModal(true)}
        />

        {dependenciesLoading ? (
          <div className="space-y-2 p-3">
            {[1, 2].map((i) => (
              <div key={i} className="h-14 animate-pulse rounded-lg bg-border" />
            ))}
          </div>
        ) : dependenciesError ? (
          <div className="flex items-start gap-3 rounded-card border border-danger/30 bg-danger/5 p-4">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-danger" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-danger">Gagal Memuat</p>
              <p className="mt-0.5 text-sm text-text-secondary">{dependenciesError}</p>
            </div>
            <button
              onClick={fetchDependencies}
              className="shrink-0 rounded-card border border-border bg-surface px-3 py-1.5 text-xs font-medium text-text-secondary transition-colors hover:bg-border/60"
            >
              <RefreshCw className="mr-1 h-4 w-4" /> Coba lagi
            </button>
          </div>
        ) : (
          <div className="space-y-2 p-3">
            {dependencies.length === 0 ? (
              <EmptyDependencies />
            ) : (
              dependencies.map((dep) => (
                <DependencyRow
                  key={dep.id}
                  dep={dep}
                  onDelete={() => setDeletingDepId(dep.id)}
                />
              ))
            )}
          </div>
        )}
      </div>

      {/* Assignments */}
      <div className="mb-6 rounded-card border border-border bg-surface shadow-sm">
        <SectionHeader
          title="Anggota yang Ditugaskan"
          actionLabel="Tugaskan Anggota"
          action={() => setShowAssignmentModal(true)}
        />

        {assignmentsLoading ? (
          <div className="space-y-2 p-3">
            {[1, 2].map((i) => (
              <div key={i} className="h-14 animate-pulse rounded-lg bg-border" />
            ))}
          </div>
        ) : assignmentsError ? (
          <div className="flex items-start gap-3 rounded-card border border-danger/30 bg-danger/5 p-4">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-danger" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-danger">Gagal Memuat</p>
              <p className="mt-0.5 text-sm text-text-secondary">{assignmentsError}</p>
            </div>
            <button
              onClick={fetchAssignments}
              className="shrink-0 rounded-card border border-border bg-surface px-3 py-1.5 text-xs font-medium text-text-secondary transition-colors hover:bg-border/60"
            >
              <RefreshCw className="mr-1 h-4 w-4" /> Coba lagi
            </button>
          </div>
        ) : (
          <div className="space-y-2 p-3">
            {assignments.length === 0 ? (
              <EmptyAssignments />
            ) : (
              assignments.map((a) => (
                <AssignmentRow
                  key={a.id}
                  assignment={a}
                  onRemove={() => handleDeleteAssignment(a.id, a.member_name)}
                />
              ))
            )}
          </div>
        )}
      </div>

      {showDependencyModal && (
        <DependencyFormModal
          task={task}
          allTasks={allTasks}
          onSave={handleAddDependency}
          onClose={() => setShowDependencyModal(false)}
          title="Tambah Dependency"
        />
      )}

      {showAssignmentModal && (
        <AssignmentFormModal
          task={task}
          teamMembers={teamMembers.filter(m => !assignedMemberIds.has(Number(m.id)))}
          onSave={handleAddAssignment}
          onClose={() => setShowAssignmentModal(false)}
          title="Tugaskan Anggota"
        />
      )}

    </div>
  );
}
