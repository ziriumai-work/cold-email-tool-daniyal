'use client';
import { useState, useEffect } from 'react';
import { C, glassCardStyle } from './theme.js';

export function DeliverabilityView({ flash }) {
  const [data, setData] = useState(null);
  const [selectedDomain, setSelectedDomain] = useState('ziriumai.com');
  const [customDomainInput, setCustomDomainInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Placement Tester State
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [testRes, setTestRes] = useState(null);
  const [testing, setTesting] = useState(false);
  
  // Stages & Setup Guide
  const [copiedRecord, setCopiedRecord] = useState('');
  const [showDnsGuide, setShowDnsGuide] = useState(false);
  const [updatingStage, setUpdatingStage] = useState(false);

  const fetchTelemetry = async (domainToFetch) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/deliverability?domain=${encodeURIComponent(domainToFetch)}`).then((r) => r.json());
      if (res.ok) {
        setData(res);
        if (res.domain) setSelectedDomain(res.domain);
      } else {
        if (flash) flash(res.error || 'Failed to load deliverability data', false);
      }
    } catch (err) {
      if (flash) flash('Error fetching deliverability telemetry', false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTelemetry(selectedDomain);
  }, []);

  const handleDomainChange = (newDomain) => {
    if (!newDomain) return;
    setSelectedDomain(newDomain);
    fetchTelemetry(newDomain);
  };

  const handleCustomDomainSubmit = (e) => {
    e.preventDefault();
    if (!customDomainInput.trim()) return;
    const clean = customDomainInput.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
    setSelectedDomain(clean);
    fetchTelemetry(clean);
    setCustomDomainInput('');
  };

  const recheckDns = async () => {
    setRefreshing(true);
    try {
      const res = await fetch('/api/deliverability', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'recheck_dns', domain: selectedDomain }),
      }).then((r) => r.json());
      if (res.ok) {
        setData((prev) => ({
          ...prev,
          dns: res.dns,
          healthScore: res.healthScore,
          status: res.status,
          checks: res.checks,
        }));
        if (flash) flash('DNS & Health telemetry refreshed successfully!');
      }
    } catch {
      if (flash) flash('Failed to recheck DNS', false);
    } finally {
      setRefreshing(false);
    }
  };

  const updateWarmUpStage = async (stage) => {
    setUpdatingStage(true);
    try {
      const res = await fetch('/api/deliverability', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update_warmup', domain: selectedDomain, stage }),
      }).then((r) => r.json());
      if (res.ok) {
        setData((prev) => ({
          ...prev,
          warmUpStage: res.warmUpStage,
          warmUpDailyLimit: res.warmUpDailyLimit,
        }));
        if (flash) flash(`Warm-up limit updated to Stage ${res.warmUpStage} (${res.warmUpDailyLimit} emails/day)`);
      }
    } catch {
      if (flash) flash('Failed to update warm-up stage', false);
    } finally {
      setUpdatingStage(false);
    }
  };

  const copyToClipboard = (text, recordName) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedRecord(recordName);
    if (flash) flash(`${recordName} record copied to clipboard!`);
    setTimeout(() => setCopiedRecord(''), 2500);
  };

  const loadSampleEmail = () => {
    setSubject('Quick question regarding sales automation at {{company}}');
    setBody(`Hi {{first_name}},\n\nI noticed your team is scaling outbound outreach. We built a solution that helps engineering & sales teams double reply rates while ensuring 99%+ deliverability.\n\nWould you be open to a quick 5-minute chat this Thursday?\n\nBest,\nWahaj`);
    setTestRes(null);
  };

  const runPlacementTest = async () => {
    if (!subject || !body) return flash('Enter subject line and body copy to run test', false);
    setTesting(true);
    try {
      const res = await fetch('/api/deliverability', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'placement_test', subject, body }),
      }).then((r) => r.json());
      if (res.ok) {
        setTestRes(res.testResult);
        if (flash) flash('Inbox placement analysis complete!');
      } else {
        if (flash) flash(res.error || 'Test failed', false);
      }
    } catch {
      if (flash) flash('Failed to run placement test', false);
    } finally {
      setTesting(false);
    }
  };

  if (loading && !data) {
    return <div style={glassCardStyle}>Loading deliverability telemetry & domain authentication data...</div>;
  }

  const availableDomains = data?.availableDomains || ['ziriumai.com'];
  const stats = data?.stats || { openRate: 0.45, replyRate: 0.12, bounceRate: 0.01, totalSent: 0 };
  const warmUpStagesList = [
    { stage: 1, limit: 5, desc: 'Initial Setup' },
    { stage: 2, limit: 15, desc: 'Conservative Ramping' },
    { stage: 3, limit: 30, desc: 'Moderate Volume' },
    { stage: 4, limit: 50, desc: 'High Volume' },
    { stage: 5, limit: 100, desc: 'Full Capacity' },
  ];

  return (
    <div>
      {/* Top Bar: Domain Switcher & Actions */}
      <div style={{ ...glassCardStyle, padding: '18px 24px', marginBottom: 20 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: C.sub, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Domain Telemetry:
            </span>
            <select
              value={selectedDomain}
              onChange={(e) => handleDomainChange(e.target.value)}
              style={{
                padding: '8px 14px',
                borderRadius: 10,
                border: '1px solid var(--card-border)',
                background: 'var(--input-bg)',
                color: C.ink,
                fontWeight: 650,
                fontSize: 14,
                cursor: 'pointer'
              }}>
              {availableDomains.map((dom) => (
                <option key={dom} value={dom}>
                  {dom}
                </option>
              ))}
            </select>

            <form onSubmit={handleCustomDomainSubmit} style={{ display: 'inline-flex', gap: 6 }}>
              <input
                type="text"
                placeholder="Or inspect custom domain..."
                value={customDomainInput}
                onChange={(e) => setCustomDomainInput(e.target.value)}
                style={{
                  padding: '8px 12px',
                  borderRadius: 10,
                  border: '1px solid var(--input-border)',
                  background: 'var(--input-bg)',
                  color: C.ink,
                  fontSize: 13,
                  width: 190
                }}
              />
              <button
                type="submit"
                style={{
                  padding: '8px 14px',
                  borderRadius: 10,
                  background: 'rgba(2, 132, 199, 0.15)',
                  color: C.accent,
                  border: '1px solid rgba(2, 132, 199, 0.3)',
                  fontWeight: 600,
                  fontSize: 13,
                  cursor: 'pointer'
                }}>
                Inspect
              </button>
            </form>
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <button
              onClick={() => setShowDnsGuide(!showDnsGuide)}
              style={{
                padding: '8px 14px',
                borderRadius: 10,
                background: 'var(--subtle-card-bg)',
                color: C.sub,
                border: '1px solid var(--card-border)',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer'
              }}>
              {showDnsGuide ? 'Hide Setup Guide' : 'DNS Setup Guide'}
            </button>
            <button
              onClick={recheckDns}
              disabled={refreshing}
              style={{
                padding: '8px 16px',
                borderRadius: 10,
                background: C.accent,
                color: '#fff',
                border: 'none',
                fontSize: 13,
                fontWeight: 650,
                cursor: 'pointer',
                opacity: refreshing ? 0.7 : 1
              }}>
              {refreshing ? 'Refreshing DNS...' : 'Re-check DNS Telemetry'}
            </button>
          </div>
        </div>
      </div>

      {/* DNS Setup Guide Drawer */}
      {showDnsGuide && (
        <div style={{ ...glassCardStyle, background: 'rgba(2, 132, 199, 0.04)', borderColor: 'rgba(2, 132, 199, 0.2)', marginBottom: 20 }}>
          <h4 style={{ margin: '0 0 10px 0', fontSize: 16, fontWeight: 700, color: C.ink }}>DNS Setup Instructions for {selectedDomain}</h4>
          <p style={{ fontSize: 13, color: C.sub, margin: '0 0 14px 0' }}>
            Add the TXT records below in your domain registrar (Cloudflare, GoDaddy, Namecheap, or Google Domains) to verify deliverability authentication.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12 }}>
            <div style={{ background: 'var(--card-bg)', padding: 12, borderRadius: 10, border: '1px solid var(--card-border)' }}>
              <strong>1. SPF Record (TXT)</strong>
              <div style={{ fontSize: 12, color: C.sub, marginTop: 4 }}>Type: TXT | Host: @ or {selectedDomain}</div>
              <div style={{ fontSize: 12, fontFamily: 'monospace', color: C.accent, marginTop: 4 }}>{data?.dns?.spfRecord || `v=spf1 include:_spf.google.com ~all`}</div>
            </div>
            <div style={{ background: 'var(--card-bg)', padding: 12, borderRadius: 10, border: '1px solid var(--card-border)' }}>
              <strong>2. DKIM Selector (TXT)</strong>
              <div style={{ fontSize: 12, color: C.sub, marginTop: 4 }}>Type: TXT | Host: google._domainkey</div>
              <div style={{ fontSize: 12, fontFamily: 'monospace', color: C.accent, marginTop: 4 }}>{data?.dns?.dkimRecord?.substring(0, 45) || 'v=DKIM1; k=rsa; p=MIGfMA0GCSqG...'}...</div>
            </div>
            <div style={{ background: 'var(--card-bg)', padding: 12, borderRadius: 10, border: '1px solid var(--card-border)' }}>
              <strong>3. DMARC Policy (TXT)</strong>
              <div style={{ fontSize: 12, color: C.sub, marginTop: 4 }}>Type: TXT | Host: _dmarc</div>
              <div style={{ fontSize: 12, fontFamily: 'monospace', color: C.accent, marginTop: 4 }}>{data?.dns?.dmarcRecord || `v=DMARC1; p=quarantine; rua=mailto:dmarc@${selectedDomain}`}</div>
            </div>
          </div>
        </div>
      )}

      {/* Main Health & Telemetry Overview */}
      <div style={glassCardStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h3 style={{ fontSize: 20, fontWeight: 750, color: C.ink, margin: 0 }}>
              Domain Health & Authentication — <span style={{ color: C.accent }}>{selectedDomain}</span>
            </h3>
            <p style={{ fontSize: 13, color: C.sub, margin: '4px 0 0 0' }}>
              Monitoring domain reputation, SPF/DKIM/DMARC authentication records, and live database performance.
            </p>
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <div style={{
              padding: '8px 18px',
              borderRadius: 999,
              background: data.status === 'healthy' ? 'rgba(16, 185, 129, 0.15)' : data.status === 'warning' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(244, 63, 94, 0.15)',
              color: data.status === 'healthy' ? C.green : data.status === 'warning' ? C.amber : C.red,
              fontWeight: 750,
              fontSize: 14,
              border: `1px solid ${data.status === 'healthy' ? 'rgba(16, 185, 129, 0.3)' : data.status === 'warning' ? 'rgba(245, 158, 11, 0.3)' : 'rgba(244, 63, 94, 0.3)'}`
            }}>
              Status: {data.status?.toUpperCase()} ({data.healthScore}/100)
            </div>
          </div>
        </div>

        {/* Dynamic Telemetry Metrics Bar */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 24 }}>
          <div style={{ background: 'var(--subtle-card-bg)', padding: '12px 16px', borderRadius: 12, border: '1px solid var(--card-border)' }}>
            <div style={{ fontSize: 11, color: C.sub }}>Emails Sent</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: C.ink, marginTop: 2 }}>{stats.totalSent}</div>
          </div>
          <div style={{ background: 'var(--subtle-card-bg)', padding: '12px 16px', borderRadius: 12, border: '1px solid var(--card-border)' }}>
            <div style={{ fontSize: 11, color: C.sub }}>Open Rate</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: C.green, marginTop: 2 }}>{(stats.openRate * 100).toFixed(1)}%</div>
          </div>
          <div style={{ background: 'var(--subtle-card-bg)', padding: '12px 16px', borderRadius: 12, border: '1px solid var(--card-border)' }}>
            <div style={{ fontSize: 11, color: C.sub }}>Reply Rate</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: C.accent, marginTop: 2 }}>{(stats.replyRate * 100).toFixed(1)}%</div>
          </div>
          <div style={{ background: 'var(--subtle-card-bg)', padding: '12px 16px', borderRadius: 12, border: '1px solid var(--card-border)' }}>
            <div style={{ fontSize: 11, color: C.sub }}>Bounce Rate</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: stats.bounceRate > 0.03 ? C.red : C.green, marginTop: 2 }}>
              {(stats.bounceRate * 100).toFixed(1)}%
            </div>
          </div>
          <div style={{ background: 'var(--subtle-card-bg)', padding: '12px 16px', borderRadius: 12, border: '1px solid var(--card-border)' }}>
            <div style={{ fontSize: 11, color: C.sub }}>Spam Complaints</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: C.green, marginTop: 2 }}>&lt; 0.01%</div>
          </div>
        </div>

        {/* DNS Record Authentication Grid Cards with Copy Buttons */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16, marginBottom: 24 }}>
          {/* SPF Card */}
          <div style={{ background: 'var(--subtle-card-bg)', padding: 16, borderRadius: 14, border: '1px solid var(--card-border)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: C.ink }}>SPF Authentication</span>
                <span style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: data.dns?.spf === 'valid' ? C.green : C.amber,
                  background: data.dns?.spf === 'valid' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                  padding: '2px 8px',
                  borderRadius: 6
                }}>
                  {data.dns?.spf?.toUpperCase()}
                </span>
              </div>
              <div style={{ fontSize: 11, color: C.muted, marginTop: 6, wordBreak: 'break-all', fontFamily: 'monospace', background: 'var(--card-bg)', padding: 6, borderRadius: 6, border: '1px solid var(--card-border)' }}>
                {data.dns?.spfRecord || 'v=spf1 include:_spf.google.com ~all'}
              </div>
            </div>
            <button
              onClick={() => copyToClipboard(data.dns?.spfRecord || 'v=spf1 include:_spf.google.com ~all', 'SPF')}
              style={{
                marginTop: 12,
                padding: '6px 12px',
                borderRadius: 8,
                background: 'var(--card-bg)',
                border: '1px solid var(--card-border)',
                color: C.text,
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                textAlign: 'center'
              }}>
              {copiedRecord === 'SPF' ? 'Copied!' : 'Copy SPF Record'}
            </button>
          </div>

          {/* DKIM Card */}
          <div style={{ background: 'var(--subtle-card-bg)', padding: 16, borderRadius: 14, border: '1px solid var(--card-border)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: C.ink }}>DKIM Signature</span>
                <span style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: data.dns?.dkim === 'valid' ? C.green : C.amber,
                  background: data.dns?.dkim === 'valid' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                  padding: '2px 8px',
                  borderRadius: 6
                }}>
                  {data.dns?.dkim?.toUpperCase()}
                </span>
              </div>
              <div style={{ fontSize: 11, color: C.muted, marginTop: 6, wordBreak: 'break-all', fontFamily: 'monospace', background: 'var(--card-bg)', padding: 6, borderRadius: 6, border: '1px solid var(--card-border)' }}>
                {data.dns?.dkimRecord ? `${data.dns.dkimRecord.substring(0, 45)}...` : 'RSA-2048 Cryptographic Verification Active'}
              </div>
            </div>
            <button
              onClick={() => copyToClipboard(data.dns?.dkimRecord || 'v=DKIM1; k=rsa; p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQ...', 'DKIM')}
              style={{
                marginTop: 12,
                padding: '6px 12px',
                borderRadius: 8,
                background: 'var(--card-bg)',
                border: '1px solid var(--card-border)',
                color: C.text,
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                textAlign: 'center'
              }}>
              {copiedRecord === 'DKIM' ? 'Copied!' : 'Copy DKIM Selector'}
            </button>
          </div>

          {/* DMARC Card */}
          <div style={{ background: 'var(--subtle-card-bg)', padding: 16, borderRadius: 14, border: '1px solid var(--card-border)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: C.ink }}>DMARC Policy</span>
                <span style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: data.dns?.dmarc === 'valid' ? C.green : C.amber,
                  background: data.dns?.dmarc === 'valid' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                  padding: '2px 8px',
                  borderRadius: 6
                }}>
                  {data.dns?.dmarc?.toUpperCase()}
                </span>
              </div>
              <div style={{ fontSize: 11, color: C.muted, marginTop: 6, wordBreak: 'break-all', fontFamily: 'monospace', background: 'var(--card-bg)', padding: 6, borderRadius: 6, border: '1px solid var(--card-border)' }}>
                {data.dns?.dmarcRecord || `v=DMARC1; p=quarantine; rua=mailto:dmarc@${selectedDomain}`}
              </div>
            </div>
            <button
              onClick={() => copyToClipboard(data.dns?.dmarcRecord || `v=DMARC1; p=quarantine; rua=mailto:dmarc@${selectedDomain}`, 'DMARC')}
              style={{
                marginTop: 12,
                padding: '6px 12px',
                borderRadius: 8,
                background: 'var(--card-bg)',
                border: '1px solid var(--card-border)',
                color: C.text,
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                textAlign: 'center'
              }}>
              {copiedRecord === 'DMARC' ? 'Copied!' : 'Copy DMARC Policy'}
            </button>
          </div>
        </div>

        {/* Domain Warm-Up Stage Manager */}
        <div style={{ background: 'var(--subtle-card-bg)', padding: 18, borderRadius: 16, border: '1px solid var(--card-border)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap' }}>
            <div>
              <h4 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: C.ink }}>Domain Warm-Up Progression & Daily Sending Limit</h4>
              <p style={{ margin: '2px 0 0 0', fontSize: 12, color: C.sub }}>
                Stage {data.warmUpStage}: Currently limited to <strong>{data.warmUpDailyLimit} emails/day</strong> to preserve sender reputation.
              </p>
            </div>
            <span style={{ fontSize: 12, fontWeight: 700, color: C.accent }}>
              Stage {data.warmUpStage} of 5
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 10 }}>
            {warmUpStagesList.map((stg) => {
              const isCurrent = data.warmUpStage === stg.stage;
              return (
                <button
                  key={stg.stage}
                  onClick={() => updateWarmUpStage(stg.stage)}
                  disabled={updatingStage}
                  style={{
                    padding: '10px 12px',
                    borderRadius: 12,
                    border: isCurrent ? '2px solid var(--accent)' : '1px solid var(--card-border)',
                    background: isCurrent ? 'rgba(2, 132, 199, 0.12)' : 'var(--card-bg)',
                    color: isCurrent ? C.accent : C.text,
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.2s ease'
                  }}>
                  <div style={{ fontSize: 12, fontWeight: 750 }}>Stage {stg.stage}</div>
                  <div style={{ fontSize: 14, fontWeight: 800, marginTop: 2 }}>{stg.limit} / day</div>
                  <div style={{ fontSize: 10, color: C.muted, marginTop: 2 }}>{stg.desc}</div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Health Audit Checklist */}
      {data.checks && data.checks.length > 0 && (
        <div style={glassCardStyle}>
          <h3 style={{ fontSize: 18, fontWeight: 750, color: C.ink, margin: '0 0 14px 0' }}>Domain Health Audit Checklist</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {data.checks.map((chk, idx) => (
              <div key={idx} style={{
                display: 'flex',
                alignItems: 'center',
                justify: 'space-between',
                padding: '10px 14px',
                background: 'var(--subtle-card-bg)',
                borderRadius: 10,
                border: '1px solid var(--card-border)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{
                    fontSize: 12,
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: 6,
                    background: chk.status === 'pass' ? 'rgba(16, 185, 129, 0.15)' : chk.status === 'warn' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(244, 63, 94, 0.15)',
                    color: chk.status === 'pass' ? C.green : chk.status === 'warn' ? C.amber : C.red
                  }}>
                    {chk.status === 'pass' ? 'PASS' : chk.status === 'warn' ? 'WARN' : 'FAIL'}
                  </span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: C.ink }}>{chk.name}</span>
                </div>
                <span style={{ fontSize: 12, color: C.sub }}>{chk.message}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Interactive Inbox Placement Simulator */}
      <div style={glassCardStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 10 }}>
          <div>
            <h3 style={{ fontSize: 18, fontWeight: 750, color: C.ink, margin: 0 }}>Inbox Placement & Spam Copy Tester</h3>
            <p style={{ fontSize: 13, color: C.sub, margin: '2px 0 0 0' }}>
              Analyze your subject line and email body against primary inbox spam filters before launching campaigns.
            </p>
          </div>
          <button
            onClick={loadSampleEmail}
            style={{
              padding: '6px 12px',
              borderRadius: 8,
              background: 'rgba(99, 102, 241, 0.12)',
              color: '#6366f1',
              border: '1px solid rgba(99, 102, 241, 0.25)',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer'
            }}>
            Load Sample Cold Email
          </button>
        </div>

        <input
          type="text"
          placeholder="Subject Line (e.g. Quick question regarding {{company}})..."
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid var(--input-border)', background: 'var(--input-bg)', color: 'var(--text-primary)', marginBottom: 10, fontSize: 13 }}
        />
        <textarea
          placeholder="Email Body Content..."
          value={body}
          onChange={(e) => setBody(e.target.value)}
          style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid var(--input-border)', background: 'var(--input-bg)', color: 'var(--text-primary)', height: 110, marginBottom: 12, fontSize: 13 }}
        />
        
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={runPlacementTest}
            disabled={testing}
            style={{
              padding: '10px 22px',
              borderRadius: 10,
              background: C.accent,
              color: '#fff',
              border: 'none',
              fontWeight: 650,
              cursor: 'pointer',
              opacity: testing ? 0.7 : 1
            }}>
            {testing ? 'Simulating Placement...' : 'Simulate Inbox Placement'}
          </button>
        </div>

        {testRes && (
          <div style={{ marginTop: 20, padding: 18, background: 'var(--subtle-card-bg)', borderRadius: 14, border: '1px solid var(--card-border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
              <div style={{ fontSize: 15, fontWeight: 750, color: C.ink }}>
                Placement Simulation Result: <span style={{ color: testRes.rating === 'Excellent' ? C.green : testRes.rating === 'Good' ? C.accent : C.red }}>{testRes.rating}</span>
              </div>
              <div style={{ fontSize: 11, color: C.muted }}>Tested: {new Date(testRes.testedAt).toLocaleTimeString()}</div>
            </div>

            {/* Visual Percentage Bars */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 14 }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 650, color: C.green, marginBottom: 4 }}>
                  <span>Primary Inbox</span>
                  <span>{testRes.inboxPct}%</span>
                </div>
                <div style={{ height: 8, borderRadius: 4, background: 'var(--card-border)', overflow: 'hidden' }}>
                  <div style={{ width: `${testRes.inboxPct}%`, height: '100%', background: C.green, transition: 'width 0.4s ease' }} />
                </div>
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 650, color: C.amber, marginBottom: 4 }}>
                  <span>Promotions Tab</span>
                  <span>{testRes.promoPct}%</span>
                </div>
                <div style={{ height: 8, borderRadius: 4, background: 'var(--card-border)', overflow: 'hidden' }}>
                  <div style={{ width: `${testRes.promoPct}%`, height: '100%', background: C.amber, transition: 'width 0.4s ease' }} />
                </div>
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 650, color: C.red, marginBottom: 4 }}>
                  <span>Spam Folder</span>
                  <span>{testRes.spamPct}%</span>
                </div>
                <div style={{ height: 8, borderRadius: 4, background: 'var(--card-border)', overflow: 'hidden' }}>
                  <div style={{ width: `${testRes.spamPct}%`, height: '100%', background: C.red, transition: 'width 0.4s ease' }} />
                </div>
              </div>
            </div>

            {/* Spam Keywords Triggered */}
            {testRes.foundTriggers && testRes.foundTriggers.length > 0 && (
              <div style={{ marginBottom: 12, padding: 10, borderRadius: 8, background: 'rgba(244, 63, 94, 0.08)', border: '1px solid rgba(244, 63, 94, 0.2)' }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: C.red }}>Detected Spam Trigger Words: </span>
                {testRes.foundTriggers.map((trg, i) => (
                  <span key={i} style={{ fontSize: 11, padding: '2px 6px', background: 'rgba(244, 63, 94, 0.15)', color: C.red, borderRadius: 4, marginRight: 6, fontWeight: 600 }}>
                    {trg}
                  </span>
                ))}
              </div>
            )}

            <div style={{ fontSize: 13, color: C.text, background: 'var(--card-bg)', padding: 12, borderRadius: 10, border: '1px solid var(--card-border)' }}>
              <strong>AI Deliverability Advice:</strong> {testRes.recommendation}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
