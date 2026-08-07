import * as db from './db.js';

/**
 * Compute AI Lead Score (0-100) and conversion probability based on company profile signals & engagement history
 */
export async function computeLeadScore(company) {
  if (!company) {
    return {
      score: 50,
      conversionProb: 0.5,
      tier: 'Warm',
      signals: [],
      nextAction: 'Import lead contact details'
    };
  }

  let score = 50;
  const signals = [];

  // 1. Website presence
  if (company.website && company.website.includes('.')) {
    score += 10;
    signals.push({ name: 'Verified Business Domain', points: +10, type: 'positive' });
  } else {
    score -= 15;
    signals.push({ name: 'Missing Domain / Website', points: -15, type: 'negative' });
  }

  // 2. Email quality
  if (company.contact_email) {
    const isGeneric = ['@gmail.com', '@yahoo.com', '@hotmail.com', '@outlook.com', '@aol.com'].some((ext) =>
      company.contact_email.toLowerCase().endsWith(ext)
    );
    if (!isGeneric) {
      score += 15;
      signals.push({ name: 'Corporate Business Email', points: +15, type: 'positive' });
    } else {
      score += 5;
      signals.push({ name: 'Generic Provider Email', points: +5, type: 'neutral' });
    }
  } else {
    score -= 20;
    signals.push({ name: 'Missing Contact Email', points: -20, type: 'negative' });
  }

  // 3. Contact Enrichment Metadata
  if (company.phone) {
    score += 5;
    signals.push({ name: 'Phone Number Available', points: +5, type: 'positive' });
  }
  if (company.all_emails && company.all_emails.includes(',')) {
    score += 5;
    signals.push({ name: 'Multiple Verified Contacts', points: +5, type: 'positive' });
  }

  // 4. Past engagement & sentiment metrics from drafts and replies
  try {
    const draft = await db.get('SELECT * FROM drafts WHERE company_id = ? ORDER BY id DESC', [company.id]);
    if (draft) {
      if (draft.status === 'bounced' || draft.status === 'cancelled') {
        score -= 25;
        signals.push({ name: 'Outreach Bounced / Failed', points: -25, type: 'negative' });
      } else if (draft.status === 'replied' || draft.replied_at) {
        score += 30;
        signals.push({ name: 'Replied to Outreach', points: +30, type: 'positive' });

        // Check reply sentiment if reply record exists
        try {
          const reply = await db.get('SELECT * FROM replies WHERE company_id = ? OR draft_id = ? ORDER BY id DESC', [company.id, draft.id]);
          if (reply) {
            const bodyText = (reply.body || reply.snippet || '').toLowerCase();
            const sentiment = reply.ai_sentiment || reply.sentiment || '';

            if (sentiment === 'interested' || bodyText.includes('interested') || bodyText.includes('call') || bodyText.includes('demo') || bodyText.includes('pricing')) {
              score += 20;
              signals.push({ name: 'High-Intent Reply Sentiment', points: +20, type: 'positive' });
            } else if (sentiment === 'not_interested' || bodyText.includes('unsubscribe') || bodyText.includes('not interested') || bodyText.includes('stop')) {
              score -= 35;
              signals.push({ name: 'Opt-Out / Not Interested Sentiment', points: -35, type: 'negative' });
            }
          }
        } catch (e) {
          // Ignore reply lookup error
        }
      } else if (draft.clicked_at || (draft.click_count || 0) > 0) {
        score += 20;
        signals.push({ name: 'Clicked Email CTA Link', points: +20, type: 'positive' });
      } else if (draft.opened_at || (draft.open_count || 0) > 0) {
        score += 10;
        signals.push({ name: 'Opened Outreach Email', points: +10, type: 'positive' });
      } else if (draft.status === 'sent') {
        score += 5;
        signals.push({ name: 'Outreach Email Delivered', points: +5, type: 'positive' });
      }
    }
  } catch (err) {
    // Ignore db fetch error
  }

  score = Math.max(0, Math.min(100, Math.round(score)));
  const conversionProb = Math.round((score / 100) * 0.85 * 100) / 100;

  let tier = 'Cold';
  let nextAction = 'Send personalized initial outreach';
  if (score >= 70) {
    tier = 'Hot';
    nextAction = 'Priority Lead: Trigger direct phone call or meeting invite immediately.';
  } else if (score >= 40) {
    tier = 'Warm';
    nextAction = 'Active Lead: Schedule follow-up email with tailored case study.';
  } else {
    tier = 'Cold';
    nextAction = 'Low Intent: Re-engage with alternative value proposition & subject line.';
  }

  return {
    score,
    conversionProb,
    tier,
    signals,
    nextAction
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
    return { score: 50, conversionProb: 0.5, tier: 'Warm', signals: [], nextAction: 'Review lead data' };
  }
}

/**
 * Recalculate lead scores for all target companies in DB
 */
export async function rescoreAllLeads() {
  const companies = await db.all('SELECT id, name, website, contact_email FROM companies');
  const results = [];

  for (const c of companies) {
    const s = await getOrUpdateLeadScore(c.id);
    results.push({
      companyId: c.id,
      companyName: c.name,
      website: c.website,
      email: c.contact_email,
      ...s
    });
  }

  return results;
}

