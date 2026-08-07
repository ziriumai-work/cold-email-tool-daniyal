'use client';
import { useState, useEffect } from 'react';
import { C, glassCardStyle } from './theme.js';

export function SecurityAuditView() {
  const [logs, setLogs] = useState([]);
  const [role, setRole] = useState('Admin');

  useEffect(() => {
    fetch('/api/audit').then((r) => r.json()).then((d) => setLogs(d.auditLogs || [])).catch(() => {});
  }, []);

  return (
    <div>
      <div style={glassCardStyle}>
        <h3 style={{ fontSize: 18, fontWeight: 750, color: C.ink, margin: '0 0 8px 0' }}>Role-Based Access Control (RBAC)</h3>
        <p style={{ fontSize: 13, color: C.sub, marginBottom: 16 }}>Manage active permissions and workspace security roles.</p>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <span style={{ fontSize: 13, color: C.text, fontWeight: 600 }}>Current User Role:</span>
          <select value={role} onChange={(e) => setRole(e.target.value)} style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid var(--input-border)', background: 'var(--input-bg)', color: 'var(--text-primary)', fontWeight: 600 }}>
            <option value="Admin">Admin (Full Control)</option>
            <option value="Manager">Manager (Campaign & Lead Admin)</option>
            <option value="Sender">Sender (Execute Outreach)</option>
            <option value="Viewer">Viewer (Read-Only Analytics)</option>
          </select>
        </div>
      </div>

      <div style={glassCardStyle}>
        <h3 style={{ fontSize: 18, fontWeight: 750, color: C.ink, margin: '0 0 8px 0' }}>Enterprise Audit Trail</h3>
        <p style={{ fontSize: 13, color: C.sub, marginBottom: 16 }}>Persistent audit-grade event stream for security compliance.</p>

        {logs.length === 0 ? (
          <div style={{ fontSize: 13, color: C.muted }}>No audit logs recorded yet.</div>
        ) : (
          <div style={{ maxHeight: 300, overflowY: 'auto' }}>
            <table style={{ width: '100%', textAlign: 'left', fontSize: 13, borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--card-border)', color: C.sub, background: 'var(--table-header-bg)' }}>
                  <th style={{ padding: 8 }}>Role</th>
                  <th style={{ padding: 8 }}>Action</th>
                  <th style={{ padding: 8 }}>Target</th>
                  <th style={{ padding: 8 }}>Timestamp</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id} style={{ borderBottom: '1px solid var(--card-border)' }}>
                    <td style={{ padding: 8, fontWeight: 600 }}>{log.user_role}</td>
                    <td style={{ padding: 8 }}>{log.action}</td>
                    <td style={{ padding: 8 }}>{log.target || 'System'}</td>
                    <td style={{ padding: 8, color: C.muted }}>{log.created_at}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
