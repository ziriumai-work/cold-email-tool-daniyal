// Background scheduler: every 30s, send any scheduled emails whose time has come.
import { all, run } from './db.js';
import { sendEmail } from './mailer.js';
import { checkReplies } from './replies.js';

export async function sendDueScheduled() {
  // Recover drafts left mid-send by a copy that was closed, so they retry.
  await run("UPDATE drafts SET status = 'scheduled' WHERE status = 'sending' AND scheduled_at <= datetime('now', '-5 minutes')");

  const drafts = await all("SELECT * FROM drafts WHERE status = 'scheduled' AND scheduled_at IS NOT NULL ORDER BY scheduled_at ASC LIMIT 25");
  const companies = await all('SELECT id, contact_email, name FROM companies');
  const companyById = new Map(companies.map((c) => [c.id, c]));
  const due = drafts.filter((d) => {
    if (!d.scheduled_at) return false;
    const scheduled = new Date(d.scheduled_at.replace(' ', 'T'));
    return scheduled <= new Date();
  });

  for (const d of due) {
    const company = companyById.get(d.company_id);
    if (!company?.contact_email) {
      await run("UPDATE drafts SET status = 'error', error = ? WHERE id = ?",
        ['No contact email at scheduled send time.', d.id]);
      continue;
    }
    // Atomic claim: only the instance that flips scheduled -> sending proceeds,
    // so multiple running copies can never send the same email twice.
    const claim = await run("UPDATE drafts SET status = 'sending' WHERE id = ? AND status = 'scheduled'", [d.id]);
    if (!claim.rowsAffected) continue; // another instance already grabbed it
    try {
      const res = await sendEmail({
        to: company.contact_email,
        subject: d.subject,
        body: d.body,
        senderKey: d.sender_key,
        senderEmail: d.sender_email,
        draftId: d.id,
      });
      await run("UPDATE drafts SET status = 'sent', sent_at = datetime('now'), error = NULL, message_id = ? WHERE id = ?",
        [res.messageId || null, d.id]);
      console.log(`[scheduler] sent draft ${d.id} to ${d.contact_email}`);
    } catch (e) {
      const msg = String(e.message || e);
      await run("UPDATE drafts SET status = 'error', error = ? WHERE id = ?", [msg, d.id]);
      console.error(`[scheduler] failed draft ${d.id}: ${msg}`);
    }
    await new Promise((r) => setTimeout(r, 2000)); // gentle throttle between sends
  }
  return due.length;
}

// Start a single polling loop per server process.
export function startScheduler() {
  const g = globalThis;
  if (g.__coldEmailScheduler) return;
  g.__coldEmailScheduler = setInterval(() => {
    sendDueScheduled().catch((e) => console.error('[scheduler] tick error', e));
  }, 30000);
  // First check shortly after boot.
  setTimeout(() => sendDueScheduled().catch(() => {}), 5000);

  // Poll the inbox for replies every 3 minutes.
  g.__coldEmailReplyPoller = setInterval(() => {
    checkReplies().then((r) => {
      if (r?.found) console.log(`[replies] ${r.found} new repl${r.found === 1 ? 'y' : 'ies'} detected`);
    }).catch((e) => console.error('[replies] poll error', e?.message || e));
  }, 180000);
  setTimeout(() => checkReplies().catch(() => {}), 15000);

  console.log('[scheduler] started (sends every 30s, reply check every 3m)');
}
