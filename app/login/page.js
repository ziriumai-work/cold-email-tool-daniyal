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
    <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <form onSubmit={submit} style={{ width: '100%', maxWidth: 360, background: '#fff', border: '1px solid #d8dee8', borderRadius: 12, padding: 28, boxShadow: '0 8px 30px rgba(15,23,42,0.08)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
          <img src="/logo.png" alt="Zirium AI" style={{ height: 40, width: 40, objectFit: 'contain' }} />
          <strong style={{ fontSize: 18 }}>Zirium AI</strong>
        </div>
        <label style={{ display: 'block', fontSize: 13, color: '#6e6e6e', marginBottom: 6 }}>Team password</label>
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoFocus
          style={{ width: '100%', boxSizing: 'border-box', border: '1px solid #d8dee8', borderRadius: 6, padding: '10px 12px', fontSize: 14, outline: 'none' }} />
        {err && <div style={{ color: '#dc2626', fontSize: 13, marginTop: 8 }}>{err}</div>}
        <button type="submit" disabled={busy || !password}
          style={{ width: '100%', marginTop: 16, background: '#41c6f1', color: '#fff', border: 'none', borderRadius: 6, padding: '10px', fontSize: 14, fontWeight: 600, cursor: 'pointer', opacity: busy || !password ? 0.6 : 1 }}>
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </main>
  );
}
