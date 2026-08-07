'use client';
import { useState, useEffect } from 'react';
import { C, glassCardStyle } from './theme.js';

export function UnifiedInboxView({ flash }) {
  const [replies, setReplies] = useState([]);

  useEffect(() => {
    fetch('/api/inbox').then((r) => r.json()).then((d) => setReplies(d.replies || [])).catch(() => {});
  }, []);

  async function pollReplies() {
    flash('Polling IMAP inboxes...');
    const res = await fetch('/api/inbox', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'poll' }),
    }).then((r) => r.json());
    if (res.ok) {
      flash(res.found ? `Found ${res.found} new replies!` : 'No new replies found.');
      fetch('/api/inbox').then((r) => r.json()).then((d) => setReplies(d.replies || []));
    }
  }

  return (
    <div style={glassCardStyle}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <h3 style={{ fontSize: 18, fontWeight: 750, color: C.ink, margin: 0 }}>AI Unified Aggregated Inbox</h3>
          <p style={{ fontSize: 13, color: C.sub, margin: '4px 0 0 0' }}>Multi-mailbox reply aggregation classified automatically into intent categories.</p>
        </div>
        <button onClick={pollReplies} style={{ padding: '8px 18px', borderRadius: 10, background: C.accent, color: '#fff', border: 'none', fontWeight: 650, cursor: 'pointer' }}>
          🔄 Sync All Mailboxes
        </button>
      </div>

      {replies.length === 0 ? (
        <div style={{ fontSize: 13, color: C.muted, padding: 20, textAlign: 'center' }}>No incoming replies recorded yet.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {replies.map((reply) => (
            <div key={reply.id} style={{ background: 'var(--subtle-card-bg)', padding: 16, borderRadius: 14, border: '1px solid var(--card-border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontWeight: 700, fontSize: 14 }}>{reply.from_email} ({reply.company_name || 'Prospect'})</span>
                <span style={{ padding: '3px 10px', borderRadius: 999, background: 'rgba(124, 58, 237, 0.15)', color: '#7c3aed', fontWeight: 700, fontSize: 11 }}>
                  {reply.status?.toUpperCase()}
                </span>
              </div>
              <div style={{ fontSize: 13, fontWeight: 600, color: C.ink, marginBottom: 4 }}>Subject: {reply.subject}</div>
              <div style={{ fontSize: 12.5, color: 'var(--text-primary)', marginBottom: 8, background: 'var(--input-bg)', padding: '10px 12px', borderRadius: 8, whiteSpace: 'pre-wrap', lineHeight: 1.55 }}>
                {reply.body || reply.response || reply.snippet}
              </div>
              {reply.notes && (
                <div style={{ fontSize: 12, color: C.accent, fontWeight: 600, background: 'rgba(21, 151, 200, 0.08)', padding: 8, borderRadius: 8 }}>
                  💡 {reply.notes}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
