import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { X } from 'lucide-react';

const ConfirmContext = createContext(null);

/**
 * Hook untuk memanggil dialog konfirmasi dari komponen mana pun.
 * Wajib dipasang di dalam <ConfirmDialogProvider>.
 */
export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) {
    // Fallback: kalau Provider belum dipasang, pakai window.confirm bawaan
    return {
      confirm: async ({ title, description }) => {
        return window.confirm(`${title}\n\n${description || ''}`);
      },
    };
  }
  return ctx;
}

function ConfirmDialog({ state, onResolve }) {
  if (!state.open || !state.pending) return null;

  const { title, description, confirmLabel = 'Ya, lanjutkan', variant = 'default' } = state.pending;
  const borderClass = variant === 'danger' ? 'border-danger/40' : 'border-border';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onResolve(false);
      }}
    >
      <div
        className={`w-full max-w-md rounded-card border ${borderClass} bg-surface p-5 shadow-xl`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h3 className="text-base font-semibold text-text-primary">{title}</h3>
            {description && (
              <p className="mt-1.5 text-sm text-text-secondary">{description}</p>
            )}
          </div>
          <button
            onClick={() => onResolve(false)}
            className="shrink-0 rounded-full p-1 text-text-secondary transition-colors hover:bg-border hover:text-text-primary"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-5 flex justify-end gap-3">
          <button
            onClick={() => onResolve(false)}
            className="rounded-input border border-border bg-surface px-4 py-2 text-sm font-medium text-text-secondary transition-colors hover:bg-border/60"
          >
            Batal
          </button>
          <button
            onClick={() => onResolve(true)}
            className={
              variant === 'danger'
                ? 'rounded-input bg-danger text-white px-4 py-2 text-sm font-medium transition-colors hover:bg-danger/90'
                : 'rounded-input bg-primary text-white px-4 py-2 text-sm font-medium transition-colors hover:bg-primary-hover'
            }
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Provider global. Pasang SEKALI di root App.
 * Menyimpan satu state confirm untuk seluruh aplikasi.
 */
export function ConfirmDialogProvider({ children }) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(null);
  const resolverRef = useRef(null);

  const confirm = useCallback((opts = {}) => {
    return new Promise((resolve) => {
      resolverRef.current = resolve;
      setPending(opts);
      setOpen(true);
    });
  }, []);

  const handleResolve = useCallback((result) => {
    setOpen(false);
    setPending(null);
    if (resolverRef.current) {
      resolverRef.current(result);
      resolverRef.current = null;
    }
  }, []);

  const value = useMemo(() => ({ confirm }), [confirm]);

  return (
    <ConfirmContext.Provider value={value}>
      {children}
      <ConfirmDialog state={{ open, pending }} onResolve={handleResolve} />
    </ConfirmContext.Provider>
  );
}