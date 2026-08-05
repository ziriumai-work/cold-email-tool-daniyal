import * as db from './db.js';

/**
 * Dispatch outbound Webhook payload when an event (reply, send, bounce, unsub) occurs
 */
export async function dispatchCrmWebhook(eventType, data) {
  try {
    const integration = await db.get("SELECT * FROM crm_integrations WHERE provider = 'webhook' AND sync_status = 'active'");
    if (!integration || !integration.config_json) return;

    const config = JSON.parse(integration.config_json);
    if (!config.webhookUrl) return;

    const payload = {
      event: eventType,
      timestamp: new Date().toISOString(),
      data
    };

    // Fire and forget fetch request to configured webhook URL
    fetch(config.webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }).catch((err) => console.error('Webhook dispatch fetch error:', err.message));

    await db.run("UPDATE crm_integrations SET last_synced_at = datetime('now') WHERE id = ?", [integration.id]);
  } catch (err) {
    console.error('Error dispatching CRM Webhook:', err.message);
  }
}

/**
 * Sync lead status or reply to HubSpot / Salesforce simulated layer
 */
export async function syncLeadToCrm(provider, leadData) {
  try {
    const integration = await db.get("SELECT * FROM crm_integrations WHERE provider = ? AND sync_status = 'active'", [provider]);
    if (!integration) {
      return { success: false, message: `${provider} integration not configured` };
    }

    // Record last sync execution timestamp
    await db.run("UPDATE crm_integrations SET last_synced_at = datetime('now') WHERE id = ?", [integration.id]);

    return {
      success: true,
      provider,
      syncedAt: new Date().toISOString(),
      message: `Lead ${leadData.name || leadData.contact_email} successfully synced to ${provider}.`
    };
  } catch (err) {
    console.error(`Error syncing lead to ${provider}:`, err.message);
    return { success: false, error: err.message };
  }
}
