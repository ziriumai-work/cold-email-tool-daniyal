import * as db from './db.js';

/**
 * Compute financial ROI and revenue attribution metrics
 */
export async function getRevenueAttributionMetrics() {
  try {
    const totalSentRow = await db.get("SELECT COUNT(*) as count FROM drafts WHERE status = 'sent'");
    const totalSent = totalSentRow?.count || 0;

    const totalRepliesRow = await db.get("SELECT COUNT(*) as count FROM replies");
    const totalReplies = totalRepliesRow?.count || 0;

    const interestedRepliesRow = await db.get("SELECT COUNT(*) as count FROM replies WHERE status = 'interested' OR notes LIKE '%Interested%'");
    const interestedReplies = interestedRepliesRow?.count || 0;

    // Unit Cost Estimates
    const smtpCostPerEmail = 0.002; // $0.002 per sent email
    const aiCostPerDraft = 0.005;  // $0.005 per AI research & draft generation
    const dealValuePerMeeting = 1500; // $1,500 estimated deal pipeline value per qualified meeting

    const totalSmtpCost = Math.round(totalSent * smtpCostPerEmail * 100) / 100;
    const totalAiCost = Math.round(totalSent * aiCostPerDraft * 100) / 100;
    const totalCost = Math.round((totalSmtpCost + totalAiCost) * 100) / 100;

    const costPerReply = totalReplies > 0 ? Math.round((totalCost / totalReplies) * 100) / 100 : 0;
    const costPerMeeting = interestedReplies > 0 ? Math.round((totalCost / interestedReplies) * 100) / 100 : 0;

    const estimatedPipelineRevenue = interestedReplies * dealValuePerMeeting;
    const netProfit = Math.round((estimatedPipelineRevenue - totalCost) * 100) / 100;
    const netRoiPct = totalCost > 0 ? Math.round(((estimatedPipelineRevenue - totalCost) / totalCost) * 100) : 0;
    const roiMultiplier = totalCost > 0 ? (estimatedPipelineRevenue / totalCost).toFixed(1) : '0.0';
    const replyRatePct = totalSent > 0 ? Math.round((totalReplies / totalSent) * 1000) / 10 : 0;
    const meetingConversionRatePct = totalReplies > 0 ? Math.round((interestedReplies / totalReplies) * 1000) / 10 : 0;

    return {
      totalSent,
      totalReplies,
      interestedReplies,
      totalSmtpCost,
      totalAiCost,
      totalCost,
      costPerReply,
      costPerMeeting,
      estimatedPipelineRevenue,
      netProfit,
      netRoiPct,
      roiMultiplier,
      replyRatePct,
      meetingConversionRatePct,
      updatedAt: new Date().toISOString()
    };
  } catch (err) {
    console.error('Error computing revenue attribution metrics:', err.message);
    return {
      totalSent: 0,
      totalReplies: 0,
      interestedReplies: 0,
      totalSmtpCost: 0,
      totalAiCost: 0,
      totalCost: 0,
      costPerReply: 0,
      costPerMeeting: 0,
      estimatedPipelineRevenue: 0,
      netProfit: 0,
      netRoiPct: 0,
      roiMultiplier: '0.0',
      replyRatePct: 0,
      meetingConversionRatePct: 0,
      updatedAt: new Date().toISOString()
    };
  }
}
