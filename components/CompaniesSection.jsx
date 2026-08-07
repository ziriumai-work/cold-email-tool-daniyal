import { useState } from 'react';
import { C, statusColor, th, td, btn, btnSm } from './constants.js';
import { Section, Badge, Empty, SearchInput } from './UIElements.jsx';
import { SparklesIcon, TrashIcon, BuildingIcon, ExternalLinkIcon, SendIcon, SpinnerIcon } from './Icons.jsx';

export function CompaniesSection({ companies, busy, openGen, promptClearAll, promptClearOne }) {
  const [companySearch, setCompanySearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  return (
    <Section title={`Target Companies (${companies.length})`} kicker="Prospect Pipeline"
      right={
        companies.length > 0 && (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button style={{
              ...btn('#10b981'),
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 16px',
              borderRadius: 12,
              fontSize: 13,
              fontWeight: 700
            }} onClick={() => openGen('all')} disabled={!!busy} title="Send or create exact email draft for all target companies">
              {busy.startsWith('all-exact:') ? <SpinnerIcon size={15} color="#fff" /> : <SendIcon size={15} color="#fff" />}
              {busy.startsWith('all-exact:') ? 'Sending Exact Emails…' : 'Send Exact Email to All'}
            </button>
            <button style={{
              ...btn('#7c5cff'),
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 16px',
              borderRadius: 12,
              fontSize: 13,
              fontWeight: 700
            }} onClick={() => openGen('all')} disabled={!!busy}>
              {busy.startsWith('all-custom:') ? <SpinnerIcon size={15} color="#fff" /> : <SparklesIcon size={15} color="#fff" />}
              {busy.startsWith('all-custom:') ? 'Generating AI Drafts…' : 'Generate AI Drafts'}
            </button>
            <button style={{
              ...btn(C.red, true),
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 14px',
              borderRadius: 12,
              fontSize: 13,
              fontWeight: 700
            }} onClick={promptClearAll} disabled={!!busy}>
              <TrashIcon size={14} color={C.red} />
              Clear All
            </button>
          </div>
        )
      }>
      {companies.length === 0 ? (
        <Empty icon={BuildingIcon}>No target companies added yet. Upload a CSV or Excel file above to begin.</Empty>
      ) : (() => {
        const q = companySearch.trim().toLowerCase();
        const sortedCompanies = [...companies].sort((a, b) => {
          const maxA = Math.max(Number(a.draft_id) || 0, Number(a.id) || 0);
          const maxB = Math.max(Number(b.draft_id) || 0, Number(b.id) || 0);
          return maxB - maxA;
        });
        const filtered = q
          ? sortedCompanies.filter((c) => `${c.name} ${c.website || ''} ${c.contact_email || ''} ${c.phone || ''}`.toLowerCase().includes(q))
          : sortedCompanies;

        const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
        const safePage = Math.min(page, totalPages);
        const startIndex = (safePage - 1) * pageSize;
        const endIndex = Math.min(startIndex + pageSize, filtered.length);
        const shown = filtered.slice(startIndex, endIndex);

        const emailsOf = (c) => { try { return c.all_emails ? JSON.parse(c.all_emails) : []; } catch { return []; } };

        // Generate pagination page numbers array (e.g. [1, 2, 3])
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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
          <SearchInput
            value={companySearch}
            onChange={(e) => {
              setCompanySearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search companies, domain, email..."
          />

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
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

            <span style={{ color: C.sub, fontSize: 12, fontWeight: 600, background: 'var(--subtle-card-bg)', padding: '4px 12px', borderRadius: 999, border: '1px solid var(--card-border)' }}>
              {filtered.length > 0 ? `Showing ${startIndex + 1}–${endIndex} of ${filtered.length} prospects` : '0 prospects'}
            </span>
          </div>
        </div>

        <div style={{ overflowX: 'auto', borderRadius: 18, border: '1px solid var(--card-border)', background: 'var(--card-bg)', boxShadow: 'var(--card-shadow)' }}>
        <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, fontSize: 14, minWidth: 760 }}>
          <thead>
            <tr style={{ color: C.sub, textAlign: 'left', background: 'var(--table-header-bg)' }}>
              <th style={th}>Company / Domain</th>
              <th style={th}>Contact Email</th>
              <th style={th}>Phone</th>
              <th style={th}>Pipeline Status</th>
              <th style={{ ...th, textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {shown.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ ...td, textAlign: 'center', padding: '30px 20px', color: C.sub }}>
                  No companies found matching "{companySearch}".
                </td>
              </tr>
            ) : (
              shown.map((c) => {
                const all = emailsOf(c);
                const extras = all.filter((e) => e !== c.contact_email);
                const letter = (c.name || 'C').charAt(0).toUpperCase();

                return (
                <tr key={c.id}>
                  <td style={td}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{
                        width: 36,
                        height: 36,
                        borderRadius: 10,
                        background: 'linear-gradient(135deg, rgba(2, 132, 199, 0.15), rgba(99, 102, 241, 0.15))',
                        color: C.accent,
                        border: `1px solid ${C.accent}33`,
                        fontWeight: 800,
                        fontSize: 14,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                      }}>
                        {letter}
                      </div>
                      <div>
                        <div style={{ fontWeight: 750, color: C.ink }}>{c.name}</div>
                        {c.website && (
                          <a href={c.website.startsWith('http') ? c.website : `https://${c.website}`}
                            target="_blank" rel="noopener noreferrer"
                            style={{ color: C.sub, fontSize: 12, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                            {c.website.replace(/^https?:\/\//, '')}
                            <ExternalLinkIcon size={10} color={C.sub} />
                          </a>
                        )}
                      </div>
                    </div>
                  </td>
                  <td style={{ ...td, wordBreak: 'break-word', maxWidth: 240 }}>
                    {c.contact_email
                      ? <div style={{ color: C.ink, fontWeight: 600, fontSize: 13 }}>{c.contact_email}</div>
                      : <span style={{ color: C.muted, fontSize: 12, fontStyle: 'italic' }}>No email found</span>}
                    {extras.length > 0 && (
                      <div style={{ color: C.sub, fontSize: 11, marginTop: 2 }}>
                        {extras.map((e, i) => <div key={i}>{e}</div>)}
                      </div>
                    )}
                  </td>
                  <td style={{ ...td, color: c.phone ? C.text : C.muted, whiteSpace: 'nowrap', fontSize: 13 }}>
                    {c.phone || '—'}
                  </td>
                  <td style={td}>
                    {c.draft_status
                      ? <Badge color={statusColor[c.draft_status]}>{c.draft_status}</Badge>
                      : <span style={{ color: C.muted, fontSize: 12, fontStyle: 'italic' }}>Pending Draft</span>}
                  </td>
                  <td style={{ ...td, textAlign: 'right', whiteSpace: 'nowrap' }}>
                    <button style={{
                      ...btnSm('#10b981', false),
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 5,
                      padding: '5px 12px',
                      fontSize: 12,
                      fontWeight: 700,
                      marginRight: 6
                    }} disabled={!!busy}
                      title="Send exact email to this prospect" onClick={() => openGen(c.id)}>
                      {busy === 'exact-' + c.id ? <SpinnerIcon size={13} color="#fff" /> : <SendIcon size={13} color="#fff" />}
                      {busy === 'exact-' + c.id ? 'Sending…' : 'Send Exact Email'}
                    </button>
                    <button style={{
                      ...btnSm('#7c5cff', true),
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 5,
                      padding: '5px 12px',
                      fontSize: 12,
                      fontWeight: 700
                    }} disabled={!!busy}
                      title="Generate custom personalized AI email draft" onClick={() => openGen(c.id)}>
                      {busy === 'custom-' + c.id ? <SpinnerIcon size={13} color="#7c5cff" /> : <SparklesIcon size={13} color="#7c5cff" />}
                      {busy === 'custom-' + c.id ? 'Generating…' : 'AI Draft'}
                    </button>
                    <button style={{
                      ...btnSm(C.red, true),
                      marginLeft: 6,
                      padding: '5px 10px',
                      fontSize: 12
                    }} disabled={!!busy}
                      title="Delete prospect"
                      onClick={() => promptClearOne(c.id, c.name)}>
                      <TrashIcon size={13} color={C.red} />
                    </button>
                  </td>
                </tr>
                );
              })
            )}
          </tbody>
        </table>
        </div>

        {/* Pagination Bar */}
        {totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, flexWrap: 'wrap', gap: 10 }}>
            <div style={{ color: C.sub, fontSize: 12, fontWeight: 600 }}>
              Page <strong>{safePage}</strong> of <strong>{totalPages}</strong> ({filtered.length} total prospects)
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
    </Section>
  );
}

