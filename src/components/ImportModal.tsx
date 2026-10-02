import { useState, useEffect } from 'react';
import { Upload, Folder, X, RefreshCw, Layers, FileText, CheckCircle2 } from 'lucide-react';
import type { AppState } from '../services/storage';
import { importJSON, formatCurrency } from '../services/storage';
import {
  listDeviceBackups, readDeviceBackup, getBackupPreview,
  mergeAppState, type DeviceBackupFile, type BackupPreview, BACKUP_FOLDER
} from '../services/backupService';
import { Capacitor } from '@capacitor/core';

interface Props {
  currentState: AppState;
  onConfirmRestore: (restoredState: AppState, mode: 'merge' | 'replace') => void;
  onClose: () => void;
}

export function ImportModal({ currentState, onConfirmRestore, onClose }: Props) {
  const [deviceFiles, setDeviceFiles] = useState<DeviceBackupFile[]>([]);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const [pendingState, setPendingState] = useState<AppState | null>(null);
  const [preview, setPreview] = useState<BackupPreview | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const isNative = Capacitor.isNativePlatform();

  // Load existing device backups on mount
  useEffect(() => {
    if (isNative) {
      listDeviceBackups().then(files => {
        setDeviceFiles(files);
      });
    }
  }, [isNative]);

  const handleSelectDeviceFile = async (name: string) => {
    setSelectedFileName(name);
    setError('');
    setLoading(true);
    try {
      const data = await readDeviceBackup(name);
      setPendingState(data);
      setPreview(getBackupPreview(data));
    } catch {
      setError(`Failed to read backup ${name}`);
      setPendingState(null);
      setPreview(null);
    } finally {
      setLoading(false);
    }
  };

  const handlePickLocalFile = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      setError('');
      setLoading(true);
      try {
        const text = await file.text();
        const data = importJSON(text);
        setSelectedFileName(file.name);
        setPendingState(data);
        setPreview(getBackupPreview(data));
      } catch {
        setError('Invalid backup JSON file');
      } finally {
        setLoading(false);
      }
    };
    input.click();
  };

  const executeRestore = (mode: 'merge' | 'replace') => {
    if (!pendingState) return;
    if (mode === 'merge') {
      const merged = mergeAppState(currentState, pendingState);
      onConfirmRestore(merged, 'merge');
    } else {
      onConfirmRestore(pendingState, 'replace');
    }
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-sheet" style={{ maxWidth: 460, maxHeight: '90vh', overflowY: 'auto' }}>
        {/* Header */}
        <div className="row between" style={{ marginBottom: 14 }}>
          <div className="row gap-2" style={{ alignItems: 'center' }}>
            <Upload size={16} color="var(--color-bull)" />
            <span className="mono font-bold" style={{ fontSize: 13, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
              RESTORE PORTFOLIO BACKUP
            </span>
          </div>
          <button className="btn btn-ghost" style={{ padding: '4px 6px' }} onClick={onClose}>
            <X size={14} />
          </button>
        </div>

        <div className="col gap-3">
          {/* Pick file buttons */}
          <div className="row gap-2">
            <button
              className="btn btn-outline flex-1 row gap-2"
              style={{ padding: '9px 12px', justifyContent: 'center' }}
              onClick={handlePickLocalFile}
            >
              <FileText size={13} />
              <span>CHOOSE FILE</span>
            </button>
          </div>

          {/* Device Backups list (if Android) */}
          {isNative && (
            <div className="col gap-1">
              <span className="mono text-xs" style={{ color: 'var(--text-muted)' }}>
                FOUND IN DOCUMENTS/{BACKUP_FOLDER}:
              </span>
              {deviceFiles.length === 0 ? (
                <div style={{ padding: '8px 10px', background: 'var(--bg-subtle)', border: '1px dashed var(--border-dim)' }}>
                  <span className="mono text-xs" style={{ color: 'var(--text-muted)' }}>No backups found on device yet</span>
                </div>
              ) : (
                <div className="col gap-1" style={{ maxHeight: 130, overflowY: 'auto' }}>
                  {deviceFiles.map(f => (
                    <button
                      key={f.name}
                      onClick={() => handleSelectDeviceFile(f.name)}
                      className="row between"
                      style={{
                        padding: '8px 10px',
                        background: selectedFileName === f.name ? 'rgba(0, 230, 118, 0.1)' : 'var(--bg-subtle)',
                        border: `1px solid ${selectedFileName === f.name ? 'var(--color-bull)' : 'var(--border-dim)'}`,
                        cursor: 'pointer',
                        textAlign: 'left',
                        color: 'inherit',
                      }}
                    >
                      <div className="row gap-2" style={{ alignItems: 'center', overflow: 'hidden' }}>
                        <Folder size={12} color="var(--text-muted)" />
                        <span className="mono" style={{ fontSize: 11, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                          {f.name}
                        </span>
                      </div>
                      {selectedFileName === f.name && <CheckCircle2 size={13} color="var(--color-bull)" />}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {loading && (
            <div className="row gap-2" style={{ alignItems: 'center', justifyContent: 'center', padding: 12 }}>
              <RefreshCw size={14} className="spin" />
              <span className="mono text-xs">Inspecting backup...</span>
            </div>
          )}

          {error && (
            <span style={{ color: 'var(--color-bear)', fontFamily: 'var(--font-mono)', fontSize: 11 }}>
              {error}
            </span>
          )}

          {/* Preview Card */}
          {preview && (
            <div style={{ padding: '12px', background: 'var(--bg-subtle)', border: '1px solid var(--border-bright)' }}>
              <div className="row between" style={{ marginBottom: 8 }}>
                <span className="mono font-bold" style={{ fontSize: 11, color: 'var(--text-primary)' }}>
                  BACKUP SUMMARY
                </span>
                {preview.exportedAt && (
                  <span className="mono text-xs" style={{ color: 'var(--text-muted)' }}>
                    {new Date(preview.exportedAt).toLocaleDateString()}
                  </span>
                )}
              </div>
              <div className="row between" style={{ marginTop: 4 }}>
                <div className="col">
                  <span className="mono text-xs" style={{ color: 'var(--text-muted)' }}>ACCOUNTS</span>
                  <span className="num font-bold" style={{ fontSize: 13 }}>{preview.accountCount}</span>
                </div>
                <div className="col">
                  <span className="mono text-xs" style={{ color: 'var(--text-muted)' }}>TOTAL CASH</span>
                  <span className="num font-bold" style={{ fontSize: 13 }}>{formatCurrency(preview.totalCashUSD, 'USD', true)}</span>
                </div>
                <div className="col">
                  <span className="mono text-xs" style={{ color: 'var(--text-muted)' }}>POSITIONS</span>
                  <span className="num font-bold" style={{ fontSize: 13 }}>{preview.openPositionsCount}</span>
                </div>
                <div className="col">
                  <span className="mono text-xs" style={{ color: 'var(--text-muted)' }}>TRADES</span>
                  <span className="num font-bold" style={{ fontSize: 13 }}>{preview.closedTradesCount}</span>
                </div>
              </div>

              {/* Restore Choices */}
              <div className="col gap-2" style={{ marginTop: 14 }}>
                <button
                  className="btn btn-bull row gap-2"
                  style={{ padding: '10px', justifyContent: 'center', fontSize: 11 }}
                  onClick={() => executeRestore('merge')}
                >
                  <Layers size={13} />
                  <span>MERGE ACCOUNTS (KEEP EXISTING)</span>
                </button>
                <button
                  className="btn btn-bear row gap-2"
                  style={{ padding: '9px', justifyContent: 'center', fontSize: 11 }}
                  onClick={() => executeRestore('replace')}
                >
                  <RefreshCw size={13} />
                  <span>REPLACE ALL (OVERWRITE CURRENT)</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
