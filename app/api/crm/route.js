import { NextResponse } from 'next/server';
import { syncLeadToCrm } from '../../../lib/crm.js';
import * as db from '../../../lib/db.js';

export async function GET() {
  try {
    const integrations = await db.all('SELECT * FROM crm_integrations');
    return NextResponse.json({ ok: true, integrations });
  } catch (err) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { provider, webhookUrl, action, testLead } = body;

    if (action === 'test_sync') {
      const result = await syncLeadToCrm(provider || 'hubspot', testLead || { name: 'Acme Corp', contact_email: 'ceo@acme.com' });
      return NextResponse.json({ ok: true, result });
    }

    const config = JSON.stringify({ webhookUrl, updatedAt: new Date().toISOString() });
    const existing = await db.get('SELECT id FROM crm_integrations WHERE provider = ?', [provider]);

    if (existing) {
      await db.run("UPDATE crm_integrations SET config_json = ?, sync_status = 'active' WHERE id = ?", [config, existing.id]);
    } else {
      await db.run("INSERT INTO crm_integrations (provider, config_json, sync_status) VALUES (?, ?, 'active')", [provider, config]);
    }

    return NextResponse.json({ ok: true, message: `${provider} integration settings updated.` });
  } catch (err) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
