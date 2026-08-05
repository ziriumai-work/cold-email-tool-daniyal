import { useState, useEffect } from 'react';
import { C, US_TZS, statusColor, statusLabel, inputStyle, lbl, btn, btnSm, fmtInTz } from './constants.js';
import { Badge } from './UIElements.jsx';
import { CheckCircleIcon, SendIcon, ClockIcon, TrashIcon, SparklesIcon, MailIcon, ExternalLinkIcon } from './Icons.jsx';

export function DraftCard({ d, senders, replies = [], onUpdate, onSend, onScheduleOpen, onUnschedule, sending, displayTz, onCollapse }) {
  const [subject, setSubject] = useState(d.subject || '');
  const [body, setBody] = useState(d.body || '');
  const [draftSenderKey, setDraftSenderKey] = useState(d.sender_key || '');
  const [showResearch, setShowResearch] = useState(false);
  const [previewMode, setPreviewMode] = useState('edit'); // 'edit' | 'preview'

  useEffect(() => {
    setSubject(d.subject || '');
    setBody(d.body || '');
    setDraftSenderKey(d.sender_key || '');
  }, [d.id, d.subject, d.body, d.sender_key]);

  const dirty = subject !== d.subject || body !== d.body || draftSenderKey !== (d.sender_key || '');
  const isSent = d.status === 'sent' || !!d.sent_at || !!d.message_id;
  const isReplied = d.status === 'replied' || !!d.replied_at;
  const effectiveStatus = isReplied ? 'replied' : isSent ? 'sent' : d.status;
  const locked = isSent || isReplied;
  const scheduled = d.status === 'scheduled';
  const editLocked = locked || scheduled;
  const tzLabel = (US_TZS.find((t) => t[0] === d.scheduled_tz) || [, ''])[1];
  const matchReply = replies.find((r) => r.draft_id === d.id);
  const currentSender = senders.find((s) => s.key === (draftSenderKey || d.sender_key)) || senders[0] || {};

  return (
    <div style={{
      background: 'var(--card-bg)',
      backdropFilter: 'blur(20px) saturate(180%)',
      WebkitBackdropFilter: 'blur(20px) saturate(180%)',
      border: '1px solid var(--card-border)',
      borderRadius: 24,
      padding: 24,
      marginBottom: 20,
      boxShadow: 'var(--card-shadow)',
      transition: 'all 0.25s ease'
    }}>
      {/* Header Info Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 14, marginBottom: 14 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <strong style={{ color: C.ink, fontSize: 17, fontWeight: 800, letterSpacing: '-0.02em' }}>{d.company_name}</strong>
            <Badge color={statusColor[effectiveStatus] || C.sub}>{statusLabel[effectiveStatus] || effectiveStatus}</Badge>
          </div>
          <div style={{ color: C.sub, fontSize: 13, marginTop: 4, fontWeight: 500 }}>
            Recipient: <strong>{d.contact_email || 'No contact email'}</strong>
            {d.sender_email && ` · From: ${d.sender_name || d.sender_email}`}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* Mode Switcher */}
          <div style={{
            display: 'flex',
            background: 'var(--input-bg)',
            border: '1px solid var(--input-border)',
            borderRadius: 999,
            padding: 3,
            gap: 2
          }}>
            <button onClick={() => setPreviewMode('edit')}
              style={{
                padding: '4px 12px',
                borderRadius: 999,
                fontSize: 11,
                fontWeight: previewMode === 'edit' ? 750 : 600,
                border: 'none',
                background: previewMode === 'edit' ? 'var(--card-bg)' : 'transparent',
                color: previewMode === 'edit' ? C.ink : C.sub,
                cursor: 'pointer',
                boxShadow: previewMode === 'edit' ? '0 2px 6px rgba(15, 23, 42, 0.08)' : 'none'
              }}>
              ✏️ Edit
            </button>
            <button onClick={() => setPreviewMode('preview')}
              style={{
                padding: '4px 12px',
                borderRadius: 999,
                fontSize: 11,
                fontWeight: previewMode === 'preview' ? 750 : 600,
                border: 'none',
                background: previewMode === 'preview' ? C.accent : 'transparent',
                color: previewMode === 'preview' ? '#ffffff' : C.sub,
                cursor: 'pointer',
                boxShadow: previewMode === 'preview' ? '0 2px 8px rgba(2, 132, 199, 0.3)' : 'none'
              }}>
              👁️ Email Client Preview
            </button>
          </div>

          {onCollapse && (
            <button style={{ ...btnSm(C.sub, true), padding: '4px 10px', fontSize: 11, borderRadius: 999 }} onClick={onCollapse}>
              Collapse ▲
            </button>
          )}
        </div>
      </div>

      {/* Reply Banner */}
      {(matchReply || d.status === 'replied') && (
        <div style={{
          background: 'rgba(236, 253, 245, 0.15)',
          border: '1px solid rgba(167, 243, 208, 0.4)',
          borderRadius: 18,
          padding: '16px 20px',
          marginBottom: 16,
          boxShadow: '0 6px 18px rgba(16, 185, 129, 0.08)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className="pulse-dot" style={{ width: 8, height: 8, borderRadius: '50%', background: C.green, display: 'inline-block' }} />
              <strong style={{ color: C.green, fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 800 }}>
                Email Reply Received ({matchReply?.from_email || d.contact_email})
              </strong>
            </div>
            {matchReply?.received_at && (
              <span style={{ fontSize: 11, color: C.sub, fontWeight: 600 }}>
                {fmtInTz(matchReply.received_at, displayTz)}
              </span>
            )}
          </div>
          {matchReply?.subject && (
            <div style={{ fontWeight: 750, fontSize: 14, color: C.ink, marginBottom: 4 }}>
              {matchReply.subject}
            </div>
          )}
          <div style={{ fontSize: 13, color: C.text, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
            {matchReply?.response || matchReply?.snippet || matchReply?.body || d.reply_snippet || '(Email reply received. Check replies tab for details.)'}
          </div>
        </div>
      )}

      {/* Tracking Info & Research Drawer Toggle */}
      <div style={{ color: C.sub, fontSize: 12, marginBottom: 16, display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
        {d.sent_at && <span style={{ fontWeight: 600 }}>Sent {d.sent_at} UTC</span>}
        {d.tracking_id && (
          <div style={{
            display: 'inline-flex',
            gap: 8,
            alignItems: 'center',
            background: 'var(--subtle-card-bg)',
            border: `1px solid ${C.accent}33`,
            borderRadius: 999,
            padding: '5px 14px',
            color: C.ink,
            fontWeight: 650,
            flexWrap: 'wrap',
            backdropFilter: 'blur(8px)',
            boxShadow: '0 2px 8px rgba(15, 23, 42, 0.03)'
          }}>
            <span style={{ color: C.accent, fontWeight: 800 }}>Live Tracking:</span>
            <span style={{ background: C.accent + '1a', color: C.accent, borderRadius: 999, padding: '2px 10px', fontSize: 11, fontWeight: 750 }}>
              Opens: {d.open_count ?? 0}
            </span>
            <span style={{ background: C.green + '1a', color: C.green, borderRadius: 999, padding: '2px 10px', fontSize: 11, fontWeight: 750 }}>
              Clicks: {d.click_count ?? 0}
            </span>
            <span style={{ background: 'var(--input-bg)', color: C.text, borderRadius: 999, padding: '2px 10px', fontSize: 11, border: `1px solid ${C.border}` }}>
              Last open: {d.last_opened_at ? fmtInTz(d.last_opened_at, displayTz) : 'never'}
            </span>
          </div>
        )}
        <button onClick={() => setShowResearch((s) => !s)}
          style={{ background: 'none', border: 'none', color: C.accent, cursor: 'pointer', padding: 0, fontSize: 12, fontWeight: 700 }}>
          {showResearch ? 'Hide AI Research ▲' : 'Show AI Research ▼'}
        </button>
      </div>

      {scheduled && (
        <div style={{ background: 'rgba(224, 242, 254, 0.15)', border: `1px solid ${statusColor.scheduled}44`, color: '#0891b2', borderRadius: 16, padding: 14, fontSize: 13, marginBottom: 16, backdropFilter: 'blur(8px)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
          <ClockIcon size={16} color="#0891b2" />
          <span>Scheduled for <strong>{fmtInTz(d.scheduled_at, d.scheduled_tz)}</strong> ({tzLabel}) · {d.scheduled_at} UTC</span>
        </div>
      )}
      {d.status === 'error' && d.error && (
        <div style={{ background: 'rgba(254, 242, 242, 0.15)', border: `1px solid ${C.red}44`, color: '#f43f5e', borderRadius: 16, padding: 14, fontSize: 13, marginBottom: 16, fontWeight: 600 }}>
          ⚠️ Delivery Error: {d.error}
        </div>
      )}
      {showResearch && (
        <div style={{ background: 'var(--subtle-card-bg)', border: `1px solid ${C.border}`, borderRadius: 16, padding: 16, fontSize: 13, color: C.ink, marginBottom: 16, whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
          <div style={{ fontWeight: 800, color: C.accent, marginBottom: 6, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.04em' }}>🧠 AI Prospect Deep Research & Strategy</div>
          {d.research_summary || 'No deep research log available for this prospect.'}
        </div>
      )}

      {/* Main Content Area: Edit vs Preview Mode */}
      {previewMode === 'edit' ? (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: senders.length > 0 ? '1.2fr .8fr' : '1fr', gap: 14, marginBottom: 12 }}>
            <div>
              <label style={lbl}>Email Subject Line</label>
              <input value={subject} onChange={(e) => setSubject(e.target.value)} style={{ ...inputStyle, fontWeight: 650 }} disabled={editLocked} />
            </div>
            {senders.length > 0 && (
              <div>
                <label style={lbl}>Sender Profile</label>
                <select value={draftSenderKey || senders[0]?.key || ''} onChange={(e) => setDraftSenderKey(e.target.value)}
                  style={{ ...inputStyle, fontWeight: 600 }} disabled={editLocked}>
                  {senders.map((s) => <option key={s.key} value={s.key}>{s.name} &lt;{s.email}&gt;</option>)}
                </select>
              </div>
            )}
          </div>
          <label style={lbl}>Email Body Content</label>
          <textarea value={body} onChange={(e) => setBody(e.target.value)} disabled={editLocked}
            style={{ ...inputStyle, minHeight: 180, resize: 'vertical', fontFamily: 'inherit', whiteSpace: 'pre-wrap', lineHeight: 1.65, fontSize: 14 }} />
        </>
      ) : (
        /* Email Client Live Preview Mockup Box */
        <div style={{
          border: '1px solid var(--preview-border)',
          borderRadius: 18,
          background: 'var(--preview-bg)',
          overflow: 'hidden',
          marginBottom: 16,
          boxShadow: 'var(--card-shadow)'
        }}>
          {/* Email Header Bar */}
          <div style={{ background: 'var(--preview-header-bg)', padding: '14px 20px', borderBottom: '1px solid var(--preview-border)', display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: C.accent, color: '#fff', fontWeight: 800, display: 'flex', alignItems: 'center', justifyCenter: 'center', fontSize: 14 }}>
                {(currentSender.name || 'S').charAt(0).toUpperCase()}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 800, fontSize: 14, color: 'var(--text-primary)' }}>{currentSender.name || 'Sender'} &lt;{currentSender.email || 'sender@domain.com'}&gt;</div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>To: {d.contact_email || 'recipient@company.com'}</div>
              </div>
              <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>Gmail / Outlook Preview</span>
            </div>
            <div style={{ fontWeight: 800, fontSize: 15, color: 'var(--text-primary)', marginTop: 4 }}>
              Subject: {subject || '(No Subject Line)'}
            </div>
          </div>
          {/* Email Body */}
          <div style={{ padding: 22, color: 'var(--text-primary)', fontSize: 14, lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
            {body || '(Empty email body)'}
          </div>
        </div>
      )}

      {/* Action Toolbar */}
      <div style={{ display: 'flex', gap: 10, marginTop: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        {locked ? (
          <div style={{
            background: 'rgba(236, 253, 245, 0.25)',
            border: '1px solid rgba(167, 243, 208, 0.5)',
            color: C.green,
            borderRadius: 16,
            padding: '10px 18px',
            fontSize: 14,
            fontWeight: 750,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8
          }}>
            <CheckCircleIcon size={18} color={C.green} />
            Email Sent Successfully{d.contact_email ? ` to ${d.contact_email}` : ''}
          </div>
        ) : d.status === 'rejected' ? (
          <div style={{
            background: 'rgba(254, 242, 242, 0.25)',
            border: `1px solid ${C.red}44`,
            color: C.red,
            borderRadius: 16,
            padding: '10px 18px',
            fontSize: 14,
            fontWeight: 750,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8
          }}>
            <TrashIcon size={16} color={C.red} />
            Draft Rejected
          </div>
        ) : scheduled ? (
          <>
            <button style={{ ...btn(C.green), display: 'inline-flex', alignItems: 'center', gap: 6 }} disabled={sending} onClick={() => onSend(d.id)}>
              <SendIcon size={14} color="#fff" />
              {sending ? 'Sending…' : 'Send Now'}
            </button>
            <button style={{ ...btn(statusColor.scheduled, true), display: 'inline-flex', alignItems: 'center', gap: 6 }} onClick={() => onScheduleOpen(d)}>
              <ClockIcon size={14} color={statusColor.scheduled} />
              Reschedule
            </button>
            <button style={btn(C.amber, true)} onClick={() => onUnschedule(d.id)}>Cancel Schedule</button>
          </>
        ) : (
          <>
            {dirty && (
              <button style={{ ...btn(C.accent), display: 'inline-flex', alignItems: 'center', gap: 6 }} onClick={() => onUpdate(d.id, { subject, body, senderKey: draftSenderKey })}>
                <SparklesIcon size={14} color="#fff" />
                Save Changes
              </button>
            )}
            {d.status !== 'approved' && (
              <button style={{ ...btn(C.green), display: 'inline-flex', alignItems: 'center', gap: 6 }} onClick={() => onUpdate(d.id, { subject, body, senderKey: draftSenderKey, status: 'approved' })}>
                <CheckCircleIcon size={15} color="#fff" />
                Approve Draft
              </button>
            )}
            {d.status === 'approved' && (
              <>
                <button style={{ ...btn(C.green), display: 'inline-flex', alignItems: 'center', gap: 6 }} disabled={sending || !d.contact_email}
                  title={!d.contact_email ? 'No contact email' : ''}
                  onClick={() => onSend(d.id)}>
                  <SendIcon size={15} color="#fff" />
                  {sending ? 'Sending…' : 'Send Now'}
                </button>
                <button style={{ ...btn(statusColor.scheduled, true), display: 'inline-flex', alignItems: 'center', gap: 6 }} disabled={!d.contact_email}
                  title={!d.contact_email ? 'No contact email' : ''}
                  onClick={() => onScheduleOpen(d)}>
                  <ClockIcon size={14} color={statusColor.scheduled} />
                  Schedule Send
                </button>
              </>
            )}
            <button style={{ ...btn(C.red, true), display: 'inline-flex', alignItems: 'center', gap: 6 }} onClick={() => onUpdate(d.id, { status: 'rejected' })}>
              <TrashIcon size={14} color={C.red} />
              Reject
            </button>
          </>
        )}
      </div>
    </div>
  );
}

