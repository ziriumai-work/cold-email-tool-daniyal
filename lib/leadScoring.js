import * as db from './db.js';

/**
 * Compute AI Lead Score (0-100) and conversion probability based on company profile signals & engagement history
 */
export async function computeLeadScore(company) {
  if (!company) return { score: 50, conversionProb: 0.5, signals: [] };

  let score = 50;
  const signals = [];

  // 1. Website presence
  if (company.website && company.website.includes('.')) {
    score += 10;
    signals.push({ name: 'Verified Domain', points: +10 });
  } else {
    score -= 15;
    signals.push({ name: 'Missing Website', points: -15 });
  }

  // 2. Email quality
  if (company.contact_email) {
    if (!company.contact_email.endsWith('@gmail.com') && !company.contact_email.endsWith('@yahoo.com')) {
      score += 15;
      signals.push({ name: 'Business Email Address', points: +15 });
    } else {
      score += 5;
      signals.push({ name: 'Generic Email Address', points: +5 });
    }
  }

  // 3. Past engagement metrics if drafts exist
  try {
    const draft = await db.get('SELECT * FROM drafts WHERE company_id = ? ORDER BY id DESC', [company.id]);
    if (draft) {
      if (draft.status === 'replied' || draft.replied_at) {
        score += 30;
        signals.push({ name: 'Replied to Outreach', points: +30 });
      } else if (draft.clicked_at || (draft.click_count || 0) > 0) {
        score += 20;
        signals.push({ name: 'Clicked Email Link', points: +20 });
      } else if (draft.opened_at || (draft.open_count || 0) > 0) {
        score += 10;
        signals.push({ name: 'Opened Outreach Email', points: +10 });
      }
    }
  } catch (err) {
    // Ignore db fetch error
  }

  score = Math.max(0, Math.min(100, Math.round(score)));
  const conversionProb = Math.round((score / 100) * 0.85 * 100) / 100;

  return {
    score,
    conversionProb,
    signals
  };
}

/**
 * Get or calculate lead score for company and persist
 */
export async function getOrUpdateLeadScore(companyId) {
  try {
    const company = await db.get('SELECT * FROM companies WHERE id = ?', [companyId]);
    if (!company) return null;

    const scored = await computeLeadScore(company);

    const existing = await db.get('SELECT * FROM lead_scores WHERE company_id = ?', [companyId]);
    if (existing) {
      await db.run(
        `UPDATE lead_scores 
         SET score = ?, conversion_prob = ?, signals_json = ?, updated_at = datetime('now') 
         WHERE company_id = ?`,
        [scored.score, scored.conversionProb, JSON.stringify(scored.signals), companyId]
      );
    } else {
      await db.run(
        `INSERT INTO lead_scores (company_id, score, conversion_prob, signals_json, updated_at) 
         VALUES (?, ?, ?, ?, datetime('now'))`,
        [companyId, scored.score, scored.conversionProb, JSON.stringify(scored.signals)]
      );
    }

    return scored;
  } catch (err) {
    console.error('Error updating lead score:', err.message);
    return { score: 50, conversionProb: 0.5, signals: [] };
  }
}
