import { createRequire } from 'module';
import { parseCsv } from './csv.js';

const require = createRequire(import.meta.url);

// Map various header spellings to canonical keys
export function normalizeKey(h) {
  if (!h) return '';
  const k = String(h).trim().toLowerCase().replace(/[\s_-]+/g, '');
  if (['company', 'companyname', 'name', 'business', 'businessname', 'organization', 'org', 'leadname', 'contactname', 'fullname', 'firstname', 'lastname', 'clientname', 'account'].includes(k)) return 'name';
  if (['website', 'url', 'site', 'web', 'domain', 'link', 'webpage', 'companyurl', 'companywebsite'].includes(k)) return 'website';
  if (
    ['email', 'emails', 'contactemail', 'contact', 'mail', 'emailaddress', 'emailaddresses', 'primaryemail', 'workemail', 'businessemail', 'leademail', 'directemail', 'personalemail', 'targetemail', 'recipientemail', 'email1', 'email2', 'emailid', 'mailid', 'contactmail', 'contactemailaddress', 'useremail', 'clientemail'].includes(k) ||
    k.includes('email') ||
    k.endsWith('mail')
  ) return 'contact_email';
  if (['phone', 'phonenumber', 'number', 'contactnumber', 'tel', 'telephone', 'mobile', 'cell', 'phone1', 'mobilephone'].includes(k) || k.includes('phone') || k.includes('mobile')) return 'phone';
  return k;
}

