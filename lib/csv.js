// Tiny dependency-free CSV parser. Handles quoted fields, commas, and
// escaped double-quotes ("") inside quotes. Returns an array of row objects
// keyed by a normalized header.
export function parseCsv(text) {
  const rows = [];
  let field = '';
  let row = [];
  let inQuotes = false;

  text = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else field += c;
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ',') {
      row.push(field); field = '';
    } else if (c === '\n') {
      row.push(field); rows.push(row); field = ''; row = [];
    } else {
      field += c;
    }
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }

  const nonEmpty = rows.filter((r) => r.some((v) => v.trim() !== ''));
  if (nonEmpty.length === 0) return [];

  const header = nonEmpty[0].map((h) => normalizeKey(h));
  return nonEmpty.slice(1).map((r) => {
    const obj = {};
    header.forEach((key, idx) => { obj[key] = (r[idx] ?? '').trim(); });
    return obj;
  });
}

// Map various header spellings to our canonical fields.
function normalizeKey(h) {
  const k = h.trim().toLowerCase().replace(/[\s_-]+/g, '');
  if (['company', 'companyname', 'name', 'business'].includes(k)) return 'name';
  if (['website', 'url', 'site', 'web', 'domain'].includes(k)) return 'website';
  if (['email', 'contactemail', 'contact', 'mail'].includes(k)) return 'contact_email';
  if (['phone', 'phonenumber', 'number', 'contactnumber', 'tel', 'telephone', 'mobile'].includes(k)) return 'phone';
  return k;
}
