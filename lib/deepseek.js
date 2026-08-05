// Thin wrapper around the DeepSeek chat completions API.
const API_URL = 'https://api.deepseek.com/chat/completions';

export async function deepseek(messages, { temperature = 0.7, maxTokens = 1200, model } = {}) {
  const key = process.env.DEEPSEEK_API_KEY;
  if (!key) throw new Error('DEEPSEEK_API_KEY is not set in .env.local');

  const res = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: model || process.env.DEEPSEEK_MODEL || 'deepseek-chat',
      messages,
      temperature,
      max_tokens: maxTokens,
      stream: false,
    }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`DeepSeek API ${res.status}: ${detail.slice(0, 300)}`);
  }
  const data = await res.json();
  return data.choices?.[0]?.message?.content?.trim() ?? '';
}

// Reasoning-capable models (v4-flash/pro) sometimes spend the whole token
// budget on internal reasoning and return empty content. This wrapper guarantees
// a non-empty result: retry with more headroom, then fall back to deepseek-chat.
export async function deepseekReliable(messages, opts = {}) {
  let out = await deepseek(messages, opts);
  if (out) return out;

  out = await deepseek(messages, { ...opts, maxTokens: (opts.maxTokens || 2000) + 2000 });
  if (out) return out;

  // Final fallback: deepseek-chat does no hidden reasoning, so it always returns text.
  return deepseek(messages, { ...opts, model: 'deepseek-chat' });
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