const EMAIL_STRICT_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function deriveFallbackName(email, website = '') {
  if (website) {
    const host = String(website).replace(/^https?:\/\//i, '').replace(/^www\./i, '').split('/')[0].split(':')[0];
    const parts = host.split('.');
    if (parts.length >= 2) {
      const brand = parts[parts.length - 2];
      if (brand && brand.length > 1) {
        return brand.charAt(0).toUpperCase() + brand.slice(1);
      }
    }
  }
  if (email && email.includes('@')) {
    const [local, domain] = email.split('@');
    const cleanLocal = local.replace(/[\._\-\+]+/g, ' ').trim();
    if (cleanLocal && !['admin', 'contact', 'info', 'support', 'sales', 'hello', 'office', 'help', 'team', 'mail'].includes(cleanLocal.toLowerCase())) {
      return cleanLocal
        .split(' ')
        .filter(Boolean)
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join(' ');
    }
    if (domain) {
      const domBrand = domain.split('.')[0];
      if (domBrand && domBrand.length > 1) {
        return domBrand.charAt(0).toUpperCase() + domBrand.slice(1);
      }
    }
  }
  return 'Lead';
}

const URL_PATTERN = /(https?:\/\/[^\s]+|(?:www\.)[a-zA-Z0-9-]+\.[a-zA-Z]{2,}(?:\/[^\s]*)?)/i;
const PHONE_PATTERN = /^[+\d\s\(\)\.-]{7,20}$/;

// Convert raw extracted objects or rows to canonical company row
export function canonicalizeRow(rawRow) {
  if (!rawRow || typeof rawRow !== 'object') {
    return { name: '', website: '', contact_email: '', phone: '' };
  }

  const obj = { name: '', website: '', contact_email: '', phone: '' };

  // Pass 1: Header key matching
  for (const [key, val] of Object.entries(rawRow)) {
    if (val === null || val === undefined) continue;
    const strVal = String(val).trim();
    if (!strVal) continue;
    const normKey = normalizeKey(key);
    if (['name', 'website', 'contact_email', 'phone'].includes(normKey)) {
      if (!obj[normKey]) obj[normKey] = strVal;
    }
  }

  // Pass 2: Fallback value scanning for email, website, and phone if missing
  for (const [key, val] of Object.entries(rawRow)) {
    if (val === null || val === undefined) continue;
    const strVal = String(val).trim();
    if (!strVal) continue;

    if ((!obj.contact_email || !EMAIL_STRICT_REGEX.test(obj.contact_email)) && EMAIL_STRICT_REGEX.test(strVal)) {
      obj.contact_email = strVal;
    } else if (!obj.website && URL_PATTERN.test(strVal) && !EMAIL_STRICT_REGEX.test(strVal)) {
      obj.website = strVal;
    } else if (!obj.phone && PHONE_PATTERN.test(strVal) && !EMAIL_STRICT_REGEX.test(strVal) && !URL_PATTERN.test(strVal) && strVal.replace(/\D/g, '').length >= 7) {
      obj.phone = strVal;
    }
  }

  // Pass 3: Fallback name generation if name is missing but contact_email exists
  if (!obj.name && obj.contact_email && EMAIL_STRICT_REGEX.test(obj.contact_email)) {
    obj.name = deriveFallbackName(obj.contact_email, obj.website);
  }

  return obj;
}

// Parse unstructured or line-based text (from PDF / DOCX) into company rows
export function parseUnstructuredText(text) {
  if (!text || typeof text !== 'string') return [];
  const lines = text.split(/\r\n|\r|\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length === 0) return [];

  // Check if first line looks like a CSV header
  if (lines[0].includes(',') && (lines[0].toLowerCase().includes('name') || lines[0].toLowerCase().includes('email') || lines[0].toLowerCase().includes('website'))) {
    const csvContent = lines.join('\n');
    const parsed = parseCsv(csvContent);
    if (parsed.length > 0) return parsed.map(canonicalizeRow);
  }

  const emailRegex = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i;
  const urlRegex = /(https?:\/\/[^\s]+|(?:www\.)[a-zA-Z0-9-]+\.[a-zA-Z]{2,}(?:\/[^\s]*)?)/i;
  const phoneRegex = /(?:\+?\d{1,3}[\s.-]?)?\(?\d{2,5}\)?[\s.-]?\d{3,5}[\s.-]?\d{3,5}/;

  const rows = [];
  let current = null;

  for (const line of lines) {
    const emailMatch = line.match(emailRegex);
    const urlMatch = line.match(urlRegex);
    const phoneMatch = line.match(phoneRegex);

    const kvMatch = line.match(/^(company|name|business|website|site|url|email|mail|phone|tel)\s*[:=-]\s*(.+)$/i);
    if (kvMatch) {
      const key = normalizeKey(kvMatch[1]);
      const val = kvMatch[2].trim();
      if (key === 'name' || (key === 'company' && current && current.name)) {
        if (current && current.name) rows.push(current);
        current = { name: val, website: '', contact_email: '', phone: '' };
      } else if (current) {
        if (['website', 'contact_email', 'phone'].includes(key)) current[key] = val;
      } else if (key === 'name') {
        current = { name: val, website: '', contact_email: '', phone: '' };
      }
      continue;
    }

    if (emailMatch || urlMatch || phoneMatch) {
      if (!current) {
        let nameCandidate = line
          .replace(emailRegex, '')
          .replace(urlRegex, '')
          .replace(phoneRegex, '')
          .replace(/[,|:;-]/g, ' ')
          .trim();
        current = {
          name: nameCandidate || (urlMatch ? urlMatch[0].replace(/^https?:\/\//i, '').replace(/^www\./i, '').split('.')[0] : 'Lead'),
          website: urlMatch ? urlMatch[0] : '',
          contact_email: emailMatch ? emailMatch[1] : '',
          phone: phoneMatch ? phoneMatch[0] : '',
        };
      } else {
        if (urlMatch && !current.website) current.website = urlMatch[0];
        if (emailMatch && !current.contact_email) current.contact_email = emailMatch[1];
        if (phoneMatch && !current.phone) current.phone = phoneMatch[0];
      }
      rows.push(current);
      current = null;
    } else if (line.length > 2 && line.length < 80 && !/^(page|table|header|footer|\d+$)/i.test(line)) {
      if (current && current.name) rows.push(current);
      current = { name: line, website: '', contact_email: '', phone: '' };
    }
  }

  if (current && current.name) rows.push(current);
  return rows.filter((r) => r.name && r.name.length > 1);
}

// Master parser function taking file buffer & filename
export async function parseUploadedFile(buffer, fileName) {
  const ext = (fileName.split('.').pop() || '').toLowerCase();

  if (ext === 'csv') {
    const text = buffer.toString('utf-8');
    const rawRows = parseCsv(text);
    return rawRows.map(canonicalizeRow);
  }

  if (ext === 'txt') {
    const text = buffer.toString('utf-8');
    return parseUnstructuredText(text);
  }

  if (ext === 'xlsx' || ext === 'xls') {
    const XLSX = require('xlsx');
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) return [];
    const worksheet = workbook.Sheets[sheetName];
    const rawRows = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
    return rawRows.map((r) => {
      const normObj = {};
      for (const [k, v] of Object.entries(r)) {
        normObj[normalizeKey(k)] = v;
      }
      return canonicalizeRow(normObj);
    });
  }

  if (ext === 'pdf') {
    const pdfParse = require('pdf-parse');
    const pdfData = await pdfParse(buffer);
    const text = pdfData.text || '';
    return parseUnstructuredText(text);
  }

  if (ext === 'docx') {
    const mammoth = require('mammoth');
    const result = await mammoth.extractRawText({ buffer });
    const text = result.value || '';
    return parseUnstructuredText(text);
  }

  throw new Error(`Unsupported file type: .${ext}. Supported formats: CSV, Excel (.xlsx/.xls), PDF (.pdf), Word (.docx).`);
}
