'use client';
import { useEffect, useState, useRef } from 'react';

const C = {
  bg: '#f5f7fb', card: '#ffffff', border: '#d9e1ec', text: '#1f2933',
  sub: '#667085', muted: '#98a2b3', accent: '#1597c8', green: '#15803d',
  red: '#c2410c', amber: '#b7791f', input: '#f8fafc', ink: '#101828',
  line: '#edf2f7',
};

const statusColor = { pending: C.amber, approved: C.green, scheduled: '#0891b2', sent: '#1f8fb8', replied: '#7c3aed', rejected: C.red, error: C.red };
const statusLabel = { pending: 'Review', approved: 'Approved', scheduled: 'Scheduled', sent: 'Sent', replied: 'Replied', rejected: 'Rejected', error: 'Error', sending: 'Sending' };

// Lead stages for tracking replies through to a sale.
const REPLY_STAGES = [
  ['new', 'New', '#d97706'],
  ['interested', 'Interested', '#16a34a'],
  ['meeting', 'Meeting booked', '#2563eb'],
  ['won', 'Won', '#059669'],
  ['not_interested', 'Not interested', '#6e6e6e'],
  ['lost', 'Lost', '#dc2626'],
];
const stageColor = (s) => (REPLY_STAGES.find((x) => x[0] === s) || [, , '#6e6e6e'])[2];

// Global time zones for scheduling.
const US_TZS = [
  ['America/New_York',     'USA — New York (Eastern)'],
  ['America/Chicago',      'USA — Chicago (Central)'],
  ['America/Denver',       'USA — Denver (Mountain)'],
  ['America/Los_Angeles',  'USA — Los Angeles (Pacific)'],
  ['Europe/London',        'UK — London'],
  ['Europe/Paris',         'Europe — Paris / Berlin / Rome'],
  ['Europe/Moscow',        'Russia — Moscow'],
  ['Asia/Dubai',           'UAE — Dubai'],
  ['Asia/Karachi',         'Pakistan — Karachi / Islamabad'],
  ['Asia/Kolkata',         'India — Mumbai / Delhi'],
  ['Asia/Dhaka',           'Bangladesh — Dhaka'],
  ['Asia/Bangkok',         'Southeast Asia — Bangkok / Jakarta'],
  ['Asia/Singapore',       'Singapore / Malaysia / Philippines'],
  ['Asia/Shanghai',        'China — Beijing / Shanghai'],
  ['Asia/Tokyo',           'Japan — Tokyo'],
  ['Asia/Seoul',           'South Korea — Seoul'],
  ['Australia/Sydney',     'Australia — Sydney / Melbourne'],
  ['Pacific/Auckland',     'New Zealand — Auckland'],
  ['America/Sao_Paulo',    'Brazil — São Paulo'],
  ['America/Mexico_City',  'Mexico — Mexico City'],
];

// Time zones available in the "display times in" dropdown.
const DISPLAY_TZS = [
  ['Asia/Karachi',         'Pakistan — Karachi / Islamabad'],
  ['Asia/Kolkata',         'India — Mumbai / Delhi'],
  ['Asia/Dubai',           'UAE — Dubai'],
  ['Asia/Riyadh',          'Saudi Arabia — Riyadh'],
  ['Asia/Shanghai',        'China — Beijing / Shanghai'],
  ['Asia/Tokyo',           'Japan — Tokyo'],
  ['Asia/Seoul',           'South Korea — Seoul'],
  ['Asia/Singapore',       'Singapore / Malaysia / Philippines'],
  ['Asia/Bangkok',         'Southeast Asia — Bangkok / Jakarta'],
  ['Asia/Dhaka',           'Bangladesh — Dhaka'],
  ['Europe/London',        'UK — London'],
  ['Europe/Paris',         'Europe — Paris / Berlin / Rome'],
  ['Europe/Moscow',        'Russia — Moscow'],
  ['America/New_York',     'USA — New York (Eastern)'],
  ['America/Chicago',      'USA — Chicago (Central)'],
  ['America/Los_Angeles',  'USA — Los Angeles (Pacific)'],
  ['America/Sao_Paulo',    'Brazil — São Paulo'],
  ['Australia/Sydney',     'Australia — Sydney / Melbourne'],
  ['Pacific/Auckland',     'New Zealand — Auckland'],
];

// Offset (ms) of a timezone at a given instant.
function tzOffsetMs(timeZone, date) {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone, hour12: false, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
  const p = dtf.formatToParts(date).reduce((a, x) => { a[x.type] = x.value; return a; }, {});
  const asUTC = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second);
  return asUTC - date.getTime();
}

// Convert a wall-clock time ("YYYY-MM-DDTHH:mm") in a timezone → UTC epoch ms.
function wallToUtcMs(localStr, tz) {
  const naive = new Date(localStr + ':00Z');
  const off1 = tzOffsetMs(tz, naive);
  let utc = new Date(naive.getTime() - off1);
  const off2 = tzOffsetMs(tz, utc);
  if (off2 !== off1) utc = new Date(naive.getTime() - off2);
  return utc.getTime();
}

// Format a stored UTC time (SQLite "YYYY-MM-DD HH:MM:SS" or ISO string) in a timezone for display.
function fmtInTz(utcSql, tz) {
  if (!utcSql) return '';
  const s = String(utcSql);
  // Already a full ISO string (from Supabase): use as-is. Otherwise append Z.
  const d = new Date(/Z$/i.test(s) || /[+-]\d{2}:\d{2}$/.test(s) ? s : s.replace(' ', 'T') + 'Z');
  if (isNaN(d.getTime())) return '';
  return new Intl.DateTimeFormat('en-US', { timeZone: tz || 'Asia/Karachi', dateStyle: 'medium', timeStyle: 'short' }).format(d);
}

