import { Download, ArrowRight, CheckCircle2 } from 'lucide-react';
import type { UpdateInfo } from '../hooks/useAppUpdate';
import { formatMarkdown } from '../utils/formatMarkdown';

interface Props {
  updateInfo: UpdateInfo;
  currentVersion: string;
  isDownloading: boolean;
  downloadProgress: number;
  isReadyToInstall: boolean;
  onStartDownload: () => void;
  onInstall: () => void;
  onClose?: () => void;
}

export function UpdateModal({
  updateInfo,
  currentVersion,
  isDownloading,
  downloadProgress,
  isReadyToInstall,
  onStartDownload,
  onInstall,
}: Props) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: 'fixed',
        inset: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 10000,
        background: '#040406',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: 'max(24px, env(safe-area-inset-top, 28px)) 20px max(24px, env(safe-area-inset-bottom, 28px))',
        boxSizing: 'border-box',
        overflow: 'hidden',
        animation: 'fadeIn 0.2s ease-out',
        userSelect: 'none',
      }}
    >
      {/* ── Top Header: Camera & Notch Safe, Centered Update Pill ─── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          paddingBottom: 14,
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          flexShrink: 0,
          width: '100%',
        }}
      >
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 'clamp(10px, 2.8vw, 11px)',
            fontWeight: 700,
            color: 'var(--color-bull, #00e676)',
            background: 'rgba(0, 230, 118, 0.12)',
            border: '1px solid rgba(0, 230, 118, 0.35)',
            padding: '4px 12px',
            borderRadius: 20,
            letterSpacing: '0.02em',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            maxWidth: '100%',
            whiteSpace: 'nowrap',
          }}
        >
          UPDATE AVAILABLE · v{currentVersion} <ArrowRight size={11} style={{ display: 'inline', flexShrink: 0 }} /> v{updateInfo.version}
        </span>
      </div>

      {/* ── Center Content: Symmetrical DailyTrade Logo & Changelog ── */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '16px 0',
          minHeight: 0,
        }}
      >
        {/* Centered App Logo with Even 360° Halo Glow */}
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <div
            style={{
              width: 76,
              height: 76,
              margin: '0 auto 14px',
              borderRadius: 20,
              boxShadow: '0 0 32px rgba(0, 230, 118, 0.25), 0 0 0 1px rgba(0, 230, 118, 0.3)',
              overflow: 'hidden',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: '#09090c',
            }}
          >
            <img
              src="/icon-192.png"
              alt="DailyTrade"
              style={{
                width: 76,
                height: 76,
                borderRadius: 20,
                objectFit: 'cover',
                display: 'block',
              }}
              onError={(e) => {
                (e.target as HTMLImageElement).src = '/logo.png';
              }}
            />
          </div>

          <h2
            style={{
              fontFamily: 'var(--font-ui)',
              fontSize: 22,
              fontWeight: 800,
              color: '#ffffff',
              letterSpacing: '-0.02em',
              marginBottom: 4,
            }}
          >
            DailyTrade v{updateInfo.version}
          </h2>
          <p
            style={{
              fontFamily: 'var(--font-ui)',
              fontSize: 13,
              color: 'var(--text-secondary)',
            }}
          >
            New build ready for installation
          </p>
        </div>

        {/* Release Highlights Card with Formatted HTML */}
        <div
          style={{
            background: 'var(--bg-card, #0c0c0f)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: 10,
            padding: '16px 18px',
            maxHeight: '42vh',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 10,
              color: 'var(--text-muted)',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              marginBottom: 12,
              display: 'block',
              flexShrink: 0,
            }}
          >
            WHAT'S NEW IN THIS BUILD
          </span>

          <div
            className="col gap-3"
            style={{
              overflowY: 'auto',
              flex: 1,
              paddingRight: 4,
            }}
          >
            {updateInfo.notes.map((note, idx) => (
              <div key={idx} className="row gap-2" style={{ alignItems: 'flex-start' }}>
                <span style={{ color: 'var(--color-bull, #00e676)', fontSize: 14, lineHeight: 1.2 }}>•</span>
                <span
                  style={{
                    fontFamily: 'var(--font-ui)',
                    fontSize: 12,
                    color: 'var(--text-secondary)',
                    lineHeight: 1.5,
                  }}
                  dangerouslySetInnerHTML={{ __html: formatMarkdown(note) }}
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Bottom Action: Orion Store In-Button Progress ──────────── */}
      <div
        style={{
          paddingTop: 16,
          borderTop: '1px solid rgba(255, 255, 255, 0.08)',
          flexShrink: 0,
        }}
      >
        <button
          onClick={!isDownloading && !isReadyToInstall ? onStartDownload : isReadyToInstall ? onInstall : undefined}
          disabled={isDownloading}
          style={{
            position: 'relative',
            width: '100%',
            height: 52,
            padding: '0 20px',
            border: 'none',
            borderRadius: 8,
            overflow: 'hidden',
            background: isDownloading
              ? 'rgba(255, 255, 255, 0.08)'
              : 'linear-gradient(135deg, #00e676 0%, #00c853 100%)',
            boxShadow: isDownloading
              ? 'none'
              : '0 0 24px rgba(0, 230, 118, 0.35), inset 0 1px 1px rgba(255, 255, 255, 0.6)',
            cursor: isDownloading ? 'default' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'transform 0.1s ease',
          }}
          onPointerDown={(e) => {
            if (!isDownloading) e.currentTarget.style.transform = 'scale(0.98)';
          }}
          onPointerUp={(e) => {
            if (!isDownloading) e.currentTarget.style.transform = 'scale(1)';
          }}
        >
          {/* Orion Store In-Button Progress Fill Bar */}
          {isDownloading && (
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                bottom: 0,
                width: `${downloadProgress}%`,
                background: 'linear-gradient(90deg, #00e676 0%, #00b0ff 100%)',
                transition: 'width 0.22s ease-out',
                zIndex: 1,
              }}
            />
          )}

          {/* Button Text & Counter (Centered over the fill bar) */}
          <span
            style={{
              position: 'relative',
              zIndex: 2,
              fontFamily: 'var(--font-mono)',
              fontWeight: 800,
              fontSize: 13,
              letterSpacing: '0.04em',
              color: isDownloading ? '#ffffff' : '#000000',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            {!isDownloading && !isReadyToInstall && (
              <>
                <Download size={18} strokeWidth={2.5} />
                UPDATE
              </>
            )}

            {isDownloading && (
              <>
                DOWNLOADING {downloadProgress}%
              </>
            )}

            {isReadyToInstall && (
              <>
                <CheckCircle2 size={18} strokeWidth={2.5} />
                INSTALL NOW
              </>
            )}
          </span>
        </button>

        {isReadyToInstall && (
          <p
            style={{
              textAlign: 'center',
              fontFamily: 'var(--font-mono)',
              fontSize: 11,
              color: 'var(--color-bull, #00e676)',
              marginTop: 10,
              letterSpacing: '0.02em',
            }}
          >
            APK downloaded · Ready to install update
          </p>
        )}
      </div>
    </div>
  );
}
