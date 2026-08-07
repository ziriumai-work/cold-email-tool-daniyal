'use client';
import { useState, useEffect } from 'react';
import { BuildingIcon } from '../Icons.jsx';
import { C, glassCardStyle } from './theme.js';

export function CrmView({ flash }) {
  const [webhookUrl, setWebhookUrl] = useState('');
  const [secretKey, setSecretKey] = useState('');
  const [subscribedEvents, setSubscribedEvents] = useState(['email.sent', 'email.opened_no_reply', 'email.clicked_no_reply', 'reply.received', 'lead.score_updated']);
  const [webhookActive, setWebhookActive] = useState(true);

  const [hubspotKey, setHubspotKey] = useState('');
  const [hubspotActive, setHubspotActive] = useState(true);

  const [salesforceKey, setSalesforceKey] = useState('');
  const [salesforceActive, setSalesforceActive] = useState(false);

  const [webhookLogs, setWebhookLogs] = useState([]);
  const [testingWebhook, setTestingWebhook] = useState(false);
  const [testingCrm, setTestingCrm] = useState(null);
  const [selectedLogPayload, setSelectedLogPayload] = useState(null);
  const [lastSynced, setLastSynced] = useState('');
  const [autoSyncLogs, setAutoSyncLogs] = useState(true);

  const ALL_EVENTS = [
    { key: 'email.sent', label: 'Email Sent' },
    { key: 'email.opened_no_reply', label: 'Email Opened' },
    { key: 'email.clicked_no_reply', label: 'Email Link Clicked' },
    { key: 'reply.received', label: 'Prospect Replied' },
    { key: 'lead.score_updated', label: 'AI Lead Score Updated' },
  ];

  async function loadCrmData() {
    try {
      const res = await fetch('/api/crm').then((r) => r.json());
      if (res.ok) {
        if (Array.isArray(res.integrations)) {
          const webhookConfig = res.integrations.find((i) => i.provider === 'webhook');
          if (webhookConfig?.config) {
            setWebhookUrl(webhookConfig.config.webhookUrl || '');
            setSecretKey(webhookConfig.config.secretKey || '');
            if (Array.isArray(webhookConfig.config.subscribedEvents)) {
              setSubscribedEvents(webhookConfig.config.subscribedEvents);
            }
            setWebhookActive(webhookConfig.sync_status === 'active');
          }

          const hubspotConfig = res.integrations.find((i) => i.provider === 'hubspot');
          if (hubspotConfig?.config) {
            setHubspotKey(hubspotConfig.config.apiKey || '');
            setHubspotActive(hubspotConfig.sync_status === 'active');
          }

          const salesforceConfig = res.integrations.find((i) => i.provider === 'salesforce');
          if (salesforceConfig?.config) {
            setSalesforceKey(salesforceConfig.config.apiKey || '');
            setSalesforceActive(salesforceConfig.sync_status === 'active');
          }
        }

        if (Array.isArray(res.webhookLogs)) {
          setWebhookLogs(res.webhookLogs);
        }
        setLastSynced(new Date().toLocaleTimeString());
      }
    } catch (err) {
      console.error('Error fetching CRM data:', err);
    }
  }

  useEffect(() => {
    loadCrmData();
  }, []);

  // Auto refresh live delivery logs
  useEffect(() => {
    if (!autoSyncLogs) return;
    const interval = setInterval(() => {
      loadCrmData();
    }, 6000);
    return () => clearInterval(interval);
  }, [autoSyncLogs]);

  async function saveConfig(provider) {
    let payload = { provider };
    if (provider === 'webhook') {
      payload = {
        provider: 'webhook',
        webhookUrl,
        secretKey,
        subscribedEvents,
        syncStatus: webhookActive ? 'active' : 'inactive'
      };
    } else if (provider === 'hubspot') {
      payload = {
        provider: 'hubspot',
        apiKey: hubspotKey,
        syncStatus: hubspotActive ? 'active' : 'inactive'
      };
    } else if (provider === 'salesforce') {
      payload = {
        provider: 'salesforce',
        apiKey: salesforceKey,
        syncStatus: salesforceActive ? 'active' : 'inactive'
      };
    }

    try {
      const res = await fetch('/api/crm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      }).then((r) => r.json());

      if (res.ok) {
        if (flash) flash(`${provider.toUpperCase()} integration settings saved!`);
        loadCrmData();
      }
    } catch (err) {
      if (flash) flash(`Error saving settings: ${err.message}`);
    }
  }

  async function testWebhookPing() {
    setTestingWebhook(true);
    try {
      // First auto-save webhook URL
      await saveConfig('webhook');

      const res = await fetch('/api/crm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'test_webhook' })
      }).then((r) => r.json());

      if (res.ok && res.result) {
        const { statusCode, responseTimeMs, success, targetUrl, error } = res.result;
        if (success) {
          if (flash) flash(`Webhook ping delivered! Status: ${statusCode} OK (${responseTimeMs}ms) to ${targetUrl}`);
        } else {
          if (flash) flash(`Webhook ping attempt logged. Status: ${statusCode || 'Failed'} (${responseTimeMs || 0}ms) ${error || ''}`);
        }
        loadCrmData();
      }
    } catch (err) {
      if (flash) flash(`Error testing webhook: ${err.message}`);
    } finally {
      setTestingWebhook(false);
    }
  }

  async function testSyncCrm(provider) {
    setTestingCrm(provider);
    try {
      const res = await fetch('/api/crm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'test_sync', provider })
      }).then((r) => r.json());

      if (res.ok && res.result) {
        if (flash) flash(res.result.message || `Lead synced to ${provider.toUpperCase()}`);
        loadCrmData();
      } else {
        if (flash) flash(`Sync failed: ${res.result?.message || 'Check configuration'}`);
      }
    } catch (err) {
      if (flash) flash(`Error syncing to ${provider}: ${err.message}`);
    } finally {
      setTestingCrm(null);
    }
  }

  async function clearLogs() {
    try {
      const res = await fetch('/api/crm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'clear_logs' })
      }).then((r) => r.json());

      if (res.ok) {
        setWebhookLogs([]);
        if (flash) flash('Webhook delivery log cleared.');
      }
    } catch (err) {
      // Ignore
    }
  }

  function toggleEventSubscription(eventKey) {
    setSubscribedEvents((prev) =>
      prev.includes(eventKey) ? prev.filter((e) => e !== eventKey) : [...prev, eventKey]
    );
  }

  return (
    <div>
      {/* Header Banner */}
      <div style={glassCardStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
          <div>
            <h3 style={{ fontSize: 19, fontWeight: 750, color: C.ink, margin: '0 0 4px 0', display: 'flex', alignItems: 'center', gap: 8 }}>
              <BuildingIcon size={20} color={C.accent} /> CRM Integrations & Real-Time Webhook Engine
            </h3>
            <p style={{ fontSize: 13, color: C.sub, margin: 0 }}>
              Bi-directional CRM synchronization and event-driven outbound HTTP Webhooks for Zapier, Make, and custom APIs.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: C.sub, cursor: 'pointer', fontWeight: 600 }}>
              <input type="checkbox" checked={autoSyncLogs} onChange={(e) => setAutoSyncLogs(e.target.checked)} />
              <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: autoSyncLogs ? C.green : C.muted, boxShadow: autoSyncLogs ? '0 0 8px #10b981' : 'none' }}></span>
              Realtime Logs (6s)
            </label>
          </div>
        </div>

        {lastSynced && (
          <div style={{ fontSize: 11, color: C.muted, textAlign: 'right' }}>
            Last synced: {lastSynced}
          </div>
        )}
      </div>

      {/* Integration Panels Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20, marginBottom: 24 }}>
        
        {/* Outbound Webhooks Configuration Panel */}
        <div style={glassCardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <h4 style={{ fontSize: 16, fontWeight: 750, color: C.ink, margin: 0 }}>
              Outbound HTTP Webhooks (Zapier & Make)
            </h4>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: C.sub, cursor: 'pointer', fontWeight: 600 }}>
              <input type="checkbox" checked={webhookActive} onChange={(e) => setWebhookActive(e.target.checked)} />
              {webhookActive ? 'Active' : 'Disabled'}
            </label>
          </div>

          <p style={{ fontSize: 12, color: C.sub, marginBottom: 14 }}>
            Receive real-time HTTP POST notifications whenever emails are sent, opened, clicked, or replied to.
          </p>

          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: C.ink, display: 'block', marginBottom: 4 }}>
              Target Webhook Endpoint URL
            </label>
            <input
              type="text"
              placeholder="https://your-server.com/api/webhook-receiver"
              value={webhookUrl}
              onChange={(e) => setWebhookUrl(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: 10,
                border: '1px solid var(--input-border)',
                background: 'var(--input-bg)',
                color: C.ink,
                fontSize: 13
              }}
            />
          </div>

          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: C.ink, display: 'block', marginBottom: 4 }}>
              Secret Key (X-Webhook-Secret Header)
            </label>
            <input
              type="text"
              placeholder="whsec_1234567890abcdef"
              value={secretKey}
              onChange={(e) => setSecretKey(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: 10,
                border: '1px solid var(--input-border)',
                background: 'var(--input-bg)',
                color: C.ink,
                fontSize: 13
              }}
            />
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: C.ink, display: 'block', marginBottom: 6 }}>
              Subscribed Outreach Events
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {ALL_EVENTS.map((ev) => (
                <label key={ev.key} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: C.sub, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={subscribedEvents.includes(ev.key)}
                    onChange={() => toggleEventSubscription(ev.key)}
                  />
                  <span>{ev.label} ({ev.key})</span>
                </label>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button
              onClick={() => saveConfig('webhook')}
              style={{
                padding: '8px 16px',
                borderRadius: 10,
                background: C.green,
                color: '#fff',
                border: 'none',
                fontWeight: 650,
                cursor: 'pointer',
                fontSize: 12
              }}
            >
              Save Webhook Config
            </button>
            <button
              onClick={testWebhookPing}
              disabled={testingWebhook}
              style={{
                padding: '8px 16px',
                borderRadius: 10,
                background: C.accent,
                color: '#fff',
                border: 'none',
                fontWeight: 650,
                cursor: testingWebhook ? 'not-allowed' : 'pointer',
                fontSize: 12,
                opacity: testingWebhook ? 0.7 : 1
              }}
            >
              {testingWebhook ? 'Dispatching Ping...' : 'Send Test Webhook Ping'}
            </button>
          </div>
        </div>

        {/* CRM Provider Direct Sync Panels */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* HubSpot */}
          <div style={glassCardStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <h4 style={{ fontSize: 16, fontWeight: 750, color: C.ink, margin: 0 }}>HubSpot Direct Sync</h4>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: C.sub, cursor: 'pointer', fontWeight: 600 }}>
                <input type="checkbox" checked={hubspotActive} onChange={(e) => setHubspotActive(e.target.checked)} />
                {hubspotActive ? 'Active' : 'Disabled'}
              </label>
            </div>
            <p style={{ fontSize: 12, color: C.sub, marginBottom: 12 }}>
              Sync contact activities, sent emails, and reply statuses directly into HubSpot CRM accounts.
            </p>
            <input
              type="password"
              placeholder="HubSpot Private App Token / API Key"
              value={hubspotKey}
              onChange={(e) => setHubspotKey(e.target.value)}
              style={{ width: '100%', padding: '9px 12px', borderRadius: 10, border: '1px solid var(--input-border)', background: 'var(--input-bg)', color: C.ink, fontSize: 12, marginBottom: 12 }}
            />
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => saveConfig('hubspot')} style={{ padding: '7px 14px', borderRadius: 8, background: 'var(--subtle-card-bg)', color: C.ink, border: '1px solid var(--card-border)', fontWeight: 600, fontSize: 12, cursor: 'pointer' }}>
                Save Key
              </button>
              <button onClick={() => testSyncCrm('hubspot')} disabled={testingCrm === 'hubspot'} style={{ padding: '7px 14px', borderRadius: 8, background: C.accent, color: '#fff', border: 'none', fontWeight: 600, fontSize: 12, cursor: 'pointer' }}>
                {testingCrm === 'hubspot' ? 'Syncing...' : 'Test HubSpot Sync'}
              </button>
            </div>
          </div>

          {/* Salesforce */}
          <div style={glassCardStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <h4 style={{ fontSize: 16, fontWeight: 750, color: C.ink, margin: 0 }}>Salesforce Direct Sync</h4>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: C.sub, cursor: 'pointer', fontWeight: 600 }}>
                <input type="checkbox" checked={salesforceActive} onChange={(e) => setSalesforceActive(e.target.checked)} />
                {salesforceActive ? 'Active' : 'Disabled'}
              </label>
            </div>
            <p style={{ fontSize: 12, color: C.sub, marginBottom: 12 }}>
              Sync qualified intent leads and reply outcomes into Salesforce CRM accounts & opportunities.
            </p>
            <input
              type="text"
              placeholder="Salesforce Instance URL or OAuth Client ID"
              value={salesforceKey}
              onChange={(e) => setSalesforceKey(e.target.value)}
              style={{ width: '100%', padding: '9px 12px', borderRadius: 10, border: '1px solid var(--input-border)', background: 'var(--input-bg)', color: C.ink, fontSize: 12, marginBottom: 12 }}
            />
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => saveConfig('salesforce')} style={{ padding: '7px 14px', borderRadius: 8, background: 'var(--subtle-card-bg)', color: C.ink, border: '1px solid var(--card-border)', fontWeight: 600, fontSize: 12, cursor: 'pointer' }}>
                Save Config
              </button>
              <button onClick={() => testSyncCrm('salesforce')} disabled={testingCrm === 'salesforce'} style={{ padding: '7px 14px', borderRadius: 8, background: C.accent, color: '#fff', border: 'none', fontWeight: 600, fontSize: 12, cursor: 'pointer' }}>
                {testingCrm === 'salesforce' ? 'Syncing...' : 'Test Salesforce Sync'}
              </button>
            </div>
          </div>
        </div>

      </div>

      {/* Live Outbound Webhook Delivery Feed Table */}
      <div style={glassCardStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
          <div>
            <h4 style={{ fontSize: 16, fontWeight: 750, color: C.ink, margin: '0 0 4px 0' }}>
              Real-Time Webhook Delivery History Feed
            </h4>
            <p style={{ fontSize: 12, color: C.sub, margin: 0 }}>
              Live audit stream of all HTTP POST webhook payloads dispatched to external endpoints.
            </p>
          </div>

          {webhookLogs.length > 0 && (
            <button
              onClick={clearLogs}
              style={{
                padding: '6px 12px',
                borderRadius: 8,
                border: '1px solid var(--card-border)',
                background: 'var(--subtle-card-bg)',
                color: C.sub,
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Clear Log History
            </button>
          )}
        </div>

        {webhookLogs.length === 0 ? (
          <div style={{ padding: 30, textAlign: 'center', color: C.muted, fontSize: 13 }}>
            No outbound webhook dispatches logged yet. Click "Send Test Webhook Ping" to test.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', textAlign: 'left', fontSize: 12, borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--card-border)', color: C.sub, background: 'var(--table-header-bg)' }}>
                  <th style={{ padding: 10 }}>Time</th>
                  <th style={{ padding: 10 }}>Event Type</th>
                  <th style={{ padding: 10 }}>Target Endpoint</th>
                  <th style={{ padding: 10 }}>HTTP Status</th>
                  <th style={{ padding: 10 }}>Latency</th>
                  <th style={{ padding: 10, textAlign: 'right' }}>Payload</th>
                </tr>
              </thead>
              <tbody>
                {webhookLogs.map((log) => {
                  const isOk = log.status_code >= 200 && log.status_code < 300;
                  const statusBg = isOk ? 'rgba(16, 185, 129, 0.12)' : 'rgba(244, 63, 94, 0.12)';
                  const statusColor = isOk ? C.green : C.red;

                  return (
                    <tr key={log.id} style={{ borderBottom: '1px solid var(--card-border)' }}>
                      <td style={{ padding: 10, color: C.sub }}>
                        {new Date(log.created_at).toLocaleTimeString()}
                      </td>
                      <td style={{ padding: 10 }}>
                        <span style={{ fontWeight: 700, color: C.ink, background: 'var(--subtle-card-bg)', padding: '2px 8px', borderRadius: 6, border: '1px solid var(--card-border)' }}>
                          {log.event_type}
                        </span>
                      </td>
                      <td style={{ padding: 10, color: C.sub, maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {log.target_url}
                      </td>
                      <td style={{ padding: 10 }}>
                        <span style={{ padding: '3px 8px', borderRadius: 6, fontWeight: 700, background: statusBg, color: statusColor }}>
                          {log.status_code ? `${log.status_code} ${isOk ? 'OK' : 'Error'}` : 'Failed'}
                        </span>
                      </td>
                      <td style={{ padding: 10, color: C.sub }}>
                        {log.response_time_ms ? `${log.response_time_ms}ms` : '—'}
                      </td>
                      <td style={{ padding: 10, textAlign: 'right' }}>
                        <button
                          onClick={() => setSelectedLogPayload(log)}
                          style={{
                            padding: '4px 10px',
                            borderRadius: 6,
                            border: '1px solid var(--card-border)',
                            background: 'var(--subtle-card-bg)',
                            color: C.ink,
                            fontSize: 11,
                            fontWeight: 600,
                            cursor: 'pointer'
                          }}
                        >
                          Inspect Payload
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Payload Modal */}
      {selectedLogPayload && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: 20 }}>
          <div style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: 20, padding: 24, maxWidth: 600, width: '100%', boxShadow: '0 20px 40px rgba(0,0,0,0.3)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div>
                <h3 style={{ fontSize: 18, fontWeight: 750, color: C.ink, margin: 0 }}>
                  Webhook Delivery Payload
                </h3>
                <div style={{ fontSize: 12, color: C.sub }}>Event: {selectedLogPayload.event_type}</div>
              </div>
              <button onClick={() => setSelectedLogPayload(null)} style={{ background: 'none', border: 'none', color: C.sub, fontSize: 20, cursor: 'pointer' }}>×</button>
            </div>

            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 11, color: C.sub, fontWeight: 600, marginBottom: 4 }}>Target URL</div>
              <div style={{ fontSize: 12, color: C.ink, background: 'var(--subtle-card-bg)', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--card-border)' }}>
                {selectedLogPayload.target_url}
              </div>
            </div>

            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 11, color: C.sub, fontWeight: 600, marginBottom: 4 }}>Dispatched JSON Payload</div>
              <pre style={{ fontSize: 11, background: 'var(--subtle-card-bg)', padding: 12, borderRadius: 10, border: '1px solid var(--card-border)', color: C.ink, maxHeight: 180, overflowY: 'auto' }}>
                {JSON.stringify(selectedLogPayload.payload || selectedLogPayload.payload_json, null, 2)}
              </pre>
            </div>

            {selectedLogPayload.response_body && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 11, color: C.sub, fontWeight: 600, marginBottom: 4 }}>Server Response Body Snippet</div>
                <pre style={{ fontSize: 11, background: 'var(--subtle-card-bg)', padding: 10, borderRadius: 8, border: '1px solid var(--card-border)', color: C.sub, maxHeight: 100, overflowY: 'auto' }}>
                  {selectedLogPayload.response_body}
                </pre>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setSelectedLogPayload(null)}
                style={{ padding: '8px 16px', borderRadius: 10, background: C.accent, color: '#fff', border: 'none', fontWeight: 600, fontSize: 12, cursor: 'pointer' }}
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
