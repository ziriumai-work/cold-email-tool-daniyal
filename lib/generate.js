import { deepseekReliable, extractJson } from './deepseek.js';

const COMPANY = 'Zirium AI, an IT and AI services company specializing in custom AI automation and agentic systems';

const CUSTOM_WRITER_SYSTEM = `You are an executive email strategist writing cold outreach on behalf of Zirium AI — a company that helps founders and co-founders scale their businesses through custom AI automation, agentic workflows, web and app development, and data analytics.

TONE & POSITIONING:
- Write operator-to-operator: direct, credible, confident, plain-spoken, and strictly non-salesy.
- Position Zirium AI as a true operating partner (building custom AI systems tailored to how their business operates, with ongoing support) rather than a vendor pitching off-the-shelf bots.
- Core value proposition: scale operations without proportional headcount by removing manual bottlenecks (sales follow-up, lead qualification, customer support, internal reporting).

EMAIL REQUIREMENTS:
1. GREETING & OPENING: Start the email body directly with "Hey, " and immediately pick up from the prompt or offer provided by the user (e.g., "Hey, I help roofing & HVAC businesses..."). Do NOT include any contact name or company name in the greeting (NEVER write "Hey [Name]", "Hi [Name]", "Hi [Company]", or "Dear [Name]").
2. SUBJECT LINE: Short (under 8 words), magnetic, specific to the industry/offer, zero hype words ("revolutionize", "unlock", "game-changing"). Do NOT include the target company's name in the subject line.
3. OPENING HOOK: Reference the core message/offer directly. Hook reader attention instantly by calling out an undeniable operational reality or bottleneck. Never open with generic fillers like "I hope this finds you well" or "My name is".
4. TRUST SIGNAL EARLY: Include one concrete, understated proof point (e.g. "we've built similar automation for [type of company]" or a specific measurable outcome) without vague claims ("best-in-class", "industry-leading").
5. THE OFFER & MECHANISM: Connect their specific pain point directly to a custom AI system Zirium could build (e.g., "an agent that qualifies and routes inbound leads before your team sees them"). Explain how it works step-by-step to build deep credibility and interest.
6. RELIABILITY CUE: One line signaling an ongoing operating partnership (custom-built systems, ongoing support, working directly with their team).
7. SOFT CTA: Low-friction ask for a brief reply or short call. Easy to say yes or no.
8. LENGTH & ENGAGEMENT: Maintain standard full email length (strictly 250–400 words total across 4 to 5 well-structured paragraphs). Do NOT write short or brief copy. Create a rich, fully developed, attractive, and highly engaging narrative that hooks the reader's attention from first line to CTA. Paragraphs strictly max 4 lines long.
9. STRICT SPAM-FREE & BANNED ELEMENTS: Absolutely NO spam trigger words or phrases (NEVER use: "free", "100%", "guarantee", "risk free", "click here", "act now", "urgent", "buy now", "earn money", "extra income", "cash", "winner", "no catch", "bonus", "double your", "unbelievable", "satisfaction guaranteed", "discount", "special offer", "limited time", "instant access", "money back", "no risk"). No ALL CAPS words, no exclamation marks (!), no emojis, no markdown formatting (no bold/italics), no hype buzzwords ("synergy", "leverage", "cutting-edge", "seamless", "transform", "skyrocket", "supercharge", "revolutionary", "game-changing"). NEVER include or mention any company name, contact name, or brand name anywhere in the subject line or email body.
10. SIGN-OFF: Do NOT include a signature, sign-off, sender name, role, or contact info (e.g., no "Best regards,", no "Name, Role, Zirium AI"). End the email body immediately after the CTA. The signature will be automatically attached at send time.

OUTPUT FORMAT (STRICT — return ONLY the subject line and email body, no preambles or notes):
Subject: <under 8 word subject without any company name>

Hey, <Pick up directly from the prompt / message ending cleanly after the CTA without any sign-off or signature>`;

