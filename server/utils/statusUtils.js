/**
 * Sync helpers for task progress/status consistency.
 */

export function computeStatusFromProgress(progress) {
  const p = Number(progress);
  if (isNaN(p)) return 'Belum Mulai';
  if (p >= 100) return 'Selesai';
  if (p > 0) return 'Berjalan';
  return 'Belum Mulai';
}

export function computeProgressForStatus(status, currentProgress) {
  if (status === 'Selesai') return 100;
  if (status === 'Berjalan') return currentProgress > 0 ? currentProgress : 1;
  return 0;
}
