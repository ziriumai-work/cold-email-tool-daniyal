import * as db from './db.js';

/**
 * Get or create A/B Test for a given draft
 */
export async function getOrCreateAbTest(draftId, variantASubject, variantBSubject, variantABody, variantBBody) {
  try {
    const existing = await db.get('SELECT * FROM ab_tests WHERE draft_id = ?', [draftId]);
    if (existing) return existing;

    const metrics = JSON.stringify({
      variantA: { sent: 0, opened: 0, clicked: 0, replied: 0 },
      variantB: { sent: 0, opened: 0, clicked: 0, replied: 0 }
    });

    const res = await db.run(
      `INSERT INTO ab_tests 
       (name, draft_id, variant_a_subject, variant_b_subject, variant_a_body, variant_b_body, winner, metrics_json, created_at) 
       VALUES (?, ?, ?, ?, ?, ?, 'pending', ?, datetime('now'))`,
      [`A/B Test #${draftId}`, draftId, variantASubject, variantBSubject, variantABody, variantBBody, metrics]
    );
    return await db.get('SELECT * FROM ab_tests WHERE draft_id = ?', [draftId]);
  } catch (err) {
    console.error('Error creating A/B test:', err.message);
    return null;
  }
}

/**
 * Pick variant for sending (alternates A and B or uses winner)
 */
export async function resolveAbVariant(draftId) {
  try {
    const abTest = await db.get('SELECT * FROM ab_tests WHERE draft_id = ?', [draftId]);
    if (!abTest) return null;

    if (abTest.winner === 'A') {
      return { variant: 'A', subject: abTest.variant_a_subject, body: abTest.variant_a_body };
    }
    if (abTest.winner === 'B') {
      return { variant: 'B', subject: abTest.variant_b_subject, body: abTest.variant_b_body };
    }

    const metrics = abTest.metrics_json ? JSON.parse(abTest.metrics_json) : { variantA: { sent: 0 }, variantB: { sent: 0 } };
    const pickVariant = metrics.variantA.sent <= metrics.variantB.sent ? 'A' : 'B';

    return {
      variant: pickVariant,
      subject: pickVariant === 'A' ? abTest.variant_a_subject : abTest.variant_b_subject,
      body: pickVariant === 'A' ? abTest.variant_a_body : abTest.variant_b_body
    };
  } catch (err) {
    console.error('Error resolving A/B variant:', err.message);
    return null;
  }
}

/**
 * Update A/B metrics and evaluate auto-winner
 */
export async function updateAbMetric(draftId, variant, metricType) {
  try {
    const abTest = await db.get('SELECT * FROM ab_tests WHERE draft_id = ?', [draftId]);
    if (!abTest) return;

    const metrics = abTest.metrics_json ? JSON.parse(abTest.metrics_json) : { variantA: {}, variantB: {} };
    const key = variant === 'A' ? 'variantA' : 'variantB';

    metrics[key][metricType] = (metrics[key][metricType] || 0) + 1;

    let winner = abTest.winner;
    const totalSent = (metrics.variantA.sent || 0) + (metrics.variantB.sent || 0);

    // Auto promote winner after 10 sends if reply rate or open rate is higher by 20%
    if (totalSent >= 10 && winner === 'pending') {
      const aRate = (metrics.variantA.opened || 0) / (metrics.variantA.sent || 1);
      const bRate = (metrics.variantB.opened || 0) / (metrics.variantB.sent || 1);
      if (aRate > bRate + 0.15) winner = 'A';
      else if (bRate > aRate + 0.15) winner = 'B';
    }

    await db.run(
      'UPDATE ab_tests SET metrics_json = ?, winner = ? WHERE draft_id = ?',
      [JSON.stringify(metrics), winner, draftId]
    );
  } catch (err) {
    console.error('Error updating A/B metrics:', err.message);
  }
}