export default function Dashboard() {
  const [offer, setOffer] = useState('');
  const [customPrompt, setCustomPrompt] = useState('');
  const [sig, setSig] = useState({ sig_name: '', sig_title: '', sig_tagline: '', sig_website: '', sig_logo: '' });
  const [sigSaved, setSigSaved] = useState('{}');
  const [authEnabled, setAuthEnabled] = useState(false);
  const [senders, setSenders] = useState([]);
  const [senderKey, setSenderKey] = useState('');
  const [companies, setCompanies] = useState([]);
  const [drafts, setDrafts] = useState([]);
  const [busy, setBusy] = useState('');
  const [msg, setMsg] = useState(null);
  const [filter, setFilter] = useState('all');
  const [companySearch, setCompanySearch] = useState('');
  const [modal, setModal] = useState(null); // { mode:'ai'|'custom', target: companyId | 'all' }
  const [schedModal, setSchedModal] = useState(null); // a draft object, or null
  const [replies, setReplies] = useState([]);
  const [displayTz, setDisplayTz] = useState(() => (typeof window !== 'undefined' ? localStorage.getItem('displayTz') : null) || 'Asia/Karachi');
  const fileRef = useRef(null);

  async function load() {
    const [c, d, rp] = await Promise.all([
      fetch('/api/companies').then((r) => r.json()),
      fetch('/api/drafts').then((r) => r.json()),
      fetch('/api/replies').then((r) => r.json()),
    ]);
    setCompanies(c.companies || []);
    setDrafts(d.drafts || []);
    setReplies(rp.replies || []);
  }

  async function checkReplies() {
    setBusy('replies');
    const res = await fetch('/api/replies', { method: 'POST' }).then((r) => r.json());
    setBusy('');
    if (res.error) return flash(res.error, false);
    flash(res.found ? `Found ${res.found} new repl${res.found === 1 ? 'y' : 'ies'}.` : 'No new replies.');
    load();
  }

  async function updateReply(id, patch) {
    const res = await fetch('/api/replies', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, ...patch }),
    }).then((r) => r.json());
    if (res.error) return flash(res.error, false);
    setReplies((rs) => rs.map((r) => (r.id === id ? res.reply : r)));
  }
  useEffect(() => {
    setOffer(localStorage.getItem('offer') || '');
    setCustomPrompt(localStorage.getItem('customPrompt') || '');
    fetch('/api/senders').then((r) => r.json()).then((s) => {
      const list = s.senders || [];
      setSenders(list);
      const saved = localStorage.getItem('senderKey') || '';
      setSenderKey(list.some((x) => x.key === saved) ? saved : (list[0]?.key || ''));
    }).catch(() => {});
    fetch('/api/login').then((r) => r.json()).then((s) => setAuthEnabled(!!s.enabled)).catch(() => {});
    load();
    // Auto-refresh every 10s so open/click counts update without manual reload
    const poll = setInterval(load, 10000);
    return () => clearInterval(poll);
  }, []);
  useEffect(() => { if (senderKey) localStorage.setItem('senderKey', senderKey); }, [senderKey]);
  useEffect(() => { localStorage.setItem('displayTz', displayTz); }, [displayTz]);
  useEffect(() => {
    if (!senderKey) return;
    fetch(`/api/settings?senderKey=${encodeURIComponent(senderKey)}`).then((r) => r.json()).then((s) => {
      const v = { sig_name: s.sig_name || '', sig_title: s.sig_title || '', sig_tagline: s.sig_tagline || '', sig_website: s.sig_website || '', sig_logo: s.sig_logo || '' };
      setSig(v);
      setSigSaved(JSON.stringify(v));
    }).catch(() => {});
  }, [senderKey]);

  async function logout() {
    await fetch('/api/login', { method: 'DELETE' });
    window.location.href = '/login';
  }

  async function saveSignature() {
    const res = await fetch('/api/settings', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...sig, senderKey }),
    }).then((r) => r.json());
    if (res.error) return flash(res.error, false);
    const v = { sig_name: res.sig_name || '', sig_title: res.sig_title || '', sig_tagline: res.sig_tagline || '', sig_website: res.sig_website || '', sig_logo: res.sig_logo || '' };
    setSig(v);
    setSigSaved(JSON.stringify(v));
    flash('Signature saved.');
  }
  useEffect(() => { localStorage.setItem('offer', offer); }, [offer]);
  useEffect(() => { localStorage.setItem('customPrompt', customPrompt); }, [customPrompt]);

  // Validate + build the generation payload for a given mode ('ai' | 'custom').
  function invalidFor(m) {
    if (m === 'custom') return !customPrompt.trim() && 'Write your custom email prompt first (section 1).';
    return !offer.trim() && 'Enter what you are pitching first (section 1).';
  }
  function payloadFor(companyId, m) {
    return m === 'custom'
      ? { companyId, mode: 'custom', customPrompt, senderKey }
      : { companyId, mode: 'ai', offer, senderKey };
  }

  // Open the popup for a generation action.
  function openGen(m, target) { setModal({ mode: m, target }); }

  // Confirm from the popup → validate, close, run the right generation.
  async function runModal() {
    const { mode: m, target } = modal;
    const bad = invalidFor(m);
    if (bad) return flash(bad, false);
    setModal(null);
    if (target === 'all') await generateAll(m);
    else await generateOne(target, m);
  }

  function flash(text, ok = true) {
    setMsg({ text, ok });
    setTimeout(() => setMsg(null), 4000);
  }

  async function importCsv(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const csv = await file.text();
    setBusy('import');
    const res = await fetch('/api/import', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ csv }),
    }).then((r) => r.json());
    setBusy('');
    if (fileRef.current) fileRef.current.value = '';
    if (res.error) return flash(res.error, false);
    flash(`Imported ${res.imported} companies${res.skipped ? `, skipped ${res.skipped} (no name)` : ''}.`);
    load();
  }

  async function generateOne(companyId, m) {
    const bad = invalidFor(m);
    if (bad) return flash(bad, false);
    setBusy(`${m}-${companyId}`);
    const res = await fetch('/api/generate', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payloadFor(companyId, m)),
    }).then((r) => r.json());
    setBusy('');
    if (res.error) return flash(res.error, false);
    if (res.site_note) flash(`Generated (note: ${res.site_note})`);
    await load();
  }

  async function generateAll(m) {
    const bad = invalidFor(m);
    if (bad) return flash(bad, false);
    const pending = companies.filter((c) => !c.draft_id);
    if (pending.length === 0) return flash('No companies without a draft.', false);
    const label = m === 'custom' ? 'Custom' : 'AI';
    let ok = 0;
    let failed = 0;
    for (let i = 0; i < pending.length; i++) {
      setBusy(`all-${m}:${label} ${i + 1}/${pending.length}`);
      const res = await fetch('/api/generate', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...payloadFor(pending[i].id, m), senderKey }),
      }).then((r) => r.json());
      if (res.error) failed += 1;
      else ok += 1;
    }
    setBusy('');
    flash(failed ? `Generated ${ok}/${pending.length} ${label} draft(s), ${failed} failed.` : `Generated ${label} drafts for ${pending.length} companies.`, !failed);
    await load();
  }

  async function clearAll() {
    if (!confirm('Delete ALL companies and drafts? This cannot be undone.')) return;
    const res = await fetch('/api/companies', { method: 'DELETE' }).then((r) => r.json());
    if (res.error) return flash(res.error, false);
    await load();
  }

  async function clearOne(companyId, companyName) {
    if (!confirm(`Delete "${companyName}" and its draft? This cannot be undone.`)) return;
    const res = await fetch(`/api/companies?id=${companyId}`, { method: 'DELETE' }).then((r) => r.json());
    if (res.error) return flash(res.error, false);
    await load();
  }

  async function updateDraft(id, patch) {
    const res = await fetch('/api/drafts', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, ...patch }),
    }).then((r) => r.json());
    if (res.error) return flash(res.error, false);
    setDrafts((ds) => ds.map((d) => (d.id === id ? res.draft : d)));
    load();
  }

  async function sendOne(draftId) {
    setBusy('send-' + draftId);
    const res = await fetch('/api/send', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ draftId }),
    }).then((r) => r.json());
    setBusy('');
    if (res.error) { flash(res.error, false); await load(); return false; }
    setDrafts((ds) => ds.map((d) => (d.id === draftId ? res.draft : d)));
    flash('Email sent.');
    load();
    return true;
  }

  async function scheduleDraft(id, sendAtMs, tz) {
    const res = await fetch('/api/schedule', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, sendAtMs, tz }),
    }).then((r) => r.json());
    if (res.error) return flash(res.error, false);
    setDrafts((ds) => ds.map((d) => (d.id === id ? res.draft : d)));
    flash('Scheduled.');
    load();
  }

  async function unschedule(id) {
    const res = await fetch('/api/schedule', {
      method: 'DELETE', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    }).then((r) => r.json());
    if (res.error) return flash(res.error, false);
    setDrafts((ds) => ds.map((d) => (d.id === id ? res.draft : d)));
    flash('Schedule cancelled');
    load();
  }

  async function sendAllApproved() {
    const approved = drafts.filter((d) => d.status === 'approved' && d.contact_email);
    if (approved.length === 0) return flash('No approved drafts with a contact email.', false);
    if (!confirm(`Send ${approved.length} approved email(s) now?`)) return;
    let sent = 0;
    for (let i = 0; i < approved.length; i++) {
      setBusy(`send-all:${i + 1}/${approved.length}`);
      const res = await fetch('/api/send', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ draftId: approved[i].id }),
      }).then((r) => r.json());
      if (!res.error) sent++;
      // Throttle between sends to protect domain reputation.
      if (i < approved.length - 1) await new Promise((r) => setTimeout(r, 4000));
    }
    setBusy('');
    flash(`Sent ${sent}/${approved.length}.`, sent === approved.length);
    load();
  }

  async function approveAllPending() {
    const pending = drafts.filter((d) => d.status === 'pending');
    if (pending.length === 0) return flash('No pending drafts.', false);
    let ok = 0;
    let failed = 0;
    for (const d of pending) {
      const res = await fetch('/api/drafts', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: d.id, status: 'approved' }),
      }).then((r) => r.json());
      if (res.error) failed += 1;
      else ok += 1;
    }
    flash(failed ? `Approved ${ok}/${pending.length} draft(s), ${failed} failed.` : `Approved ${pending.length} draft(s).`, !failed);
    await load();
  }

  const activeSender = senders.find((s) => s.key === senderKey);

  return (
    <>
    <div style={{ background: C.card, borderBottom: `1px solid ${C.border}`, position: 'sticky', top: 0, zIndex: 20, boxShadow: '0 1px 2px rgba(16,24,40,0.04)' }}>
      <div style={{ maxWidth: 1180, margin: '0 auto', padding: '12px 24px', display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 11, minWidth: 220 }}>
          <img src="/logo.png" alt="Zirium AI" style={{ height: 38, width: 38, objectFit: 'contain', display: 'block' }} />
          <div>
            <div style={{ fontWeight: 750, fontSize: 16, color: C.ink, lineHeight: 1.1 }}>Zirium AI</div>
            <div style={{ color: C.sub, fontSize: 12, marginTop: 2 }}>Cold Email Outreach</div>
          </div>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 12, color: C.sub, whiteSpace: 'nowrap' }}>Show times in</span>
            <select value={displayTz} onChange={(e) => setDisplayTz(e.target.value)}
              style={{ fontSize: 12, color: C.text, border: `1px solid ${C.border}`, borderRadius: 6, padding: '5px 8px', background: '#fff', cursor: 'pointer' }}>
              {DISPLAY_TZS.map(([v, label]) => <option key={v} value={v}>{label}</option>)}
            </select>
          </div>
          {authEnabled && (
            <button onClick={logout} style={btn(C.sub, true)}>Log out</button>
          )}
        </div>
      </div>
    </div>
    <main style={{ maxWidth: 1180, margin: '0 auto', padding: '26px 24px 80px' }}>

      {msg && (
        <div style={{
          margin: '16px 0', padding: '10px 14px', borderRadius: 8,
          background: msg.ok ? '#e7f7ee' : '#fdeaea',
          color: msg.ok ? '#15803d' : '#b91c1c', border: `1px solid ${msg.ok ? C.green : C.red}`,
        }}>{msg.text}</div>
      )}
      {senders.length > 0 && (
        <ActiveSenderPanel
          senders={senders}
          senderKey={senderKey}
          setSenderKey={setSenderKey}
          activeSender={activeSender}
        />
      )}

      {/* Import */}
      <Section title="Import companies" kicker="CSV upload">
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <label style={{ ...btn(C.accent), display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            Choose CSV
            <input ref={fileRef} type="file" accept=".csv,text/csv" onChange={importCsv}
              style={{ display: 'none' }} disabled={busy === 'import'} />
          </label>
          {busy === 'import' && <span style={{ color: C.sub }}>Importing…</span>}
          <span style={{ color: C.sub, fontSize: 13 }}>Columns: name, website, contact_email, phone</span>
        </div>
      </Section>

      {/* Signature */}
      <Section title="Email signature" kicker="Sender identity">
        {senders.length > 0 && (
          <div style={{ marginBottom: 12 }}>
            <label style={{ ...lbl, marginTop: 0 }}>Signature for</label>
            <select value={senderKey} onChange={(e) => setSenderKey(e.target.value)}
              style={{ ...inputStyle, maxWidth: 360 }}>
              {senders.map((s) => <option key={s.key} value={s.key}>{s.name} &lt;{s.email}&gt;</option>)}
            </select>
          </div>
        )}
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 280 }}>
            <label style={lbl}>Name</label>
            <input value={sig.sig_name} onChange={(e) => setSig({ ...sig, sig_name: e.target.value })}
              placeholder="Haseeb Akbari" style={inputStyle} />
            <label style={lbl}>Title</label>
            <input value={sig.sig_title} onChange={(e) => setSig({ ...sig, sig_title: e.target.value })}
              placeholder="Chief Technology Officer | ZiriumAI" style={inputStyle} />
            <label style={lbl}>Tagline</label>
            <input value={sig.sig_tagline} onChange={(e) => setSig({ ...sig, sig_tagline: e.target.value })}
              placeholder="AI Systems • Automation • Workflow Engineering" style={inputStyle} />
            <label style={lbl}>Website</label>
            <input value={sig.sig_website} onChange={(e) => setSig({ ...sig, sig_website: e.target.value })}
              placeholder="ziriumai.com" style={inputStyle} />
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12, fontSize: 14, cursor: 'pointer' }}>
              <input type="checkbox" checked={sig.sig_logo === '1'}
                onChange={(e) => setSig({ ...sig, sig_logo: e.target.checked ? '1' : '0' })} />
              Include Zirium AI logo
            </label>
          </div>

          <div style={{ flex: 1, minWidth: 280 }}>
            <label style={lbl}>Preview</label>
            <div style={{ padding: 18, border: `1px solid ${C.border}`, borderLeft: `3px solid ${C.accent}`, borderRadius: 8, background: '#fff', minHeight: 150, boxShadow: '0 1px 2px rgba(16,24,40,0.04)' }}>
              {sig.sig_name && <div style={{ fontWeight: 750, fontSize: 15, color: C.ink }}>{sig.sig_name}</div>}
              {sig.sig_title && <div style={{ fontSize: 13, marginTop: 2 }}>{sig.sig_title}</div>}
              {sig.sig_tagline && <div style={{ color: C.sub, fontSize: 13, marginTop: 3 }}>{sig.sig_tagline}</div>}
              {sig.sig_website && <div style={{ color: C.accent, fontSize: 13, marginTop: 6, fontWeight: 650 }}>{sig.sig_website}</div>}
              {sig.sig_logo === '1' && <img src="/logo.png" alt="Zirium AI" style={{ height: 50, marginTop: 12, display: 'block' }} />}
              {!sig.sig_name && !sig.sig_title && !sig.sig_tagline && !sig.sig_website && sig.sig_logo !== '1' &&
                <span style={{ color: C.sub, fontSize: 13 }}>Your signature preview appears here.</span>}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 12, flexWrap: 'wrap' }}>
          <button style={btn(C.accent)} onClick={saveSignature} disabled={JSON.stringify(sig) === sigSaved}>
            {JSON.stringify(sig) === sigSaved ? 'Saved' : 'Save signature'}
          </button>
          <span style={{ color: C.sub, fontSize: 12 }}>
            Added automatically when this sender sends an email. The AI does not sign a name.
          </span>
        </div>
      </Section>

      {/* Companies */}
      <Section title={`Companies (${companies.length})`} kicker="Leads"
        right={
          companies.length > 0 && (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button style={btn(C.accent)} onClick={() => openGen('ai', 'all')} disabled={!!busy}>
                {busy.startsWith('all-ai:') ? `${busy.slice(7)}…` : 'Generate with AI'}
              </button>
              <button style={btn('#7c5cff')} onClick={() => openGen('custom', 'all')} disabled={!!busy}>
                {busy.startsWith('all-custom:') ? `${busy.slice(11)}…` : 'Custom generate'}
              </button>
              <button style={btn(C.red, true)} onClick={clearAll} disabled={!!busy}>Clear</button>
            </div>
          )
        }>
        {companies.length === 0 ? (
          <Empty>No companies yet. Import a CSV above.</Empty>
        ) : (() => {
          const q = companySearch.trim().toLowerCase();
          const shown = q
            ? companies.filter((c) => `${c.name} ${c.website || ''} ${c.contact_email || ''} ${c.phone || ''}`.toLowerCase().includes(q))
            : companies;
          const emailsOf = (c) => { try { return c.all_emails ? JSON.parse(c.all_emails) : []; } catch { return []; } };
          return (
          <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 12, flexWrap: 'wrap' }}>
            <input value={companySearch} onChange={(e) => setCompanySearch(e.target.value)}
              placeholder="Search companies by name, website, or email"
              style={{ ...inputStyle, maxWidth: 360 }} />
            <span style={{ color: C.sub, fontSize: 12 }}>
              {q ? `${shown.length} of ${companies.length}` : `${companies.length} total`}
            </span>
          </div>
          <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, fontSize: 14, minWidth: 760 }}>
            <thead>
              <tr style={{ color: C.sub, textAlign: 'left' }}>
                <th style={th}>Company</th><th style={th}>Emails</th>
                <th style={th}>Phone</th><th style={th}>Status</th><th style={{ ...th, textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((c) => {
                const all = emailsOf(c);
                const extras = all.filter((e) => e !== c.contact_email);
                return (
                <tr key={c.id}>
                  <td style={td}>
                    <div style={{ fontWeight: 650, color: C.ink }}>{c.name}</div>
                    {c.website && <div style={{ color: C.sub, fontSize: 12 }}>{c.website}</div>}
                  </td>
                  <td style={{ ...td, wordBreak: 'break-word', maxWidth: 240 }}>
                    {c.contact_email
                      ? <div style={{ color: C.text }}>{c.contact_email}</div>
                      : <span style={{ color: C.sub }}>no email</span>}
                    {extras.length > 0 && (
                      <div style={{ color: C.sub, fontSize: 12, marginTop: 2 }}>
                        {extras.map((e, i) => <div key={i}>{e}</div>)}
                      </div>
                    )}
                  </td>
                  <td style={{ ...td, color: c.phone ? C.text : C.sub, whiteSpace: 'nowrap', fontSize: 13 }}>
                    {c.phone || '—'}
                  </td>
                  <td style={td}>
                    {c.draft_status
                      ? <Badge color={statusColor[c.draft_status]}>{c.draft_status}</Badge>
                      : <span style={{ color: C.sub }}>no draft</span>}
                  </td>
                  <td style={{ ...td, textAlign: 'right', whiteSpace: 'nowrap' }}>
                    <button style={{ ...btnSm(C.accent, true), marginRight: 6 }} disabled={!!busy}
                      title="AI: crawl the site and pitch an idea" onClick={() => openGen('ai', c.id)}>
                      {busy === 'ai-' + c.id ? '…' : 'AI'}
                    </button>
                    <button style={btnSm('#7c5cff', true)} disabled={!!busy}
                      title="Custom: polish your written prompt, no crawl" onClick={() => openGen('custom', c.id)}>
                      {busy === 'custom-' + c.id ? '…' : 'Custom'}
                    </button>
                    <button style={{ ...btnSm(C.red, true), marginLeft: 6 }} disabled={!!busy}
                      title="Delete this company and its draft"
                      onClick={() => clearOne(c.id, c.name)}>
                      ✕
                    </button>
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
          </div>
          </>
          );
        })()}
      </Section>

      {/* Drafts */}
      <Section title={`Drafts (${drafts.length})`} kicker="Review queue"
        right={
          drafts.length > 0 && (
            <div style={{ display: 'flex', gap: 8 }}>
              <button style={btn(C.green, true)} onClick={approveAllPending} disabled={!!busy}>
                Approve all pending
              </button>
              <button style={btn(C.accent)} onClick={sendAllApproved} disabled={!!busy}>
                {busy.startsWith('send-all:') ? `Sending ${busy.slice(9)}…` : 'Send all approved'}
              </button>
            </div>
          )
        }>
        {drafts.length === 0 ? (
          <Empty>Generated drafts will appear here for approval.</Empty>
        ) : (
          <>
            <div style={{ display: 'flex', gap: 6, marginBottom: 14, flexWrap: 'wrap' }}>
              {['all', 'pending', 'approved', 'scheduled', 'sent', 'replied', 'rejected', 'error'].map((f) => {
                const n = f === 'all' ? drafts.length : drafts.filter((d) => d.status === f).length;
                const active = filter === f;
                return (
                  <button key={f} onClick={() => setFilter(f)}
                    style={{
                      background: active ? C.accent : 'transparent',
                      color: active ? '#fff' : C.sub,
                      border: `1px solid ${active ? C.accent : C.border}`,
                      borderRadius: 20, padding: '4px 12px', fontSize: 13, cursor: 'pointer',
                      textTransform: 'capitalize',
                    }}>
                    {f} {n > 0 && `(${n})`}
                  </button>
                );
              })}
            </div>
            {drafts.filter((d) => filter === 'all' || d.status === filter).length === 0 ? (
              <Empty>No drafts with status "{filter}".</Empty>
            ) : (
              drafts
                .filter((d) => filter === 'all' || d.status === filter)
                .map((d) => (
                  <DraftCard key={d.id} d={d} senders={senders} onUpdate={updateDraft} onSend={sendOne}
                    onScheduleOpen={(draft) => setSchedModal(draft)} onUnschedule={unschedule}
                    sending={busy === 'send-' + d.id} displayTz={displayTz} />
                ))
            )}
          </>
        )}
      </Section>

      {/* Replies */}
      <Section title={`Replies (${replies.length})`} kicker="Pipeline"
        right={
          <button style={btn(C.accent, true)} onClick={checkReplies} disabled={!!busy}>
            {busy === 'replies' ? 'Checking inbox…' : 'Check replies now'}
          </button>
        }>
        {replies.length === 0 ? (
          <Empty>No replies yet. When a prospect replies to your inbox, it appears here and that lead is marked “replied”. The inbox is checked automatically every few minutes.</Empty>
        ) : (
          <>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 12, fontSize: 12, color: C.sub }}>
              {REPLY_STAGES.map(([v, label, col]) => {
                const n = replies.filter((r) => (r.status || 'new') === v).length;
                return n > 0 ? <span key={v} style={{ color: col, fontWeight: 600 }}>{n} {label}</span> : null;
              })}
            </div>
            {replies.map((r) => <ReplyCard key={r.id} r={r} onUpdate={updateReply} />)}
          </>
        )}
      </Section>

      {modal && (
        <GenModal
          modal={modal}
          companies={companies}
          senders={senders}
          senderKey={senderKey}
          setSenderKey={setSenderKey}
          offer={offer} setOffer={setOffer}
          customPrompt={customPrompt} setCustomPrompt={setCustomPrompt}
          onCancel={() => setModal(null)}
          onSubmit={runModal}
        />
      )}

      {schedModal && (
        <ScheduleModal
          draft={schedModal}
          onCancel={() => setSchedModal(null)}
          onConfirm={async (id, ms, tz) => { setSchedModal(null); await scheduleDraft(id, ms, tz); }}
        />
      )}
    </main>
    </>
  );
}

