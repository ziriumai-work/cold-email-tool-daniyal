// Reads the Spacemail inbox over IMAP and matches incoming replies to the
// drafts we sent — by In-Reply-To/References header (most reliable) or by the
// sender address matching a recipient we emailed. Records new replies and marks
// the draft as 'replied'.
import { ImapFlow } from 'imapflow';
import { all, run } from './db.js';
import { senderAccounts } from './senders.js';

function imapConfig(sender) {
  return {
    host: process.env.IMAP_HOST || sender.smtpHost || 'mail.spacemail.com',
    port: Number(process.env.IMAP_PORT || 993),
    secure: true,
    auth: {
      user: sender.imapUser || sender.smtpUser,
      pass: sender.imapPass || sender.smtpPass,
    },
    logger: false,
  };
}

export async function checkReplies({ days = 21 } = {}) {
  const accounts = senderAccounts();
  if (!accounts.length) {
    return { ok: false, error: 'IMAP not configured in .env.local' };
  }

  // Index the drafts we've sent so we can match replies to them.
  const sent = await all("SELECT id, company_id, message_id, subject, sent_at FROM drafts WHERE status IN ('sent', 'replied') AND sent_at IS NOT NULL");
  const companies = await all('SELECT id, contact_email FROM companies');
  const companyById = new Map(companies.map((c) => [c.id, c]));

  const byMsgId = new Map();
  const byEmail = new Map();
  for (const d of sent) {
    const company = companyById.get(d.company_id);
    const contactEmail = company?.contact_email;
    if (d.message_id) byMsgId.set(d.message_id.replace(/[<>]/g, '').toLowerCase(), d);
    if (contactEmail) {
      const k = contactEmail.toLowerCase();
      (byEmail.get(k) || byEmail.set(k, []).get(k)).push(d);
    }
  }

  const known = new Set(
    (await all('SELECT imap_message_id FROM replies WHERE imap_message_id IS NOT NULL'))
      .map((r) => r.imap_message_id)
  );
  const ourAddresses = new Set(accounts.map((a) => a.email.toLowerCase()));

function extractSnippet(msg) {
  try {
    if (!msg || !msg.source) return '';
    const src = msg.source.toString('utf8');
    let body = src;
    if (body.includes('Content-Type: text/plain')) {
      body = body.split('Content-Type: text/plain')[1] || body;
      const headerEnd = body.indexOf('\r\n\r\n');
      if (headerEnd !== -1) body = body.slice(headerEnd + 4);
    } else {
      const headerEnd = body.indexOf('\r\n\r\n');
      if (headerEnd !== -1) body = body.slice(headerEnd + 4);
    }
    if (body.includes('--')) body = body.split('--')[0];
    body = body.replace(/<[^>]+>/g, '').replace(/\r/g, '').trim();
    return body.slice(0, 600);
  } catch {
    return '';
  }
}

  let found = 0;
  for (const sender of accounts) {
    let client;
    let lock;
    const fetchedMsgs = [];
    try {
      client = new ImapFlow(imapConfig(sender));
      await client.connect();
      lock = await client.getMailboxLock('INBOX');
      const since = new Date(Date.now() - days * 24 * 3600 * 1000);
      let uids = [];
      try { uids = await client.search({ since }, { uid: true }); } catch { uids = []; }
      if (uids && uids.length) {
        const batchSize = 100;
        for (let i = 0; i < uids.length; i += batchSize) {
          const batch = uids.slice(i, i + batchSize);
          const rangeStr = batch.length === 1 ? String(batch[0]) : `${batch[0]}:${batch[batch.length - 1]}`;
          try {
            for await (const msg of client.fetch(rangeStr, { uid: true, envelope: true, headers: ['in-reply-to', 'references'] }, { uid: true })) {
              const env = msg.envelope || {};
              const imapMsgId = env.messageId || `${sender.email}:uid-${msg.uid}`;
              if (known.has(imapMsgId)) continue;

              const fromAddr = (env.from?.[0]?.address || '').toLowerCase();
              if (!fromAddr || ourAddresses.has(fromAddr)) continue; // skip our own / empty
              const subject = env.subject || '';
              const received = env.date ? new Date(env.date) : null;
              const hdr = (msg.headers ? msg.headers.toString() : '').toLowerCase();

              // 1) Strongest match: a referenced Message-ID we sent.
              let match = null;
              for (const [mid, d] of byMsgId) {
                if (mid && hdr.includes(mid)) { match = d; break; }
              }
              // 2) Fallback: from a recipient we emailed, arriving after we sent.
              if (!match && byEmail.has(fromAddr)) {
                const cands = byEmail.get(fromAddr)
                  .filter((d) => !received || !d.sent_at || received >= new Date(d.sent_at + 'Z'))
                  .sort((a, b) => String(b.sent_at || '').localeCompare(String(a.sent_at || '')));
                if (cands.length) match = cands[0];
              }
              if (!match) continue;

              // Fetch source for the matching email only
              let fullMsg = msg;
              try {
                fullMsg = await client.fetchOne(String(msg.uid), { uid: true, envelope: true, source: true }, { uid: true }) || msg;
              } catch {}

              fetchedMsgs.push({ msg: fullMsg, match, env, fromAddr, subject, received, imapMsgId });
            }
          } catch (batchErr) {
            console.warn(`IMAP batch fetch warning for ${sender.email}:`, batchErr?.message || batchErr);
          }
        }
      }
    } catch (err) {
      console.error(`IMAP error for ${sender.email}:`, err?.message || err);
    } finally {
      if (lock) {
        try { lock.release(); } catch {}
      }
      if (client) {
        try { await client.logout(); } catch {}
      }
    }

    // Process matched messages safely after IMAP connection is closed
    for (const item of fetchedMsgs) {
      const { msg, match, fromAddr, subject, received, imapMsgId } = item;
      const receivedSql = received ? received.toISOString().slice(0, 19).replace('T', ' ') : null;
      const snippetText = extractSnippet(msg);
      try {
        // Enterprise AI Reply Intelligence Classification
        const { classifyReplyIntent, handleAutonomousReplyAction } = await import('./aiReply.js');
        const { dispatchCrmWebhook } = await import('./crm.js');

        const intent = await classifyReplyIntent(subject, snippetText);
        const replyStatus = (intent.category || 'new').toLowerCase();

        const insertRes = await run(`INSERT INTO replies (draft_id, company_id, from_email, subject, snippet, imap_message_id, status, notes, received_at)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [match.id, match.company_id, fromAddr, subject, snippetText, imapMsgId, replyStatus, intent.recommendedAction || null, receivedSql]);

        await run("UPDATE drafts SET status = 'replied', replied_at = COALESCE(replied_at, datetime('now')) WHERE id = ?",
          [match.id]);

        const replyId = insertRes.lastInsertRowid;
        if (replyId) {
          await handleAutonomousReplyAction(replyId, match.company_id, fromAddr, intent.category, intent.summary);
        }

        dispatchCrmWebhook('reply.received', { draftId: match.id, companyId: match.company_id, from: fromAddr, category: intent.category, subject, snippet: snippetText });

        known.add(imapMsgId);
        found++;
      } catch (e) {
        /* unique constraint = already recorded or row error */
      }
    }
  }
  return { ok: true, found };
}

