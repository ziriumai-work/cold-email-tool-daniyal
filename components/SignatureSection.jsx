import { C, inputStyle, lbl, btn } from './constants.js';
import { Section } from './UIElements.jsx';
import { UserIcon, CheckCircleIcon, ExternalLinkIcon } from './Icons.jsx';

export function SignatureSection({ senders, senderKey, setSenderKey, sig, setSig, sigSaved, saveSignature }) {
  const isUnsaved = JSON.stringify(sig) !== sigSaved;

  return (
    <Section title="Email Signature Configuration" kicker="Sender Identity & Branding">
      <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 300px' }}>
          <label style={{ ...lbl, marginTop: 0 }}>Select Sender Profile</label>
          <select value={senderKey || 'wahaj'} onChange={(e) => setSenderKey(e.target.value)}
            style={{ ...inputStyle, marginBottom: 14, fontWeight: 650 }}>
            {(senders.length > 0 ? senders : [
              { key: 'wahaj', name: 'Wahaj Shehzad', email: 'wahaj.s@ziriumai.com' },
              { key: 'info', name: 'ZiriumAI', email: 'info@ziriumai.com' },
              { key: 'haseeb', name: 'Haseeb Akbari', email: 'haseeb.a@ziriumai.com' },
            ]).map((s) => <option key={s.key} value={s.key}>{s.name} &lt;{s.email}&gt;</option>)}
          </select>

          <label style={lbl}>Full Name</label>
          <input value={sig.sig_name} onChange={(e) => setSig({ ...sig, sig_name: e.target.value })}
            placeholder="Haseeb Akbari" style={{ ...inputStyle, marginBottom: 10 }} />
          
          <label style={lbl}>Job Title / Organization</label>
          <input value={sig.sig_title} onChange={(e) => setSig({ ...sig, sig_title: e.target.value })}
            placeholder="Chief Technology Officer | ZiriumAI" style={{ ...inputStyle, marginBottom: 10 }} />
          
          <label style={lbl}>Tagline / Specialization</label>
          <input value={sig.sig_tagline} onChange={(e) => setSig({ ...sig, sig_tagline: e.target.value })}
            placeholder="AI Systems • Automation • Workflow Engineering" style={{ ...inputStyle, marginBottom: 10 }} />
          
          <label style={lbl}>Website URL</label>
          <input value={sig.sig_website} onChange={(e) => setSig({ ...sig, sig_website: e.target.value })}
            placeholder="ziriumai.com" style={{ ...inputStyle, marginBottom: 10 }} />
          
          <label style={lbl}>Calendly / Meeting Link <span style={{ fontWeight: 400, color: C.sub }}>(optional)</span></label>
          <input value={sig.sig_calendly || ''} onChange={(e) => setSig({ ...sig, sig_calendly: e.target.value })}
            placeholder="https://calendly.com/your-name/30min" style={{ ...inputStyle, marginBottom: 12 }} />
          
          <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, cursor: 'pointer', color: C.ink, fontWeight: 650 }}>
            <input type="checkbox" checked={sig.sig_logo === '1'}
              onChange={(e) => setSig({ ...sig, sig_logo: e.target.checked ? '1' : '0' })}
              style={{ width: 16, height: 16, accentColor: C.accent, cursor: 'pointer' }} />
            Include Zirium AI Brand Logo
          </label>
        </div>

        <div style={{ flex: '1 1 300px' }}>
          <label style={{ ...lbl, marginTop: 0 }}>Live Signature Preview</label>
          <div style={{
            padding: 22,
            border: '1px solid var(--preview-border)',
            borderLeft: `4px solid ${C.accent}`,
            borderRadius: 18,
            background: 'var(--preview-bg)',
            minHeight: 180,
            boxShadow: 'var(--card-shadow)',
            backdropFilter: 'blur(10px)'
          }}>
            {sig.sig_name && <div style={{ fontWeight: 800, fontSize: 16, color: C.ink, letterSpacing: '-0.01em' }}>{sig.sig_name}</div>}
            {sig.sig_title && <div style={{ fontSize: 13, marginTop: 3, fontWeight: 600, color: C.text }}>{sig.sig_title}</div>}
            {sig.sig_tagline && <div style={{ color: C.sub, fontSize: 12, marginTop: 4, fontWeight: 500 }}>{sig.sig_tagline}</div>}
            {sig.sig_website && (
              <div style={{ color: C.accent, fontSize: 13, marginTop: 8, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
                {sig.sig_website}
                <ExternalLinkIcon size={12} color={C.accent} />
              </div>
            )}
            {sig.sig_calendly && (
              <div style={{ marginTop: 10 }}>
                <a href={sig.sig_calendly.startsWith('http') ? sig.sig_calendly : `https://${sig.sig_calendly}`}
                  target="_blank" rel="noopener noreferrer"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    background: 'linear-gradient(135deg, #0284c7, #0369a1)',
                    color: '#ffffff',
                    padding: '7px 16px',
                    borderRadius: 10,
                    fontSize: 12,
                    fontWeight: 700,
                    textDecoration: 'none',
                    boxShadow: '0 4px 12px rgba(2, 132, 199, 0.25)'
                  }}>
                  📅 Schedule a Meeting
                </a>
              </div>
            )}
            {sig.sig_logo === '1' && <img src="/logo.png" alt="Zirium AI" style={{ height: 44, marginTop: 14, display: 'block' }} />}
            {!sig.sig_name && !sig.sig_title && !sig.sig_tagline && !sig.sig_website && !sig.sig_calendly && sig.sig_logo !== '1' &&
              <span style={{ color: C.sub, fontSize: 13 }}>Your formatted email signature preview appears here.</span>}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginTop: 16, flexWrap: 'wrap' }}>
        <button style={{
          ...btn(isUnsaved ? C.accent : C.green),
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          padding: '9px 20px',
          borderRadius: 12,
          fontSize: 13,
          fontWeight: 700
        }} onClick={saveSignature} disabled={!isUnsaved}>
          <CheckCircleIcon size={16} color="#fff" />
          {isUnsaved ? 'Save Signature' : 'Saved'}
        </button>
        <span style={{ color: C.sub, fontSize: 12, fontWeight: 500 }}>
          Automatically appended when sending emails from this profile.
        </span>
      </div>
    </Section>
  );
}

