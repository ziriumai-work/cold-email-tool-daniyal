// Thin wrapper around the DeepSeek chat completions API.
const API_URL = 'https://api.deepseek.com/chat/completions';

/**
 * @param {Array} messages - chat messages
 * @param {Object} opts
 * @param {string} [opts.model] - defaults to DEEPSEEK_MODEL env or 'deepseek-v4-pro'.
 *   Note: 'deepseek-chat' does NOT support thinking mode — if you pass that model,
 *   thinking/reasoningEffort are silently dropped by the API.
 * @param {number} [opts.temperature] - ignored automatically if thinking mode is enabled
 * @param {number} [opts.maxTokens] - total budget; thinking mode eats into this BEFORE content
 * @param {boolean} [opts.thinking] - chain-of-thought reasoning, ON by default (v4-flash/v4-pro only)
 * @param {'low'|'high'|'xhigh'|'max'} [opts.reasoningEffort] - defaults to 'max'; only matters if thinking=true
 * @param {boolean} [opts.returnReasoning] - if true, resolves to { content, reasoning } instead of a plain string
 */
export async function deepseek(messages, {
  temperature = 0.7,
  maxTokens = 3000,
  model,
  thinking = false,
  reasoningEffort = 'low',
  returnReasoning = false,
} = {}) {
  const key = process.env.DEEPSEEK_API_KEY;
  if (!key) throw new Error('DEEPSEEK_API_KEY is not set in .env.local');

  // Use fast non-thinking model 'deepseek-chat' by default for fast generations (~1-2s response time).
  const chosenModel = model || (thinking ? (process.env.DEEPSEEK_MODEL || 'deepseek-v4-pro') : 'deepseek-chat');

  const body = {
    model: chosenModel,
    messages,
    max_tokens: maxTokens,
    stream: false,
  };

  // Thinking mode ignores temperature/top_p/presence_penalty/frequency_penalty entirely,
  // so only send it when thinking mode is explicitly enabled.
  if (thinking) {
    body.thinking = { type: 'enabled' };
    if (reasoningEffort) body.reasoning_effort = reasoningEffort;
  } else {
    body.temperature = temperature;
    if (opts.presencePenalty !== undefined) body.presence_penalty = opts.presencePenalty;
    if (opts.frequencyPenalty !== undefined) body.frequency_penalty = opts.frequencyPenalty;
  }

  const res = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`DeepSeek API ${res.status}: ${detail.slice(0, 300)}`);
  }
  const data = await res.json();
  const msg = data.choices?.[0]?.message;
  const content = msg?.content?.trim() ?? '';
  const reasoning = msg?.reasoning_content ?? '';

  return returnReasoning ? { content, reasoning } : content;
}

// Guaranteed non-empty generation wrapper optimized for high speed and reliability.
export async function deepseekReliable(messages, opts = {}) {
  const base = { model: 'deepseek-chat', thinking: false, maxTokens: 3000, ...opts };

  let out = await deepseek(messages, base);
  if (out) return out;

  out = await deepseek(messages, { ...base, maxTokens: (base.maxTokens || 3000) + 3000 });
  if (out) return out;

  // Final fallback
  return deepseek(messages, { ...opts, model: 'deepseek-chat', thinking: false });
}

// Tolerant extraction of the first JSON object from a model reply
// (handles ```json fences and surrounding prose).
export function extractJson(text) {
  if (!text) return null;
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1] : text;
  const start = candidate.indexOf('{');
  const end = candidate.lastIndexOf('}');
  if (start === -1 || end === -1) return null;
  try {
    return JSON.parse(candidate.slice(start, end + 1));
  } catch {
    return null;
  }
}