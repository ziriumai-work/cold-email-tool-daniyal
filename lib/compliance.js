import * as db from './db.js';

/**
 * Check if an email is suppressed (unsubscribed, bounced, or manually blacklisted).
 */
export async function isSuppressed(email) {
  if (!email) return false;
  try {
    const row = await db.get('SELECT id FROM suppression_list WHERE lower(email) = ?', [email.toLowerCase().trim()]);
    return !!row;
  } catch (err) {
    console.error('Error checking suppression list:', err.message);
    return false;
  }
}

/**
 * Add an email to the suppression list.
 */
export async function suppressEmail(email, reason = 'unsubscribed', source = 'user_action') {
  if (!email) return false;
  try {
    const cleanEmail = email.toLowerCase().trim();
    const existing = await isSuppressed(cleanEmail);
    if (existing) return true;

    await db.run(
      'INSERT INTO suppression_list (email, reason, source, created_at) VALUES (?, ?, ?, datetime(\'now\'))',
      [cleanEmail, reason, source]
    );

    // If company exists with this email, update status
    await db.run(
      "UPDATE drafts SET status = 'cancelled', error = 'Suppressed recipient' WHERE lower(company_id) IN (SELECT id FROM companies WHERE lower(contact_email) = ?)",
      [cleanEmail]
    );
    return true;
  } catch (err) {
    console.error('Error suppressing email:', err.message);
    return false;
  }
}

/**
 * Get all suppressed emails
 */
export async function getSuppressionList() {
  try {
    const rows = await db.all('SELECT * FROM suppression_list ORDER BY created_at DESC');
    return rows;
  } catch (err) {
    console.error('Error fetching suppression list:', err.message);
    return [];
  }
}

/**
 * Append standard Unsubscribe footer and compliance header
 */
export function appendComplianceFooter(htmlContent, recipientEmail, trackingId) {
  const unsubUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/compliance?action=unsubscribe&email=${encodeURIComponent(recipientEmail)}&t=${trackingId || ''}`;

  // For 1-to-1 cold emails, heavy HTML footers with 'CAN-SPAM' text and borders trigger Gmail's Promotions tab.
  // We use a clean, subtle plain-text style opt-out link for high deliverability.
  const isMarketing = process.env.ENABLE_MARKETING_FOOTER === 'true';

  const footerHtml = isMarketing
    ? `
      <br/><br/>
      <div style="font-size: 11px; color: #888888; border-top: 1px solid #eeeeee; padding-top: 10px; margin-top: 20px; font-family: sans-serif;">
        If you no longer wish to receive these communications, you may <a href="${unsubUrl}" style="color: #666666; text-decoration: underline;">unsubscribe here</a>.
        <br/>
        Sent in compliance with CAN-SPAM & GDPR requirements.
      </div>
    `
    : `
      <br/><br/>
      <span style="font-size: 11px; color: #999999; font-family: sans-serif;">
        If you'd prefer not to receive future emails, you can <a href="${unsubUrl}" style="color: #999999; text-decoration: underline;">opt out here</a>.
      </span>
    `;

  const footerText = `\n\nOpt-out: ${unsubUrl}`;

  return {
    html: htmlContent + footerHtml,
    text: footerText,
    unsubscribeUrl: unsubUrl
  };
}
