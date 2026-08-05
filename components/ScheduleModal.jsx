import { useState } from 'react';
import { C, US_TZS, statusColor, overlay, modalCard, inputStyle, lbl, btn, wallToUtcMs, nowInTzPlus, tzDatePlusDaysAt } from './constants.js';

export function ScheduleModal({ draft, onCancel, onConfirm }) {
  const [tz, setTz] = useState(draft.scheduled_tz || 'Asia/Karachi');
  const [when, setWhen] = useState(tzDatePlusDaysAt(draft.scheduled_tz || 'Asia/Karachi', 1, 9, 0));
  const [mins, setMins] = useState(2);
  const [err, setErr] = useState('');
  const tzName = (US_TZS.find((t) => t[0] === tz) || [, ''])[1];
  const nowLabel = new Intl.DateTimeFormat('en-US', { timeZone: tz, hour12: true, dateStyle: 'medium', timeStyle: 'short' }).format(new Date());
  const presets = [
    ['In 2 min', () => nowInTzPlus(tz, 2)],
    ['In 5 min', () => nowInTzPlus(tz, 5)],
    ['In 15 min', () => nowInTzPlus(tz, 15)],
    ['In 1 hour', () => nowInTzPlus(tz, 60)],
    ['Tomorrow 9 AM', () => tzDatePlusDaysAt(tz, 1, 9, 0)],
  ];

  const ms = when ? wallToUtcMs(when, tz) : null;
  const tooSoon = ms !== null && ms <= Date.now();
  const localPreview = ms !== null ? new Date(ms).toLocaleString() : '';
  const utcPreview = ms !== null ? new Date(ms).toISOString().slice(0, 16).replace('T', ' ') + ' UTC' : '';

  function submit() {
    if (!when) return setErr('Pick a date and time.');
    if (tooSoon) return setErr('That time is in the past. Pick a future time.');
    onConfirm(draft.id, ms, tz);
  }

  return (
    <div onClick={onCancel} style={overlay}>
      <div onClick={(e) => e.stopPropagation()} style={modalCard}>
        <h3 style={{ margin: '0 0 4px', fontSize: 18, fontWeight: 750, color: C.ink, letterSpacing: '-0.01em' }}>Schedule send</h3>
        <p style={{ color: C.sub, fontSize: 13, margin: '0 0 14px' }}>
          {draft.company_name} — {draft.contact_email || 'no contact email'}
        </p>

        <div style={{ fontSize: 12, color: C.sub, marginBottom: 14, fontWeight: 500 }}>
          Now in {tzName}: <b style={{ color: C.text, fontWeight: 650 }}>{nowLabel}</b>
        </div>

        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 180 }}>
            <label style={{ ...lbl, marginTop: 0 }}>Send date & time (in {tzName})</label>
            <input type="datetime-local" value={when}
              onChange={(e) => { setWhen(e.target.value); setErr(''); }}
              style={{ ...inputStyle }} />
          </div>
          <div style={{ minWidth: 150 }}>
            <label style={{ ...lbl, marginTop: 0 }}>US time zone</label>
            <select value={tz} onChange={(e) => setTz(e.target.value)} style={{ ...inputStyle }}>
              {US_TZS.map(([v, label]) => <option key={v} value={v}>{label}</option>)}
            </select>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 12 }}>
          {presets.map(([label, fn]) => (
            <button key={label} onClick={() => { setWhen(fn()); setErr(''); }}
              style={{ background: 'var(--input-bg)', color: C.sub, border: '1px solid var(--input-border)', borderRadius: 999, padding: '5px 12px', fontSize: 12, cursor: 'pointer', backdropFilter: 'blur(8px)', boxShadow: '0 2px 4px rgba(15, 23, 42, 0.02)' }}>
              {label}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12 }}>
          <span style={{ color: C.sub, fontSize: 13 }}>Or send in</span>
          <input type="number" min="1" value={mins}
            onChange={(e) => setMins(e.target.value)}
            style={{ ...inputStyle, width: 70, padding: '6px 8px', textAlign: 'center' }} />
          <span style={{ color: C.sub, fontSize: 13 }}>minutes from now</span>
          <button style={btn(C.accent, true)}
            onClick={() => { const n = Math.max(1, parseInt(mins) || 1); setWhen(nowInTzPlus(tz, n)); setErr(''); }}>
            Set
          </button>
        </div>

        <div style={{ marginTop: 14, padding: 14, borderRadius: 16, background: 'var(--subtle-card-bg)', border: '1px solid var(--input-border)', fontSize: 13, backdropFilter: 'blur(8px)' }}>
          <div style={{ color: C.sub, fontWeight: 500 }}>This email will send at:</div>
          <div style={{ color: tooSoon ? C.red : '#0e7490', fontWeight: 750, fontSize: 15, marginTop: 3 }}>
            {when ? `${when.replace('T', ' ')} ${(US_TZS.find((t) => t[0] === tz) || [, ''])[1]}` : '—'}
          </div>
          {ms !== null && (
            <div style={{ color: C.sub, marginTop: 4, fontSize: 12 }}>
              Your local time: {localPreview} · {utcPreview}
            </div>
          )}
        </div>

        {err && <div style={{ color: C.red, fontSize: 13, marginTop: 10, fontWeight: 600 }}>{err}</div>}

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 18 }}>
          <button style={btn(C.sub, true)} onClick={onCancel}>Cancel</button>
          <button style={btn(statusColor.scheduled)} disabled={!draft.contact_email || tooSoon} onClick={submit}>
            Schedule send
          </button>
        </div>
      </div>
    </div>
  );
}
