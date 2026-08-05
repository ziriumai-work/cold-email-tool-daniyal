import { C, overlay, modalCard, inputStyle, lbl, btn } from './constants.js';
import { SparklesIcon, XIcon } from './Icons.jsx';

export function GenModal({ modal, companies, senders, senderKey, setSenderKey, customPrompt, setCustomPrompt, onCancel, onSubmit }) {
  const pendingCount = companies.filter((c) => !c.draft_id).length;
  const scope = modal.target === 'all'
    ? `all ${pendingCount} compan${pendingCount === 1 ? 'y' : 'ies'} without a draft`
    : (companies.find((c) => c.id === modal.target)?.name || 'this company');

  const presets = [
    { label: '🚀 SaaS Free Trial Pitch', text: 'We offer an AI sales assistant that automatically qualifies leads and schedules meetings on autopilot. Friendly, professional tone, under 100 words, call to action for a 15-minute quick chat.' },
    { label: '🤝 Strategic Partnership', text: 'Reaching out to explore a potential strategic co-marketing partnership between our AI automation platform and your team. Concise, high-value, under 80 words.' },
    { label: '🎯 Custom Offer / Demo Invite', text: 'Offering an exclusive custom audit of their current website workflow, demonstrating 3 actionable places AI can reduce manual operational cost by 40%.' }
  ];

  function onKey(e) {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') onSubmit();
    if (e.key === 'Escape') onCancel();
  }

  return (
    <div onClick={onCancel} style={{ ...overlay, backdropFilter: 'blur(12px)' }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        ...modalCard,
        borderRadius: 24,
        padding: 26
      }} onKeyDown={onKey}>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ padding: 8, borderRadius: 12, background: 'rgba(124, 92, 255, 0.12)', color: '#7c5cff' }}>
              <SparklesIcon size={20} color="#7c5cff" />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: C.ink, letterSpacing: '-0.02em' }}>
                AI Cold Email Generator
              </h3>
              <p style={{ color: C.sub, fontSize: 12, margin: '2px 0 0', fontWeight: 500 }}>Target: <strong>{scope}</strong></p>
            </div>
          </div>
          <button onClick={onCancel} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.sub, padding: 4 }}>
            <XIcon size={18} color={C.sub} />
          </button>
        </div>

        {senders.length > 0 && (
          <div style={{ marginBottom: 12 }}>
            <label style={lbl}>Send From Profile</label>
            <select value={senderKey} onChange={(e) => setSenderKey(e.target.value)} style={{ ...inputStyle, fontWeight: 600 }}>
              {senders.map((s) => <option key={s.key} value={s.key}>{s.name} &lt;{s.email}&gt;</option>)}
            </select>
          </div>
        )}

        <div style={{ marginBottom: 12 }}>
          <label style={lbl}>Prompt Preset Shortcuts</label>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 4 }}>
            {presets.map((p) => (
              <button key={p.label} type="button" onClick={() => setCustomPrompt(p.text)}
                style={{
                  fontSize: 11,
                  fontWeight: 650,
                  color: C.accent,
                  background: 'var(--subtle-card-bg)',
                  border: `1px solid ${C.accent}33`,
                  borderRadius: 999,
                  padding: '4px 10px',
                  cursor: 'pointer'
                }}>
                {p.label}
              </button>
            ))}
          </div>
        </div>

        <label style={lbl}>AI Prompt / Offer Instructions</label>
        <textarea autoFocus value={customPrompt} onChange={(e) => setCustomPrompt(e.target.value)}
          placeholder={"Write your custom offer details here. Friendly, professional tone, under 90 words..."}
          style={{ ...inputStyle, minHeight: 140, resize: 'vertical', lineHeight: 1.6, fontSize: 14 }} />

        <div style={{ display: 'flex', gap: 10, justifyContent: 'space-between', alignItems: 'center', marginTop: 18 }}>
          <span style={{ color: C.sub, fontSize: 11, fontWeight: 500 }}>
            Press <strong>Ctrl/Cmd + Enter</strong> to generate
          </span>

          <div style={{ display: 'flex', gap: 8 }}>
            <button style={{ ...btn(C.sub, true), padding: '8px 16px', borderRadius: 12 }} onClick={onCancel}>Cancel</button>
            <button style={{
              ...btn('#7c5cff'),
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 20px',
              borderRadius: 12,
              fontSize: 13,
              fontWeight: 700
            }} onClick={onSubmit}>
              <SparklesIcon size={15} color="#fff" />
              Generate Drafts
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

