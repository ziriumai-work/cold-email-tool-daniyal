'use client';
import { useState, useEffect } from 'react';
import {
  MailIcon,
  ShieldIcon,
  ZapIcon,
  BarChartIcon,
  CheckCircleIcon,
  UserIcon,
  BuildingIcon,
  SparklesIcon,
  ClockIcon
} from './Icons.jsx';

const C = {
  bg: 'transparent',
  card: 'var(--card-bg)',
  border: 'var(--card-border)',
  text: 'var(--text-primary)',
  sub: 'var(--text-secondary)',
  muted: 'var(--text-muted)',
  accent: 'var(--accent)',
  green: '#10b981',
  red: '#f43f5e',
  amber: '#f59e0b',
  input: 'var(--input-bg)',
  ink: 'var(--text-primary)',
  line: 'var(--card-border)',
};

const glassCardStyle = {
  background: 'var(--card-bg)',
  backdropFilter: 'blur(24px) saturate(190%)',
  WebkitBackdropFilter: 'blur(24px) saturate(190%)',
  border: '1px solid var(--card-border)',
  borderRadius: 24,
  padding: '26px 30px',
  boxShadow: 'var(--card-shadow)',
  marginBottom: 24,
};

export function EnterpriseTabBar({ activeTab, setActiveTab }) {
  const tabs = [
    { id: 'pipeline', label: 'Outreach Pipeline', icon: MailIcon },
    { id: 'deliverability', label: 'Deliverability & Health', icon: ZapIcon },
    { id: 'sequences', label: 'Branching Sequences', icon: ClockIcon },
    { id: 'compliance', label: 'Compliance & Spam', icon: ShieldIcon },
    { id: 'inbox', label: 'AI Unified Inbox', icon: SparklesIcon },
    { id: 'scoring', label: 'Lead Scoring & Copilot', icon: UserIcon },
    { id: 'crm', label: 'CRM & Webhooks', icon: BuildingIcon },
    { id: 'audit', label: 'Security & Audit', icon: CheckCircleIcon },
    { id: 'roi', label: 'Revenue ROI', icon: BarChartIcon },
  ];

  return (
    <div style={{
      display: 'flex',
      gap: 6,
      overflowX: 'auto',
      padding: '8px 12px',
      marginTop: 12,
      background: 'var(--card-bg)',
      backdropFilter: 'blur(20px) saturate(180%)',
      borderRadius: 22,
      border: '1px solid var(--card-border)',
      marginBottom: 26,
      boxShadow: 'var(--card-shadow)'
    }}>
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        const Icon = tab.icon;
        return (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '10px 16px',
              borderRadius: 16,
              border: isActive ? '1px solid rgba(2, 132, 199, 0.35)' : '1px solid transparent',
              background: isActive ? 'linear-gradient(135deg, rgba(2, 132, 199, 0.12), rgba(99, 102, 241, 0.12))' : 'transparent',
              color: isActive ? C.accent : C.text,
              fontWeight: isActive ? 800 : 600,
              fontSize: 13,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
              boxShadow: isActive ? '0 4px 14px rgba(2, 132, 199, 0.12)' : 'none'
            }}>
            <Icon size={16} color={isActive ? C.accent : C.sub} />
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}


