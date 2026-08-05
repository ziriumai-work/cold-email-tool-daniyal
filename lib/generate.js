// Two-stage generation:
//   Stage A — research the company against our offer → a concrete observation
//             and the single most relevant opportunity (no fabrication).
//   Stage B — write a short, consultative email anchored by a worked example.
import { crawlSite } from './crawlSite.js';
import { deepseekReliable, extractJson } from './deepseek.js';

// ---------------------------------------------------------------------------
// Stage A prompt
// ---------------------------------------------------------------------------
function researchPrompt(company, offer, site) {
  const siteBlock = site.ok
    ? site.text
    : '(Their website could not be read. Do NOT invent specifics. Base your note only on the company name and the general nature of this business, and say the page content was unavailable.)';

  const signalBlock = site.signals && site.signals.length
    ? site.signals.map((s) => '- ' + s).join('\n')
    : '(No automated signals detected. Infer an interesting opportunity from the page content above.)';

  const crawledList = site.pages && site.pages.length
    ? site.pages.map((p) => p.url).join(', ')
    : '(homepage only)';

  return [
    {
      role: 'system',
      content:
        'You are a commercially sharp solutions consultant. You study a company and identify ONE project they could realistically buy now. ' +
        'Your job is not to sound clever, it is to find the most credible, valuable problem-solution angle for a first outreach email. ' +
        'Prefer revenue, conversion, lead handling, support load, quoting speed, internal workflow drag, response time, or customer experience over generic audits. ' +
        'You never fabricate facts, never overclaim ROI, and never choose a boring technical nitpick unless it is genuinely the strongest angle.',
    },
    {
      role: 'user',
      content:
        `COMPANY: ${company.name}\nWEBSITE: ${company.website || 'n/a'}\n` +
        `PAGES CRAWLED: ${crawledList}\n\n` +
        `WHAT WE OFFER (the kind of solution we provide, e.g. an AI tool / automation):\n"""\n${offer}\n"""\n\n` +
        `INTERESTING OPPORTUNITY SIGNALS (found by crawling their site):\n${signalBlock}\n\n` +
        `THEIR WEBSITE CONTENT (multiple pages):\n"""\n${siteBlock}\n"""\n\n` +
        'Write a tight outreach brief, under 140 words, with exactly these four labelled parts:\n\n' +
        'HOOK: the single most specific, true detail about THIS company to open a cold email with. It must be concrete enough that it could only have been written for them.\n\n' +
        'PROBLEM: the business drag, missed opportunity, or workload that hook implies, from their point of view.\n\n' +
        'PROJECT: one scoped project they could plausibly buy from Zirium AI now. Make it concrete and practical, not broad transformation language.\n\n' +
        'OUTCOME: the result they would care about if that project worked.\n\n' +
        'Rules:\n' +
        '- Pick exactly one angle.\n' +
        '- Make the project sound implementable, not theoretical.\n' +
        '- Do not mention SEO audit items unless they are honestly the strongest commercial opportunity.\n' +
        '- If the website could not be read, say so implicitly through restraint, and keep the angle conservative.',
    },
  ];
}

// ---------------------------------------------------------------------------
// Stage B prompt — the email writer (with a worked example to anchor quality)
// ---------------------------------------------------------------------------
const COMPANY = 'Zirium AI, an AI automation and software development company';