// Current wall-clock time in a timezone, plus N minutes, as "YYYY-MM-DDTHH:mm".
function nowInTzPlus(tz, addMin) {
  const t = new Date(Date.now() + addMin * 60000);
  const p = new Intl.DateTimeFormat('en-US', {
    timeZone: tz, hour12: false, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
  }).formatToParts(t).reduce((a, x) => { a[x.type] = x.value; return a; }, {});
  const hh = p.hour === '24' ? '00' : p.hour;
  return `${p.year}-${p.month}-${p.day}T${hh}:${p.minute}`;
}

// A wall-clock "YYYY-MM-DDTHH:mm" = today-in-tz + N days, at hh:mm.
function tzDatePlusDaysAt(tz, days, hh, mm) {
  const today = nowInTzPlus(tz, 0).slice(0, 10);
  const dt = new Date(today + 'T00:00:00Z');
  dt.setUTCDate(dt.getUTCDate() + days);
  const ymd = dt.toISOString().slice(0, 10);
  return `${ymd}T${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}

function ScheduleModal({ draft, onCancel, onConfirm }) {
  const [tz, setTz] = useState(draft.scheduled_tz || 'Asia/Karachi');
  // Default to a sensible, clearly-future slot (tomorrow 9 AM in the zone),
  // not "now + 1h" which looks like a timezone error.
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
        <h3 style={{ margin: '0 0 4px', fontSize: 17, fontWeight: 600 }}>Schedule send</h3>
        <p style={{ color: C.sub, fontSize: 13, margin: '0 0 12px' }}>
          {draft.company_name} — {draft.contact_email || 'no contact email'}
        </p>

        <div style={{ fontSize: 12, color: C.sub, marginBottom: 12 }}>
          Now in {tzName}: <b style={{ color: C.text }}>{nowLabel}</b>
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

        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 10 }}>
          {presets.map(([label, fn]) => (
            <button key={label} onClick={() => { setWhen(fn()); setErr(''); }}
              style={{ background: 'transparent', color: C.sub, border: `1px solid ${C.border}`, borderRadius: 16, padding: '4px 10px', fontSize: 12, cursor: 'pointer' }}>
              {label}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10 }}>
          <span style={{ color: C.sub, fontSize: 13 }}>Or send in</span>
          <input type="number" min="1" value={mins}
            onChange={(e) => setMins(e.target.value)}
            style={{ ...inputStyle, width: 70, padding: '6px 8px' }} />
          <span style={{ color: C.sub, fontSize: 13 }}>minutes from now</span>
          <button style={btn(C.accent, true)}
            onClick={() => { const n = Math.max(1, parseInt(mins) || 1); setWhen(nowInTzPlus(tz, n)); setErr(''); }}>
            Set
          </button>
        </div>

        <div style={{ marginTop: 12, padding: 10, borderRadius: 8, background: '#eef2f7', border: `1px solid ${C.border}`, fontSize: 13 }}>
          <div style={{ color: C.sub }}>This email will send at:</div>
          <div style={{ color: tooSoon ? C.red : '#0e7490', fontWeight: 600, marginTop: 2 }}>
            {when ? `${when.replace('T', ' ')} ${(US_TZS.find((t) => t[0] === tz) || [, ''])[1]}` : '—'}
          </div>
          {ms !== null && (
            <div style={{ color: C.sub, marginTop: 4, fontSize: 12 }}>
              Your local time: {localPreview} · {utcPreview}
            </div>
          )}
        </div>

        {err && <div style={{ color: C.red, fontSize: 13, marginTop: 8 }}>{err}</div>}

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
          <button style={btn(C.sub, true)} onClick={onCancel}>Cancel</button>
          <button style={btn(statusColor.scheduled)} disabled={!draft.contact_email || tooSoon} onClick={submit}>
            Schedule send
          </button>
        </div>
      </div>
    </div>
  );
}

function GenModal({ modal, companies, senders, senderKey, setSenderKey, offer, setOffer, customPrompt, setCustomPrompt, onCancel, onSubmit }) {
  const isAi = modal.mode === 'ai';
  const pendingCount = companies.filter((c) => !c.draft_id).length;
  const scope = modal.target === 'all'
    ? `all ${pendingCount} compan${pendingCount === 1 ? 'y' : 'ies'} without a draft`
    : (companies.find((c) => c.id === modal.target)?.name || 'this company');

  // Submit on Ctrl/Cmd+Enter for speed.
  function onKey(e) {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') onSubmit();
    if (e.key === 'Escape') onCancel();
  }

  return (
    <div onClick={onCancel} style={overlay}>
      <div onClick={(e) => e.stopPropagation()} style={modalCard} onKeyDown={onKey}>
        <h3 style={{ margin: '0 0 4px', fontSize: 17, fontWeight: 600 }}>
          {isAi ? 'Generate with AI' : 'Custom email'}
        </h3>
        <p style={{ color: C.sub, fontSize: 13, margin: '0 0 14px' }}>For {scope}.</p>

        {senders.length > 0 && (
          <>
            <label style={lbl}>Send from</label>
            <select value={senderKey} onChange={(e) => setSenderKey(e.target.value)} style={inputStyle}>
              {senders.map((s) => <option key={s.key} value={s.key}>{s.name} &lt;{s.email}&gt;</option>)}
            </select>
          </>
        )}

        {isAi ? (
          <>
            <label style={lbl}>What do you want to pitch?</label>
            <textarea autoFocus value={offer} onChange={(e) => setOffer(e.target.value)}
              placeholder="e.g. We build custom AI tools and automations for e-commerce (AI shopping assistants, auto product descriptions, automated tagging & translation)."
              style={{ ...inputStyle, minHeight: 130, resize: 'vertical' }} />
            <p style={{ color: C.sub, fontSize: 12, margin: '6px 0 0' }}>
              The AI crawls each company's website and proposes an interesting, personalized idea around this.
            </p>
          </>
        ) : (
          <>
            <label style={lbl}>Write your email / instructions</label>
            <textarea autoFocus value={customPrompt} onChange={(e) => setCustomPrompt(e.target.value)}
              placeholder={"e.g. We're offering a free 14-day trial of our AI shopping assistant that answers customer questions and writes product descriptions. Friendly, professional tone, under 90 words, sign off as Haseeb."}
              style={{ ...inputStyle, minHeight: 160, resize: 'vertical' }} />
            <p style={{ color: C.sub, fontSize: 12, margin: '6px 0 0' }}>
              No website crawling. The AI polishes your wording and inserts the company name.
            </p>
          </>
        )}

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
          <button style={btn(C.sub, true)} onClick={onCancel}>Cancel</button>
          <button style={btn(isAi ? C.accent : '#7c5cff')} onClick={onSubmit}>
            Generate
          </button>
        </div>
        <p style={{ color: C.sub, fontSize: 11, textAlign: 'right', margin: '8px 0 0' }}>
          Tip: Ctrl/Cmd + Enter to generate
        </p>
      </div>
    </div>
  );
}

function ReplyCard({ r, onUpdate }) {
  const [notes, setNotes] = useState(r.notes || '');
  const status = r.status || 'new';
  const dirty = notes !== (r.notes || '');
  return (
    <div style={{ border: `1px solid ${C.border}`, borderLeft: `3px solid ${stageColor(status)}`, borderRadius: 8, padding: '12px 14px', marginBottom: 10, background: '#fff', boxShadow: '0 1px 2px rgba(16,24,40,0.04)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <strong style={{ color: C.ink }}>{r.company_name || r.from_email}</strong>
        <span style={{ color: C.sub, fontSize: 12 }}>{r.received_at ? r.received_at + ' UTC' : ''}</span>
      </div>
      <div style={{ color: C.text, fontSize: 14, marginTop: 2 }}>{r.subject || '(no subject)'}</div>
      <div style={{ color: C.sub, fontSize: 12, marginTop: 2 }}>from {r.from_email} · open your inbox to reply</div>
      <div style={{ display: 'flex', gap: 8, marginTop: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <select value={status} onChange={(e) => onUpdate(r.id, { status: e.target.value })}
          style={{ ...inputStyle, width: 'auto', padding: '6px 10px', color: stageColor(status), fontWeight: 600 }}>
          {REPLY_STAGES.map(([v, label]) => <option key={v} value={v} style={{ color: C.text }}>{label}</option>)}
        </select>
        <input value={notes} onChange={(e) => setNotes(e.target.value)}
          onBlur={() => { if (dirty) onUpdate(r.id, { notes }); }}
          placeholder="Notes (e.g. follow up Tue, sent proposal)"
          style={{ ...inputStyle, flex: 1, minWidth: 180, padding: '6px 10px' }} />
        {dirty && <button style={btnSm(C.accent)} onClick={() => onUpdate(r.id, { notes })}>Save</button>}
      </div>
    </div>
  );
}

function DraftCard({ d, senders, onUpdate, onSend, onScheduleOpen, onUnschedule, sending, displayTz }) {
  const [subject, setSubject] = useState(d.subject || '');
  const [body, setBody] = useState(d.body || '');
  const [draftSenderKey, setDraftSenderKey] = useState(d.sender_key || '');
  const [showResearch, setShowResearch] = useState(false);
  const dirty = subject !== d.subject || body !== d.body || draftSenderKey !== (d.sender_key || '');
  const locked = d.status === 'sent';
  const scheduled = d.status === 'scheduled';
  const editLocked = locked || scheduled;
  const tzLabel = (US_TZS.find((t) => t[0] === d.scheduled_tz) || [, ''])[1];

  return (
    <div style={{ border: `1px solid ${C.border}`, borderRadius: 8, padding: 18, marginBottom: 14, background: '#fff', boxShadow: '0 1px 3px rgba(16,24,40,0.06)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 14, marginBottom: 10 }}>
        <div>
          <strong style={{ color: C.ink, fontSize: 15 }}>{d.company_name}</strong>
          <div style={{ color: C.sub, fontSize: 12, marginTop: 3 }}>
            {d.contact_email || 'No contact email'}
            {d.sender_email && ` · ${d.sender_name || d.sender_email}`}
          </div>
        </div>
        <Badge color={statusColor[d.status] || C.sub}>{statusLabel[d.status] || d.status}</Badge>
      </div>
      <div style={{ color: C.sub, fontSize: 12, marginBottom: 10, display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
        {d.sent_at && <span>sent {d.sent_at} UTC</span>}
        {d.tracking_id && (
          <div style={{ display: 'inline-flex', gap: 10, alignItems: 'center', background: '#eef6ff', border: `1px solid ${C.accent}33`, borderRadius: 999, padding: '8px 12px', color: C.ink, fontWeight: 600, flexWrap: 'wrap' }}>
            <span style={{ color: C.accent, fontWeight: 700 }}>Tracking</span>
            <span style={{ background: C.accent + '16', color: C.accent, borderRadius: 999, padding: '4px 10px' }}>Opens: {d.open_count ?? 0}</span>
            <span style={{ background: C.green + '16', color: C.green, borderRadius: 999, padding: '4px 10px' }}>Clicks: {d.click_count ?? 0}</span>
            <span style={{ background: '#ffffff', color: C.text, borderRadius: 999, padding: '4px 10px', border: `1px solid ${C.border}` }}>Last open: {d.last_opened_at ? fmtInTz(d.last_opened_at, displayTz) : 'never'}</span>
            <span style={{ background: '#ffffff', color: C.text, borderRadius: 999, padding: '4px 10px', border: `1px solid ${C.border}` }}>Last click: {d.last_clicked_at ? fmtInTz(d.last_clicked_at, displayTz) : 'never'}</span>
          </div>
        )}
        <button onClick={() => setShowResearch((s) => !s)}
          style={{ background: 'none', border: 'none', color: C.accent, cursor: 'pointer', padding: 0, fontSize: 12, fontWeight: 650 }}>
          {showResearch ? 'hide research' : 'show research'}
        </button>
      </div>

      {scheduled && (
        <div style={{ background: '#e6f7fd', border: `1px solid ${statusColor.scheduled}`, color: '#0e6b82', borderRadius: 8, padding: 10, fontSize: 13, marginBottom: 10 }}>
          Scheduled for <b>{fmtInTz(d.scheduled_at, d.scheduled_tz)}</b> {tzLabel}
          <span style={{ color: C.sub }}> · {d.scheduled_at} UTC</span>
        </div>
      )}
      {d.status === 'error' && d.error && (
        <div style={{ background: '#fdeaea', border: `1px solid ${C.red}`, color: '#b91c1c', borderRadius: 8, padding: 10, fontSize: 13, marginBottom: 10 }}>
          {d.error}
        </div>
      )}
      {showResearch && (
        <div style={{ background: '#eef2f7', border: `1px solid ${C.border}`, borderRadius: 8, padding: 10, fontSize: 13, color: C.sub, marginBottom: 10, whiteSpace: 'pre-wrap' }}>
          {d.research_summary}
        </div>
      )}
      <div style={{ display: 'grid', gridTemplateColumns: senders.length > 0 ? '1.2fr .8fr' : '1fr', gap: 12 }}>
        <div>
          <label style={lbl}>Subject</label>
          <input value={subject} onChange={(e) => setSubject(e.target.value)} style={inputStyle} disabled={editLocked} />
        </div>
        {senders.length > 0 && (
          <div>
            <label style={lbl}>Send from</label>
            <select value={draftSenderKey || senders[0]?.key || ''} onChange={(e) => setDraftSenderKey(e.target.value)}
              style={inputStyle} disabled={editLocked}>
              {senders.map((s) => <option key={s.key} value={s.key}>{s.name} &lt;{s.email}&gt;</option>)}
            </select>
          </div>
        )}
      </div>
      <label style={lbl}>Body</label>
      <textarea value={body} onChange={(e) => setBody(e.target.value)} disabled={editLocked}
        style={{ ...inputStyle, minHeight: 170, resize: 'vertical', fontFamily: 'inherit', whiteSpace: 'pre-wrap', lineHeight: 1.55 }} />

      <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        {locked ? (
          <span style={{ color: C.green, fontSize: 14, alignSelf: 'center', fontWeight: 500 }}>Sent</span>
        ) : scheduled ? (
          <>
            <button style={btn(C.green)} disabled={sending} onClick={() => onSend(d.id)}>
              {sending ? 'Sending…' : 'Send now'}
            </button>
            <button style={btn(statusColor.scheduled, true)} onClick={() => onScheduleOpen(d)}>Reschedule</button>
            <button style={btn(C.amber, true)} onClick={() => onUnschedule(d.id)}>Cancel schedule</button>
          </>
        ) : (
          <>
            {dirty && (
              <button style={btn(C.accent)} onClick={() => onUpdate(d.id, { subject, body, senderKey: draftSenderKey })}>Save edits</button>
            )}
            {d.status !== 'approved' && (
              <button style={btn(C.green)} onClick={() => onUpdate(d.id, { subject, body, senderKey: draftSenderKey, status: 'approved' })}>Approve</button>
            )}
            {d.status === 'approved' && (
              <>
                <button style={btn(C.green)} disabled={sending || !d.contact_email}
                  title={!d.contact_email ? 'No contact email' : ''}
                  onClick={() => onSend(d.id)}>
                  {sending ? 'Sending…' : 'Send now'}
                </button>
                <button style={btn(statusColor.scheduled, true)} disabled={!d.contact_email}
                  title={!d.contact_email ? 'No contact email' : ''}
                  onClick={() => onScheduleOpen(d)}>
                  Schedule
                </button>
              </>
            )}
            <button style={btn(C.red, true)} onClick={() => onUpdate(d.id, { status: 'rejected' })}>Reject</button>
          </>
        )}
      </div>
    </div>
  );
}

// --- small presentational helpers ---
function Section({ title, kicker, right, children }) {
  return (
    <section style={{ marginTop: 18, background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, boxShadow: '0 1px 3px rgba(16,24,40,0.06)', overflow: 'hidden' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, padding: '14px 18px', borderBottom: `1px solid ${C.line}`, background: '#fbfcfe', flexWrap: 'wrap' }}>
        <div>
          {kicker && <div style={{ color: C.accent, fontSize: 11, fontWeight: 750, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 3 }}>{kicker}</div>}
          <h2 style={{ fontSize: 15, margin: 0, fontWeight: 750, color: C.ink }}>{title}</h2>
        </div>
        {right}
      </div>
      <div style={{ padding: 18 }}>{children}</div>
    </section>
  );
}
function Badge({ color, children }) {
  return <span style={{ background: color + '16', color, border: `1px solid ${color}44`, borderRadius: 999, padding: '3px 9px', fontSize: 11, fontWeight: 750, textTransform: 'uppercase', letterSpacing: 0.35, whiteSpace: 'nowrap' }}>{children}</span>;
}
function Empty({ children }) {
  return <div style={{ color: C.sub, margin: 0, fontSize: 14, padding: '18px 16px', border: `1px dashed ${C.border}`, borderRadius: 8, background: C.input }}>{children}</div>;
}
function ActiveSenderPanel({ senders, senderKey, setSenderKey, activeSender }) {
  const initials = (activeSender?.name || activeSender?.email || 'S')
    .split(/\s+/)
    .map((x) => x[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
  return (
    <section style={{ marginTop: 14, background: '#fff', border: `1px solid ${C.border}`, borderRadius: 8, padding: 16, display: 'grid', gridTemplateColumns: 'minmax(220px, 1fr) minmax(260px, 360px)', gap: 16, alignItems: 'center', boxShadow: '0 1px 3px rgba(16,24,40,0.06)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
        <div style={{ width: 42, height: 42, borderRadius: 8, background: `${C.accent}14`, border: `1px solid ${C.accent}33`, color: C.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 14, flex: '0 0 auto' }}>
          {initials}
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ color: C.accent, fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.6 }}>Active sender</div>
          <div style={{ color: C.ink, fontWeight: 750, fontSize: 15, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {activeSender ? `${activeSender.name} <${activeSender.email}>` : 'Select sender'}
          </div>
          <div style={{ color: C.sub, fontSize: 12, marginTop: 3 }}>
            Used for new drafts, generation context, and this sender's signature.
          </div>
        </div>
      </div>
      <div>
        <label style={{ ...lbl, marginTop: 0 }}>Send new emails from</label>
        <select value={senderKey} onChange={(e) => setSenderKey(e.target.value)}
          title="Sender account"
          style={inputStyle}>
          {senders.map((s) => <option key={s.key} value={s.key}>{s.name} &lt;{s.email}&gt;</option>)}
        </select>
      </div>
    </section>
  );
}
const overlay = { position: 'fixed', inset: 0, background: 'rgba(16,24,40,0.48)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, zIndex: 50 };
const modalCard = { background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: 22, width: '100%', maxWidth: 580, boxShadow: '0 24px 70px rgba(16,24,40,0.22)' };
const inputStyle = { width: '100%', boxSizing: 'border-box', background: '#fff', color: C.text, border: `1px solid ${C.border}`, borderRadius: 6, padding: '9px 11px', fontSize: 14, outline: 'none' };
const lbl = { display: 'block', color: C.sub, fontSize: 12, fontWeight: 700, margin: '10px 0 5px' };
const th = { padding: '9px 10px', fontWeight: 750, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.45, color: C.sub, background: C.input, borderBottom: `1px solid ${C.line}` };
const td = { padding: '12px 10px', verticalAlign: 'top', borderBottom: `1px solid ${C.line}` };
const btn = (color, outline = false) => ({
  background: outline ? 'transparent' : color,
  color: outline ? color : '#fff',
  border: `1px solid ${outline ? C.border : color}`, borderRadius: 6, padding: '8px 13px',
  fontSize: 13, cursor: 'pointer', fontWeight: 750, boxShadow: outline ? 'none' : '0 1px 2px rgba(16,24,40,0.08)',
});
const btnSm = (color, outline = false) => ({ ...btn(color, outline), padding: '5px 10px', fontSize: 12 });
