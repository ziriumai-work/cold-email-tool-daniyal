'use client';
import { useState, useEffect, useCallback } from 'react';
import { C, glassCardStyle } from './theme.js';

export function ComplianceView({ flash }) {
  const [suppressionList, setSuppressionList] = useState([]);
  const [newEmail, setNewEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [spamResult, setSpamResult] = useState(null);
  const [isAnalyzingSpam, setIsAnalyzingSpam] = useState(false);
  const [autoSync, setAutoSync] = useState(true);
  const [lastSynced, setLastSynced] = useState(null);
  const [syncing, setSyncing] = useState(false);

  const fetchSuppressionList = useCallback(async (isBackground = false) => {
    if (!isBackground) setSyncing(true);
    try {
      const res = await fetch('/api/compliance').then((r) => r.json());
      if (res.ok) {
        setSuppressionList(res.suppressionList || []);
        setLastSynced(new Date().toLocaleTimeString());
      }
    } catch (err) {
      console.error('Error auto-syncing suppression list:', err);
    } finally {
      if (!isBackground) setSyncing(false);
    }
  }, []);

  // Real-time background sync interval for suppression list (every 5 seconds)
  useEffect(() => {
    fetchSuppressionList(false);
    if (!autoSync) return;
    const interval = setInterval(() => {
      fetchSuppressionList(true);
    }, 5000);
    return () => clearInterval(interval);
  }, [autoSync, fetchSuppressionList]);

  // Real-time debounced spam score calculation on input change (350ms)
  useEffect(() => {
    if (!subject.trim() && !body.trim()) {
      setSpamResult(null);
      return;
    }

    setIsAnalyzingSpam(true);
    const timer = setTimeout(async () => {
      try {
        const res = await fetch('/api/spam-check', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ subject, body }),
        }).then((r) => r.json());
        if (res.ok) {
          setSpamResult(res.result);
        }
      } catch (err) {
        console.error('Error running real-time spam check:', err);
      } finally {
        setIsAnalyzingSpam(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [subject, body]);

  async function addSuppression() {
    if (!newEmail || !newEmail.includes('@')) return;
    const res = await fetch('/api/compliance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: newEmail, reason: 'manual' }),
    }).then((r) => r.json());
    if (res.ok) {
      if (flash) flash(`Added ${newEmail} to permanent suppression list`);
      setNewEmail('');
      fetchSuppressionList(false);
    }
  }

  async function removeSuppression(email) {
    const res = await fetch(`/api/compliance?email=${encodeURIComponent(email)}`, {
      method: 'DELETE',
    }).then((r) => r.json());
    if (res.ok) {
      if (flash) flash(`Removed ${email} from suppression list`);
      fetchSuppressionList(false);
    }
  }

  // Summary Metrics
  const totalSuppressed = suppressionList.length;
  const unsubscribedCount = suppressionList.filter((s) => s.reason === 'unsubscribed').length;
  const manualCount = suppressionList.filter((s) => s.reason === 'manual' || s.source === 'admin_ui').length;

  return (
    <div>
      {/* Real-time Status Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, background: 'var(--subtle-card-bg)', padding: '12px 18px', borderRadius: 12, border: '1px solid var(--card-border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ width: 10, height: 10, borderRadius: '50%', background: autoSync ? '#22c55e' : '#eab308', boxShadow: autoSync ? '0 0 10px #22c55e' : 'none', display: 'inline-block' }} />
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>
            {autoSync ? 'Real-Time Compliance Sync Active' : 'Real-Time Sync Paused'}
          </span>
          {lastSynced && <span style={{ fontSize: 12, color: C.muted }}>• Last synced at {lastSynced}</span>}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <label style={{ fontSize: 12, color: C.sub, display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', userSelect: 'none' }}>
            <input type="checkbox" checked={autoSync} onChange={(e) => setAutoSync(e.target.checked)} style={{ cursor: 'pointer' }} />
            Auto-Sync (5s)
          </label>
          <button onClick={() => fetchSuppressionList(false)} disabled={syncing} style={{ background: 'var(--input-bg)', border: '1px solid var(--input-border)', color: C.text, padding: '4px 10px', borderRadius: 6, fontSize: 12, cursor: 'pointer' }}>
            {syncing ? 'Syncing...' : '↻ Refresh Now'}
          </button>
        </div>
      </div>

      {/* Metric Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginBottom: 20 }}>
        <div style={{ ...glassCardStyle, padding: 14 }}>
          <div style={{ fontSize: 12, color: C.sub, fontWeight: 600 }}>Total Suppressed</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: C.ink, marginTop: 4 }}>{totalSuppressed}</div>
        </div>
        <div style={{ ...glassCardStyle, padding: 14 }}>
          <div style={{ fontSize: 12, color: C.sub, fontWeight: 600 }}>Opt-Out Unsubscribes</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: C.red, marginTop: 4 }}>{unsubscribedCount}</div>
        </div>
        <div style={{ ...glassCardStyle, padding: 14 }}>
          <div style={{ fontSize: 12, color: C.sub, fontWeight: 600 }}>Manual Admin Blacklists</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: C.accent, marginTop: 4 }}>{manualCount}</div>
        </div>
        <div style={{ ...glassCardStyle, padding: 14 }}>
          <div style={{ fontSize: 12, color: C.sub, fontWeight: 600 }}>Live Copy Risk Level</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: spamResult ? (spamResult.score > 30 ? C.red : C.green) : C.muted, marginTop: 8 }}>
            {isAnalyzingSpam ? 'Analyzing copy...' : spamResult ? `${spamResult.status} (${spamResult.score}/100)` : 'No Draft Entered'}
          </div>
        </div>
      </div>

      {/* Realtime Spam Score Content Analyzer */}
      <div style={glassCardStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <h3 style={{ fontSize: 18, fontWeight: 750, color: C.ink, margin: 0 }}>Spam Score Content Analyzer</h3>
          <span style={{ fontSize: 12, fontWeight: 650, color: isAnalyzingSpam ? C.accent : spamResult ? C.green : C.muted, background: 'var(--subtle-card-bg)', padding: '3px 10px', borderRadius: 20, border: '1px solid var(--card-border)' }}>
            {isAnalyzingSpam ? '⚡ Live Analyzing...' : spamResult ? '✓ Real-Time Score Live' : 'Idle'}
          </span>
        </div>
        <p style={{ fontSize: 13, color: C.sub, marginBottom: 16 }}>
          Evaluate body copy and subject line in real-time against spam filter rules, trigger words, and formatting guidelines.
        </p>

        <input
          type="text"
          placeholder="Subject line to test in real-time..."
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid var(--input-border)', background: 'var(--input-bg)', color: 'var(--text-primary)', marginBottom: 10, fontSize: 13 }}
        />
        <textarea
          placeholder="Email body copy to test in real-time..."
          value={body}
          onChange={(e) => setBody(e.target.value)}
          style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid var(--input-border)', background: 'var(--input-bg)', color: 'var(--text-primary)', height: 95, marginBottom: 12, fontSize: 13 }}
        />

        {spamResult && (
          <div style={{ marginTop: 12, padding: 16, background: 'var(--subtle-card-bg)', borderRadius: 12, border: '1px solid var(--card-border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: spamResult.score > 30 ? C.red : C.green }}>
                Spam Score: {spamResult.score}/100 ({spamResult.status})
              </div>
              <div style={{ fontSize: 12, color: C.sub, fontWeight: 600 }}>
                Words: {spamResult.wordCount} | Links: {spamResult.linkCount}
              </div>
            </div>

            {/* Score Progress Bar */}
            <div style={{ width: '100%', height: 6, background: 'var(--card-border)', borderRadius: 3, overflow: 'hidden', marginBottom: 12 }}>
              <div style={{ width: `${spamResult.score}%`, height: '100%', background: spamResult.score >= 60 ? C.red : spamResult.score >= 30 ? '#eab308' : C.green, transition: 'width 0.3s ease' }} />
            </div>

            <ul style={{ margin: 0, paddingLeft: 20, fontSize: 13, color: C.text }}>
              {spamResult.suggestions?.map((s, idx) => (
                <li key={idx} style={{ marginBottom: 4 }}>{s}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Permanent Suppression List */}
      <div style={glassCardStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <h3 style={{ fontSize: 18, fontWeight: 750, color: C.ink, margin: 0 }}>Permanent Suppression List</h3>
          <span style={{ fontSize: 12, color: C.muted }}>Updated live from CAN-SPAM / GDPR logs</span>
        </div>
        <p style={{ fontSize: 13, color: C.sub, marginBottom: 16 }}>
          CAN-SPAM & GDPR compliance list. Outbound emails are automatically blocked for suppressed addresses.
        </p>

        <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
          <input
            type="email"
            placeholder="Enter email to suppress..."
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') addSuppression(); }}
            style={{ flex: 1, padding: '10px 14px', borderRadius: 10, border: '1px solid var(--input-border)', background: 'var(--input-bg)', color: 'var(--text-primary)', fontSize: 13 }}
          />
          <button onClick={addSuppression} style={{ padding: '10px 20px', borderRadius: 10, background: C.red, color: '#fff', border: 'none', fontWeight: 650, cursor: 'pointer' }}>
            Suppress Email
          </button>
        </div>

        <div style={{ maxHeight: 260, overflowY: 'auto' }}>
          {suppressionList.length === 0 ? (
            <div style={{ fontSize: 13, color: C.muted, padding: '12px 0' }}>No suppressed emails recorded yet.</div>
          ) : (
            <table style={{ width: '100%', textAlign: 'left', fontSize: 13, borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--card-border)', color: C.sub, background: 'var(--table-header-bg)' }}>
                  <th style={{ padding: 8 }}>Email</th>
                  <th style={{ padding: 8 }}>Reason</th>
                  <th style={{ padding: 8 }}>Source</th>
                  <th style={{ padding: 8 }}>Date</th>
                  <th style={{ padding: 8, textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {suppressionList.map((item) => (
                  <tr key={item.id || item.email} style={{ borderBottom: '1px solid var(--card-border)' }}>
                    <td style={{ padding: 8, fontWeight: 600 }}>{item.email}</td>
                    <td style={{ padding: 8 }}>
                      <span style={{ padding: '2px 8px', borderRadius: 12, fontSize: 11, fontWeight: 600, background: item.reason === 'unsubscribed' ? '#fef2f2' : '#f0fdf4', color: item.reason === 'unsubscribed' ? '#991b1b' : '#166534' }}>
                        {item.reason}
                      </span>
                    </td>
                    <td style={{ padding: 8, color: C.sub }}>{item.source}</td>
                    <td style={{ padding: 8, color: C.muted }}>{item.created_at}</td>
                    <td style={{ padding: 8, textAlign: 'right' }}>
                      <button
                        onClick={() => removeSuppression(item.email)}
                        style={{ padding: '4px 10px', borderRadius: 6, background: 'transparent', color: C.red, border: '1px solid var(--card-border)', fontSize: 12, cursor: 'pointer', fontWeight: 600 }}
                      >
                        Unsuppress
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