const WRITER_SYSTEM = `You are a world-class B2B cold email copywriter. You write the short, sharp emails that owners, directors, founders, and operators reply to when the idea is genuinely relevant. You write on behalf of the sender, who works at ${COMPANY}.

Understand the reader before you write: they are smart, commercially minded, short on time, and pitched constantly. They ignore generic agencies and vague "AI automation" promises immediately. Your ONLY goal is to earn a reply by presenting one credible project idea that feels relevant to their business.

HOW THE BEST COLD EMAILS WORK — follow this arc:
0. GREETING. Start with a simple "Hi," on its own line, then a blank line. Nothing more in the greeting.
1. EARN THE SECOND LINE. Right after the greeting, open on a specific, true detail about THEM from the brief's HOOK. Concrete and observational, never flattery.
2. NAME THE BUSINESS PAIN. Bridge that detail to the operational or commercial drag it likely creates.
3. PRESENT ONE PROJECT. Offer one practical project idea, not a basket of services. It should sound like something a serious buyer could picture implementing.
4. MAKE REPLYING EASY. Close with one low-pressure question that asks permission to show the idea, not to book a meeting.

CRAFT — this is what separates good from generic:
- One idea per email. If you are making two points, cut the weaker one.
- Specific beats clever. A real detail always beats a vague compliment.
- Write the way sharp people talk. Short sentences, contractions, natural rhythm, varied sentence length. Read it aloud in your head; if it sounds like a brochure, rewrite it.
- Lead with them, not you. The reader should feel understood before they feel sold to.
- Confidence, not neediness. You are offering something useful, not asking for a favor.
- Sound like a senior operator or consultant, not a marketer. Calm, precise, commercially aware.
- Ruthless edit. Delete every word and every line that does not earn its place. Most great cold emails are 60 to 120 words.

HARD RULES:
- Start with "Hi," on its own line (just "Hi," — do NOT use "Hi there", "Hello", "Dear", or invent a name you were not given), then a blank line, then the opening hook.
- The first sentence of the body (after the greeting) must not start with the word "I". Lead with them.
- Exactly one ask. No Calendly, no booking links, and no "15-minute chat" ask in a first email.
- Plain text only. No bullet points, markdown, emojis, or exclamation marks.
- No em-dash ("—"); use commas or periods.
- Banned phrases: "I hope this email finds you well", "touch base", "circle back", "leverage", "synergy", "game-changer", "reach out", "boost", "skyrocket", "unlock", "elevate", "cutting-edge", "seamless", "supercharge", "just following up", "would love to", "quick call", "pick your brain".
- Never invent facts or numbers not in the brief. If you lack a figure, stay general ("a few hundred").
- Do not say "we help businesses like yours" unless followed by a concrete project idea.
- Do not describe Zirium AI as a generic agency. Speak in terms of building and implementing specific systems.
- Do NOT add any sign-off, name, signature, or closing word ("Best", "Thanks", "Regards"), and no opt-out line. End on your closing question. A signature is appended automatically below your email.

SUBJECT:
- 2 to 4 words only.
- Sentence case.
- Specific, understated, and businesslike.
- It must read like the subject of a real one-to-one business note, not a marketing campaign.
- Prefer concrete references to their catalogue, workflow, product area, support flow, or customer journey.
- Avoid curiosity-bait and avoid sounding "smart".
- Avoid vague subjects like "Quick idea", "AI automation", "Growth idea", "Partnership opportunity", "Worth a look", "Thought this might help".
- Good subject patterns:
  "Rug catalogue questions"
  "Product page enquiries"
  "Quote turnaround"
  "Rental lead handling"
  "Support on listings"
- Bad subject patterns:
  "Interesting opportunity"
  "AI for growth"
  "Helping Kabul Rugs"
  "Website idea"
  "Open to this?"

TWO EXAMPLES OF THE QUALITY BAR (study the craft and rhythm, never copy the content — your email is for a different company):

Subject: Your empty workspace
Hi,

New Linear users land in a blank workspace with no sample project to poke at. Most teams that do this lose people in the first session, before the product ever gets a chance to click.
We build guided first runs that walk a new user to their first real win on their own. It quietly lifts activation without you touching the core product.
Worth a look at how it would fit Linear?

Subject: One size chart
Hi,

Most apparel returns come down to fit, and your product pages still point every shopper at one generic size chart. That is a lot of guesswork right at checkout.
We add a fit assistant that asks two quick questions and recommends the right size per item, which tends to cut returns and lift conversion.
Open to seeing it on one of your bestsellers?

OUTPUT FORMAT (follow exactly): the first line must be "Subject: <your subject>", then a blank line, then the email body ending on your closing question (no name, no sign-off — a signature is added automatically). Output nothing else — no JSON, no quotes, no labels other than that first "Subject:" line.`;

function writerPrompt(company, offer, sender, research) {
  return [
    { role: 'system', content: WRITER_SYSTEM },
    {
      role: 'user',
      content:
        `SENDER: ${sender.name} <${sender.email}> (writing on behalf of ${COMPANY})\n\n` +
        `WHAT WE HELP WITH (translate into their context — do not paste verbatim):\n"""\n${offer}\n"""\n\n` +
        `TARGET COMPANY: ${company.name}\n\n` +
        `RESEARCH BRIEF (use HOOK to open, PROBLEM to create the bridge, PROJECT as the offer, OUTCOME to sharpen relevance):\n"""\n${research}\n"""\n\n` +
        'Write the email now. The email should feel like a sharp person noticed a real issue and has one practical build idea worth showing. ' +
        'Do not sound like a campaign, a freelancer, or an agency brochure. The subject must be plain, concrete, and professionally restrained. ' +
        'Output only the final email in the required format.',
    },
  ];
}

