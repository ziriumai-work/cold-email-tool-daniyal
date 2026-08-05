import { NextResponse } from 'next/server';
import { getDefaultSequenceNodes } from '../../../lib/sequences.js';
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

    const tasks = await db.all("SELECT t.*, c.name as company_name, c.contact_email FROM multi_channel_tasks t LEFT JOIN companies c ON t.company_id = c.id WHERE t.status = 'pending' ORDER BY t.id DESC");

    return NextResponse.json({
      ok: true,
      sequence: {
        ...sequence,
        nodes: sequence.nodes_json ? JSON.parse(sequence.nodes_json) : getDefaultSequenceNodes()
      },
      tasks
    });
  } catch (err) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { action, taskId, nodes, name } = body;

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

    return NextResponse.json({ ok: false, error: 'Invalid sequence action' }, { status: 400 });
  } catch (err) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
