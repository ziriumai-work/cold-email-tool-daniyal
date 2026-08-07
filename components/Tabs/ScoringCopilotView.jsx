'use client';
import { useState, useEffect } from 'react';
import { ZapIcon, SparklesIcon, SearchIcon } from '../Icons.jsx';
import { C, glassCardStyle } from './theme.js';

export function ScoringCopilotView({ flash }) {
  const [scores, setScores] = useState([]);
  const [summary, setSummary] = useState({ totalLeads: 0, hotLeads: 0, warmLeads: 0, coldLeads: 0, avgScore: 0, avgProb: 0 });
  const [copilot, setCopilot] = useState(null);
  const [loading, setLoading] = useState(true);
  const [rescoring, setRescoring] = useState(false);
  const [rescoringId, setRescoringId] = useState(null);
  const [selectedLead, setSelectedLead] = useState(null);

  const [tierFilter, setTierFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('score_desc');
  const [lastSynced, setLastSynced] = useState('');
  const [autoSync, setAutoSync] = useState(true);

  async function loadData(showLoader = false) {
    if (showLoader) setLoading(true);
    try {
      const queryParams = new URLSearchParams({ tier: tierFilter, q: searchQuery, sortBy });
      const [scoreRes, copilotRes] = await Promise.all([
        fetch(`/api/lead-score?${queryParams.toString()}`).then((r) => r.json()),
        fetch('/api/copilot').then((r) => r.json())
      ]);

      if (scoreRes.ok) {
        setScores(scoreRes.leadScores || []);
        if (scoreRes.summary) setSummary(scoreRes.summary);
        setLastSynced(new Date().toLocaleTimeString());
      }
      if (copilotRes.ok) {
        setCopilot(copilotRes);
      }
    } catch (e) {
      console.error('Error fetching lead scores:', e);
    } finally {
      if (showLoader) setLoading(false);
    }
  }

  useEffect(() => {
    loadData(true);
  }, [tierFilter, searchQuery, sortBy]);

  // Real-time background sync interval
  useEffect(() => {
    if (!autoSync) return;
    const interval = setInterval(() => {
      loadData(false);
    }, 8000);
    return () => clearInterval(interval);
  }, [autoSync, tierFilter, searchQuery, sortBy]);

  async function handleRescoreAll() {
    setRescoring(true);
    try {
      const res = await fetch('/api/lead-score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'rescore_all' })
      }).then((r) => r.json());

      if (res.ok) {
        setScores(res.leadScores || []);
        if (res.summary) setSummary(res.summary);
        setLastSynced(new Date().toLocaleTimeString());
        if (flash) flash(res.message || 'Rescored all leads in real-time!');
      } else {
        if (flash) flash(`Error: ${res.error}`);
      }
    } catch (err) {
      if (flash) flash(`Error rescoring leads: ${err.message}`);
    } finally {
      setRescoring(false);
    }
  }

  async function handleRescoreOne(companyId) {
    setRescoringId(companyId);
    try {
      const res = await fetch('/api/lead-score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'rescore_one', companyId })
      }).then((r) => r.json());

      if (res.ok && res.leadScore) {
        setScores((prev) => prev.map((item) => (item.companyId === companyId ? { ...item, ...res.leadScore } : item)));
        if (selectedLead && selectedLead.companyId === companyId) {
          setSelectedLead({ ...selectedLead, ...res.leadScore });
        }
        if (flash) flash(`Rescored ${res.leadScore.companyName || 'lead'} in real-time!`);
      }
    } catch (err) {
      if (flash) flash(`Error rescoring lead: ${err.message}`);
    } finally {
      setRescoringId(null);
    }
  }

  return (
    <div>
      {/* Top Banner with Realtime Sync Status & Summary Cards */}
      <div style={glassCardStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 20 }}>
          <div>
            <h3 style={{ fontSize: 19, fontWeight: 750, color: C.ink, margin: '0 0 4px 0', display: 'flex', alignItems: 'center', gap: 8 }}>
              <ZapIcon size={20} color={C.accent} /> Real-Time AI Lead Scoring & Intent Matrix
            </h3>
            <p style={{ fontSize: 13, color: C.sub, margin: 0 }}>
              Live scoring engine calculating lead intent (0-100), engagement signals, and conversion probabilities.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: C.sub, cursor: 'pointer', fontWeight: 600 }}>
              <input type="checkbox" checked={autoSync} onChange={(e) => setAutoSync(e.target.checked)} />
              <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: autoSync ? C.green : C.muted, boxShadow: autoSync ? '0 0 8px #10b981' : 'none' }}></span>
              Auto-Sync (8s)
            </label>

            <button
              onClick={handleRescoreAll}
              disabled={rescoring}
              style={{
                padding: '8px 16px',
                borderRadius: 10,
                background: C.accent,
                color: '#fff',
                border: 'none',
                fontWeight: 650,
                cursor: rescoring ? 'not-allowed' : 'pointer',
                fontSize: 13,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                boxShadow: '0 2px 8px rgba(99,102,241,0.25)',
                opacity: rescoring ? 0.7 : 1
              }}
            >
              {rescoring ? 'Rescoring Leads...' : 'Rescore All Leads'}
            </button>
          </div>
        </div>

        {/* Metric Cards Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14, marginBottom: 12 }}>
          <div style={{ background: 'var(--subtle-card-bg)', padding: '14px 16px', borderRadius: 14, border: '1px solid var(--card-border)' }}>
            <div style={{ fontSize: 12, color: C.sub, fontWeight: 600 }}>Total Leads Scored</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: C.ink, marginTop: 4 }}>{summary.totalLeads}</div>
          </div>
          <div style={{ background: 'var(--subtle-card-bg)', padding: '14px 16px', borderRadius: 14, border: '1px solid var(--card-border)' }}>
            <div style={{ fontSize: 12, color: C.sub, fontWeight: 600 }}>Hot Intent Leads (≥70)</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: C.green, marginTop: 4 }}>{summary.hotLeads}</div>
          </div>
          <div style={{ background: 'var(--subtle-card-bg)', padding: '14px 16px', borderRadius: 14, border: '1px solid var(--card-border)' }}>
            <div style={{ fontSize: 12, color: C.sub, fontWeight: 600 }}>Avg Lead Score</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: C.accent, marginTop: 4 }}>{summary.avgScore} <span style={{ fontSize: 13, color: C.sub, fontWeight: 500 }}>/100</span></div>
          </div>
          <div style={{ background: 'var(--subtle-card-bg)', padding: '14px 16px', borderRadius: 14, border: '1px solid var(--card-border)' }}>
            <div style={{ fontSize: 12, color: C.sub, fontWeight: 600 }}>Avg Conversion Prob.</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: C.ink, marginTop: 4 }}>{(summary.avgProb * 100).toFixed(0)}%</div>
          </div>
        </div>

        {lastSynced && (
          <div style={{ fontSize: 11, color: C.muted, textAlign: 'right', marginTop: 4 }}>
            Last synced: {lastSynced}
          </div>
        )}
      </div>

      {/* AI Copilot Guidance Section */}
      {copilot?.recommendations && copilot.recommendations.length > 0 && (
        <div style={glassCardStyle}>
          <h4 style={{ fontSize: 16, fontWeight: 750, color: C.ink, margin: '0 0 12px 0', display: 'flex', alignItems: 'center', gap: 8 }}>
            <SparklesIcon size={18} color={C.accent} /> Campaign Sequence Copilot Insights
          </h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12 }}>
            {copilot.recommendations.map((rec) => (
              <div key={rec.id} style={{ background: 'var(--subtle-card-bg)', padding: 14, borderRadius: 14, border: '1px solid var(--card-border)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14, color: C.ink }}>{rec.title}</div>
                  <div style={{ fontSize: 12, color: C.sub, margin: '6px 0 10px 0', lineHeight: '1.4' }}>{rec.insight}</div>
                </div>
                <div style={{ fontSize: 12, color: C.accent, fontWeight: 650, background: 'rgba(99,102,241,0.08)', padding: '6px 10px', borderRadius: 8 }}>
                  Action: {rec.action}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Lead Scores Data Table with Search & Filters */}
      <div style={glassCardStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
          <h4 style={{ fontSize: 16, fontWeight: 750, color: C.ink, margin: 0 }}>
            Lead Intent Directory
          </h4>

          {/* Search, Filter Pills & Sort Selector */}
          <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                placeholder="Search leads..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  padding: '7px 12px 7px 32px',
                  borderRadius: 10,
                  border: '1px solid var(--input-border)',
                  background: 'var(--input-bg)',
                  color: C.ink,
                  fontSize: 12,
                  width: 180
                }}
              />
              <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }}>
                <SearchIcon size={14} />
              </span>
            </div>

            {/* Tier Filter Pills */}
            <div style={{ display: 'flex', background: 'var(--subtle-card-bg)', borderRadius: 10, padding: 3, border: '1px solid var(--card-border)' }}>
              {[
                { id: 'all', label: 'All' },
                { id: 'hot', label: 'Hot' },
                { id: 'warm', label: 'Warm' },
                { id: 'cold', label: 'Cold' }
              ].map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTierFilter(t.id)}
                  style={{
                    padding: '5px 10px',
                    borderRadius: 8,
                    border: 'none',
                    background: tierFilter === t.id ? C.accent : 'transparent',
                    color: tierFilter === t.id ? '#fff' : C.sub,
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* Sort Selector */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              style={{
                padding: '7px 10px',
                borderRadius: 10,
                border: '1px solid var(--input-border)',
                background: 'var(--input-bg)',
                color: C.ink,
                fontSize: 12,
                fontWeight: 600
              }}
            >
              <option value="score_desc">Highest Score</option>
              <option value="score_asc">Lowest Score</option>
              <option value="name">Company Name</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div style={{ padding: 30, textAlign: 'center', color: C.sub, fontSize: 13 }}>Calculating realtime lead scores...</div>
        ) : scores.length === 0 ? (
          <div style={{ padding: 30, textAlign: 'center', color: C.muted, fontSize: 13 }}>No lead scores match the selected filters.</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', textAlign: 'left', fontSize: 13, borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--card-border)', color: C.sub, background: 'var(--table-header-bg)' }}>
                  <th style={{ padding: 10 }}>Company</th>
                  <th style={{ padding: 10 }}>Contact Email</th>
                  <th style={{ padding: 10 }}>Intent Tier</th>
                  <th style={{ padding: 10 }}>Lead Score</th>
                  <th style={{ padding: 10 }}>Conversion Prob.</th>
                  <th style={{ padding: 10, textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {scores.map((s) => {
                  const isHot = s.score >= 70;
                  const isWarm = s.score >= 40 && s.score < 70;
                  const tierBadgeColor = isHot ? C.green : isWarm ? C.amber : C.muted;

                  return (
                    <tr key={s.companyId} style={{ borderBottom: '1px solid var(--card-border)' }}>
                      <td style={{ padding: 10 }}>
                        <div style={{ fontWeight: 650, color: C.ink }}>{s.companyName}</div>
                        {s.website && <div style={{ fontSize: 11, color: C.sub }}>{s.website}</div>}
                      </td>
                      <td style={{ padding: 10, color: C.sub }}>{s.email || '—'}</td>
                      <td style={{ padding: 10 }}>
                        <span style={{
                          padding: '3px 8px',
                          borderRadius: 6,
                          fontSize: 11,
                          fontWeight: 700,
                          background: isHot ? 'rgba(16, 185, 129, 0.12)' : isWarm ? 'rgba(245, 158, 11, 0.12)' : 'rgba(156, 163, 175, 0.12)',
                          color: tierBadgeColor
                        }}>
                          {s.tier || (isHot ? 'Hot' : isWarm ? 'Warm' : 'Cold')}
                        </span>
                      </td>
                      <td style={{ padding: 10 }}>
                        <span style={{ fontWeight: 750, color: tierBadgeColor, fontSize: 14 }}>
                          {s.score}
                        </span>
                        <span style={{ fontSize: 11, color: C.sub }}>/100</span>
                      </td>
                      <td style={{ padding: 10, minWidth: 140 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ flex: 1, height: 6, borderRadius: 3, background: 'var(--card-border)', overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${Math.round((s.conversionProb || 0) * 100)}%`, background: tierBadgeColor, borderRadius: 3 }} />
                          </div>
                          <span style={{ fontSize: 12, fontWeight: 600, color: C.sub, minWidth: 32 }}>
                            {Math.round((s.conversionProb || 0) * 100)}%
                          </span>
                        </div>
                      </td>
                      <td style={{ padding: 10, textAlign: 'right' }}>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
                          <button
                            onClick={() => setSelectedLead(s)}
                            style={{
                              padding: '5px 10px',
                              borderRadius: 8,
                              border: '1px solid var(--card-border)',
                              background: 'var(--subtle-card-bg)',
                              color: C.ink,
                              fontSize: 12,
                              fontWeight: 600,
                              cursor: 'pointer'
                            }}
                          >
                            Inspect Signals
                          </button>
                          <button
                            onClick={() => handleRescoreOne(s.companyId)}
                            disabled={rescoringId === s.companyId}
                            style={{
                              padding: '5px 10px',
                              borderRadius: 8,
                              border: 'none',
                              background: 'rgba(99,102,241,0.12)',
                              color: C.accent,
                              fontSize: 12,
                              fontWeight: 650,
                              cursor: 'pointer'
                            }}
                          >
                            {rescoringId === s.companyId ? '...' : 'Rescore'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Signal Breakdown Modal */}
      {selectedLead && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: 20 }}>
          <div style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: 20, padding: 24, maxWidth: 520, width: '100%', boxShadow: '0 20px 40px rgba(0,0,0,0.3)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div>
                <h3 style={{ fontSize: 18, fontWeight: 750, color: C.ink, margin: 0 }}>
                  {selectedLead.companyName}
                </h3>
                <div style={{ fontSize: 12, color: C.sub }}>{selectedLead.email}</div>
              </div>
              <button onClick={() => setSelectedLead(null)} style={{ background: 'none', border: 'none', color: C.sub, fontSize: 20, cursor: 'pointer' }}>×</button>
            </div>

            <div style={{ display: 'flex', gap: 12, marginBottom: 16, background: 'var(--subtle-card-bg)', padding: 12, borderRadius: 12, border: '1px solid var(--card-border)' }}>
              <div>
                <div style={{ fontSize: 11, color: C.sub }}>Lead Score</div>
                <div style={{ fontSize: 20, fontWeight: 800, color: selectedLead.score >= 70 ? C.green : selectedLead.score >= 40 ? C.amber : C.muted }}>{selectedLead.score}/100</div>
              </div>
              <div style={{ borderLeft: '1px solid var(--card-border)', paddingLeft: 12 }}>
                <div style={{ fontSize: 11, color: C.sub }}>Conversion Prob.</div>
                <div style={{ fontSize: 20, fontWeight: 800, color: C.ink }}>{Math.round((selectedLead.conversionProb || 0) * 100)}%</div>
              </div>
              <div style={{ borderLeft: '1px solid var(--card-border)', paddingLeft: 12 }}>
                <div style={{ fontSize: 11, color: C.sub }}>Intent Tier</div>
                <div style={{ fontSize: 14, fontWeight: 750, marginTop: 4, color: selectedLead.score >= 70 ? C.green : selectedLead.score >= 40 ? C.amber : C.muted }}>
                  {selectedLead.tier || (selectedLead.score >= 70 ? 'Hot' : selectedLead.score >= 40 ? 'Warm' : 'Cold')}
                </div>
              </div>
            </div>

            {/* AI Next Action Box */}
            {selectedLead.nextAction && (
              <div style={{ background: 'rgba(99, 102, 241, 0.08)', padding: 12, borderRadius: 12, border: '1px solid rgba(99, 102, 241, 0.2)', marginBottom: 16 }}>
                <div style={{ fontSize: 11, color: C.accent, fontWeight: 700, textTransform: 'uppercase' }}>Suggested AI Next Action</div>
                <div style={{ fontSize: 13, color: C.ink, fontWeight: 600, marginTop: 4 }}>{selectedLead.nextAction}</div>
              </div>
            )}

            {/* Signal Items List */}
            <h4 style={{ fontSize: 14, fontWeight: 700, color: C.ink, margin: '0 0 8px 0' }}>Score Factor Breakdown</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 220, overflowY: 'auto', marginBottom: 20 }}>
              {selectedLead.signals && selectedLead.signals.length > 0 ? (
                selectedLead.signals.map((sig, idx) => (
                  <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: 'var(--subtle-card-bg)', borderRadius: 8, fontSize: 12 }}>
                    <span style={{ color: C.ink, fontWeight: 600 }}>{sig.name}</span>
                    <span style={{ fontWeight: 750, color: sig.points > 0 ? C.green : sig.points < 0 ? C.red : C.sub }}>
                      {sig.points > 0 ? `+${sig.points}` : sig.points} pts
                    </span>
                  </div>
                ))
              ) : (
                <div style={{ fontSize: 12, color: C.muted }}>Base baseline score (50 pts). No additional engagement signals recorded yet.</div>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button
                onClick={() => handleRescoreOne(selectedLead.companyId)}
                disabled={rescoringId === selectedLead.companyId}
                style={{ padding: '8px 14px', borderRadius: 10, background: C.accent, color: '#fff', border: 'none', fontWeight: 600, fontSize: 12, cursor: 'pointer' }}
              >
                {rescoringId === selectedLead.companyId ? 'Recalculating...' : 'Recalculate Score Now'}
              </button>
              <button
                onClick={() => setSelectedLead(null)}
                style={{ padding: '8px 14px', borderRadius: 10, background: 'var(--subtle-card-bg)', color: C.ink, border: '1px solid var(--card-border)', fontWeight: 600, fontSize: 12, cursor: 'pointer' }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
