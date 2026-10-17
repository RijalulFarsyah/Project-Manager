import { useState, useEffect, useCallback } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api/client';
import {
  Plus,
  Trash2,
  Edit2,
  AlertCircle,
  RefreshCw,
  Loader2,
  CheckCircle,
  X,
  Calendar as CalendarIcon,
} from 'lucide-react';
import { useConfirm } from '../hooks/useConfirm.jsx';

const DAYS = [
  { key: 'is_working_day_mon', label: 'Senin', short: 'Sen' },
  { key: 'is_working_day_tue', label: 'Selasa', short: 'Sel' },
  { key: 'is_working_day_wed', label: 'Rabu', short: 'Rab' },
  { key: 'is_working_day_thu', label: 'Kamis', short: 'Kam' },
  { key: 'is_working_day_fri', label: 'Jumat', short: 'Jum' },
  { key: 'is_working_day_sat', label: 'Sabtu', short: 'Sab' },
  { key: 'is_working_day_sun', label: 'Minggu', short: 'Min' },
];

const DAY_WORKING_COLORS = {
  true: 'bg-success/10 text-success border-success/30',
  false: 'bg-danger/10 text-danger border-danger/30',
};

export default function CalendarPage() {
  const { projectId } = useParams();
  const { confirm } = useConfirm();

  const [calendar, setCalendar] = useState(null);
  const [holidays, setHolidays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Calendar form state
  const [calendarForm, setCalendarForm] = useState({
    is_working_day_mon: true,
    is_working_day_tue: true,
    is_working_day_wed: true,
    is_working_day_thu: true,
    is_working_day_fri: true,
    is_working_day_sat: false,
    is_working_day_sun: false,
  });
  const [calendarDirty, setCalendarDirty] = useState(false);

  // Holiday form state
  const [showAddHoliday, setShowAddHoliday] = useState(false);
  const [editingHoliday, setEditingHoliday] = useState(null);
  const [holidayDate, setHolidayDate] = useState('');
  const [holidayDesc, setHolidayDesc] = useState('');
  const [holidayError, setHolidayError] = useState(null);
  const [savingHoliday, setSavingHoliday] = useState(false);

  // Fetch calendar + holidays
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [calRes, holRes] = await Promise.all([
        api.get(`/projects/${projectId}/calendar`),
        api.get(`/projects/${projectId}/holidays`),
      ]);
      setCalendar(calRes.data);
      setHolidays(holRes.data || []);

      setCalendarForm({
        is_working_day_mon: !!calRes.data.is_working_day_mon,
        is_working_day_tue: !!calRes.data.is_working_day_tue,
        is_working_day_wed: !!calRes.data.is_working_day_wed,
        is_working_day_thu: !!calRes.data.is_working_day_thu,
        is_working_day_fri: !!calRes.data.is_working_day_fri,
        is_working_day_sat: !!calRes.data.is_working_day_sat,
        is_working_day_sun: !!calRes.data.is_working_day_sun,
      });
      setCalendarDirty(false);
    } catch (err) {
      setError(err.message || 'Gagal memuat data kalender.');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Calendar save
  const handleSaveCalendar = async () => {
    try {
      await api.put(`/projects/${projectId}/calendar`, calendarForm);
      await fetchData();
    } catch (err) {
      setError(`Gagal menyimpan: ${err.message}`);
      setTimeout(fetchData, 1000);
    }
  };

  // Holiday CRUD
  const openAddHoliday = () => {
    setShowAddHoliday(true);
    setEditingHoliday(null);
    setHolidayDate('');
    setHolidayDesc('');
    setHolidayError(null);
  };

  const openEditHoliday = (holiday) => {
    setEditingHoliday(holiday);
    setShowAddHoliday(true);
    setHolidayDate(holiday.date);
    setHolidayDesc(holiday.description);
    setHolidayError(null);
  };

  const closeHolidayForm = () => {
    setShowAddHoliday(false);
    setEditingHoliday(null);
    setHolidayDate('');
    setHolidayDesc('');
    setHolidayError(null);
  };

  const saveHoliday = async () => {
    setHolidayError(null);
    setSavingHoliday(true);
    try {
      const payload = {
        date: holidayDate,
        description: holidayDesc.trim() || '',
      };
      if (editingHoliday) {
        await api.put(`/projects/${projectId}/holidays/${editingHoliday.id}`, payload);
      } else {
        await api.post(`/projects/${projectId}/holidays`, payload);
      }
      await fetchData();
      closeHolidayForm();
    } catch (err) {
      setHolidayError(err.message || 'Gagal menyimpan hari libur.');
    } finally {
      setSavingHoliday(false);
    }
  };

  const deleteHoliday = async (holiday) => {
    const ok = await confirm({
      title: 'Hapus hari libur?',
      description: `"${holiday.date}" — ${holiday.description || '(tanpa keterangan)'}`,
      confirmLabel: 'Hapus',
      variant: 'danger',
    });
    if (!ok) return;
    try {
      await api.del(`/projects/${projectId}/holidays/${holiday.id}`);
      await fetchData();
    } catch (err) {
      setError(`Gagal menghapus: ${err.message}`);
      setTimeout(fetchData, 1000);
    }
  };

  if (loading && !calendar) {
    return (
      <div className="mx-auto max-w-3xl">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            <span className="text-sm text-text-secondary">Memuat kalender...</span>
          </div>
        </div>
        <div className="space-y-4">
          <div className="h-16 animate-pulse rounded-card bg-border" />
          <div className="h-32 animate-pulse rounded-card bg-border" />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      {/* Breadcrumb */}
      <Link
        to={`/projects/${projectId}`}
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-text-secondary transition-colors hover:text-text-primary"
      >
        <ArrowLeft className="h-4 w-4" />
        Kembali ke Overview
      </Link>

      {/* Error */}
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

      {/* Section: Kalender Kerja */}
      <div className="mb-8">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-text-primary">
            <CalendarIcon className="mr-2 h-5 w-5 text-primary" />
            Kalender Kerja
          </h2>
          {calendarDirty && (
            <button
              onClick={handleSaveCalendar}
              className="inline-flex items-center gap-2 rounded-card bg-primary px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-primary-hover"
            >
              <CheckCircle className="h-4 w-4" />
              Simpan Perubahan
            </button>
          )}
        </div>

        <div className="rounded-card border border-border bg-surface p-5 shadow-sm">
          <p className="mb-4 text-sm text-text-secondary">
            Tentukan hari kerja dalam seminggu. Hari yang tidak aktif akan diangap libur dalam perhitungan jadwal.
          </p>

          <div className="grid grid-cols-7 gap-2">
            {DAYS.map((day) => {
              const checked = calendarForm[day.key];
              const cls = DAY_WORKING_COLORS[checked];
              return (
                <label
                  key={day.key}
                  className={`flex cursor-pointer flex-col items-center gap-2 rounded-card border px-3 py-3 text-center transition-colors hover:bg-border/60 ${cls}`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(e) => {
                      setCalendarForm((prev) => ({
                        ...prev,
                        [day.key]: e.target.checked,
                      }));
                      setCalendarDirty(true);
                    }}
                    className="h-4 w-4 accent-primary"
                  />
                  <div>
                    <span className="text-xs font-medium">{day.short}</span>
                    <p className="text-[11px] text-text-secondary">{day.label}</p>
                  </div>
                </label>
              );
            })}
          </div>

          {/* Visual preview hari kerja */}
          <div className="mt-5 flex flex-wrap items-center gap-2 text-sm">
            <span className="text-text-secondary">Hari kerja:</span>
            {DAYS.map((day) => {
              if (calendarForm[day.key]) {
                return (
                  <span
                    key={day.key}
                    className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary"
                  >
                    {day.short}
                  </span>
                );
              }
              return null;
            })}
            {!DAYS.some((d) => calendarForm[d.key]) && (
              <span className="text-xs text-danger">Tidak ada hari kerja yang ditentukan.</span>
            )}
          </div>
        </div>
      </div>

      {/* Section: Hari Libur Khusus */}
      <div className="mb-8">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-text-primary">
            Hari Libur Khusus
          </h2>
          <button
            onClick={openAddHoliday}
            className="inline-flex items-center gap-2 rounded-card bg-primary px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-primary-hover"
          >
            <Plus className="h-4 w-4" />
            Tambah Libur
          </button>
        </div>

        <div className="rounded-card border border-border bg-surface shadow-sm overflow-hidden">
          {holidays.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full border border-border bg-border/40">
                <CalendarIcon className="h-6 w-6 text-text-secondary" />
              </div>
              <p className="text-sm font-medium text-text-primary">Belum ada hari libur khusus</p>
              <p className="text-xs text-text-secondary">Tambahkan hari libur untuk hari yang tidak bekerja.</p>
            </div>
          ) : (
            <div className="divide-y divide-border/60">
              {holidays.map((holiday) => (
                <div
                  key={holiday.id}
                  className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-border/40 transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-text-primary">
                        {holiday.date}
                      </span>
                      <span className="rounded-full bg-warning/10 px-2 py-0.5 text-xs font-medium text-warning">
                        Libur
                      </span>
                    </div>
                    {holiday.description && (
                      <p className="truncate text-xs text-text-secondary">{holiday.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => openEditHoliday(holiday)}
                      className="rounded-full p-1.5 text-text-secondary transition-colors hover:bg-border hover:text-text-primary"
                      title="Edit"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => deleteHoliday(holiday)}
                      className="rounded-full p-1.5 text-danger transition-colors hover:bg-danger/10 hover:text-danger"
                      title="Hapus"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modal tambah/edit hari libur */}
      {showAddHoliday && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm" onClick={(e) => { if (e.target === e.currentTarget) closeHolidayForm(); }}>
          <div className="w-full max-w-md rounded-card border border-border bg-surface p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-text-primary">
                {editingHoliday ? 'Edit Hari Libur' : 'Tambah Hari Libur'}
              </h2>
              <button onClick={closeHolidayForm} className="rounded-full p-1 text-text-secondary transition-colors hover:bg-border hover:text-text-primary">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={(e) => { e.preventDefault(); saveHoliday(); }} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-text-primary">Tanggal <span className="text-danger">*</span></label>
                <input
                  type="date"
                  value={holidayDate}
                  onChange={(e) => setHolidayDate(e.target.value)}
                  className={`h-10 w-full rounded-input border bg-surface px-3 text-sm text-text-primary focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-colors ${!holidayDate ? 'border-danger focus:border-danger focus:ring-danger/20' : ''}`}
                />
                {!holidayDate && <p className="text-xs text-danger">Tanggal wajib diisi.</p>}
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-text-primary">Keterangan</label>
                <input
                  type="text"
                  value={holidayDesc}
                  onChange={(e) => setHolidayDesc(e.target.value)}
                  placeholder="Contoh: Libur ciduk, hari besar nasional..."
                  className="h-10 w-full rounded-input border border-border bg-surface px-3 text-sm text-text-primary placeholder:text-text-secondary focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-colors"
                  maxLength={300}
                />
              </div>

              {holidayError && (
                <div className="flex items-start gap-3 rounded-card border border-danger/30 bg-danger/5 p-3">
                  <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-danger" />
                  <p className="text-sm text-danger">{holidayError}</p>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={closeHolidayForm} className="rounded-input border border-border bg-surface px-4 py-2 text-sm font-medium text-text-secondary transition-colors hover:bg-border/60">
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={savingHoliday || !holidayDate}
                  className="inline-flex items-center gap-2 rounded-input bg-primary px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {savingHoliday && <><Loader2 className="h-4 w-4 animate-spin" />Simpan...</>}
                  {!savingHoliday && <><CheckCircle className="h-4 w-4" />Simpan</>}
                </button>
              </div>
            </form>
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
