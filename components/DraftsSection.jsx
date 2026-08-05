import { useState } from 'react';
import { C, statusColor, inputStyle, btn } from './constants.js';
import { Section, Badge, Empty, SearchInput } from './UIElements.jsx';
import { DraftCard } from './DraftCard.jsx';
import { CheckCircleIcon, SendIcon, MailIcon } from './Icons.jsx';

export function DraftsSection({
  drafts,
  senders,
  replies,
  busy,
  updateDraft,
  sendOne,
  setSchedModal,
  unschedule,
  displayTz,
  approveAllPending,
  promptSendAllApproved
}) {
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [expandedDraftId, setExpandedDraftId] = useState(null);

  return (
    <Section title={`Drafts & Outreach Queue (${drafts.length})`} kicker="Human Approval Queue"
      right={
        drafts.length > 0 && (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button style={{
              ...btn(C.green, true),
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 16px',
              borderRadius: 12,
              fontSize: 13,
              fontWeight: 700
            }} onClick={approveAllPending} disabled={!!busy}>
              <CheckCircleIcon size={15} color={C.green} />
              Approve All Pending
            </button>
            <button style={{
              ...btn(C.accent),
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 18px',
              borderRadius: 12,
              fontSize: 13,
              fontWeight: 700
            }} onClick={promptSendAllApproved} disabled={!!busy}>
              <SendIcon size={15} color="#fff" />
              {busy.startsWith('send-all:') ? `Sending ${busy.slice(9)}…` : 'Send All Approved'}
            </button>
          </div>
        )
      }>
      {drafts.length === 0 ? (
        <Empty icon={MailIcon}>Generated drafts will appear here for human review and approval.</Empty>
      ) : (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', gap: 6, overflowX: 'auto', flexWrap: 'wrap' }}>
              {['all', 'pending', 'approved', 'scheduled', 'sent', 'replied', 'rejected', 'error'].map((f) => {
                const n = f === 'all' ? drafts.length : drafts.filter((d) => {
                  const isSent = d.status === 'sent' || !!d.sent_at || !!d.message_id;
                  const isReplied = d.status === 'replied' || !!d.replied_at;
                  const eff = isReplied ? 'replied' : isSent ? 'sent' : d.status;
                  return eff === f;
                }).length;
                const active = filter === f;
                return (
                  <button key={f} onClick={() => setFilter(f)}
                    style={{
                      background: active ? 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)' : 'var(--input-bg)',
                      color: active ? '#ffffff' : C.sub,
                      border: active ? '1px solid rgba(255,255,255,0.3)' : '1px solid var(--input-border)',
                      borderRadius: 999,
                      padding: '5px 14px',
                      fontSize: 12,
                      fontWeight: active ? 750 : 600,
                      cursor: 'pointer',
                      textTransform: 'capitalize',
                      backdropFilter: 'blur(8px)',
                      boxShadow: active ? '0 4px 12px rgba(2, 132, 199, 0.3)' : '0 2px 4px rgba(15, 23, 42, 0.02)',
                    }}>
                    {f} {n > 0 && `(${n})`}
                  </button>
                );
              })}
            </div>

            <SearchInput
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by company or subject..."
            />
          </div>

          {(() => {
            const q = search.trim().toLowerCase();
            const filteredSorted = [...drafts]
              .filter((d) => {
                if (filter === 'all') return true;
                const isSent = d.status === 'sent' || !!d.sent_at || !!d.message_id;
                const isReplied = d.status === 'replied' || !!d.replied_at;
                const eff = isReplied ? 'replied' : isSent ? 'sent' : d.status;
                return eff === filter;
              })
              .filter((d) => !q || `${d.company_name} ${d.subject || ''} ${d.contact_email || ''}`.toLowerCase().includes(q))
              .sort((a, b) => b.id - a.id);

            if (filteredSorted.length === 0) {
              return <Empty icon={MailIcon}>No drafts match search criteria.</Empty>;
            }

            const activeId = expandedDraftId === 'collapsed'
              ? null
              : (filteredSorted.some((d) => d.id === expandedDraftId) ? expandedDraftId : filteredSorted[0]?.id);

            return (
              <>
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
                    Focus Draft View:
                  </span>
                  <select
                    value={activeId || 'collapsed'}
                    onChange={(e) => setExpandedDraftId(e.target.value === 'collapsed' ? 'collapsed' : Number(e.target.value))}
                    style={{
                      ...inputStyle,
                      flex: 1,
                      minWidth: 200,
                      padding: '7px 14px',
                      borderRadius: 12,
                      fontWeight: 650,
                      background: 'var(--input-bg)'
                    }}>
                    <option value="collapsed">-- Collapse all drafts --</option>
                    {filteredSorted.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.company_name} — {d.subject || '(no subject)'} [{d.status}]
                      </option>
                    ))}
                  </select>
                </div>

                {filteredSorted.map((d) => {
                  const isExpanded = d.id === activeId;
                  if (isExpanded) {
                    return (
                      <DraftCard
                        key={d.id}
                        d={d}
                        senders={senders}
                        replies={replies}
                        onUpdate={updateDraft}
                        onSend={sendOne}
                        onScheduleOpen={(draft) => setSchedModal(draft)}
                        onUnschedule={unschedule}
                        sending={busy === 'send-' + d.id}
                        displayTz={displayTz}
                        onCollapse={() => setExpandedDraftId('collapsed')}
                      />
                    );
                  }
                  return (
                    <div
                      key={d.id}
                      onClick={() => setExpandedDraftId(d.id)}
                      style={{
                        background: 'var(--card-bg)',
                        backdropFilter: 'blur(16px)',
                        border: '1px solid var(--card-border)',
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
                          {d.company_name}
                        </strong>
                        <span style={{ color: C.sub, fontSize: 13, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', fontWeight: 500 }}>
                          {d.subject || '(no subject)'}
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                        <Badge color={statusColor[d.status]}>{d.status}</Badge>
                        <span style={{ fontSize: 12, color: C.accent, fontWeight: 700 }}>Expand & Edit ▼</span>
                      </div>
                    </div>
                  );
                })}
              </>
            );
          })()}
        </>
      )}
    </Section>
  );
}