// 1. Deliverability Dashboard
export function DeliverabilityView({ flash }) {
  const [data, setData] = useState(null);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [testRes, setTestRes] = useState(null);

  useEffect(() => {
    fetch('/api/deliverability?domain=ziriumai.com')
      .then((r) => r.json())
      .then((d) => setData(d))
      .catch(() => {});
  }, []);

  async function runPlacementTest() {
    if (!subject || !body) return flash('Enter subject and body to run placement test', false);
    const res = await fetch('/api/deliverability', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'placement_test', subject, body }),
    }).then((r) => r.json());
    if (res.ok) {
      setTestRes(res.testResult);
      flash('Inbox placement test complete!');
    }
  }

  if (!data) return <div style={glassCardStyle}>Loading deliverability telemetry...</div>;

  return (
    <div>
      <div style={glassCardStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div>
            <h3 style={{ fontSize: 18, fontWeight: 750, color: C.ink, margin: 0 }}>Domain Health & Authentication</h3>
            <p style={{ fontSize: 13, color: C.sub, margin: '4px 0 0 0' }}>Monitoring domain reputation, SPF/DKIM/DMARC authentication and sending limits.</p>
          </div>
          <div style={{
            padding: '8px 18px',
            borderRadius: 999,
            background: data.status === 'healthy' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(244, 63, 94, 0.15)',
            color: data.status === 'healthy' ? C.green : C.red,
            fontWeight: 700,
            fontSize: 14
          }}>
            Status: {data.status?.toUpperCase()} ({data.healthScore}/100)
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 24 }}>
          <div style={{ background: 'var(--subtle-card-bg)', padding: 16, borderRadius: 14, border: '1px solid var(--card-border)' }}>
            <div style={{ fontSize: 12, color: C.sub }}>SPF Record</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: data.dns?.spf === 'valid' ? C.green : C.amber, marginTop: 4 }}>
              {data.dns?.spf?.toUpperCase()}
            </div>
            <div style={{ fontSize: 11, color: C.muted, marginTop: 4, wordBreak: 'break-all' }}>{data.dns?.spfRecord}</div>
          </div>

          <div style={{ background: 'var(--subtle-card-bg)', padding: 16, borderRadius: 14, border: '1px solid var(--card-border)' }}>
            <div style={{ fontSize: 12, color: C.sub }}>DKIM Signature</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: data.dns?.dkim === 'valid' ? C.green : C.amber, marginTop: 4 }}>
              {data.dns?.dkim?.toUpperCase()}
            </div>
            <div style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>RSA-2048 Verified</div>
          </div>

          <div style={{ background: 'var(--subtle-card-bg)', padding: 16, borderRadius: 14, border: '1px solid var(--card-border)' }}>
            <div style={{ fontSize: 12, color: C.sub }}>DMARC Policy</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: data.dns?.dmarc === 'valid' ? C.green : C.amber, marginTop: 4 }}>
              {data.dns?.dmarc?.toUpperCase()}
            </div>
            <div style={{ fontSize: 11, color: C.muted, marginTop: 4, wordBreak: 'break-all' }}>{data.dns?.dmarcRecord}</div>
          </div>

          <div style={{ background: 'var(--subtle-card-bg)', padding: 16, borderRadius: 14, border: '1px solid var(--card-border)' }}>
            <div style={{ fontSize: 12, color: C.sub }}>Domain Warm-Up Stage</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: C.accent, marginTop: 4 }}>
              Stage {data.warmUpStage} ({data.warmUpDailyLimit} emails/day limit)
            </div>
            <div style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>Auto-ramping gradually</div>
          </div>
        </div>
      </div>

      <div style={glassCardStyle}>
        <h3 style={{ fontSize: 18, fontWeight: 750, color: C.ink, margin: '0 0 12px 0' }}>Inbox Placement Tester</h3>
        <p style={{ fontSize: 13, color: C.sub, marginBottom: 16 }}>Test your campaign subject line and body copy against primary spam filters before launch.</p>

        <input
          type="text"
          placeholder="Subject Line..."
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid var(--input-border)', background: 'var(--input-bg)', color: 'var(--text-primary)', marginBottom: 10, fontSize: 13 }}
        />
        <textarea
          placeholder="Email Body Content..."
          value={body}
          onChange={(e) => setBody(e.target.value)}
          style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid var(--input-border)', background: 'var(--input-bg)', color: 'var(--text-primary)', height: 100, marginBottom: 12, fontSize: 13 }}
        />
        <button
          onClick={runPlacementTest}
          style={{ padding: '10px 20px', borderRadius: 10, background: C.accent, color: '#fff', border: 'none', fontWeight: 650, cursor: 'pointer' }}>
          Simulate Inbox Placement
        </button>

        {testRes && (
          <div style={{ marginTop: 20, padding: 16, background: 'var(--subtle-card-bg)', borderRadius: 12, border: '1px solid var(--card-border)' }}>
            <div style={{ display: 'flex', gap: 20, marginBottom: 10 }}>
              <div>📥 <strong>Inbox:</strong> {testRes.inboxPct}%</div>
              <div>🏷️ <strong>Promotions:</strong> {testRes.promoPct}%</div>
              <div>⚠️ <strong>Spam:</strong> {testRes.spamPct}%</div>
            </div>
            <div style={{ fontSize: 13, color: C.text }}><strong>AI Insight:</strong> {testRes.recommendation}</div>
          </div>
        )}
      </div>
    </div>
  );
}

