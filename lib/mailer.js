// Sends email through Spacemail SMTP using the same settings we tested in Phase 0.
import { randomUUID } from 'node:crypto';
import nodemailer from 'nodemailer';
import { run } from './db.js';
import { signatureData, signatureText, signatureHtml, logoAttachment } from './signature.js';
import { findSender } from './senders.js';

function build(sender) {
  return nodemailer.createTransport({
    host: sender.smtpHost,
    port: sender.smtpPort,
    secure: sender.smtpSecure,
    auth: { user: sender.smtpUser, pass: sender.smtpPass },
  });
}

// Reuse transporters across hot reloads, one per sender account.
const g = globalThis;
function transporter(sender) {
  g.__coldEmailTransporters ??= new Map();
  const key = sender.key || sender.email;
  if (!g.__coldEmailTransporters.has(key)) g.__coldEmailTransporters.set(key, build(sender));
  return g.__coldEmailTransporters.get(key);
}

// Convert plain-text body (with line breaks) into simple HTML.
function toHtml(text) {
  const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return esc(text).replace(/\n/g, '<br>');
}

function injectTracking(html, trackingId, baseUrl) {
  if (!html || !trackingId || !baseUrl) return html;

  const tracked = html.replace(/href="(https?:\/\/[^"]+)"/g, (match, originalUrl) => {
    const target = `${baseUrl.replace(/\/+$/, '')}/api/track/click?id=${encodeURIComponent(trackingId)}&dest=${encodeURIComponent(originalUrl)}`;
    return `href="${target}"`;
  });

  const pixel = `<img src="${baseUrl.replace(/\/+$/, '')}/api/track/open?id=${encodeURIComponent(trackingId)}" width="1" height="1" style="display:none" alt="">`;
  if (tracked.includes('</table>')) {
    return tracked.replace(/<\/table>(?![\s\S]*<\/table>)/i, `${pixel}</table>`);
  }
  return tracked + pixel;
}

export async function sendEmail({ to, subject, body, senderKey, senderEmail, draftId }) {
  if (!to) throw new Error('No recipient email address.');
  const sender = findSender(senderKey || senderEmail);
  const fromEmail = sender.email;
  const from = `"${sender.name || ''}" <${fromEmail}>`;
  const trackingId = randomUUID();

  // Deliverability: a List-Unsubscribe header (mailto) is a strong trust signal
  // for Gmail/Yahoo and is effectively required for outreach at any volume.
  const unsubMailto = `mailto:${fromEmail}?subject=unsubscribe`;

  // Append the configured signature (plain text + rich HTML with embedded logo).
  const sig = await signatureData(sender);
  const sigText = signatureText(sig);
  const sigHtml = signatureHtml(sig);
  const text = sigText ? `${String(body).trim()}\n\n${sigText}` : body;
  let html = toHtml(body) + sigHtml;

  if (draftId) {
    try {
      await run('UPDATE drafts SET tracking_id = ? WHERE id = ?', [trackingId, draftId]);
    } catch {
      // Keep sending even if tracking persistence fails.
    }
  }

  const baseUrl = process.env.APP_BASE_URL?.trim();
  if (draftId && baseUrl) {
    try {
      html = injectTracking(html, trackingId, baseUrl);
    } catch {
      // Keep sending even if tracking injection fails.
    }
  }

  const mail = {
    from,
    to,
    subject,
    text,
    html,
    headers: { 'List-Unsubscribe': `<${unsubMailto}>` },
  };
  const att = logoAttachment(sig);
  if (att) mail.attachments = [att];

  const info = await transporter(sender).sendMail(mail);
  return { messageId: info.messageId, accepted: info.accepted, rejected: info.rejected };
}
