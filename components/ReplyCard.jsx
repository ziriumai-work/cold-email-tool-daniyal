import { useState } from 'react';
import { C, REPLY_STAGES, stageColor, inputStyle, btnSm } from './constants.js';

export function ReplyCard({ r, onUpdate, onCollapse }) {
  const [notes, setNotes] = useState(r.notes || '');
  const status = r.status || 'new';
  const dirty = notes !== (r.notes || '');
  return (
    <div style={{
      background: 'var(--card-bg)',
      backdropFilter: 'blur(16px)',
      WebkitBackdropFilter: 'blur(16px)',
      border: '1px solid var(--card-border)',
      borderLeft: `4px solid ${stageColor(status)}`,
      borderRadius: 18,
      padding: '14px 16px',
      marginBottom: 12,
      boxShadow: 'var(--card-shadow)'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <strong style={{ color: C.ink, fontSize: 15, fontWeight: 700 }}>{r.company_name || r.from_email}</strong>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ color: C.sub, fontSize: 12 }}>{r.received_at ? r.received_at + ' UTC' : ''}</span>
          {onCollapse && (
            <button style={{ ...btnSm(C.sub, true), padding: '4px 10px', fontSize: 11 }} onClick={onCollapse}>
              Collapse ▲
            </button>
          )}
        </div>
      </div>
      <div style={{ color: C.text, fontSize: 14, marginTop: 4, fontWeight: 500 }}>{r.subject || '(no subject)'}</div>
      <div style={{ color: C.sub, fontSize: 12, marginTop: 2 }}>from {r.from_email} · open your inbox to reply</div>
      <div style={{
        background: 'var(--subtle-card-bg)',
        border: '1px solid var(--card-border)',
        borderRadius: 14,
        padding: '12px 16px',
        marginTop: 12,
        fontSize: 13,
        color: C.ink,
        lineHeight: 1.55,
        whiteSpace: 'pre-wrap'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 750, color: C.accent, textTransform: 'uppercase', marginBottom: 6, letterSpacing: '0.02em' }}>
          <span>💬</span> Incoming Email Reply
        </div>
        {r.response || r.snippet || r.body || `Received email reply from ${r.from_email} regarding "${r.subject || 'outreach'}". Open your mail client to view full message history.`}
      </div>
      <div style={{ display: 'flex', gap: 10, marginTop: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        <select value={status} onChange={(e) => onUpdate(r.id, { status: e.target.value })}
          style={{ ...inputStyle, width: 'auto', padding: '7px 12px', color: stageColor(status), fontWeight: 700, borderRadius: 12 }}>
          {REPLY_STAGES.map(([v, label]) => <option key={v} value={v} style={{ color: C.text }}>{label}</option>)}
        </select>
        <input value={notes} onChange={(e) => setNotes(e.target.value)}
          onBlur={() => { if (dirty) onUpdate(r.id, { notes }); }}
          placeholder="Notes (e.g. follow up Tue, sent proposal)"
          style={{ ...inputStyle, flex: 1, minWidth: 180, padding: '7px 12px', borderRadius: 12 }} />
        {dirty && <button style={btnSm(C.accent)} onClick={() => onUpdate(r.id, { notes })}>Save</button>}
      </div>
    </div>
  );
}
