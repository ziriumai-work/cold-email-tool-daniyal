'use client';
import { useState } from 'react';

export default function Login() {
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setBusy(true); setErr('');
    const res = await fetch('/api/login', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    }).then((r) => r.json()).catch(() => ({ error: 'Network error' }));
    setBusy(false);
    if (res.error) { setErr(res.error); return; }
    window.location.href = '/';
  }

  return (
    <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, position: 'relative', overflow: 'hidden' }}>
      {/* Background ambient lighting blobs */}
      <div style={{ position: 'absolute', width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle, rgba(21, 151, 200, 0.18) 0%, rgba(255,255,255,0) 70%)', top: '20%', left: '30%', pointerEvents: 'none', filter: 'blur(40px)' }} />
      <div style={{ position: 'absolute', width: 350, height: 350, borderRadius: '50%', background: 'radial-gradient(circle, rgba(124, 92, 255, 0.15) 0%, rgba(255,255,255,0) 70%)', bottom: '25%', right: '32%', pointerEvents: 'none', filter: 'blur(40px)' }} />

      <form onSubmit={submit} style={{
        width: '100%',
        maxWidth: 380,
        background: 'rgba(255, 255, 255, 0.72)',
        backdropFilter: 'blur(24px) saturate(180%)',
        WebkitBackdropFilter: 'blur(24px) saturate(180%)',
        border: '1px solid rgba(255, 255, 255, 0.8)',
        borderRadius: 24,
        padding: '32px 30px',
        boxShadow: '0 25px 50px -12px rgba(15, 23, 42, 0.1), 0 0 0 1px rgba(255, 255, 255, 0.5) inset',
        position: 'relative',
        zIndex: 1
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
          <div style={{ padding: 8, background: 'rgba(255, 255, 255, 0.9)', borderRadius: 14, boxShadow: '0 4px 12px rgba(15, 23, 42, 0.06)' }}>
            <img src="/logo.png" alt="Zirium AI" style={{ height: 36, width: 36, objectFit: 'contain', display: 'block' }} />
          </div>
          <div>
            <strong style={{ fontSize: 20, fontWeight: 700, color: '#0f172a', letterSpacing: '-0.02em', display: 'block', lineHeight: 1.1 }}>Zirium AI</strong>
            <span style={{ fontSize: 12, color: '#64748b', fontWeight: 500 }}>Outreach Portal</span>
          </div>
        </div>

        <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 8 }}>Team password</label>
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoFocus
          placeholder="Enter team password"
          style={{
            width: '100%',
            boxSizing: 'border-box',
            background: 'rgba(255, 255, 255, 0.85)',
            border: '1px solid rgba(203, 213, 225, 0.7)',
            borderRadius: 14,
            padding: '12px 14px',
            fontSize: 14,
            outline: 'none',
            color: '#0f172a',
            boxShadow: 'inset 0 1px 2px rgba(0, 0, 0, 0.03)',
            transition: 'all 0.15s ease'
          }} />
        {err && (
          <div style={{
            color: '#dc2626',
            background: 'rgba(254, 242, 242, 0.8)',
            border: '1px solid rgba(254, 202, 202, 0.6)',
            borderRadius: 10,
            padding: '8px 12px',
            fontSize: 13,
            fontWeight: 500,
            marginTop: 12
          }}>
            {err}
          </div>
        )}
        <button type="submit" disabled={busy || !password}
          style={{
            width: '100%',
            marginTop: 20,
            background: 'linear-gradient(135deg, #1597c8 0%, #0e7490 100%)',
            color: '#ffffff',
            border: '1px solid rgba(255, 255, 255, 0.3)',
            borderRadius: 14,
            padding: '12px 16px',
            fontSize: 14,
            fontWeight: 650,
            cursor: 'pointer',
            opacity: busy || !password ? 0.6 : 1,
            boxShadow: '0 8px 20px -4px rgba(21, 151, 200, 0.35)',
            letterSpacing: '0.01em'
          }}>
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </main>
  );
}

