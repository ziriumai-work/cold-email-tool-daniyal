import { deepseekReliable, extractJson } from './deepseek.js';
import { suppressEmail } from './compliance.js';
import * as db from './db.js';

/**
 * Classify reply sentiment and intent using DeepSeek AI or keyword fallback
 */
export async function classifyReplyIntent(replySubject, replySnippet) {
  const prompt = `Classify this email reply into ONE of these exact categories: Interested, Referral, Objection, Wrong Person, Out of Office, Spam, Unsubscribe, Negative.

Subject: ${replySubject || 'No Subject'}
Snippet: ${replySnippet || 'No Content'}

Return ONLY a JSON object with this structure:
{
  "category": "Interested" | "Referral" | "Objection" | "Wrong Person" | "Out of Office" | "Spam" | "Unsubscribe" | "Negative",
  "confidence": 0.95,
  "summary": "Short 1-sentence summary of reply",
  "recommendedAction": "Recommended next action for user"
}`;

  try {
    const raw = await deepseekReliable([{ role: 'user', content: prompt }]);
    const parsed = extractJson(raw);
    if (parsed && parsed.category) {
      return parsed;
    }
  } catch (err) {
    console.error('DeepSeek reply classification fallback:', err.message);
  }

  // Robust Keyword Fallback Classifier
  const text = `${replySubject || ''} ${replySnippet || ''}`.toLowerCase();
  
  if (text.includes('unsubscribe') || text.includes('remove me') || text.includes('stop sending')) {
    return { category: 'Unsubscribe', confidence: 0.9, summary: 'Lead requested removal from list.', recommendedAction: 'Suppress email immediately.' };
  }
  if (text.includes('out of office') || text.includes('vacation') || text.includes('automatic reply') || text.includes('autoreply')) {
    return { category: 'Out of Office', confidence: 0.95, summary: 'Auto-reply OOO notice.', recommendedAction: 'Pause sequence for 7 days.' };
  }
  if (text.includes('interested') || text.includes('call') || text.includes('demo') || text.includes('pricing') || text.includes('schedule')) {
    return { category: 'Interested', confidence: 0.85, summary: 'Lead expressed potential interest.', recommendedAction: 'Send booking link or proposed meeting times.' };
  }
  if (text.includes('contact') || text.includes('speak with') || text.includes('reach out to')) {
    return { category: 'Referral', confidence: 0.8, summary: 'Referred to another team member.', recommendedAction: 'Forward outreach to referred contact.' };
  }
  if (text.includes('not interested') || text.includes('no thanks') || text.includes('pass')) {
    return { category: 'Negative', confidence: 0.85, summary: 'Lead declined offer.', recommendedAction: 'Close draft record.' };
  }

  return { category: 'Objection', confidence: 0.6, summary: 'General reply needing review.', recommendedAction: 'Manual review required.' };
}

/**
 * Perform Autonomous Action based on Reply Category
 */
export async function handleAutonomousReplyAction(replyId, companyId, fromEmail, category, summary) {
  try {
    if (category === 'Unsubscribe') {
      await suppressEmail(fromEmail, 'unsubscribed', 'autonomous_reply_handler');
      await db.run("UPDATE replies SET notes = 'Autonomous Action: Email permanently suppressed' WHERE id = ?", [replyId]);
    } else if (category === 'Out of Office') {
      await db.run("UPDATE sequence_enrollments SET status = 'paused', scheduled_at = datetime('now', '+7 days') WHERE company_id = ?", [companyId]);
      await db.run("UPDATE replies SET notes = 'Autonomous Action: Paused sequence for 7 days due to OOO' WHERE id = ?", [replyId]);
    } else if (category === 'Interested') {
      // Draft AI response requiring human approval before sending
      const draftPrompt = `Write a professional, warm, concise 3-sentence email response to a lead who is interested. Offer a quick 15-minute introductory call. Summary of reply: ${summary}`;
      try {
        const aiResponseText = await deepseekReliable([{ role: 'user', content: draftPrompt }]);
        await db.run("UPDATE replies SET notes = ? WHERE id = ?", [`AI Drafted Response (Pending Approval):\n"${aiResponseText.trim()}"`, replyId]);
      } catch (e) {
        await db.run("UPDATE replies SET notes = 'Action Recommended: Follow up with meeting link' WHERE id = ?", [replyId]);
      }
    } else if (category === 'Negative') {
      await db.run("UPDATE replies SET notes = 'Autonomous Action: Flagged negative response' WHERE id = ?", [replyId]);
    }
  } catch (err) {
    console.error('Error executing autonomous reply action:', err.message);
  }
}
