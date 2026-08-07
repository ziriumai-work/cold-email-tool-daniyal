import { NextResponse } from 'next/server';
import {
  checkDomainDns,
  calculateDomainHealth,
  runInboxPlacementTest,
  getWarmUpLimit,
  getDomainStats,
  getDomainWarmUpStage,
  setDomainWarmUpStage
} from '../../../lib/deliverability.js';
import { publicSenders } from '../../../lib/senders.js';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const senders = publicSenders();
    const availableDomains = Array.from(
      new Set(
        senders
          .map((s) => (s.email || '').split('@')[1])
          .filter(Boolean)
      )
    );
    if (!availableDomains.includes('ziriumai.com')) {
      availableDomains.push('ziriumai.com');
    }

    const domainParam = searchParams.get('domain');
    const domain = (domainParam || availableDomains[0] || 'ziriumai.com').trim().toLowerCase();

    const dnsInfo = await checkDomainDns(domain);
    const stats = await getDomainStats(domain);
    const warmUpStage = await getDomainWarmUpStage(domain);

    const health = calculateDomainHealth({
      bounceRate: stats.bounceRate,
      spamComplaints: stats.spamComplaints,
      openRate: stats.openRate,
      replyRate: stats.replyRate,
      spf: dnsInfo.spf,
      dkim: dnsInfo.dkim,
      dmarc: dnsInfo.dmarc,
    });

    const warmUpLimit = getWarmUpLimit(warmUpStage);

    return NextResponse.json({
      ok: true,
      domain,
      availableDomains,
      senders,
      dns: dnsInfo,
      stats,
      healthScore: health.healthScore,
      status: health.status,
      checks: health.checks,
      warmUpStage,
      warmUpDailyLimit: warmUpLimit,
      recommendedDnsRecords: [
        { type: 'TXT', host: domain, value: dnsInfo.spfRecord || `v=spf1 include:_spf.google.com ~all`, purpose: 'SPF Authentication' },
        { type: 'TXT', host: `google._domainkey.${domain}`, value: dnsInfo.dkimRecord || `v=DKIM1; k=rsa; p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQ...`, purpose: 'DKIM Selector' },
        { type: 'TXT', host: `_dmarc.${domain}`, value: dnsInfo.dmarcRecord || `v=DMARC1; p=quarantine; rua=mailto:dmarc@${domain}`, purpose: 'DMARC Enforcement' }
      ]
    });
  } catch (err) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { action, domain = 'ziriumai.com', subject, body: content, stage } = body;

    if (action === 'placement_test') {
      const result = await runInboxPlacementTest(subject, content);
      return NextResponse.json({ ok: true, testResult: result });
    }

    if (action === 'update_warmup') {
      const newStage = await setDomainWarmUpStage(domain, stage);
      const newLimit = getWarmUpLimit(newStage);
      return NextResponse.json({
        ok: true,
        domain,
        warmUpStage: newStage,
        warmUpDailyLimit: newLimit,
        message: `Warm-up limit updated to Stage ${newStage} (${newLimit} emails/day)`
      });
    }

    if (action === 'recheck_dns') {
      const dnsInfo = await checkDomainDns(domain);
      const stats = await getDomainStats(domain);
      const warmUpStage = await getDomainWarmUpStage(domain);
      const health = calculateDomainHealth({
        bounceRate: stats.bounceRate,
        spamComplaints: stats.spamComplaints,
        openRate: stats.openRate,
        replyRate: stats.replyRate,
        spf: dnsInfo.spf,
        dkim: dnsInfo.dkim,
        dmarc: dnsInfo.dmarc,
      });

      return NextResponse.json({
        ok: true,
        domain,
        dns: dnsInfo,
        healthScore: health.healthScore,
        status: health.status,
        checks: health.checks
      });
    }

    return NextResponse.json({ ok: false, error: 'Invalid deliverability action' }, { status: 400 });
  } catch (err) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
