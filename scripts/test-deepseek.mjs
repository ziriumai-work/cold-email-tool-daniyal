// Phase 0 DeepSeek test: proves the API key works and returns text.
// Run with:  npm run test:deepseek
import { readFileSync } from 'node:fs';

try {
  const env = readFileSync(new URL('../.env.local', import.meta.url), 'utf8');
  for (const line of env.split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
} catch {}

if (!process.env.DEEPSEEK_API_KEY) {
  console.error('❌ DEEPSEEK_API_KEY missing in .env.local');
  process.exit(1);
}

const res = await fetch('https://api.deepseek.com/chat/completions', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}`,
  },
  body: JSON.stringify({
    model: process.env.DEEPSEEK_MODEL || 'deepseek-chat',
    messages: [{ role: 'user', content: 'Reply with exactly: DeepSeek connection OK' }],
    stream: false,
  }),
});

if (!res.ok) {
  console.error('❌ DeepSeek API error', res.status, await res.text());
  process.exit(1);
}

const data = await res.json();
console.log('✅ DeepSeek replied:', data.choices?.[0]?.message?.content?.trim());
