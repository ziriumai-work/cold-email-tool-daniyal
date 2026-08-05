import { useState } from 'react';
import { C, REPLY_STAGES, stageColor, inputStyle, btn } from './constants.js';
import { Section, Badge, Empty } from './UIElements.jsx';
import { ReplyCard } from './ReplyCard.jsx';
import { RefreshIcon, MailIcon } from './Icons.jsx';

export function RepliesSection({ replies, busy, checkReplies, updateReply }) {
  const [expandedReplyId, setExpandedReplyId] = useState(null);

  return (
    <Section title={`Inbox & Replies (${replies.length})`} kicker="Prospect Communication"
      right={
        <button style={{
          ...btn(C.accent, true),
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          padding: '8px 16px',
          borderRadius: 12,
          fontSize: 13,
          fontWeight: 700
        }} onClick={checkReplies} disabled={!!busy}>
          <RefreshIcon size={15} color={C.accent} />
          {busy === 'replies' ? 'Checking Inbox…' : 'Check Replies Now'}
        </button>
      }>
      {replies.length === 0 ? (
        <Empty icon={MailIcon}>No replies yet. When a prospect responds to your cold outreach, their message will appear here automatically.</Empty>
      ) : (
        (() => {
          const sortedReplies = [...replies].sort((a, b) => b.id - a.id);
          const activeReplyId = expandedReplyId === 'collapsed'
            ? null
            : (sortedReplies.some((r) => r.id === expandedReplyId) ? expandedReplyId : sortedReplies[0]?.id);

          return (
            <>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 16, fontSize: 12, color: C.sub }}>
                {REPLY_STAGES.map(([v, label, col]) => {
                  const n = replies.filter((r) => (r.status || 'new') === v).length;
                  return n > 0 ? (
                    <span key={v} style={{
                      color: col,
                      fontWeight: 700,
                      background: col + '14',
                      border: `1px solid ${col}33`,
                      padding: '4px 12px',
                      borderRadius: 999
                    }}>
                      {n} {label}
                    </span>
                  ) : null;
                })}
              </div>

              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                marginBottom: 16,
                background: 'var(--subtle-card-bg)',
                padding: '10px 18px',
                borderRadius: 18,
                border: '1px solid var(--card-border)',
                backdropFilter: 'blur(12px)',
                flexWrap: 'wrap'
              }}>
                <span style={{ fontSize: 13, fontWeight: 750, color: C.ink, whiteSpace: 'nowrap' }}>
                  Focus Reply:
                </span>
                <select
                  value={activeReplyId || 'collapsed'}
                  onChange={(e) => setExpandedReplyId(e.target.value === 'collapsed' ? 'collapsed' : Number(e.target.value))}
                  style={{
                    ...inputStyle,
                    flex: 1,
                    minWidth: 200,
                    padding: '7px 14px',
                    borderRadius: 12,
                    fontWeight: 650,
                    background: 'var(--input-bg)'
                  }}>
                  <option value="collapsed">-- Collapse all replies --</option>
                  {sortedReplies.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.company_name || r.from_email} — {r.subject || '(no subject)'} [{r.status || 'new'}]
                    </option>
                  ))}
                </select>
              </div>

              {sortedReplies.map((r) => {
                const isExpanded = r.id === activeReplyId;
                if (isExpanded) {
                  return (
                    <ReplyCard
                      key={r.id}
                      r={r}
                      onUpdate={updateReply}
                      onCollapse={() => setExpandedReplyId('collapsed')}
                    />
                  );
                }
                return (
                  <div
                    key={r.id}
                    onClick={() => setExpandedReplyId(r.id)}
                    style={{
                      background: 'var(--card-bg)',
                      backdropFilter: 'blur(16px)',
                      border: '1px solid var(--card-border)',
                      borderLeft: `4px solid ${stageColor(r.status || 'new')}`,
                      borderRadius: 18,
                      padding: '14px 20px',
                      marginBottom: 12,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 14,
                      transition: 'all 0.2s ease',
                      boxShadow: 'var(--card-shadow)'
                    }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, overflow: 'hidden' }}>
                      <strong style={{ color: C.ink, fontSize: 15, fontWeight: 750, minWidth: 150, flexShrink: 0 }}>
                        {r.company_name || r.from_email}
                      </strong>
                      <span style={{ color: C.sub, fontSize: 13, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', fontWeight: 500 }}>
                        {r.subject || '(no subject)'}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                      <Badge color={stageColor(r.status || 'new')}>{r.status || 'new'}</Badge>
                      <span style={{ fontSize: 12, color: C.accent, fontWeight: 700 }}>View Message ▼</span>
                    </div>
                  </div>
                );
              })}
            </>
          );
        })()
      )}
    </Section>
  );
}

