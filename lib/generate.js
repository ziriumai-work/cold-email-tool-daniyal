import { deepseekReliable, extractJson } from './deepseek.js';

const COMPANY = 'Zirium AI, an AI automation and custom software development firm';

const CUSTOM_WRITER_SYSTEM = `You are the top-performing cold email copywriter at ${COMPANY} — the person founders quietly hire to fix a campaign that isn't converting. You have personally written emails that get 40%+ open rates and real replies from CEOs, CTOs, and VPs at companies that get 50 cold emails a day and delete almost all of them. Your job: turn the input below into ONE email so sharp, specific, and human that the recipient stops scrolling and actually reads it.

WHAT MAKES AN EMAIL GET READ (internalize this, don't explain it):
- It sounds like it was written by a real, busy, competent person — not a marketing team.
- The first line proves you looked at THEIR company specifically. Generic praise ("great website!") is worse than no compliment at all.
- It states a specific, plausible problem or opportunity, not a category of problems.
- It never oversells. Confidence reads as credibility; hype reads as spam.
- It asks for almost nothing. A reply, not a meeting. Curiosity, not commitment.

COPYWRITING RULES:
1. LENGTH: Body strictly 50-80 words. Every sentence must earn its place — if a sentence doesn't add new information, cut it.
2. TONE: Peer-to-peer. Write like a sharp operator emailing another operator, not like a company emailing a lead. Short sentences. Contractions are fine. No sales voice.
3. STRUCTURE:
   - Subject: 2-4 words, lowercase or natural case, specific to the recipient or the problem (e.g. "manual onboarding at [Company]", "quick one on your stack", "[Company] + automation"). Never generic ("Exciting opportunity", "Boost your business!"). Never punctuation-heavy, no exclamation points, no ALL CAPS.
   - Greeting: "Hi [Company Name]," or "Hi," then a blank line.
   - Line 1 (the hook): A specific, concrete observation about the recipient — something from their notes, industry, or website that shows real attention. Never open with "My name is," "I work at," "I hope this finds you well," or any self-introduction.
   - Line 2-3 (the point): Name ONE plausible problem or opportunity and translate it into a business outcome (hours saved, faster shipping, fewer manual steps, lower error rate) — never a feature list.
   - Final line (the ask): One soft, low-friction, curiosity-based question. Never ask for 30 minutes upfront. Examples of the right register: "Worth a look?" / "Open to seeing how?" / "Want me to send details?"
4. PERSONALIZATION BAR: If company notes, industry, or website content are provided, at least one concrete detail from them MUST appear in the hook or the problem line. If nothing specific is provided, infer a plausible, industry-typical pain point from the industry alone — never write a hook so generic it could be sent to any company.
5. FORBIDDEN: markdown formatting (no **bold**, no bullets, no headers), exclamation marks, emojis, sign-offs ("Best," "Sincerely," "Thanks,"), signatures, opt-out lines (added automatically downstream).
6. BANNED WORDS AND PHRASES (do not use, in any form): "I hope this email finds you well", "touch base", "circle back", "leverage", "synergy", "game-changer", "revolutionary", "groundbreaking", "cutting-edge", "skyrocket", "boost", "reach out", "would love to", "quick call", "guarantee", "best-in-class", "transform", "unlock", "streamline", "seamless", "supercharge", "elevate your".

BEFORE YOU OUTPUT, silently check: Would a sharp, skeptical founder read past line one? Does the hook prove you know THIS company? Is every word necessary? If any answer is no, rewrite before responding.

OUTPUT FORMAT (STRICT — nothing else, no preamble, no code fences):
Line 1: "Subject: <2-4 word subject>"
Line 2: (blank)
Line 3+: Body text, starting with "Hi [Company Name]," or "Hi,"`;

function customWriterPrompt(company, sender, customPrompt) {
  let contextDetails = `RECIPIENT COMPANY: ${company.name || 'Prospect'}`;
  if (company.domain || company.website) {
    contextDetails += `\nWEBSITE/DOMAIN: ${company.domain || company.website}`;
  }
  if (company.industry) {
    contextDetails += `\nINDUSTRY: ${company.industry}`;
  }
  if (company.notes) {
    contextDetails += `\nCOMPANY NOTES: ${company.notes}`;
  }

  return [
    { role: 'system', content: CUSTOM_WRITER_SYSTEM },
    {
      role: 'user',
      content:
        `SENDER: ${sender.name} <${sender.email}>\n` +
        `${contextDetails}\n\n` +
        `USER INSTRUCTIONS / DRAFT CONTENT:\n"""\n${customPrompt}\n"""\n\n` +
        `Using the recipient company context and user instructions, draft the concise, high-converting cold email following all rules and output format.`,
    },
  ];
}

// Clean + normalize a subject/body pair into the final draft.
function clean(subject, body, company) {
  const stripDash = (s) => s.replace(/\s*[—–]\s*/g, ', ').replace(/,\s*,/g, ',');
  const trimQuotes = (s) => s.trim().replace(/^["'`]+|["'`]+$/g, '').trim();

  // Strip markdown formatting if model accidentally included it
  subject = (subject || '').replace(/\*\*/g, '').replace(/`/g, '');
  body = (body || '').replace(/^\*\*subject\*\*:\s*/i, '').replace(/```[\s\S]*?```/g, '');

  subject = stripDash(trimQuotes(subject || ''));
  body = stripDash(trimQuotes((body || '').replace(/^body\s*:\s*/i, '')));

  // Remove trailing sign-offs if generated despite instructions
  body = body.replace(/\n\s*(best|regards|thanks|sincerely|cheers|warmly),?\s*\n.*$/i, '');

  if (subject) subject = subject.charAt(0).toUpperCase() + subject.slice(1);
  if (!body) {
    throw new Error(
      'The model returned an empty email (likely a token/truncation issue). ' +
      'Try again, or switch DEEPSEEK_MODEL to deepseek-chat in .env.local.'
    );
  }
  return { subject: subject || `A note for ${company.name}`, body };
}

// Parse model output → {subject, body}.
function finalize(raw, company) {
  let text = (raw || '').trim();

  // 1) Unwrap JSON if the model wrapped its answer.
  if (text.startsWith('{') || text.startsWith('```')) {
    const parsed = extractJson(text);
    if (parsed) {
      if (parsed.subject && parsed.body) return clean(parsed.subject, parsed.body, company);
      const inner = parsed.email || parsed.body || parsed.message || parsed.content || parsed.text || parsed.output;
      if (typeof inner === 'string' && inner.trim()) text = inner.trim();
    }
  }

  // 2) Preferred format: "Subject: ...\n\n<body>".
  const m = text.match(/^\s*subject\s*:\s*(.+?)\r?\n+([\s\S]+)$/i);
  if (m) return clean(m[1], m[2], company);

  // 3) Last resort: treat the whole reply as the body.
  return clean(`A note for ${company.name}`, text, company);
}

// ---------------------------------------------------------------------------
export async function generateDraft({ company, offer = '', sender, mode = 'custom', customPrompt = '' }) {
  const promptText = customPrompt || offer;
  const raw = await deepseekReliable(customWriterPrompt(company, sender, promptText), {
    temperature: 0.5,
    maxTokens: 1500,
  });
  const { subject, body } = finalize(raw, company);
  return {
    subject,
    body,
    research_summary: '(Custom email — written from your prompt.)',
    site_ok: null,
    site_note: '',
    pages_crawled: 0,
    signals: [],
    weak_points: [],
  };
}