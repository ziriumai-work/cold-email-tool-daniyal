import { readFileSync } from 'node:fs';
const env = readFileSync(new URL('../.env.local', import.meta.url), 'utf8');
for (const line of env.split('\n')) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
}
const model = process.argv[2] || 'deepseek-v4-flash';

const res = await fetch('https://api.deepseek.com/chat/completions', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}` },
  body: JSON.stringify({
    model,
    messages: [
      { role: 'system', content: 'Output strict JSON only.' },
      { role: 'user', content: 'Write a 3-sentence consultative cold email to a rug shop. Respond as {"subject":"...","body":"..."}' },
    ],
    max_tokens: 600,
    temperature: 0.7,
  }),
});
const status = res.status;
const data = await res.json();
const ch = data.choices?.[0];
console.log('model:', model);
console.log('http:', status, '| finish_reason:', ch?.finish_reason);
console.log('usage:', JSON.stringify(data.usage));
console.log('content len:', (ch?.message?.content || '').length, '| reasoning len:', (ch?.message?.reasoning_content || '').length);
console.log('content:\n', (ch?.message?.content || '').slice(0, 400));
if (data.error) console.log('API ERROR:', JSON.stringify(data.error));
