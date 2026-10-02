import { useState } from 'react';
import { Download, Folder, X, Check } from 'lucide-react';
import type { AppState } from '../services/storage';
import { saveBackupToFile, BACKUP_FOLDER } from '../services/backupService';
import { Capacitor } from '@capacitor/core';

interface Props {
  state: AppState;
  onSuccess: (fileName: string) => void;
  onClose: () => void;
}

export function ExportModal({ state, onSuccess, onClose }: Props) {
  const defaultName = `DailyTrade_Portfolio_${new Date().toISOString().slice(0, 10)}`;
  const [fileName, setFileName] = useState(defaultName);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const isNative = Capacitor.isNativePlatform();

  const handleExport = async () => {
    if (!fileName.trim()) {
      setError('Please provide a file name');
      return;
    }
    setSaving(true);
    setError('');

    const res = await saveBackupToFile(state, fileName.trim());
    setSaving(false);
    if (res.success) {
      onSuccess(res.filePath || fileName.trim());
      onClose();
    } else {
      setError(res.error || 'Failed to export backup');
    }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-sheet" style={{ maxWidth: 440 }}>
        {/* Header */}
        <div className="row between" style={{ marginBottom: 16 }}>
          <div className="row gap-2" style={{ alignItems: 'center' }}>
            <Download size={16} color="var(--color-bull)" />
            <span className="mono font-bold" style={{ fontSize: 13, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
              EXPORT PORTFOLIO BACKUP
            </span>
          </div>
          <button className="btn btn-ghost" style={{ padding: '4px 6px' }} onClick={onClose}>
            <X size={14} />
          </button>
        </div>

        <div className="col gap-3">
          {/* Storage Directory Info */}
          <div style={{ padding: '12px', background: 'var(--bg-subtle)', border: '1px solid var(--border-dim)' }}>
            <div className="row gap-2" style={{ alignItems: 'center', marginBottom: 4 }}>
              <Folder size={14} color="#60a5fa" />
              <span className="mono font-bold" style={{ fontSize: 11, color: '#93c5fd' }}>
                {isNative ? 'DEVICE STORAGE DIRECTORY' : 'BROWSER DOWNLOAD'}
              </span>
            </div>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-secondary)', margin: 0, wordBreak: 'break-all' }}>
              {isNative
                ? `Documents/${BACKUP_FOLDER}/ (survives app updates & uninstalls)`
                : 'Direct JSON file download to your device'}
            </p>
          </div>

          {/* Backup Summary Snapshot */}
          <div className="row between" style={{ padding: '10px 12px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-dim)' }}>
            <div className="col">
              <span className="mono text-xs" style={{ color: 'var(--text-muted)' }}>ACCOUNTS</span>
              <span className="num font-bold" style={{ fontSize: 13 }}>{state.accounts.length}</span>
            </div>
            <div className="col">
              <span className="mono text-xs" style={{ color: 'var(--text-muted)' }}>POSITIONS</span>
              <span className="num font-bold" style={{ fontSize: 13 }}>{state.positions.length}</span>
            </div>
            <div className="col">
              <span className="mono text-xs" style={{ color: 'var(--text-muted)' }}>TRADES</span>
              <span className="num font-bold" style={{ fontSize: 13 }}>{state.history.length}</span>
            </div>
          </div>

          {/* File Name Input */}
          <div className="col gap-1">
            <label style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              FILE NAME
            </label>
            <div className="row" style={{ alignItems: 'center', background: 'var(--bg-subtle)', border: '1px solid var(--border-dim)', padding: '0 8px' }}>
              <input
                type="text"
                value={fileName}
                onChange={e => setFileName(e.target.value)}
                placeholder="MyBackup_2026"
                style={{
                  flex: 1,
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-primary)',
                  fontFamily: 'var(--font-mono)',
                  fontSize: 12,
                  padding: '9px 0',
                  outline: 'none',
                }}
              />
              <span className="mono text-xs" style={{ color: 'var(--text-muted)' }}>.json</span>
            </div>
          </div>

          {error && (
            <span style={{ color: 'var(--color-bear)', fontFamily: 'var(--font-mono)', fontSize: 11 }}>
              {error}
            </span>
          )}

          {/* Action Buttons */}
          <div className="row gap-2" style={{ marginTop: 8 }}>
            <button
              className="btn btn-ghost flex-1"
              style={{ padding: '10px' }}
              onClick={onClose}
              disabled={saving}
            >
              CANCEL
            </button>
            <button
              className="btn btn-bull flex-1"
              style={{ padding: '10px', fontSize: 12 }}
              onClick={handleExport}
              disabled={saving}
            >
              {saving ? 'SAVING...' : (
                <span className="row gap-1" style={{ alignItems: 'center', justifyContent: 'center' }}>
                  <Check size={13} strokeWidth={3} /> SAVE BACKUP
                </span>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