function customWriterPrompt(company, sender, customPrompt) {
  const senderObj = sender || {};
  return [
    { role: 'system', content: CUSTOM_WRITER_SYSTEM },
    {
      role: 'user',
      content:
        `SENDER DETAILS:\n` +
        `Name: ${senderObj.name || 'Outreach Lead'}\n` +
        `Email: ${senderObj.email || 'contact@ziriumai.com'}\n` +
        `Role: Sales Lead / Outreach\n` +
        `Company: Zirium AI\n\n` +
        `CAMPAIGN ANGLE & INSTRUCTIONS:\n"""\n${customPrompt}\n"""\n\n` +
        `STRICT LENGTH & ATTENTION REQUIREMENT:\n` +
        `Write a rich, highly attractive, and compelling email of standard full length (250–400 words total, structured across 4-5 short paragraphs). Ensure the copy is thoroughly developed to grab and hold reader attention. Do NOT produce brief, truncated, or short copy.\n\n` +
        `STRICT SPAM-FREE REQUIREMENT:\n` +
        `Ensure 100% spam-free copy. Do NOT use any spam trigger words (such as free, 100%, guarantee, risk-free, act now, urgent, click here, buy now, cash, bonus, no risk, limited time) or exclamation marks. Keep tone entirely conversational, professional, and deliverability-focused.\n\n` +
        `STRICT NO-COMPANY-NAME REQUIREMENT:\n` +
        `Do NOT mention or include any target company name, contact person name, or brand name anywhere in the subject line or email body. Keep the copy completely generic of specific target company names and contact names so it applies uniformly to all prospects.\n\n` +
        `Draft the cold outreach email following all instructions and rules. Ensure the body opens with "Hey, " and picks up seamlessly from the prompt. Return strictly in the required format without any sign-off or signature block.`,
    },
  ];
}

// Clean + normalize a subject/body pair into the final draft.
function clean(subject, body, company) {
  const stripDash = (s) => s.replace(/\s*[—–]\s*/g, ', ').replace(/,\s*,/g, ',');
  const trimQuotes = (s) => s.trim().replace(/^["'`]+|["'`]+$/g, '').trim();

  // Strip markdown formatting if model accidentally included it
  subject = (subject || '').replace(/\*\*/g, '').replace(/`/g, '').replace(/!/g, '');
  body = (body || '').replace(/^\*\*subject\*\*:\s*/i, '').replace(/```[\s\S]*?```/g, '').replace(/!/g, '');

  subject = stripDash(trimQuotes(subject || ''));
  body = stripDash(trimQuotes((body || '').replace(/^body\s*:\s*/i, '')));

  // Normalize greeting to always start strictly with "Hey, " without prospect/company name, preserving the rest of the text
  body = body.replace(/^(hi|hey|hello|dear)(\s+[^,\n]+)?,?\s*/i, 'Hey, ');

  // Strip company name if it was accidentally generated in subject or body
  if (company?.name && company.name.length > 2) {
    const escName = company.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const nameRegex = new RegExp(`\\b${escName}\\b`, 'gi');
    subject = subject.replace(nameRegex, '').replace(/\s+/g, ' ').trim();
    body = body.replace(nameRegex, '').replace(/\s+/g, ' ').trim();
  }

  // Remove trailing sign-offs and extra signature details if generated despite instructions
  body = body.replace(/\n\s*(best|regards|thanks|sincerely|cheers|warmly|best regards|kind regards),?\s*(\n.*)?$/is, '').trim();

  if (subject) subject = subject.charAt(0).toUpperCase() + subject.slice(1);
  if (!body) {
    throw new Error(
      'The model returned an empty email (likely a token/truncation issue). ' +
      'Try again, or switch DEEPSEEK_MODEL to deepseek-chat in .env.local.'
    );
  }
  return { subject: subject || 'A quick note', body };
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
  return clean('A quick note', text, company);
}

// ---------------------------------------------------------------------------
export async function generateDraft({ company, offer = '', sender, mode = 'custom', customPrompt = '' }) {
  const promptText = customPrompt || offer;
  const raw = await deepseekReliable(customWriterPrompt(company, sender, promptText), {
    model: 'deepseek-chat',
    thinking: false,
    temperature: 0.78,
    presencePenalty: 0.3,
    frequencyPenalty: 0.2,
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