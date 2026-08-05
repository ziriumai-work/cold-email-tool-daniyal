import { NextResponse } from 'next/server';
import { checkDomainDns, calculateDomainHealth, runInboxPlacementTest, getWarmUpLimit } from '../../../lib/deliverability.js';
import * as db from '../../../lib/db.js';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const domain = searchParams.get('domain') || 'ziriumai.com';

    const dnsInfo = await checkDomainDns(domain);
    const health = calculateDomainHealth({
      bounceRate: 0.01,
      spamComplaints: 0.0001,
      openRate: 0.45,
      replyRate: 0.12,
      spf: dnsInfo.spf,
      dkim: dnsInfo.dkim,
      dmarc: dnsInfo.dmarc,
    });

    const warmUpLimit = getWarmUpLimit(2);

    return NextResponse.json({
      ok: true,
      domain,
      dns: dnsInfo,
      healthScore: health.healthScore,
      status: health.status,
      warmUpStage: 2,
      warmUpDailyLimit: warmUpLimit,
      recommendedDnsRecords: [
        { type: 'TXT', host: domain, value: dnsInfo.spfRecord || 'v=spf1 include:_spf.google.com ~all' },
        { type: 'TXT', host: `_dmarc.${domain}`, value: dnsInfo.dmarcRecord || 'v=DMARC1; p=quarantine; rua=mailto:dmarc@' + domain }
      ]
    });
  } catch (err) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { action, subject, body: content } = body;

    if (action === 'placement_test') {
      const result = await runInboxPlacementTest(subject, content);
      return NextResponse.json({ ok: true, testResult: result });
    }

    return NextResponse.json({ ok: false, error: 'Invalid deliverability action' }, { status: 400 });
  } catch (err) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
