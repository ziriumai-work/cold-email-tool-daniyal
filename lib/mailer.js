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

import { isSuppressed, appendComplianceFooter } from './compliance.js';
import { dispatchCrmWebhook } from './crm.js';

export async function sendEmail({ to, subject, body, senderKey, senderEmail, draftId }) {
  if (!to) throw new Error('No recipient email address.');

  // Enterprise Compliance Check: Never send to suppressed emails
  const suppressed = await isSuppressed(to);
  if (suppressed) {
    if (draftId) {
      try {
        await run("UPDATE drafts SET status = 'cancelled', error = 'Recipient is suppressed (Unsubscribed/Bounced)' WHERE id = ?", [draftId]);
      } catch {}
    }
    throw new Error(`Recipient ${to} is in the suppression list.`);
  }

  const sender = findSender(senderKey || senderEmail);
  const fromEmail = sender.email;
  const from = `"${sender.name || ''}" <${fromEmail}>`;
  const trackingId = randomUUID();

  // Deliverability: List-Unsubscribe header
  const unsubMailto = `mailto:${fromEmail}?subject=unsubscribe`;

  // Append signature
  const sig = await signatureData(sender);
  const sigText = signatureText(sig);
  const sigHtml = signatureHtml(sig);
  let text = sigText ? `${String(body).trim()}\n\n${sigText}` : body;
  let html = toHtml(body) + sigHtml;

  // Append Enterprise Compliance Footer
  const compliance = appendComplianceFooter(html, to, trackingId);
  html = compliance.html;
  text += compliance.text;

  if (draftId) {
    try {
      await run('UPDATE drafts SET tracking_id = ? WHERE id = ?', [trackingId, draftId]);
    } catch {
      // Keep sending even if tracking persistence fails.
    }
  }

  // High-Deliverability Inbox Optimization:
  // 1. Gmail automatically flags emails with 'List-Unsubscribe' headers as Promotional/Bulk.
  //    For 1-to-1 B2B cold outreach, omit these bulk headers unless explicitly enabled.
  const headers = {};
  if (process.env.ENABLE_BULK_HEADERS === 'true') {
    const unsubMailto = `mailto:${fromEmail}?subject=unsubscribe`;
    headers['List-Unsubscribe'] = `<${compliance.unsubscribeUrl}>, <${unsubMailto}>`;
    headers['List-Unsubscribe-Post'] = 'List-Unsubscribe=One-Click';
  }

  // 2. Open/Click tracking pixels & redirected links trigger Gmail Promotions & Spam filters.
  //    Only inject tracking if explicitly enabled in env (ENABLE_EMAIL_TRACKING=true).
  const baseUrl = process.env.APP_BASE_URL?.trim();
  const enableTracking = process.env.ENABLE_EMAIL_TRACKING === 'true';
  if (draftId && baseUrl && enableTracking) {
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
    headers,
  };
  const att = logoAttachment(sig);
  if (att) mail.attachments = [att];

  const info = await transporter(sender).sendMail(mail);

  if (draftId) {
    try {
      await run("UPDATE drafts SET status = 'sent', sent_at = datetime('now'), message_id = ?, error = NULL WHERE id = ?", [info.messageId || null, draftId]);
    } catch {
      // Keep going even if status update fails.
    }
  }

  // Dispatch CRM Webhook event
  dispatchCrmWebhook('email.sent', { draftId, to, from: fromEmail, subject, messageId: info.messageId });

  return { messageId: info.messageId, accepted: info.accepted, rejected: info.rejected };
}

