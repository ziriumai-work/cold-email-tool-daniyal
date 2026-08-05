import { C, DISPLAY_TZS } from './constants.js';
import { SunIcon, MoonIcon, ZapIcon } from './Icons.jsx';

export function Header({ navVisible, displayTz, setDisplayTz, logout, theme = 'light', toggleTheme }) {
  return (
    <header style={{
      position: 'fixed',
      top: 12,
      left: '50%',
      transform: navVisible ? 'translate(-50%, 0)' : 'translate(-50%, -130%)',
      opacity: navVisible ? 1 : 0,
      transition: 'transform 0.35s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.3s ease',
      zIndex: 1000,
      width: '100%',
      maxWidth: 1180,
      padding: '0 16px',
      pointerEvents: 'none'
    }}>
      <div style={{
        pointerEvents: 'auto',
        background: 'var(--header-bg)',
        backdropFilter: 'blur(32px) saturate(220%)',
        WebkitBackdropFilter: 'blur(32px) saturate(220%)',
        border: '1px solid var(--card-border)',
        borderRadius: 24,
        padding: '10px 22px',
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        flexWrap: 'wrap',
        boxShadow: 'var(--card-shadow)',
        position: 'relative',
        overflow: 'hidden',
        transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)'
      }}>
        {/* Top specular highlight reflection line */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: '10%',
          right: '10%',
          height: '1px',
          background: 'linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.9) 50%, rgba(255,255,255,0) 100%)',
          pointerEvents: 'none'
        }} />

        {/* Brand Logo & Title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 200 }}>
          <div style={{
            padding: 6,
            background: 'linear-gradient(135deg, rgba(255,255,255,0.9), rgba(240,249,255,0.9))',
            border: '1px solid rgba(255, 255, 255, 0.95)',
            borderRadius: 14,
            boxShadow: '0 6px 16px rgba(14, 165, 233, 0.15), inset 0 1px 1px rgba(255, 255, 255, 1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <img src="/logo.png" alt="Zirium AI" style={{ height: 28, width: 28, objectFit: 'contain', display: 'block' }} />
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 16, color: 'var(--text-primary)', lineHeight: 1.1, letterSpacing: '-0.025em', display: 'flex', alignItems: 'center', gap: 6 }}>
              Zirium AI
              <span style={{ fontSize: 10, background: 'rgba(16, 185, 129, 0.12)', color: C.green, border: `1px solid ${C.green}33`, padding: '1px 6px', borderRadius: 999, fontWeight: 700, letterSpacing: '0.04em' }}>PRO</span>
            </div>
            <div style={{ color: 'var(--text-secondary)', fontSize: 11, marginTop: 2, fontWeight: 600, letterSpacing: '0.01em' }}>Cold Email Outreach</div>
          </div>
        </div>

        {/* Live Status Pill */}
        <div style={{
          display: 'none',
          alignItems: 'center',
          gap: 6,
          background: 'rgba(16, 185, 129, 0.08)',
          border: '1px solid rgba(16, 185, 129, 0.25)',
          borderRadius: 999,
          padding: '4px 10px',
          fontSize: 11,
          fontWeight: 700,
          color: C.green,
          letterSpacing: '0.02em'
        }} className="status-badge-desktop">
          <span className="pulse-dot" style={{ width: 7, height: 7, borderRadius: '50%', background: C.green, display: 'inline-block' }} />
          AI Engine Active
        </div>

        {/* Timezone, Theme Switch & Logout Actions */}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            background: 'var(--input-bg)',
            border: '1px solid var(--input-border)',
            borderRadius: 999,
            padding: '5px 14px',
            backdropFilter: 'blur(10px)',
            boxShadow: 'inset 0 1px 2px rgba(0, 0, 0, 0.02)'
          }}>
            <span style={{ fontSize: 12, color: 'var(--text-secondary)', whiteSpace: 'nowrap', fontWeight: 600 }}>Show times in</span>
            <select value={displayTz} onChange={(e) => setDisplayTz(e.target.value)}
              style={{
                fontSize: 12,
                fontWeight: 700,
                color: 'var(--text-primary)',
                border: 'none',
                background: 'transparent',
                cursor: 'pointer',
                outline: 'none',
                paddingRight: 4
              }}>
              {DISPLAY_TZS.map(([v, label]) => <option key={v} value={v} style={{ background: 'var(--bg-page)', color: 'var(--text-primary)' }}>{label}</option>)}
            </select>
          </div>

          {toggleTheme && (
            <button onClick={toggleTheme}
              title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              style={{
                background: 'var(--input-bg)',
                color: 'var(--text-primary)',
                border: '1px solid var(--input-border)',
                borderRadius: 999,
                width: 34,
                height: 34,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                backdropFilter: 'blur(8px)'
              }}>
              {theme === 'dark' ? <SunIcon size={16} color="#f59e0b" /> : <MoonIcon size={16} color="#6366f1" />}
            </button>
          )}

          <button onClick={logout}
            style={{
              background: 'rgba(244, 63, 94, 0.09)',
              color: '#e11d48',
              border: '1px solid rgba(244, 63, 94, 0.25)',
              borderRadius: 999,
              padding: '7px 16px',
              fontSize: 13,
              fontWeight: 700,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              backdropFilter: 'blur(8px)',
              boxShadow: '0 2px 8px rgba(244, 63, 94, 0.08)'
            }}>
            Log out
          </button>
        </div>
      </div>
    </header>
  );
}

