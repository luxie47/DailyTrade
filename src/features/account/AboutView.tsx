import { useState } from 'react';
import { ExternalLink, Heart, Star, ShieldCheck, MessageSquare, Download } from 'lucide-react';
import { APP_METADATA } from '../../config/constants';

interface Props {
  onBack: () => void;
  onClose: () => void;
}

export function AboutView({ onBack }: Props) {
  const [showPrivacy, setShowPrivacy] = useState(false);

  return (
    <div className="col gap-3">
      <div className="row between" style={{ marginBottom: 4 }}>
        <span className="mono font-bold" style={{ fontSize: 14, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
          ABOUT US & OPEN SOURCE
        </span>
        <button className="btn btn-ghost" style={{ padding: '4px 8px' }} onClick={onBack}>
          BACK
        </button>
      </div>

      {/* Mission Statement */}
      <div style={{ padding: '14px', background: 'var(--bg-subtle)', border: '1px solid var(--border-bright)' }}>
        <div className="row between" style={{ alignItems: 'center' }}>
          <div className="row gap-2" style={{ alignItems: 'center' }}>
            <img
              src="/logo.png"
              alt="DailyTrade Logo"
              style={{
                width: 26,
                height: 26,
                borderRadius: 4,
                border: '1px solid rgba(255, 255, 255, 0.15)',
                objectFit: 'contain',
                background: '#000',
                flexShrink: 0
              }}
            />
            <span className="mono font-bold" style={{ fontSize: 14, color: 'var(--text-primary)' }}>DailyTrade</span>
          </div>
          <span className="badge badge-neutral" style={{ fontSize: 10 }}>v{APP_METADATA.VERSION}</span>
        </div>
        <p style={{ fontFamily: 'var(--font-ui)', fontSize: 12.5, color: 'var(--text-secondary)', marginTop: 8, lineHeight: 1.5 }}>
          We are <strong>open sourcing this app mentally and wholeheartedly for everyone</strong>. Built to provide a clean, uncompromising, 100% free paper trading platform with real live feeds and zero paywalls.
        </p>
      </div>

      {/* What's New */}
      <div style={{ padding: '14px', background: 'var(--bg-card)', border: '1px solid var(--border-bright)' }}>
        <div className="row between" style={{ alignItems: 'center', marginBottom: 8 }}>
          <span className="mono font-bold" style={{ fontSize: 12, color: 'var(--text-primary)' }}>
            WHAT'S NEW
          </span>
          <span className="badge badge-bull" style={{ fontSize: 9 }}>LATEST</span>
        </div>
        <ul style={{ margin: 0, paddingLeft: 16, fontFamily: 'var(--font-ui)', fontSize: 11.5, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
          <li><strong>Modular Clean Architecture</strong>: Clean feature boundaries, resilient API adapters, and typed domain logic.</li>
          <li><strong>Fixed Stop Loss &amp; Targets</strong>: Mathematical execution fix with true OCO cancellation.</li>
          <li><strong>Active Position Protection</strong>: Set or modify Stop Loss &amp; Target Price directly on open holdings via <code>SL/TP</code> button.</li>
          <li><strong>Tiny Ticker Android Widget (2x1)</strong>: Ultra-compact live ticker on phone home screen showing real-time price and delta badge.</li>
          <li><strong>OLED Portfolio HUD Card (2x2)</strong>: Redesigned high-contrast dark card with live equity, position count, and colored P&amp;L pill.</li>
          <li><strong>Native System Push Notifications</strong>: Added Android 13+ permissions and system alerts for trade executions.</li>
        </ul>
      </div>

      {/* ⭐ Star This Repo Banner */}
      <div style={{ padding: '14px', background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.12), rgba(217, 119, 6, 0.05))', border: '1px solid rgba(245, 158, 11, 0.35)' }}>
        <div className="row gap-2" style={{ alignItems: 'center' }}>
          <Star size={16} color="#fbbf24" fill="#fbbf24" />
          <span className="mono font-bold" style={{ fontSize: 12, color: '#fef3c7', letterSpacing: '0.04em' }}>
            PLEASE STAR THIS REPOSITORY!
          </span>
        </div>
        <p style={{ fontFamily: 'var(--font-ui)', fontSize: 12, color: 'var(--text-secondary)', marginTop: 6, lineHeight: 1.4 }}>
          If you like what we built, giving us a star on GitHub would mean the world to our team. It helps keep this project free and thriving.
        </p>
        <a
          href="https://github.com/luxie47/DailyTrade"
          target="_blank"
          rel="noreferrer"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            marginTop: 10,
            background: '#f59e0b',
            color: '#000000',
            padding: '8px 14px',
            fontFamily: 'var(--font-mono)',
            fontSize: 11,
            fontWeight: 800,
            textDecoration: 'none',
            borderRadius: 2,
            letterSpacing: '0.05em',
          }}
        >
          <Star size={13} fill="#000" /> STAR ON GITHUB <ExternalLink size={12} />
        </a>
      </div>

      {/* Featured Project: DailyFlow */}
      <div style={{ padding: '14px', background: 'rgba(99, 102, 241, 0.08)', border: '1px solid rgba(99, 102, 241, 0.3)' }}>
        <div className="row gap-2" style={{ alignItems: 'center', marginBottom: 4 }}>
          <Heart size={14} color="#818cf8" />
          <span className="mono font-bold" style={{ fontSize: 12, color: '#c7d2fe' }}>FEATURED PROJECT: DAILYFLOW</span>
        </div>
        <p style={{ fontFamily: 'var(--font-ui)', fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.4 }}>
          Check out my main app <strong>DailyFlow</strong> — a hybrid daily tracker, habit optimizer, and workflow powerhouse:
        </p>
        <a
          href="https://dailyflow-luxie.vercel.app"
          target="_blank"
          rel="noreferrer"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            marginTop: 10,
            background: '#4f46e5',
            color: '#ffffff',
            padding: '7px 12px',
            fontFamily: 'var(--font-mono)',
            fontSize: 11,
            fontWeight: 700,
            textDecoration: 'none',
            borderRadius: 2,
          }}
        >
          VISIT DAILYFLOW <ExternalLink size={12} />
        </a>
      </div>

      {/* Android APK Download */}
      <div style={{ padding: '14px', background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
        <div className="row gap-2" style={{ alignItems: 'center', marginBottom: 4 }}>
          <span style={{ fontSize: 15 }}>📱</span>
          <span className="mono font-bold" style={{ fontSize: 12, color: '#6ee7b7' }}>GET ANDROID APP (APK)</span>
        </div>
        <p style={{ fontFamily: 'var(--font-ui)', fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.4 }}>
          Install DailyTrade directly on your Android phone for native performance and full offline simulation.
        </p>
        <a
          href="https://github.com/luxie47/DailyTrade/releases/latest/download/DailyTrade.apk"
          target="_blank"
          rel="noreferrer"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            marginTop: 10,
            background: '#059669',
            color: '#ffffff',
            padding: '7px 12px',
            fontFamily: 'var(--font-mono)',
            fontSize: 11,
            fontWeight: 700,
            textDecoration: 'none',
            borderRadius: 2,
            letterSpacing: '0.04em',
          }}
        >
          <Download size={12} /> DOWNLOAD DAILYTRADE.APK <ExternalLink size={12} />
        </a>
      </div>

      {/* Bugs & Issues */}
      <div style={{ padding: '12px', background: 'var(--bg-subtle)', border: '1px solid var(--border-dim)' }}>
        <div className="row gap-2" style={{ alignItems: 'center', marginBottom: 6 }}>
          <MessageSquare size={13} color="var(--text-primary)" />
          <span className="mono font-bold" style={{ fontSize: 11, color: 'var(--text-primary)', textTransform: 'uppercase' }}>
            BUGS &amp; ISSUES
          </span>
        </div>
        <p style={{ fontFamily: 'var(--font-ui)', fontSize: 11.5, color: 'var(--text-secondary)', lineHeight: 1.4, marginBottom: 10 }}>
          Found a bug or have a suggestion? Open a GitHub Issue — we read every single one.
        </p>
        <a
          href="https://github.com/luxie47/DailyTrade/issues/new"
          target="_blank"
          rel="noreferrer"
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            background: 'var(--bg-card)', border: '1px solid var(--border-mid)',
            color: 'var(--text-primary)', padding: '7px 12px',
            fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700,
            textDecoration: 'none', letterSpacing: '0.04em',
          }}
        >
          <MessageSquare size={11} /> OPEN A GITHUB ISSUE
        </a>
      </div>

      {/* Support / Donate */}
      <div style={{ padding: '12px', background: 'rgba(251, 146, 60, 0.06)', border: '1px solid rgba(251, 146, 60, 0.3)' }}>
        <div className="row gap-2" style={{ alignItems: 'center', marginBottom: 6 }}>
          <span style={{ fontSize: 14 }}>🍵</span>
          <span className="mono font-bold" style={{ fontSize: 11, color: '#fb923c', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            BUY ME A CHAI / DONATE
          </span>
        </div>
        <p style={{ fontFamily: 'var(--font-ui)', fontSize: 11.5, color: 'var(--text-secondary)', lineHeight: 1.4, marginBottom: 10 }}>
          DailyTrade is 100% free with no ads. If it helps you learn or trade with confidence, buying me a chai / donating keeps this project alive!
        </p>
        <a
          href={APP_METADATA.DONATE_URL}
          target="_blank"
          rel="noreferrer"
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            background: '#fb923c', border: 'none',
            color: '#000', padding: '8px 14px',
            fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 800,
            textDecoration: 'none', borderRadius: 2, letterSpacing: '0.05em',
          }}
        >
          🍵 {APP_METADATA.DONATE_LABEL}
        </a>
      </div>

      {/* In-App Privacy Policy Viewer */}
      <div style={{ padding: '12px', background: 'var(--bg-subtle)', border: '1px solid var(--border-dim)' }}>
        <div className="row between" style={{ alignItems: 'center', cursor: 'pointer' }} onClick={() => setShowPrivacy(prev => !prev)}>
          <div className="row gap-2" style={{ alignItems: 'center' }}>
            <ShieldCheck size={14} color="#34d399" />
            <span className="mono font-bold" style={{ fontSize: 11, color: 'var(--text-primary)' }}>
              PRIVACY POLICY (100% ON-DEVICE)
            </span>
          </div>
          <button className="btn btn-ghost" style={{ padding: '2px 8px', fontSize: 10 }}>
            {showPrivacy ? 'COLLAPSE' : 'VIEW DETAILS'}
          </button>
        </div>

        {showPrivacy && (
          <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--border-dim)', fontFamily: 'var(--font-ui)', fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            <p style={{ margin: '0 0 6px' }}>• <strong>Zero Tracking:</strong> No analytics, telemetry, cookies, or user profiling.</p>
            <p style={{ margin: '0 0 6px' }}>• <strong>No Accounts Required:</strong> You never need to sign up, provide emails, or store passwords.</p>
            <p style={{ margin: '0 0 6px' }}>• <strong>Local Sandbox:</strong> All portfolios, balances, and orders stay on your phone or browser.</p>
            <p style={{ margin: '0 0 6px' }}>• <strong>Public Market Data:</strong> Quotes stream from Binance & Yahoo public endpoints with zero personal tokens.</p>
            <p style={{ margin: 0, color: 'var(--text-muted)' }}>Full policy is tracked in <code>PRIVACY.md</code> under the MIT License.</p>
          </div>
        )}
      </div>

      {/* Legal & Financial Disclaimer */}
      <div style={{ padding: '10px 12px', background: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
        <span className="mono font-bold" style={{ fontSize: 10, color: 'var(--color-bear)', letterSpacing: '0.05em' }}>
          ⚠️ LEGAL & FINANCIAL DISCLAIMER
        </span>
        <p style={{ fontFamily: 'var(--font-ui)', fontSize: 11, color: 'var(--text-muted)', marginTop: 4, lineHeight: 1.4 }}>
          DailyTrade is an educational paper trading simulator. All currencies, balances, and orders are 100% virtual simulation credits with zero monetary value. DailyTrade does not provide real investment advice.
        </p>
      </div>
    </div>
  );
}
