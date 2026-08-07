import { NextResponse } from 'next/server';
import { getOrUpdateLeadScore, rescoreAllLeads } from '../../../lib/leadScoring.js';
import * as db from '../../../lib/db.js';

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const tierFilter = (searchParams.get('tier') || 'all').toLowerCase();
    const queryStr = (searchParams.get('q') || '').trim().toLowerCase();
    const sortBy = searchParams.get('sortBy') || 'score_desc';

    const companies = await db.all('SELECT id, name, website, contact_email FROM companies LIMIT 100');
    const allScores = [];

    for (const c of companies) {
      const s = await getOrUpdateLeadScore(c.id);
      allScores.push({
        companyId: c.id,
        companyName: c.name,
        website: c.website,
        email: c.contact_email,
        ...s
      });
    }

    // Calculate Summary Statistics
    const totalLeads = allScores.length;
    const hotLeads = allScores.filter((s) => s.score >= 70).length;
    const warmLeads = allScores.filter((s) => s.score >= 40 && s.score < 70).length;
    const coldLeads = allScores.filter((s) => s.score < 40).length;
    const avgScore = totalLeads > 0 ? Math.round(allScores.reduce((acc, curr) => acc + curr.score, 0) / totalLeads) : 0;
    const avgProb = totalLeads > 0 ? Math.round((allScores.reduce((acc, curr) => acc + (curr.conversionProb || 0), 0) / totalLeads) * 100) / 100 : 0;

    // Filter by tier and search query
    let filtered = allScores;
    if (tierFilter === 'hot') {
      filtered = filtered.filter((s) => s.score >= 70);
    } else if (tierFilter === 'warm') {
      filtered = filtered.filter((s) => s.score >= 40 && s.score < 70);
    } else if (tierFilter === 'cold') {
      filtered = filtered.filter((s) => s.score < 40);
    }

    if (queryStr) {
      filtered = filtered.filter(
        (s) =>
          (s.companyName || '').toLowerCase().includes(queryStr) ||
          (s.email || '').toLowerCase().includes(queryStr) ||
          (s.website || '').toLowerCase().includes(queryStr)
      );
    }

    // Sort
    if (sortBy === 'score_desc') {
      filtered.sort((a, b) => b.score - a.score);
    } else if (sortBy === 'score_asc') {
      filtered.sort((a, b) => a.score - b.score);
    } else if (sortBy === 'name') {
      filtered.sort((a, b) => (a.companyName || '').localeCompare(b.companyName || ''));
    }

    return NextResponse.json({
      ok: true,
      leadScores: filtered,
      summary: {
        totalLeads,
        hotLeads,
        warmLeads,
        coldLeads,
        avgScore,
        avgProb
      },
      lastUpdated: new Date().toISOString()
    });
  } catch (err) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const body = await req.json().catch(() => ({}));
    const action = body.action || 'rescore_all';
    const companyId = body.companyId;

    if (action === 'rescore_one' && companyId) {
      const updatedScore = await getOrUpdateLeadScore(companyId);
      const company = await db.get('SELECT id, name, website, contact_email FROM companies WHERE id = ?', [companyId]);
      return NextResponse.json({
        ok: true,
        message: `Successfully rescored company #${companyId}`,
        leadScore: {
          companyId,
          companyName: company?.name,
          website: company?.website,
          email: company?.contact_email,
          ...updatedScore
        }
      });
    }

    // Default rescore all leads
    const allScores = await rescoreAllLeads();
    const totalLeads = allScores.length;
    const hotLeads = allScores.filter((s) => s.score >= 70).length;
    const warmLeads = allScores.filter((s) => s.score >= 40 && s.score < 70).length;
    const coldLeads = allScores.filter((s) => s.score < 40).length;
    const avgScore = totalLeads > 0 ? Math.round(allScores.reduce((acc, curr) => acc + curr.score, 0) / totalLeads) : 0;
    const avgProb = totalLeads > 0 ? Math.round((allScores.reduce((acc, curr) => acc + (curr.conversionProb || 0), 0) / totalLeads) * 100) / 100 : 0;

    return NextResponse.json({
      ok: true,
      message: `Rescored ${allScores.length} leads in real-time.`,
      leadScores: allScores,
      summary: {
        totalLeads,
        hotLeads,
        warmLeads,
        coldLeads,
        avgScore,
        avgProb
      },
      lastUpdated: new Date().toISOString()
    });
  } catch (err) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}

