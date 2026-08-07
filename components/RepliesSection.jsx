import { useState } from 'react';
import { C, REPLY_STAGES, stageColor, inputStyle, btn } from './constants.js';
import { Section, Badge, Empty, SearchInput } from './UIElements.jsx';
import { ReplyCard } from './ReplyCard.jsx';
import { RefreshIcon, MailIcon } from './Icons.jsx';

export function RepliesSection({ replies, busy, checkReplies, updateReply }) {
  const [expandedReplyId, setExpandedReplyId] = useState(null);
  const [stageFilter, setStageFilter] = useState('all');
  const [replySearch, setReplySearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

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
          const q = replySearch.trim().toLowerCase();
          const filteredReplies = [...replies]
            .filter((r) => {
              if (stageFilter === 'all') return true;
              return (r.status || 'new') === stageFilter;
            })
            .sort((a, b) => {
              const timeA = a.received_at || a.created_at;
              const timeB = b.received_at || b.created_at;
              if (timeA && timeB) {
                const tA = new Date(timeA).getTime();
                const tB = new Date(timeB).getTime();
                if (!isNaN(tA) && !isNaN(tB) && tA !== tB) return tB - tA;
              }
              return (Number(b.id) || 0) - (Number(a.id) || 0);
            });

          const totalPages = Math.max(1, Math.ceil(filteredReplies.length / pageSize));
          const safePage = Math.min(page, totalPages);
          const startIndex = (safePage - 1) * pageSize;
          const endIndex = Math.min(startIndex + pageSize, filteredReplies.length);
          const paginatedReplies = filteredReplies.slice(startIndex, endIndex);

          const activeReplyId = expandedReplyId === 'collapsed'
            ? null
            : (filteredReplies.some((r) => r.id === expandedReplyId) ? expandedReplyId : paginatedReplies[0]?.id);

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
              {/* Filter Pills & Controls */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                  <button
                    onClick={() => { setStageFilter('all'); setPage(1); }}
                    style={{
                      background: stageFilter === 'all' ? 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)' : 'var(--input-bg)',
                      color: stageFilter === 'all' ? '#ffffff' : C.sub,
                      border: stageFilter === 'all' ? '1px solid rgba(255,255,255,0.3)' : '1px solid var(--input-border)',
                      borderRadius: 999,
                      padding: '4px 12px',
                      fontSize: 12,
                      fontWeight: stageFilter === 'all' ? 750 : 600,
                      cursor: 'pointer'
                    }}
                  >
                    All ({replies.length})
                  </button>

                  {REPLY_STAGES.map(([v, label, col]) => {
                    const count = replies.filter((r) => (r.status || 'new') === v).length;
                    const active = stageFilter === v;
                    return count > 0 ? (
                      <button
                        key={v}
                        onClick={() => { setStageFilter(v); setPage(1); }}
                        style={{
                          color: active ? '#ffffff' : col,
                          fontWeight: active ? 750 : 650,
                          background: active ? col : col + '14',
                          border: `1px solid ${col}44`,
                          padding: '4px 12px',
                          borderRadius: 999,
                          fontSize: 12,
                          cursor: 'pointer'
                        }}
                      >
                        {label} ({count})
                      </button>
                    ) : null;
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
                    value={replySearch}
                    onChange={(e) => {
                      setReplySearch(e.target.value);
                      setPage(1);
                    }}
                    placeholder="Search replies, email, content..."
                  />
                </div>
              </div>

              {filteredReplies.length === 0 ? (
                <Empty icon={MailIcon}>No replies match search criteria.</Empty>
              ) : (
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
                        {filteredReplies.map((r) => (
                          <option key={r.id} value={r.id}>
                            {r.company_name || r.from_email} — {r.subject || '(no subject)'} [{r.status || 'new'}]
                          </option>
                        ))}
                      </select>
                    </div>

                    <span style={{ color: C.sub, fontSize: 12, fontWeight: 600, background: 'var(--card-bg)', padding: '4px 12px', borderRadius: 999, border: '1px solid var(--card-border)' }}>
                      Showing {startIndex + 1}–{endIndex} of {filteredReplies.length} replies
                    </span>
                  </div>

                  {paginatedReplies.map((r) => {
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

                  {/* Pagination Bar */}
                  {totalPages > 1 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, flexWrap: 'wrap', gap: 10 }}>
                      <div style={{ color: C.sub, fontSize: 12, fontWeight: 600 }}>
                        Page <strong>{safePage}</strong> of <strong>{totalPages}</strong> ({filteredReplies.length} total replies)
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
              )}
            </>
          );
        })()
      )}
    </Section>
  );
}

