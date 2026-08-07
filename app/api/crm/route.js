import { NextResponse } from 'next/server';
import { syncLeadToCrm, dispatchCrmWebhook, getWebhookLogs, clearWebhookLogs, getAllCrmIntegrations, saveCrmIntegration } from '../../../lib/crm.js';

export async function GET() {
  try {
    const integrations = await getAllCrmIntegrations();
    const webhookLogs = await getWebhookLogs(50);

    return NextResponse.json({ ok: true, integrations, webhookLogs });
  } catch (err) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { provider, webhookUrl, secretKey, subscribedEvents, apiKey, portalId, syncStatus, action, testLead } = body;

    if (action === 'test_webhook') {
      const result = await dispatchCrmWebhook('test.ping', {
        message: 'Real-Time Webhook Connection Test',
        triggeredAt: new Date().toISOString(),
        testData: { sampleCompany: 'Acme Corp', sampleEmail: 'ceo@acme.com', intentScore: 85 }
      }, true);

      return NextResponse.json({ ok: true, result });
    }

    if (action === 'test_sync') {
      const result = await syncLeadToCrm(provider || 'hubspot', testLead || { name: 'Acme Corp', contact_email: 'ceo@acme.com' });
      return NextResponse.json({ ok: true, result });
    }

    if (action === 'clear_logs') {
      await clearWebhookLogs();
      return NextResponse.json({ ok: true, message: 'Webhook delivery history cleared.' });
    }

    // Default save config
    const targetProvider = (provider || 'webhook').toLowerCase();
    const configObj = {
      webhookUrl: webhookUrl || '',
      secretKey: secretKey || '',
      subscribedEvents: subscribedEvents || ['email.sent', 'email.opened_no_reply', 'email.clicked_no_reply', 'reply.received', 'lead.score_updated'],
      apiKey: apiKey || '',
      portalId: portalId || '',
      updatedAt: new Date().toISOString()
    };

    const status = syncStatus || 'active';
    await saveCrmIntegration(targetProvider, configObj, status);

    return NextResponse.json({ ok: true, message: `${targetProvider.toUpperCase()} integration settings saved.` });
  } catch (err) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}

