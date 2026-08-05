import * as db from './db.js';

export const ROLES = {
  ADMIN: 'Admin',
  MANAGER: 'Manager',
  SENDER: 'Sender',
  VIEWER: 'Viewer',
};

export const PERMISSIONS = {
  [ROLES.ADMIN]: ['create_campaign', 'edit_campaign', 'delete_campaign', 'manage_smtp', 'import_leads', 'export_data', 'manage_users', 'view_analytics'],
  [ROLES.MANAGER]: ['create_campaign', 'edit_campaign', 'import_leads', 'export_data', 'view_analytics'],
  [ROLES.SENDER]: ['create_campaign', 'edit_campaign', 'view_analytics'],
  [ROLES.VIEWER]: ['view_analytics'],
};

/**
 * Check if a role has permission to perform an action
 */
export function hasPermission(userRole = 'Admin', actionPermission) {
  const allowedActions = PERMISSIONS[userRole] || PERMISSIONS[ROLES.ADMIN];
  return allowedActions.includes(actionPermission);
}

/**
 * Log an audit event to the database
 */
export async function logAuditEvent(userRole = 'Admin', action, target = '', payload = {}) {
  try {
    const payloadStr = typeof payload === 'string' ? payload : JSON.stringify(payload);
    await db.run(
      `INSERT INTO audit_logs (user_role, action, target, payload_json, created_at)
       VALUES (?, ?, ?, ?, datetime('now'))`,
      [userRole, action, target, payloadStr]
    );
  } catch (err) {
    console.error('Error logging audit event:', err.message);
  }
}

/**
 * Get audit logs history
 */
export async function getAuditLogs(limit = 100) {
  try {
    const rows = await db.all(`SELECT * FROM audit_logs ORDER BY id DESC LIMIT ${limit}`);
    return rows;
  } catch (err) {
    console.error('Error fetching audit logs:', err.message);
    return [];
  }
}
