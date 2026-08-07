import { useState } from 'react';
import { C, statusColor, inputStyle, btn } from './constants.js';
import { Section, Badge, Empty, SearchInput } from './UIElements.jsx';
import { DraftCard } from './DraftCard.jsx';
import { CheckCircleIcon, ClockIcon, SendIcon, MailIcon, XIcon, SpinnerIcon } from './Icons.jsx';

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
  promptApproveAndSendAll,
  promptRejectAllPending,
  promptScheduleAllApproved,
  promptSendAllApproved
}) {
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [expandedDraftId, setExpandedDraftId] = useState(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const hasPending = drafts.some((d) => d.status === 'pending');
  const hasApproved = drafts.some((d) => d.status === 'approved');
  const hasReadyToSend = drafts.some((d) => (d.status === 'pending' || d.status === 'approved') && d.contact_email);

  return (
    <Section title={`Drafts & Outreach Queue (${drafts.length})`} kicker="Human Approval Queue"
      right={
        drafts.length > 0 && (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', justifyContent: 'flex-end', marginLeft: 'auto' }}>
            {/* Dynamic Primary Bulk Action Button: Approve All Pending -> Send All Approved */}
            {hasPending ? (
              <button style={{
                ...btn(C.green),
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '8px 18px',
                borderRadius: 12,
                fontSize: 13,
                fontWeight: 700
              }} onClick={approveAllPending} disabled={!!busy} title="Approve all pending drafts in queue">
                {busy === 'approve-all' ? <SpinnerIcon size={15} color="#fff" /> : <CheckCircleIcon size={15} color="#fff" />}
                {busy === 'approve-all' ? 'Approving All Drafts…' : 'Approve All Pending'}
              </button>
            ) : hasApproved ? (
              <button style={{
                ...btn('#10b981'),
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '8px 18px',
                borderRadius: 12,
                fontSize: 13,
                fontWeight: 700
              }} onClick={promptSendAllApproved} disabled={!!busy} title="Send all approved email drafts to prospects">
                {busy.startsWith('send-all:') ? <SpinnerIcon size={15} color="#fff" /> : <SendIcon size={15} color="#fff" />}
                {busy.startsWith('send-all:') ? `Sending ${busy.slice(9)}…` : 'Send All Approved'}
              </button>
            ) : null}

            {/* Secondary Action: Schedule All Approved (when approved drafts exist) */}
            {hasApproved && (
              <button style={{
                ...btn('#0e7490', true),
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '8px 14px',
                borderRadius: 12,
                fontSize: 13,
                fontWeight: 700
              }} onClick={promptScheduleAllApproved} disabled={!!busy}>
                <ClockIcon size={15} color="#0e7490" />
                Schedule All Approved
              </button>
            )}

            {/* Secondary Action: Reject All Pending (when pending drafts exist) */}
            {hasPending && (
              <button style={{
                ...btn(C.red, true),
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '8px 14px',
                borderRadius: 12,
                fontSize: 13,
                fontWeight: 700
              }} onClick={promptRejectAllPending} disabled={!!busy}>
                <XIcon size={15} color={C.red} />
                Reject All Pending
              </button>
            )}
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
                  <button key={f} onClick={() => { setFilter(f); setPage(1); }}
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

            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: C.sub, fontWeight: 600 }}>
                <span>Per page:</span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setPage(1);
                  }}
                  style={{
                    background: 'var(--subtle-card-bg)',
                    color: C.ink,
                    border: '1px solid var(--card-border)',
                    borderRadius: 8,
                    padding: '3px 8px',
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>

              <SearchInput
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="Search by company or subject..."
              />
            </div>
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
              .sort((a, b) => {
                const timeA = a.created_at || a.sent_at;
                const timeB = b.created_at || b.sent_at;
                if (timeA && timeB) {
                  const tA = new Date(timeA).getTime();
                  const tB = new Date(timeB).getTime();
                  if (!isNaN(tA) && !isNaN(tB) && tA !== tB) return tB - tA;
                }
                return (Number(b.id) || 0) - (Number(a.id) || 0);
              });

            if (filteredSorted.length === 0) {
              return <Empty icon={MailIcon}>No drafts match search criteria.</Empty>;
            }

            const totalPages = Math.max(1, Math.ceil(filteredSorted.length / pageSize));
            const safePage = Math.min(page, totalPages);
            const startIndex = (safePage - 1) * pageSize;
            const endIndex = Math.min(startIndex + pageSize, filteredSorted.length);
            const paginatedDrafts = filteredSorted.slice(startIndex, endIndex);

            const activeId = expandedDraftId === 'collapsed'
              ? null
              : (filteredSorted.some((d) => d.id === expandedDraftId) ? expandedDraftId : paginatedDrafts[0]?.id);

            // Generate page numbers array (e.g. [1, 2, 3])
            const pageNumbers = [];
            const maxDisplayed = 5;
            let startP = Math.max(1, safePage - 2);
            let endP = Math.min(totalPages, startP + maxDisplayed - 1);
            if (endP - startP + 1 < maxDisplayed) {
              startP = Math.max(1, endP - maxDisplayed + 1);
            }
            for (let i = startP; i <= endP; i++) pageNumbers.push(i);

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
                  flexWrap: 'wrap',
                  justifyContent: 'space-between'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 260 }}>
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

                  <span style={{ color: C.sub, fontSize: 12, fontWeight: 600, background: 'var(--card-bg)', padding: '4px 12px', borderRadius: 999, border: '1px solid var(--card-border)' }}>
                    Showing {startIndex + 1}–{endIndex} of {filteredSorted.length} drafts
                  </span>
                </div>

                {paginatedDrafts.map((d) => {
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

                {/* Pagination Bar */}
                {totalPages > 1 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, flexWrap: 'wrap', gap: 10 }}>
                    <div style={{ color: C.sub, fontSize: 12, fontWeight: 600 }}>
                      Page <strong>{safePage}</strong> of <strong>{totalPages}</strong> ({filteredSorted.length} total drafts)
                    </div>

                    <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                      <button
                        disabled={safePage === 1}
                        onClick={() => setPage(1)}
                        style={{
                          padding: '5px 10px',
                          borderRadius: 8,
                          fontSize: 12,
                          fontWeight: 650,
                          border: '1px solid var(--card-border)',
                          background: 'var(--subtle-card-bg)',
                          color: safePage === 1 ? C.muted : C.ink,
                          cursor: safePage === 1 ? 'not-allowed' : 'pointer'
                        }}
                        title="First Page"
                      >
                        « First
                      </button>

                      <button
                        disabled={safePage === 1}
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        style={{
                          padding: '5px 12px',
                          borderRadius: 8,
                          fontSize: 12,
                          fontWeight: 650,
                          border: '1px solid var(--card-border)',
                          background: 'var(--subtle-card-bg)',
                          color: safePage === 1 ? C.muted : C.ink,
                          cursor: safePage === 1 ? 'not-allowed' : 'pointer'
                        }}
                      >
                        ‹ Prev
                      </button>

                      {pageNumbers.map((num) => (
                        <button
                          key={num}
                          onClick={() => setPage(num)}
                          style={{
                            padding: '5px 10px',
                            borderRadius: 8,
                            fontSize: 12,
                            fontWeight: num === safePage ? 800 : 600,
                            border: num === safePage ? `1px solid ${C.accent}` : '1px solid var(--card-border)',
                            background: num === safePage ? C.accent : 'var(--subtle-card-bg)',
                            color: num === safePage ? '#ffffff' : C.ink,
                            cursor: 'pointer',
                            minWidth: 32
                          }}
                        >
                          {num}
                        </button>
                      ))}

                      <button
                        disabled={safePage === totalPages}
                        onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                        style={{
                          padding: '5px 12px',
                          borderRadius: 8,
                          fontSize: 12,
                          fontWeight: 650,
                          border: '1px solid var(--card-border)',
                          background: 'var(--subtle-card-bg)',
                          color: safePage === totalPages ? C.muted : C.ink,
                          cursor: safePage === totalPages ? 'not-allowed' : 'pointer'
                        }}
                      >
                        Next ›
                      </button>

                      <button
                        disabled={safePage === totalPages}
                        onClick={() => setPage(totalPages)}
                        style={{
                          padding: '5px 10px',
                          borderRadius: 8,
                          fontSize: 12,
                          fontWeight: 650,
                          border: '1px solid var(--card-border)',
                          background: 'var(--subtle-card-bg)',
                          color: safePage === totalPages ? C.muted : C.ink,
                          cursor: safePage === totalPages ? 'not-allowed' : 'pointer'
                        }}
                        title="Last Page"
                      >
                        Last »
                      </button>
                    </div>
                  </div>
                )}
              </>
            );
          })()}
        </>
      )}
    </Section>
  );
}

