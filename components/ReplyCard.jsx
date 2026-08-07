import { useState } from 'react';
import { C, REPLY_STAGES, stageColor, inputStyle, btnSm } from './constants.js';

export function ReplyCard({ r, onUpdate, onCollapse }) {
  const [notes, setNotes] = useState(r.notes || '');
  const [expandedText, setExpandedText] = useState(false);
  const status = r.status || 'new';
  const dirty = notes !== (r.notes || '');

  const fullContent = r.body || r.response || r.snippet || `Received email reply from ${r.from_email} regarding "${r.subject || 'outreach'}". Open your mail client to view full message history.`;
  const isLong = fullContent.length > 500;
  const displayedContent = (isLong && !expandedText) ? fullContent.slice(0, 500) + '...' : fullContent;

  return (
    <div style={{
      background: 'var(--card-bg)',
      backdropFilter: 'blur(16px)',
      WebkitBackdropFilter: 'blur(16px)',
      border: '1px solid var(--card-border)',
      borderLeft: `4px solid ${stageColor(status)}`,
      borderRadius: 18,
      padding: '16px 20px',
      marginBottom: 14,
      boxShadow: 'var(--card-shadow)'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <strong style={{ color: C.ink, fontSize: 16, fontWeight: 750 }}>{r.company_name || r.from_email}</strong>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ color: C.sub, fontSize: 12, fontWeight: 500 }}>{r.received_at ? r.received_at + ' UTC' : ''}</span>
          {onCollapse && (
            <button style={{ ...btnSm(C.sub, true), padding: '4px 10px', fontSize: 11 }} onClick={onCollapse}>
              Collapse ▲
            </button>
          )}
        </div>
      </div>
      <div style={{ color: C.text, fontSize: 14, marginTop: 4, fontWeight: 600 }}>{r.subject || '(no subject)'}</div>
      <div style={{ color: C.sub, fontSize: 12, marginTop: 2 }}>from {r.from_email} · open your inbox to reply</div>
      <div style={{
        background: 'var(--subtle-card-bg)',
        border: '1px solid var(--card-border)',
        borderRadius: 14,
        padding: '14px 18px',
        marginTop: 12,
        fontSize: 13.5,
        color: C.ink,
        lineHeight: 1.6,
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word'
      }}>
        {displayedContent}
        {isLong && (
          <div style={{ marginTop: 10 }}>
            <button
              onClick={() => setExpandedText(!expandedText)}
              style={{
                background: 'transparent',
                border: 'none',
                color: C.accent,
                fontWeight: 700,
                fontSize: 12,
                cursor: 'pointer',
                padding: 0
              }}>
              {expandedText ? 'Show Less ▲' : 'Read Full Message ▼'}
            </button>
          </div>
        )}
      </div>
      <div style={{ display: 'flex', gap: 10, marginTop: 12, alignItems: 'center', flexWrap: 'wrap' }}>
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
