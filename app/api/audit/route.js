import { NextResponse } from 'next/server';
import { getAuditLogs, logAuditEvent } from '../../../lib/rbacAudit.js';

export async function GET() {
  try {
    const logs = await getAuditLogs(100);
    return NextResponse.json({ ok: true, auditLogs: logs });
  } catch (err) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const { action, target, payload, role } = await request.json();
    await logAuditEvent(role || 'Admin', action, target, payload);
    return NextResponse.json({ ok: true, message: 'Audit event logged' });
  } catch (err) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
