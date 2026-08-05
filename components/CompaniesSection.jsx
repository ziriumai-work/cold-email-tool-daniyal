import { useState } from 'react';
import { C, statusColor, th, td, btn, btnSm } from './constants.js';
import { Section, Badge, Empty, SearchInput } from './UIElements.jsx';
import { SparklesIcon, TrashIcon, BuildingIcon, ExternalLinkIcon } from './Icons.jsx';

export function CompaniesSection({ companies, busy, openGen, promptClearAll, promptClearOne }) {
  const [companySearch, setCompanySearch] = useState('');

  return (
    <Section title={`Target Companies (${companies.length})`} kicker="Prospect Pipeline"
      right={
        companies.length > 0 && (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
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
              <SparklesIcon size={15} color="#fff" />
              {busy.startsWith('all-custom:') ? `${busy.slice(11)}…` : 'Generate All Drafts'}
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
        const shown = q
          ? companies.filter((c) => `${c.name} ${c.website || ''} ${c.contact_email || ''} ${c.phone || ''}`.toLowerCase().includes(q))
          : companies;
        const emailsOf = (c) => { try { return c.all_emails ? JSON.parse(c.all_emails) : []; } catch { return []; } };
        
        return (
        <>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
          <SearchInput
            value={companySearch}
            onChange={(e) => setCompanySearch(e.target.value)}
            placeholder="Search companies, domain, email..."
          />
          <span style={{ color: C.sub, fontSize: 12, fontWeight: 600, background: 'var(--subtle-card-bg)', padding: '4px 12px', borderRadius: 999, border: '1px solid var(--card-border)' }}>
            Showing {q ? `${shown.length} of ${companies.length}` : `${companies.length} prospects`}
          </span>
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
            {shown.map((c) => {
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
                    ...btnSm('#7c5cff', true),
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 5,
                    padding: '5px 12px',
                    fontSize: 12,
                    fontWeight: 700
                  }} disabled={!!busy}
                    title="Generate custom personalized AI email draft" onClick={() => openGen(c.id)}>
                    <SparklesIcon size={13} color="#7c5cff" />
                    {busy === 'custom-' + c.id ? 'Generating…' : 'Generate Draft'}
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
            })}
          </tbody>
        </table>
        </div>
        </>
        );
      })()}
    </Section>
  );
}

