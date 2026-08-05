export const C = {
  bg: 'transparent',
  card: 'var(--card-bg)',
  border: 'var(--card-border)',
  text: 'var(--text-primary)',
  sub: 'var(--text-secondary)',
  muted: 'var(--text-muted)',
  accent: 'var(--accent)',
  green: '#10b981',
  red: '#f43f5e',
  amber: '#f59e0b',
  input: 'var(--input-bg)',
  ink: 'var(--text-primary)',
  line: 'var(--card-border)',
};

export const statusColor = { pending: C.amber, approved: C.green, scheduled: '#0891b2', sent: '#1f8fb8', replied: '#7c3aed', rejected: C.red, error: C.red };
export const statusLabel = { pending: 'Review', approved: 'Approved', scheduled: 'Scheduled', sent: 'Sent', replied: 'Replied', rejected: 'Rejected', error: 'Error', sending: 'Sending' };

// Lead stages for tracking replies through to a sale.
export const REPLY_STAGES = [
  ['new', 'New', '#d97706'],
  ['interested', 'Interested', '#16a34a'],
  ['meeting', 'Meeting booked', '#2563eb'],
  ['won', 'Won', '#059669'],
  ['not_interested', 'Not interested', '#6e6e6e'],
  ['lost', 'Lost', '#dc2626'],
];
export const stageColor = (s) => (REPLY_STAGES.find((x) => x[0] === s) || [, , '#6e6e6e'])[2];

// Global time zones for scheduling.
export const US_TZS = [
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
export const DISPLAY_TZS = [
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
export function tzOffsetMs(timeZone, date) {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone, hour12: false, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
  const p = dtf.formatToParts(date).reduce((a, x) => { a[x.type] = x.value; return a; }, {});
  const asUTC = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second);
  return asUTC - date.getTime();
}

// Convert a wall-clock time ("YYYY-MM-DDTHH:mm") in a timezone → UTC epoch ms.
export function wallToUtcMs(localStr, tz) {
  const naive = new Date(localStr + ':00Z');
  const off1 = tzOffsetMs(tz, naive);
  let utc = new Date(naive.getTime() - off1);
  const off2 = tzOffsetMs(tz, utc);
  if (off2 !== off1) utc = new Date(naive.getTime() - off2);
  return utc.getTime();
}

// Format a stored UTC time (SQLite "YYYY-MM-DD HH:MM:SS" or ISO string) in a timezone for display.
export function fmtInTz(utcSql, tz) {
  if (!utcSql) return '';
  const s = String(utcSql);
  // Already a full ISO string (from Supabase): use as-is. Otherwise append Z.
  const d = new Date(/Z$/i.test(s) || /[+-]\d{2}:\d{2}$/.test(s) ? s : s.replace(' ', 'T') + 'Z');
  if (isNaN(d.getTime())) return '';
  return new Intl.DateTimeFormat('en-US', { timeZone: tz || 'Asia/Karachi', dateStyle: 'medium', timeStyle: 'short' }).format(d);
}

// Current wall-clock time in a timezone, plus N minutes, as "YYYY-MM-DDTHH:mm".
export function nowInTzPlus(tz, addMin) {
  const t = new Date(Date.now() + addMin * 60000);
  const p = new Intl.DateTimeFormat('en-US', {
    timeZone: tz, hour12: false, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
  }).formatToParts(t).reduce((a, x) => { a[x.type] = x.value; return a; }, {});
  const hh = p.hour === '24' ? '00' : p.hour;
  return `${p.year}-${p.month}-${p.day}T${hh}:${p.minute}`;
}

// A wall-clock "YYYY-MM-DDTHH:mm" = today-in-tz + N days, at hh:mm.
export function tzDatePlusDaysAt(tz, days, hh, mm) {
  const today = nowInTzPlus(tz, 0).slice(0, 10);
  const dt = new Date(today + 'T00:00:00Z');
  dt.setUTCDate(dt.getUTCDate() + days);
  const ymd = dt.toISOString().slice(0, 10);
  return `${ymd}T${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}

export const overlay = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(15, 23, 42, 0.6)',
  backdropFilter: 'blur(16px)',
  WebkitBackdropFilter: 'blur(16px)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 20,
  zIndex: 999
};

export const modalCard = {
  background: 'var(--card-bg)',
  backdropFilter: 'blur(24px) saturate(180%)',
  WebkitBackdropFilter: 'blur(24px) saturate(180%)',
  border: '1px solid var(--card-border)',
  borderRadius: 24,
  padding: 26,
  width: '100%',
  maxWidth: 580,
  boxShadow: 'var(--card-shadow)'
};

export const inputStyle = {
  width: '100%',
  boxSizing: 'border-box',
  background: 'var(--input-bg)',
  color: 'var(--text-primary)',
  border: '1px solid var(--input-border)',
  borderRadius: 14,
  padding: '10px 14px',
  fontSize: 14,
  outline: 'none',
  backdropFilter: 'blur(8px)',
  WebkitBackdropFilter: 'blur(8px)',
  boxShadow: 'inset 0 1px 2px rgba(0, 0, 0, 0.02)',
  transition: 'all 0.15s ease'
};

export const lbl = {
  display: 'block',
  color: 'var(--text-secondary)',
  fontSize: 12,
  fontWeight: 700,
  margin: '12px 0 6px'
};

export const th = {
  padding: '12px 14px',
  fontWeight: 750,
  fontSize: 11,
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  color: 'var(--text-secondary)',
  background: 'var(--table-header-bg)',
  borderBottom: '1px solid var(--card-border)'
};

export const td = {
  padding: '14px 14px',
  verticalAlign: 'middle',
  borderBottom: '1px solid var(--card-border)'
};

export const btn = (color, outline = false) => ({
  background: outline ? 'var(--input-bg)' : `linear-gradient(135deg, ${color} 0%, ${color}dd 100%)`,
  color: outline ? color : '#ffffff',
  border: `1px solid ${outline ? 'var(--input-border)' : 'rgba(255, 255, 255, 0.3)'}`,
  borderRadius: 14,
  padding: '9px 16px',
  fontSize: 13,
  cursor: 'pointer',
  fontWeight: 650,
  boxShadow: outline ? '0 2px 6px rgba(15, 23, 42, 0.04)' : `0 4px 14px -2px ${color}55`,
  backdropFilter: outline ? 'blur(8px)' : 'none',
  WebkitBackdropFilter: outline ? 'blur(8px)' : 'none',
  letterSpacing: '0.01em',
});

export const btnSm = (color, outline = false) => ({
  ...btn(color, outline),
  padding: '6px 12px',
  fontSize: 12,
  borderRadius: 10
});
