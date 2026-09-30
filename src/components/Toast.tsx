import { useEffect } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  title: string;
  message?: string;
}

interface Props {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export function ToastContainer({ toasts, onDismiss }: Props) {
  return (
    <div style={{
      position: 'fixed',
      top: 64,
      left: '50%',
      transform: 'translateX(-50%)',
      width: 'calc(100% - 24px)',
      maxWidth: 420,
      zIndex: 9999,
      display: 'flex',
      flexDirection: 'column',
      gap: 8,
      pointerEvents: 'none',
    }}>
      {toasts.map(t => (
        <ToastItem key={t.id} toast={t} onDismiss={onDismiss} />
      ))}
    </div>
  );
}

function ToastItem({ toast, onDismiss }: { toast: ToastMessage; onDismiss: (id: string) => void }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onDismiss(toast.id);
    }, 4000);
    return () => clearTimeout(timer);
  }, [toast.id, onDismiss]);

  const isSuccess = toast.type === 'success';
  const isError   = toast.type === 'error';

  const borderColor = isSuccess ? 'var(--color-bull)' : isError ? 'var(--color-bear)' : 'var(--color-blue)';
  const iconColor   = isSuccess ? 'var(--color-bull)' : isError ? 'var(--color-bear)' : 'var(--color-blue)';
  const bgColor     = isSuccess ? 'rgba(0, 230, 118, 0.12)' : isError ? 'rgba(255, 61, 113, 0.12)' : 'rgba(59, 130, 246, 0.12)';

  return (
    <div style={{
      pointerEvents: 'auto',
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      padding: '10px 14px',
      background: 'rgba(10, 10, 12, 0.95)',
      backdropFilter: 'blur(12px)',
      border: `1px solid ${borderColor}`,
      boxShadow: `0 4px 20px rgba(0,0,0,0.7), 0 0 10px ${bgColor}`,
      color: 'var(--text-primary)',
      animation: 'slideDown 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
    }}>
      <div style={{ color: iconColor, display: 'flex', flexShrink: 0 }}>
        {isSuccess && <CheckCircle2 size={18} strokeWidth={2} />}
        {isError && <AlertCircle size={18} strokeWidth={2} />}
        {!isSuccess && !isError && <Info size={18} strokeWidth={2} />}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontFamily: 'var(--font-ui)',
          fontSize: 13,
          fontWeight: 700,
          letterSpacing: '0.02em',
          color: 'var(--text-primary)',
        }}>
          {toast.title}
        </div>
        {toast.message && (
          <div style={{
            fontFamily: 'var(--font-ui)',
            fontSize: 11,
            color: 'var(--text-secondary)',
            marginTop: 2,
          }}>
            {toast.message}
          </div>
        )}
      </div>

      <button
        onClick={() => onDismiss(toast.id)}
        style={{
          background: 'none',
          border: 'none',
          color: 'var(--text-muted)',
          cursor: 'pointer',
          padding: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <X size={14} />
      </button>
    </div>
  );
}
