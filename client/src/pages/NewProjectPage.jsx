import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { ArrowLeft, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';

export default function NewProjectPage() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [organization, setOrganization] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [success, setSuccess] = useState(null);

  const nameErr = (!name || name.trim() === '') && name !== '';
  const orgErr = (!organization || organization.trim() === '') && organization !== '';
  const dateErr =
    startDate && endDate && endDate < startDate
      ? 'Tanggal selesai tidak boleh lebih awal dari tanggal mulai.'
      : undefined;

  const fieldInvalid = (err) =>
    err ? 'border-danger focus:border-danger focus:ring-danger/20' : '';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError(null);

    if (!name.trim()) return;
    if (!organization.trim()) return;
    if (!startDate) return;
    if (endDate && endDate < startDate) {
      setSubmitError('Tanggal selesai tidak boleh lebih awal dari tanggal mulai.');
      return;
    }

    setLoading(true);
    try {
      const res = await api.post('/projects', {
        name: name.trim(),
        organization: organization.trim(),
        description: description.trim(),
        start_date: startDate,
        end_date: endDate || null,
      });
      setSuccess({ title: 'Proyek berhasil dibuat.', description: `"${res.data.name}" sekarang tersedia.` });
      setTimeout(() => {
        navigate(`/projects/${res.data.id}`);
      }, 800);
    } catch (err) {
      setSubmitError(err.message || 'Gagal membuat proyek. Silakan coba lagi.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-xl">
      {/* Breadcrumb */}
      <Link
        to="/projects"
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-text-secondary transition-colors hover:text-text-primary"
      >
        <ArrowLeft className="h-[16px] w-[16px]" />
        Kembali ke Semua Proyek
      </Link>

      <div className="rounded-card border border-border bg-surface p-6 shadow-sm">
        <div className="mb-5">
          <h1 className="text-xl font-semibold text-text-primary">Buat Proyek Baru</h1>
          <p className="mt-1 text-sm text-text-secondary">
            Isi informasi dasar proyek Anda di bawah ini.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Nama */}
          <div className="space-y-1.5">
            <label htmlFor="name" className="text-sm font-medium text-text-primary">
              Nama proyek <span className="text-danger">*</span>
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Contoh: Renovasi Kantor Pusat"
              className={`h-10 w-full rounded-input border bg-surface px-3 text-sm text-text-primary placeholder:text-text-secondary focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-colors ${fieldInvalid(nameErr)}`}
            />
            {nameErr && <p className="text-xs text-danger">Nama proyek wajib diisi.</p>}
          </div>

          {/* Organisasi */}
          <div className="space-y-1.5">
            <label htmlFor="organization" className="text-sm font-medium text-text-primary">
              Organisasi <span className="text-danger">*</span>
            </label>
            <input
              id="organization"
              type="text"
              value={organization}
              onChange={(e) => setOrganization(e.target.value)}
              placeholder="Contoh: PT Maju Bersama"
              className={`h-10 w-full rounded-input border bg-surface px-3 text-sm text-text-primary placeholder:text-text-secondary focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-colors ${fieldInvalid(orgErr)}`}
            />
            {orgErr && <p className="text-xs text-danger">Organisasi wajib diisi.</p>}
          </div>

          {/* Deskripsi */}
          <div className="space-y-1.5">
            <label htmlFor="description" className="text-sm font-medium text-text-primary">
              Deskripsi <span className="text-text-secondary">(opsional)</span>
            </label>
            <textarea
              id="description"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ringkasan singkat tentang proyek ini..."
              className="h-auto min-h-[80px] w-full resize-y rounded-input border border-border bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-secondary focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-colors"
            />
          </div>

          {/* Tanggal mulai */}
          <div className="space-y-1.5">
            <label htmlFor="start_date" className="text-sm font-medium text-text-primary">
              Tanggal mulai <span className="text-danger">*</span>
            </label>
            <input
              id="start_date"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className={`h-10 w-full rounded-input border bg-surface px-3 text-sm text-text-primary focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-colors ${fieldInvalid(!startDate)}`}
            />
            {!startDate && (
              <p className="text-xs text-danger">Tanggal mulai wajib diisi.</p>
            )}
          </div>

          {/* Tanggal selesai */}
          <div className="space-y-1.5">
            <label htmlFor="end_date" className="text-sm font-medium text-text-primary">
              Tanggal selesai <span className="text-text-secondary">(opsional)</span>
            </label>
            <input
              id="end_date"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              min={startDate}
              className={`h-10 w-full rounded-input border bg-surface px-3 text-sm text-text-primary focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-colors ${fieldInvalid(dateErr)}`}
            />
            {dateErr && <p className="text-xs text-danger">{dateErr}</p>}
          </div>

          {/* Error */}
          {submitError && (
            <div className="flex items-start gap-3 rounded-card border border-danger/30 bg-danger/5 p-4">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-danger" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-danger">Gagal membuat proyek</p>
                <p className="mt-0.5 text-sm text-text-secondary">{submitError}</p>
              </div>
            </div>
          )}

          {/* Success toast */}
          {success && (
            <div className="flex items-start gap-3 rounded-card border border-success/30 bg-success/5 p-4">
              <CheckCircle className="mt-0.5 h-5 w-5 shrink-0 text-success" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-success">{success.title}</p>
                <p className="mt-0.5 text-sm text-text-secondary">{success.description}</p>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between pt-2">
            <Link
              to="/projects"
              className="inline-flex items-center gap-1.5 rounded-input border border-border bg-surface px-4 py-2 text-sm font-medium text-text-secondary transition-colors hover:bg-border/60"
            >
              <ArrowLeft className="h-[16px] w-[16px]" />
              Batal
            </Link>
            <button
              type="submit"
              disabled={loading || !!nameErr || !!orgErr || !startDate}
              className="inline-flex items-center gap-2 rounded-input bg-primary px-5 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading && (
                <>
                  <Loader2 className="h-[16px] w-[16px] animate-spin" />
                  Membuat...
                </>
              )}
              {!loading && (
                <>
                  <CheckCircle className="h-[16px] w-[16px]" />
                  Buat Proyek
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