// 2. Branching Sequences
export function SequencesView({ flash }) {
  const [seqData, setSeqData] = useState(null);

  useEffect(() => {
    fetch('/api/sequences').then((r) => r.json()).then((d) => setSeqData(d)).catch(() => {});
  }, []);

  async function completeTask(taskId) {
    const res = await fetch('/api/sequences', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'complete_task', taskId }),
    }).then((r) => r.json());
    if (res.ok) {
      flash('Task completed');
      fetch('/api/sequences').then((r) => r.json()).then((d) => setSeqData(d));
    }
  }

  if (!seqData) return <div style={glassCardStyle}>Loading sequence logic...</div>;

  return (
    <div>
      <div style={glassCardStyle}>
        <h3 style={{ fontSize: 18, fontWeight: 750, color: C.ink, margin: '0 0 8px 0' }}>Conditional Sequence Engine</h3>
        <p style={{ fontSize: 13, color: C.sub, marginBottom: 16 }}>Branching workflow logic triggered automatically based on recipient actions (Opened, Clicked, Replied, Bounced).</p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {seqData.sequence?.nodes?.map((node, i) => (
            <div key={node.id} style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'var(--subtle-card-bg)', padding: 14, borderRadius: 12, border: '1px solid var(--card-border)' }}>
              <div style={{ width: 28, height: 28, borderRadius: '50%', background: C.accent, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 12 }}>
                {i + 1}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 650, fontSize: 14, color: C.text }}>{node.name}</div>
                <div style={{ fontSize: 12, color: C.sub }}>
                  Type: {node.type} | Delay: {node.delayDays} day(s) | Condition: {node.condition || 'None (Initial Trigger)'}
                </div>
              </div>
              <span style={{ fontSize: 12, background: 'rgba(8, 145, 178, 0.1)', color: '#0891b2', padding: '4px 10px', borderRadius: 8, fontWeight: 600 }}>
                Active Node
              </span>
            </div>
          ))}
        </div>
      </div>

      <div style={glassCardStyle}>
        <h3 style={{ fontSize: 18, fontWeight: 750, color: C.ink, margin: '0 0 12px 0' }}>Multi-Channel Reminder Tasks</h3>
        <p style={{ fontSize: 13, color: C.sub, marginBottom: 16 }}>Manual tasks generated by sequence steps (LinkedIn connections, phone calls, manual touchpoints).</p>

        {(!seqData.tasks || seqData.tasks.length === 0) ? (
          <div style={{ fontSize: 13, color: C.muted }}>No pending multi-channel tasks right now.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {seqData.tasks.map((task) => (
              <div key={task.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--subtle-card-bg)', padding: 12, borderRadius: 10, border: '1px solid var(--card-border)' }}>
                <div>
                  <div style={{ fontWeight: 650, fontSize: 13 }}>{task.description} - {task.company_name}</div>
                  <div style={{ fontSize: 11, color: C.sub }}>Contact: {task.contact_email}</div>
                </div>
                <button onClick={() => completeTask(task.id)} style={{ padding: '6px 14px', borderRadius: 8, background: C.green, color: '#fff', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
                  Mark Done
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// 3. Compliance & Spam Analyzer
export function ComplianceView({ flash }) {
  const [suppressionList, setSuppressionList] = useState([]);
  const [newEmail, setNewEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [spamResult, setSpamResult] = useState(null);

  useEffect(() => {
    fetch('/api/compliance').then((r) => r.json()).then((d) => setSuppressionList(d.suppressionList || [])).catch(() => {});
  }, []);

  async function addSuppression() {
    if (!newEmail) return;
    const res = await fetch('/api/compliance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: newEmail, reason: 'manual' }),
    }).then((r) => r.json());
    if (res.ok) {
      flash(`Added ${newEmail} to suppression list`);
      setNewEmail('');
      fetch('/api/compliance').then((r) => r.json()).then((d) => setSuppressionList(d.suppressionList || []));
    }
  }

  async function checkSpam() {
    const res = await fetch('/api/spam-check', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subject, body }),
    }).then((r) => r.json());
    if (res.ok) {
      setSpamResult(res.result);
      flash('Spam score analyzed!');
    }
  }

  return (
    <div>
      <div style={glassCardStyle}>
        <h3 style={{ fontSize: 18, fontWeight: 750, color: C.ink, margin: '0 0 8px 0' }}>Spam Score Content Analyzer</h3>
        <p style={{ fontSize: 13, color: C.sub, marginBottom: 16 }}>Evaluate body copy and subject line against spam filter rules, trigger words, and formatting guidelines.</p>

        <input type="text" placeholder="Subject line to test..." value={subject} onChange={(e) => setSubject(e.target.value)} style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid var(--input-border)', background: 'var(--input-bg)', color: 'var(--text-primary)', marginBottom: 10, fontSize: 13 }} />
        <textarea placeholder="Email body to test..." value={body} onChange={(e) => setBody(e.target.value)} style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid var(--input-border)', background: 'var(--input-bg)', color: 'var(--text-primary)', height: 90, marginBottom: 12, fontSize: 13 }} />
        <button onClick={checkSpam} style={{ padding: '10px 20px', borderRadius: 10, background: C.accent, color: '#fff', border: 'none', fontWeight: 650, cursor: 'pointer' }}>
          Analyze Spam Score
        </button>

        {spamResult && (
          <div style={{ marginTop: 16, padding: 16, background: 'var(--subtle-card-bg)', borderRadius: 12, border: '1px solid var(--card-border)' }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: spamResult.score > 30 ? C.red : C.green, marginBottom: 8 }}>
              Spam Score: {spamResult.score}/100 ({spamResult.status})
            </div>
            <div style={{ fontSize: 13, color: C.sub, marginBottom: 8 }}>Words: {spamResult.wordCount} | Links: {spamResult.linkCount}</div>
            <ul style={{ margin: 0, paddingLeft: 20, fontSize: 13, color: C.text }}>
              {spamResult.suggestions?.map((s, idx) => (
                <li key={idx} style={{ marginBottom: 4 }}>{s}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div style={glassCardStyle}>
        <h3 style={{ fontSize: 18, fontWeight: 750, color: C.ink, margin: '0 0 8px 0' }}>Permanent Suppression List</h3>
        <p style={{ fontSize: 13, color: C.sub, marginBottom: 16 }}>CAN-SPAM & GDPR compliance list. Outbound emails are automatically blocked for suppressed addresses.</p>

        <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
          <input type="email" placeholder="Enter email to suppress..." value={newEmail} onChange={(e) => setNewEmail(e.target.value)} style={{ flex: 1, padding: '10px 14px', borderRadius: 10, border: '1px solid var(--input-border)', background: 'var(--input-bg)', color: 'var(--text-primary)', fontSize: 13 }} />
          <button onClick={addSuppression} style={{ padding: '10px 20px', borderRadius: 10, background: C.red, color: '#fff', border: 'none', fontWeight: 650, cursor: 'pointer' }}>
            Suppress Email
          </button>
        </div>

        <div style={{ maxHeight: 200, overflowY: 'auto' }}>
          {suppressionList.length === 0 ? (
            <div style={{ fontSize: 13, color: C.muted }}>No suppressed emails recorded yet.</div>
          ) : (
            <table style={{ width: '100%', textAlign: 'left', fontSize: 13, borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--card-border)', color: C.sub, background: 'var(--table-header-bg)' }}>
                  <th style={{ padding: 8 }}>Email</th>
                  <th style={{ padding: 8 }}>Reason</th>
                  <th style={{ padding: 8 }}>Source</th>
                  <th style={{ padding: 8 }}>Date</th>
                </tr>
              </thead>
              <tbody>
                {suppressionList.map((item) => (
                  <tr key={item.id} style={{ borderBottom: '1px solid var(--card-border)' }}>
                    <td style={{ padding: 8, fontWeight: 600 }}>{item.email}</td>
                    <td style={{ padding: 8 }}>{item.reason}</td>
                    <td style={{ padding: 8 }}>{item.source}</td>
                    <td style={{ padding: 8, color: C.muted }}>{item.created_at}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

// 4. AI Unified Inbox
export function UnifiedInboxView({ flash }) {
  const [replies, setReplies] = useState([]);

  useEffect(() => {
    fetch('/api/inbox').then((r) => r.json()).then((d) => setReplies(d.replies || [])).catch(() => {});
  }, []);

  async function pollReplies() {
    flash('Polling IMAP inboxes...');
    const res = await fetch('/api/inbox', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'poll' }),
    }).then((r) => r.json());
    if (res.ok) {
      flash(res.found ? `Found ${res.found} new replies!` : 'No new replies found.');
      fetch('/api/inbox').then((r) => r.json()).then((d) => setReplies(d.replies || []));
    }
  }

  return (
    <div style={glassCardStyle}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <h3 style={{ fontSize: 18, fontWeight: 750, color: C.ink, margin: 0 }}>AI Unified Aggregated Inbox</h3>
          <p style={{ fontSize: 13, color: C.sub, margin: '4px 0 0 0' }}>Multi-mailbox reply aggregation classified automatically into intent categories.</p>
        </div>
        <button onClick={pollReplies} style={{ padding: '8px 18px', borderRadius: 10, background: C.accent, color: '#fff', border: 'none', fontWeight: 650, cursor: 'pointer' }}>
          🔄 Sync All Mailboxes
        </button>
      </div>

      {replies.length === 0 ? (
        <div style={{ fontSize: 13, color: C.muted, padding: 20, textAlign: 'center' }}>No incoming replies recorded yet.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {replies.map((reply) => (
            <div key={reply.id} style={{ background: 'var(--subtle-card-bg)', padding: 16, borderRadius: 14, border: '1px solid var(--card-border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontWeight: 700, fontSize: 14 }}>{reply.from_email} ({reply.company_name || 'Prospect'})</span>
                <span style={{ padding: '3px 10px', borderRadius: 999, background: 'rgba(124, 58, 237, 0.15)', color: '#7c3aed', fontWeight: 700, fontSize: 11 }}>
                  {reply.status?.toUpperCase()}
                </span>
              </div>
              <div style={{ fontSize: 13, fontWeight: 600, color: C.ink, marginBottom: 4 }}>Subject: {reply.subject}</div>
              <div style={{ fontSize: 12, color: C.sub, marginBottom: 8, background: 'var(--input-bg)', color: 'var(--text-primary)', padding: 8, borderRadius: 8 }}>"{reply.snippet}"</div>
              {reply.notes && (
                <div style={{ fontSize: 12, color: C.accent, fontWeight: 600, background: 'rgba(21, 151, 200, 0.08)', padding: 8, borderRadius: 8 }}>
                  💡 {reply.notes}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// 5. Lead Scoring & Copilot
export function ScoringCopilotView({ flash }) {
  const [scores, setScores] = useState([]);
  const [copilot, setCopilot] = useState(null);

  useEffect(() => {
    fetch('/api/lead-score').then((r) => r.json()).then((d) => setScores(d.leadScores || [])).catch(() => {});
    fetch('/api/copilot').then((r) => r.json()).then((d) => setCopilot(d)).catch(() => {});
  }, []);

  return (
    <div>
      <div style={glassCardStyle}>
        <h3 style={{ fontSize: 18, fontWeight: 750, color: C.ink, margin: '0 0 8px 0' }}>AI Campaign Sequence Copilot</h3>
        <p style={{ fontSize: 13, color: C.sub, marginBottom: 16 }}>Real-time recommendations for subject optimization, CTA improvements, and predictive send timing.</p>

        {copilot?.recommendations?.map((rec) => (
          <div key={rec.id} style={{ background: 'var(--subtle-card-bg)', padding: 14, borderRadius: 12, border: '1px solid var(--card-border)', marginBottom: 10 }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: C.ink }}>{rec.title}</div>
            <div style={{ fontSize: 12, color: C.sub, margin: '4px 0' }}>{rec.insight}</div>
            <div style={{ fontSize: 13, color: C.accent, fontWeight: 600 }}>👉 {rec.action}</div>
          </div>
        ))}
      </div>

      <div style={glassCardStyle}>
        <h3 style={{ fontSize: 18, fontWeight: 750, color: C.ink, margin: '0 0 8px 0' }}>AI Lead Scoring & Conversion Probabilities</h3>
        <p style={{ fontSize: 13, color: C.sub, marginBottom: 16 }}>Predictive probability calculation based on firmographic signals, site data, and past engagement.</p>

        {scores.length === 0 ? (
          <div style={{ fontSize: 13, color: C.muted }}>No company lead scores available yet.</div>
        ) : (
          <table style={{ width: '100%', textAlign: 'left', fontSize: 13, borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--card-border)', color: C.sub, background: 'var(--table-header-bg)' }}>
                <th style={{ padding: 8 }}>Company</th>
                <th style={{ padding: 8 }}>Email</th>
                <th style={{ padding: 8 }}>Score</th>
                <th style={{ padding: 8 }}>Conversion Prob.</th>
              </tr>
            </thead>
            <tbody>
              {scores.map((s) => (
                <tr key={s.companyId} style={{ borderBottom: '1px solid var(--card-border)' }}>
                  <td style={{ padding: 8, fontWeight: 650 }}>{s.companyName}</td>
                  <td style={{ padding: 8 }}>{s.email}</td>
                  <td style={{ padding: 8, fontWeight: 700, color: s.score > 70 ? C.green : C.amber }}>{s.score}/100</td>
                  <td style={{ padding: 8 }}>{(s.conversionProb * 100).toFixed(0)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// 6. CRM & Webhooks
export function CrmView({ flash }) {
  const [webhookUrl, setWebhookUrl] = useState('');
  const [testStatus, setTestStatus] = useState('');

  async function saveIntegration(provider) {
    const res = await fetch('/api/crm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider, webhookUrl }),
    }).then((r) => r.json());
    if (res.ok) flash(`${provider} integration saved!`);
  }

  async function testSync(provider) {
    setTestStatus('Testing sync...');
    const res = await fetch('/api/crm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'test_sync', provider }),
    }).then((r) => r.json());
    setTestStatus(res.result?.message || 'Sync complete.');
  }

  return (
    <div style={glassCardStyle}>
      <h3 style={{ fontSize: 18, fontWeight: 750, color: C.ink, margin: '0 0 8px 0' }}>CRM Integrations & Webhooks</h3>
      <p style={{ fontSize: 13, color: C.sub, marginBottom: 20 }}>Sync outreach events, replies, and campaign statuses seamlessly to external CRMs.</p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ background: 'var(--subtle-card-bg)', padding: 16, borderRadius: 14, border: '1px solid var(--card-border)' }}>
          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>HubSpot Direct Sync</div>
          <div style={{ fontSize: 12, color: C.sub, marginBottom: 10 }}>Sync contact activities, sent emails, and reply statuses directly.</div>
          <button onClick={() => testSync('hubspot')} style={{ padding: '8px 16px', borderRadius: 8, background: C.accent, color: '#fff', border: 'none', fontWeight: 600, cursor: 'pointer', fontSize: 12 }}>
            Test HubSpot Sync
          </button>
        </div>

        <div style={{ background: 'var(--subtle-card-bg)', padding: 16, borderRadius: 14, border: '1px solid var(--card-border)' }}>
          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>Salesforce Sync</div>
          <div style={{ fontSize: 12, color: C.sub, marginBottom: 10 }}>Sync leads and meeting outcomes into Salesforce CRM accounts.</div>
          <button onClick={() => testSync('salesforce')} style={{ padding: '8px 16px', borderRadius: 8, background: C.accent, color: '#fff', border: 'none', fontWeight: 600, cursor: 'pointer', fontSize: 12 }}>
            Test Salesforce Sync
          </button>
        </div>

        <div style={{ background: 'var(--subtle-card-bg)', padding: 16, borderRadius: 14, border: '1px solid var(--card-border)' }}>
          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>Outbound Webhooks (Zapier & Make Ready)</div>
          <div style={{ fontSize: 12, color: C.sub, marginBottom: 10 }}>Receive real-time HTTP POST notifications on email sends, opens, clicks, and replies.</div>
          <input
            type="text"
            placeholder="https://your-server.com/webhook-endpoint"
            value={webhookUrl}
            onChange={(e) => setWebhookUrl(e.target.value)}
            style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid var(--input-border)', background: 'var(--input-bg)', color: 'var(--text-primary)', fontSize: 13, marginBottom: 10 }}
          />
          <button onClick={() => saveIntegration('webhook')} style={{ padding: '8px 16px', borderRadius: 8, background: C.green, color: '#fff', border: 'none', fontWeight: 600, cursor: 'pointer', fontSize: 12 }}>
            Save Webhook Configuration
          </button>
        </div>

        {testStatus && <div style={{ fontSize: 13, color: C.green, fontWeight: 600 }}>{testStatus}</div>}
      </div>
    </div>
  );
}

// 7. Security & Audit Log
export function SecurityAuditView() {
  const [logs, setLogs] = useState([]);
  const [role, setRole] = useState('Admin');

  useEffect(() => {
    fetch('/api/audit').then((r) => r.json()).then((d) => setLogs(d.auditLogs || [])).catch(() => {});
  }, []);

  return (
    <div>
      <div style={glassCardStyle}>
        <h3 style={{ fontSize: 18, fontWeight: 750, color: C.ink, margin: '0 0 8px 0' }}>Role-Based Access Control (RBAC)</h3>
        <p style={{ fontSize: 13, color: C.sub, marginBottom: 16 }}>Manage active permissions and workspace security roles.</p>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <span style={{ fontSize: 13, color: C.text, fontWeight: 600 }}>Current User Role:</span>
          <select value={role} onChange={(e) => setRole(e.target.value)} style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid var(--input-border)', background: 'var(--input-bg)', color: 'var(--text-primary)', fontWeight: 600 }}>
            <option value="Admin">Admin (Full Control)</option>
            <option value="Manager">Manager (Campaign & Lead Admin)</option>
            <option value="Sender">Sender (Execute Outreach)</option>
            <option value="Viewer">Viewer (Read-Only Analytics)</option>
          </select>
        </div>
      </div>

      <div style={glassCardStyle}>
        <h3 style={{ fontSize: 18, fontWeight: 750, color: C.ink, margin: '0 0 8px 0' }}>Enterprise Audit Trail</h3>
        <p style={{ fontSize: 13, color: C.sub, marginBottom: 16 }}>Persistent audit-grade event stream for security compliance.</p>

        {logs.length === 0 ? (
          <div style={{ fontSize: 13, color: C.muted }}>No audit logs recorded yet.</div>
        ) : (
          <div style={{ maxHeight: 300, overflowY: 'auto' }}>
            <table style={{ width: '100%', textAlign: 'left', fontSize: 13, borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--card-border)', color: C.sub, background: 'var(--table-header-bg)' }}>
                  <th style={{ padding: 8 }}>Role</th>
                  <th style={{ padding: 8 }}>Action</th>
                  <th style={{ padding: 8 }}>Target</th>
                  <th style={{ padding: 8 }}>Timestamp</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id} style={{ borderBottom: '1px solid var(--card-border)' }}>
                    <td style={{ padding: 8, fontWeight: 600 }}>{log.user_role}</td>
                    <td style={{ padding: 8 }}>{log.action}</td>
                    <td style={{ padding: 8 }}>{log.target || 'System'}</td>
                    <td style={{ padding: 8, color: C.muted }}>{log.created_at}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// 8. Revenue Attribution & ROI
export function RevenueRoiView() {
  const [metrics, setMetrics] = useState(null);

  useEffect(() => {
    fetch('/api/attribution').then((r) => r.json()).then((d) => setMetrics(d.metrics)).catch(() => {});
  }, []);

  if (!metrics) return <div style={glassCardStyle}>Loading revenue metrics...</div>;

  return (
    <div style={glassCardStyle}>
      <h3 style={{ fontSize: 18, fontWeight: 750, color: C.ink, margin: '0 0 8px 0' }}>Revenue Attribution & ROI Analytics</h3>
      <p style={{ fontSize: 13, color: C.sub, marginBottom: 20 }}>Financial calculation of outreach expenses vs. pipeline deal attribution value.</p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
        <div style={{ background: 'var(--subtle-card-bg)', padding: 16, borderRadius: 14, border: '1px solid var(--card-border)' }}>
          <div style={{ fontSize: 12, color: C.sub }}>Total Cost (SMTP + AI API)</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: C.ink, marginTop: 4 }}>${metrics.totalCost}</div>
          <div style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>SMTP: ${metrics.totalSmtpCost} | AI: ${metrics.totalAiCost}</div>
        </div>

        <div style={{ background: 'var(--subtle-card-bg)', padding: 16, borderRadius: 14, border: '1px solid var(--card-border)' }}>
          <div style={{ fontSize: 12, color: C.sub }}>Cost Per Reply</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: C.accent, marginTop: 4 }}>${metrics.costPerReply}</div>
          <div style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>Across {metrics.totalReplies} total replies</div>
        </div>

        <div style={{ background: 'var(--subtle-card-bg)', padding: 16, borderRadius: 14, border: '1px solid var(--card-border)' }}>
          <div style={{ fontSize: 12, color: C.sub }}>Cost Per Qualified Meeting</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: C.green, marginTop: 4 }}>${metrics.costPerMeeting}</div>
          <div style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>Across {metrics.interestedReplies} interested leads</div>
        </div>

        <div style={{ background: 'var(--subtle-card-bg)', padding: 16, borderRadius: 14, border: '1px solid var(--card-border)' }}>
          <div style={{ fontSize: 12, color: C.sub }}>Pipeline Deal Value</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: C.green, marginTop: 4 }}>${metrics.estimatedPipelineRevenue}</div>
          <div style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>ROI: {metrics.netRoiPct}%</div>
        </div>
      </div>
    </div>
  );
}
