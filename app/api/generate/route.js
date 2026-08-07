import { get, all, run, runBulkInsert } from '../../../lib/db.js';
import { generateDraft } from '../../../lib/generate.js';
import { findSender } from '../../../lib/senders.js';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function GET() {
  return Response.json(
    { error: 'GET method is not allowed on /api/generate. Use POST with JSON body { companyId, customPrompt } to generate emails.' },
    { status: 405 }
  );
}

// Generate custom draft(s) for single company or all pending companies.
// Body: { companyId, generateAll, customPrompt, offer, senderKey }
export async function POST(req) {
  try {
    const { companyId, generateAll, offer, customPrompt, customSubject, senderKey, useExactText, autoSend } = await req.json();
    const isBatch = generateAll || companyId === 'all';

    if (!isBatch && !companyId) {
      return Response.json({ error: 'companyId required' }, { status: 400 });
    }

    const promptText = (customPrompt || offer || '').trim();
    if (!promptText) {
      return Response.json({ error: 'Please enter your email content or prompt first.' }, { status: 400 });
    }

    const sender = findSender(senderKey);

    // If exact text mode is selected, bypass DeepSeek AI generation
    let result;
    if (useExactText) {
      let subject = (customSubject || '').trim();
      let body = promptText;

      // Extract subject line if user typed "Subject: ..." on the first line
      if (!subject) {
        const match = body.match(/^subject\s*:\s*(.+)$/im);
        if (match) {
          subject = match[1].trim();
          body = body.replace(/^subject\s*:\s*.+(\r?\n)*/i, '').trim();
        } else {
          subject = 'Cold Outreach';
        }
      }

      result = {
        subject: subject || 'Cold Outreach',
        body: body || promptText,
        research_summary: '(Exact user-entered email)',
        site_ok: null,
        site_note: '',
        pages_crawled: 0,
        signals: [],
        weak_points: [],
      };
    } else {
      if (!process.env.DEEPSEEK_API_KEY || process.env.DEEPSEEK_API_KEY === 'sk-xxxxxxxx') {
        return Response.json({ error: 'DEEPSEEK_API_KEY is not set in .env.local. Please add your DeepSeek API key to .env.local.' }, { status: 400 });
      }
    }

    if (isBatch) {
      let targetCompanies = await all(`
        SELECT c.* FROM companies c 
        LEFT JOIN drafts d ON d.company_id = c.id AND d.status IN ('approved', 'scheduled', 'sent')
        WHERE d.id IS NULL
      `);

      if (!targetCompanies || targetCompanies.length === 0) {
        targetCompanies = await all('SELECT * FROM companies');
      }

      if (!targetCompanies || targetCompanies.length === 0) {
        return Response.json({ error: 'No companies found in database. Please upload companies first.' }, { status: 400 });
      }

      if (!useExactText) {
        result = await generateDraft({ company: null, offer: promptText, sender, mode: 'custom', customPrompt: promptText });
      }

      // Clean up un-sent drafts for target companies
      for (const comp of targetCompanies) {
        await run("DELETE FROM drafts WHERE company_id = ? AND status IN ('pending', 'rejected', 'error')", [comp.id]);
      }

      // Insert uniform draft for each company
      const rowsToInsert = targetCompanies.map((comp) => ({
        company_id: comp.id,
        subject: result.subject,
        body: result.body,
        research_summary: result.research_summary || '(Exact user-entered email)',
        offer: promptText,
        status: autoSend ? 'approved' : 'pending',
        sender_key: sender.key,
        sender_name: sender.name,
        sender_email: sender.email,
      }));

      await runBulkInsert('drafts', rowsToInsert);

      const insertedDrafts = await all(`
        SELECT d.*, c.name AS company_name, c.website, c.contact_email 
        FROM drafts d 
        JOIN companies c ON c.id = d.company_id 
        ORDER BY d.id DESC LIMIT ?
      `, [targetCompanies.length]);

      return Response.json({
        success: true,
        count: targetCompanies.length,
        subject: result.subject,
        body: result.body,
        drafts: insertedDrafts,
      });
    }

    // Single company draft generation
    const company = await get('SELECT * FROM companies WHERE id = ?', [companyId]);
    if (!company) return Response.json({ error: 'Company not found' }, { status: 404 });

    // Clean up any un-sent draft for this company before creating a fresh draft
    await run("DELETE FROM drafts WHERE company_id = ? AND status IN ('pending', 'rejected', 'error')", [company.id]);

    if (!useExactText) {
      result = await generateDraft({ company, offer: promptText, sender, mode: 'custom', customPrompt: promptText });
    }

    const draftStatus = autoSend ? 'approved' : 'pending';

    const info = await run(`
      INSERT INTO drafts (company_id, subject, body, research_summary, offer, status, sender_key, sender_name, sender_email)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [company.id, result.subject, result.body, result.research_summary, promptText, draftStatus, sender.key, sender.name, sender.email]);

    const draft = await get('SELECT * FROM drafts WHERE id = ?', [Number(info.lastInsertRowid)]);
    const fullDraft = {
      ...draft,
      company_name: company?.name ?? null,
      website: company?.website ?? null,
      contact_email: company?.contact_email ?? null,
    };
    return Response.json({
      draft: fullDraft,
      site_ok: result.site_ok,
      site_note: result.site_note,
      pages_crawled: result.pages_crawled,
      weak_points: result.weak_points,
    });
  } catch (e) {
    return Response.json({ error: String(e.message || e) }, { status: 500 });
  }
}
