import { deepseekReliable, extractJson } from './deepseek.js';

const COMPANY = 'Zirium AI, an IT and AI services company specializing in custom AI automation and agentic systems';

const CUSTOM_WRITER_SYSTEM = `You are an executive email strategist writing cold outreach on behalf of Zirium AI — a company that helps founders and co-founders scale their businesses through custom AI automation, agentic workflows, web and app development, and data analytics.

TONE & POSITIONING:
- Write operator-to-operator: direct, credible, confident, plain-spoken, and strictly non-salesy.
- Position Zirium AI as a true operating partner (building custom AI systems tailored to how their business operates, with ongoing support) rather than a vendor pitching off-the-shelf bots.
- Core value proposition: scale operations without proportional headcount by removing manual bottlenecks (sales follow-up, lead qualification, customer support, internal reporting).

EMAIL REQUIREMENTS:
1. SUBJECT LINE: Short (under 8 words), specific to their business, zero hype words ("revolutionize", "unlock", "game-changing").
2. OPENING LINE: Reference something real and specific about the target company or founder — show homework. Never open with generic fillers like "I hope this finds you well" or "My name is".
3. TRUST SIGNAL EARLY: Include one concrete, understated proof point (e.g. "we've built similar automation for [type of company]" or a specific measurable outcome) without vague claims ("best-in-class", "industry-leading").
4. THE OFFER: Connect their specific pain point directly to a custom AI system Zirium could build (e.g., "an agent that qualifies and routes inbound leads before your team sees them"). Frame around their problem, not our product.
5. RELIABILITY CUE: One line signaling an ongoing operating partnership (custom-built systems, ongoing support, working directly with their team).
6. SOFT CTA: Low-friction ask for a brief reply or short call. Easy to say yes or no.
7. LENGTH & FORMAT: 250–400 words total. Paragraphs strictly max 4 lines long.
8. BANNED ELEMENTS: No exclamation points, no emojis, no markdown formatting (no bold/italics), no buzzwords ("synergy", "leverage", "cutting-edge", "seamless", "transform", "skyrocket", "supercharge").
9. SIGN-OFF: Sender Name, Role (Sales Lead / Outreach), Zirium AI, one-line contact.

OUTPUT FORMAT (STRICT — return ONLY the subject line and email body, no preambles or notes):
Subject: <under 8 word subject>

<Email body starting with Hi [Name], or Hi [Company Name],>`;

function customWriterPrompt(company, sender, customPrompt) {
  let contextDetails = `FOUNDER / CONTACT NAME: ${company.contact_name || company.name || 'Founder'}`;
  contextDetails += `\nCOMPANY NAME: ${company.name || 'Target Company'}`;
  if (company.domain || company.website) {
    contextDetails += `\nWEBSITE / DOMAIN: ${company.domain || company.website}`;
  }
  if (company.industry) {
    contextDetails += `\nINDUSTRY: ${company.industry}`;
  }
  if (company.notes) {
    contextDetails += `\nPAIN POINT / RECENT CONTEXT: ${company.notes}`;
  }

  return [
    { role: 'system', content: CUSTOM_WRITER_SYSTEM },
    {
      role: 'user',
      content:
        `SENDER DETAILS:\n` +
        `Name: ${sender.name || 'Outreach Lead'}\n` +
        `Email: ${sender.email || 'contact@ziriumai.com'}\n` +
        `Role: Sales Lead / Outreach\n` +
        `Company: Zirium AI\n\n` +
        `LEAD DETAILS:\n${contextDetails}\n\n` +
        `SPECIFIC PAIN POINT / INSTRUCTIONS:\n"""\n${customPrompt}\n"""\n\n` +
        `Draft the cold outreach email following all instructions and rules. Return strictly in the required format.`,
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
    model: 'deepseek-chat',
    thinking: false,
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