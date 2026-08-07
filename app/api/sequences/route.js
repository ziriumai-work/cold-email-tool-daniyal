import { NextResponse } from 'next/server';
import { getDefaultSequenceNodes, processSequenceStepForCompany, enrollCompanyInSequence } from '../../../lib/sequences.js';
import * as db from '../../../lib/db.js';

export async function GET() {
  try {
    let sequence = await db.get("SELECT * FROM sequences ORDER BY id DESC LIMIT 1");
    if (!sequence) {
      const defaultNodes = getDefaultSequenceNodes();
      await db.run(
        "INSERT INTO sequences (name, nodes_json, status, created_at) VALUES ('Standard Enterprise Branching Campaign', ?, 'active', datetime('now'))",
        [JSON.stringify(defaultNodes)]
      );
      sequence = await db.get("SELECT * FROM sequences ORDER BY id DESC LIMIT 1");
    }

    const defaultNodes = getDefaultSequenceNodes();
    const companies = (await db.all("SELECT id, name, contact_email, website FROM companies ORDER BY id DESC LIMIT 100")) || [];
    const companyMap = new Map(companies.map((c) => [c.id, c]));

    const rawTasks = (await db.all("SELECT * FROM multi_channel_tasks WHERE status = 'pending' ORDER BY id DESC")) || [];
    const tasks = (rawTasks || []).map((t) => ({
      ...t,
      company_name: companyMap.get(t.company_id)?.name || `Company #${t.company_id}`,
      contact_email: companyMap.get(t.company_id)?.contact_email || ''
    }));

    const rawEnrollments = (await db.all("SELECT * FROM sequence_enrollments ORDER BY id DESC")) || [];
    const enrollments = (rawEnrollments || []).map((e) => ({
      ...e,
      company_name: companyMap.get(e.company_id)?.name || `Company #${e.company_id}`,
      contact_email: companyMap.get(e.company_id)?.contact_email || '',
      website: companyMap.get(e.company_id)?.website || ''
    }));

    const rawDrafts = (await db.all("SELECT id, company_id, subject, status, open_count, opened_at, last_opened_at, click_count, clicked_at, last_clicked_at, replied_at, tracking_id, created_at FROM drafts ORDER BY id DESC LIMIT 50")) || [];
    const drafts = (rawDrafts || []).map((d) => ({
      ...d,
      company_name: companyMap.get(d.company_id)?.name || `Company #${d.company_id}`,
      contact_email: companyMap.get(d.company_id)?.contact_email || ''
    }));

    return NextResponse.json({
      ok: true,
      sequence: {
        id: sequence?.id || 1,
        name: sequence?.name || 'Standard Enterprise Branching Campaign',
        status: sequence?.status || 'active',
        nodes: sequence?.nodes_json ? JSON.parse(sequence.nodes_json) : defaultNodes
      },
      tasks: tasks || [],
      enrollments: enrollments || [],
      drafts: drafts || [],
      companies: companies || []
    });
  } catch (err) {
    console.error('GET /api/sequences error:', err);
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { action, taskId, nodes, name, companyId, enrollmentId, status, eventType } = body;

    if (action === 'save_sequence') {
      const nodesStr = JSON.stringify(nodes || []);
      const existing = await db.get("SELECT id FROM sequences ORDER BY id DESC LIMIT 1");
      if (existing) {
        await db.run("UPDATE sequences SET name = ?, nodes_json = ? WHERE id = ?", [name || 'Enterprise Branching Campaign', nodesStr, existing.id]);
      } else {
        await db.run("INSERT INTO sequences (name, nodes_json, status, created_at) VALUES (?, ?, 'active', datetime('now'))", [name || 'Enterprise Branching Campaign', nodesStr]);
      }
      return NextResponse.json({ ok: true, message: 'Sequence configuration saved successfully' });
    }

    if (action === 'complete_task') {
      await db.run("UPDATE multi_channel_tasks SET status = 'completed' WHERE id = ?", [taskId]);
      return NextResponse.json({ ok: true, message: 'Multi-channel task marked as completed' });
    }

    if (action === 'enroll_company') {
      const result = await enrollCompanyInSequence(companyId);
      return NextResponse.json(result);
    }

    if (action === 'update_enrollment') {
      await db.run("UPDATE sequence_enrollments SET status = ? WHERE id = ?", [status, enrollmentId]);
      return NextResponse.json({ ok: true, message: `Enrollment status updated to ${status}` });
    }

    if (action === 'trigger_event') {
      if (!companyId) return NextResponse.json({ ok: false, error: 'Company ID required' }, { status: 400 });

      // Update draft counts if simulating open, click, or reply
      const draft = await db.get("SELECT * FROM drafts WHERE company_id = ? ORDER BY id DESC LIMIT 1", [companyId]);
      const now = new Date().toISOString();

      if (draft) {
        if (eventType === 'open') {
          const newCount = (draft.open_count || 0) + 1;
          const openedAt = draft.opened_at || now;
          await db.run("UPDATE drafts SET open_count = ?, opened_at = ?, last_opened_at = ? WHERE id = ?", [newCount, openedAt, now, draft.id]);
        } else if (eventType === 'click') {
          const newCount = (draft.click_count || 0) + 1;
          const clickedAt = draft.clicked_at || now;
          await db.run("UPDATE drafts SET click_count = ?, clicked_at = ?, last_clicked_at = ? WHERE id = ?", [newCount, clickedAt, now, draft.id]);
        } else if (eventType === 'reply') {
          const repliedAt = draft.replied_at || now;
          await db.run("UPDATE drafts SET status = 'replied', replied_at = ? WHERE id = ?", [repliedAt, draft.id]);
        }
      }

      const res = await processSequenceStepForCompany(companyId, draft, eventType);
      return NextResponse.json(res);
    }

    return NextResponse.json({ ok: false, error: 'Invalid sequence action' }, { status: 400 });
  } catch (err) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
