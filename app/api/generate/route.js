import { get, run } from '../../../lib/db.js';
import { generateDraft } from '../../../lib/generate.js';
import { findSender } from '../../../lib/senders.js';

export const runtime = 'nodejs';
export const maxDuration = 60; // crawl + AI call can be slow

// Generate a personalized draft for one company.
// Body: { companyId, offer }
export async function POST(req) {
  try {
    const { companyId, offer, mode, customPrompt, senderKey } = await req.json();
    if (!companyId) return Response.json({ error: 'companyId required' }, { status: 400 });

    const useMode = mode === 'custom' ? 'custom' : 'ai';
    if (useMode === 'custom') {
      if (!customPrompt || !customPrompt.trim()) {
        return Response.json({ error: 'Please write your custom prompt first.' }, { status: 400 });
      }
    } else if (!offer || !offer.trim()) {
      return Response.json({ error: 'Please enter what you are pitching (the offer).' }, { status: 400 });
    }

    const company = await get('SELECT * FROM companies WHERE id = ?', [companyId]);
    if (!company) return Response.json({ error: 'Company not found' }, { status: 404 });

    const sender = findSender(senderKey);

    const result = await generateDraft({ company, offer, sender, mode: useMode, customPrompt });

    // Record what drove this draft (the offer, or the custom prompt).
    const instructions = useMode === 'custom' ? customPrompt : offer;
    const info = await run(`
      INSERT INTO drafts (company_id, subject, body, research_summary, offer, status, sender_key, sender_name, sender_email)
      VALUES (?, ?, ?, ?, ?, 'pending', ?, ?, ?)
    `, [company.id, result.subject, result.body, result.research_summary, instructions, sender.key, sender.name, sender.email]);

    const draft = await get('SELECT * FROM drafts WHERE id = ?', [Number(info.lastInsertRowid)]);
    return Response.json({
      draft,
      site_ok: result.site_ok,
      site_note: result.site_note,
      pages_crawled: result.pages_crawled,
      weak_points: result.weak_points,
    });
  } catch (e) {
    return Response.json({ error: String(e.message || e) }, { status: 500 });
  }
}