// ---------------------------------------------------------------------------
// CUSTOM mode — the marketing agent writes their own email/instructions. We do
// NOT crawl the website. The AI simply returns a polished, ready-to-send version.
// ---------------------------------------------------------------------------
const CUSTOM_WRITER_SYSTEM = `You are an expert B2B outreach editor writing on behalf of the sender, who works at ${COMPANY}. A marketing agent gives you their own instructions and/or a rough draft for a cold outreach email. Return a single polished, ready-to-send version.

Rules:
- Follow the agent's instructions and intent exactly. They take priority. Improve clarity, grammar, flow, and tone, but keep their meaning.
- Voice: senior, peer-to-peer, commercially literate. Write like an operator or consultant, not a salesperson. Short sentences, no corporate filler.
- You may insert the COMPANY NAME naturally. Do NOT invent any other facts about them; you have NOT seen their website.
- No exclamation marks (unless the agent explicitly asks for a casual tone). No em-dash, no markdown, no emojis. Plain text with line breaks.
- BANNED phrases unless the agent insists: "I hope this email finds you well", "touch base", "circle back", "leverage", "synergy", "game-changer", "reach out", "boost", "skyrocket", "would love to", "quick call".
- If the agent provided a subject, refine it into a more professional, concrete business-note subject; otherwise write one.
- Keep subjects plain and specific, never promotional or curiosity-based.
- Prefer one clear project idea over broad service language.
- Do NOT add a sign-off, name, or signature (a signature is appended automatically), and no opt-out line, unless the agent explicitly asks for one.

OUTPUT FORMAT (follow exactly): the first line must be "Subject: <your subject>", then a blank line, then the full email body. Output nothing else — no JSON, no quotes around the text, no labels other than that first "Subject:" line.`;

function customWriterPrompt(company, sender, customPrompt) {
  return [
    { role: 'system', content: CUSTOM_WRITER_SYSTEM },
    {
      role: 'user',
      content:
        `SENDER: ${sender.name} <${sender.email}>\n` +
        `COMPANY NAME: ${company.name}\n\n` +
        `THE AGENT'S INSTRUCTIONS / DRAFT EMAIL:\n"""\n${customPrompt}\n"""\n\n` +
        'Produce the polished final email in the required output format.',
    },
  ];
}

// Clean + normalize a subject/body pair into the final draft.
function clean(subject, body, company) {
  const stripDash = (s) => s.replace(/\s*[—–]\s*/g, ', ').replace(/,\s*,/g, ',');
  const trimQuotes = (s) => s.trim().replace(/^["'`]+|["'`]+$/g, '').trim();
  subject = stripDash(trimQuotes(subject || ''));
  body = stripDash(trimQuotes((body || '').replace(/^body\s*:\s*/i, '')));
  if (subject) subject = subject.charAt(0).toUpperCase() + subject.slice(1);
  if (!body) {
    throw new Error(
      'The model returned an empty email (likely a token/truncation issue). ' +
      'Try again, or switch DEEPSEEK_MODEL to deepseek-chat in .env.local.'
    );
  }
  return { subject: subject || `A note for ${company.name}`, body };
}

// Parse model output → {subject, body}. Robust to: the plain "Subject: ...\n\n
// <body>" format, a {subject, body} JSON object, OR a JSON wrapper that hides
// the whole email in a single field like {"email": "Subject: ...\n\n..."}.
function finalize(raw, company) {
  let text = (raw || '').trim();

  // 1) Unwrap JSON if the model wrapped its answer.
  if (text.startsWith('{') || text.startsWith('```')) {
    const parsed = extractJson(text);
    if (parsed) {
      if (parsed.subject && parsed.body) return clean(parsed.subject, parsed.body, company);
      const inner = parsed.email || parsed.body || parsed.message || parsed.content || parsed.text || parsed.output;
      if (typeof inner === 'string' && inner.trim()) text = inner.trim(); // re-parse below
    }
  }

  // 2) Preferred format: "Subject: ...\n\n<body>".
  const m = text.match(/^\s*subject\s*:\s*(.+?)\r?\n+([\s\S]+)$/i);
  if (m) return clean(m[1], m[2], company);

  // 3) Last resort: treat the whole reply as the body.
  return clean(`A note for ${company.name}`, text, company);
}

// ---------------------------------------------------------------------------
export async function generateDraft({ company, offer, sender, mode = 'ai', customPrompt = '' }) {
  // CUSTOM: polish the agent's own email. No crawling, no website research.
  if (mode === 'custom') {
    const raw = await deepseekReliable(customWriterPrompt(company, sender, customPrompt), {
      temperature: 0.6,
      maxTokens: 2000,
    });
    const { subject, body } = finalize(raw, company);
    return {
      subject,
      body,
      research_summary: '(Custom email — written from your prompt, no website crawl.)',
      site_ok: null,
      site_note: '',
      pages_crawled: 0,
      signals: [],
      weak_points: [],
    };
  }

  // AI: crawl the site, find an interesting angle, write a personalized pitch.
  const site = await crawlSite(company.website);
  const research_summary = await deepseekReliable(researchPrompt(company, offer, site), {
    temperature: 0.4,
    maxTokens: 1500,
  });
  const raw = await deepseekReliable(writerPrompt(company, offer, sender, research_summary), {
    temperature: 0.7,
    maxTokens: 2000,
  });
  const { subject, body } = finalize(raw, company);
  return {
    subject,
    body,
    research_summary,
    site_ok: site.ok,
    site_note: site.note,
    pages_crawled: site.pages ? site.pages.length : 0,
    signals: site.signals || [],
    weak_points: site.weakPoints || [],
  };
}
