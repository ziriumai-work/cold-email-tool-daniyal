import { createClient } from '@libsql/client';

const SCHEMA_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS companies (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    website TEXT,
    contact_email TEXT,
    phone TEXT,
    all_emails TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS drafts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    subject TEXT,
    body TEXT,
    research_summary TEXT,
    offer TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    error TEXT,
    sent_at TEXT,
    scheduled_at TEXT,
    scheduled_tz TEXT,
    message_id TEXT,
    sender_key TEXT,
    sender_name TEXT,
    sender_email TEXT,
    replied_at TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    tracking_id TEXT,
    opened_at TEXT,
    open_count INTEGER DEFAULT 0,
    last_opened_at TEXT,
    clicked_at TEXT,
    click_count INTEGER DEFAULT 0,
    last_clicked_at TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS replies (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    draft_id INTEGER REFERENCES drafts(id) ON DELETE SET NULL,
    company_id INTEGER REFERENCES companies(id) ON DELETE SET NULL,
    from_email TEXT,
    subject TEXT,
    snippet TEXT,
    imap_message_id TEXT UNIQUE,
    status TEXT DEFAULT 'new',
    notes TEXT,
    received_at TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE INDEX IF NOT EXISTS idx_drafts_company_id ON drafts(company_id)`,
  `CREATE INDEX IF NOT EXISTS idx_drafts_status ON drafts(status)`,
  `CREATE INDEX IF NOT EXISTS idx_drafts_tracking_id ON drafts(tracking_id)`,
  `CREATE INDEX IF NOT EXISTS idx_replies_draft_id ON replies(draft_id)`,
  `CREATE INDEX IF NOT EXISTS idx_replies_company_id ON replies(company_id)`,
];

const LEGACY_COLUMNS = [
  ['companies', 'phone', 'ALTER TABLE companies ADD COLUMN phone TEXT'],
  ['companies', 'all_emails', 'ALTER TABLE companies ADD COLUMN all_emails TEXT'],
  ['companies', 'created_at', 'ALTER TABLE companies ADD COLUMN created_at TEXT'],
  ['drafts', 'research_summary', 'ALTER TABLE drafts ADD COLUMN research_summary TEXT'],
  ['drafts', 'offer', 'ALTER TABLE drafts ADD COLUMN offer TEXT'],
  ['drafts', 'status', "ALTER TABLE drafts ADD COLUMN status TEXT NOT NULL DEFAULT 'pending'"],
  ['drafts', 'error', 'ALTER TABLE drafts ADD COLUMN error TEXT'],
  ['drafts', 'sent_at', 'ALTER TABLE drafts ADD COLUMN sent_at TEXT'],
  ['drafts', 'scheduled_at', 'ALTER TABLE drafts ADD COLUMN scheduled_at TEXT'],
  ['drafts', 'scheduled_tz', 'ALTER TABLE drafts ADD COLUMN scheduled_tz TEXT'],
  ['drafts', 'message_id', 'ALTER TABLE drafts ADD COLUMN message_id TEXT'],
  ['drafts', 'sender_key', 'ALTER TABLE drafts ADD COLUMN sender_key TEXT'],
  ['drafts', 'sender_name', 'ALTER TABLE drafts ADD COLUMN sender_name TEXT'],
  ['drafts', 'sender_email', 'ALTER TABLE drafts ADD COLUMN sender_email TEXT'],
  ['drafts', 'replied_at', 'ALTER TABLE drafts ADD COLUMN replied_at TEXT'],
  ['drafts', 'created_at', 'ALTER TABLE drafts ADD COLUMN created_at TEXT'],
  ['drafts', 'tracking_id', 'ALTER TABLE drafts ADD COLUMN tracking_id TEXT'],
  ['drafts', 'opened_at', 'ALTER TABLE drafts ADD COLUMN opened_at TEXT'],
  ['drafts', 'open_count', 'ALTER TABLE drafts ADD COLUMN open_count INTEGER DEFAULT 0'],
  ['drafts', 'last_opened_at', 'ALTER TABLE drafts ADD COLUMN last_opened_at TEXT'],
  ['drafts', 'clicked_at', 'ALTER TABLE drafts ADD COLUMN clicked_at TEXT'],
  ['drafts', 'click_count', 'ALTER TABLE drafts ADD COLUMN click_count INTEGER DEFAULT 0'],
  ['drafts', 'last_clicked_at', 'ALTER TABLE drafts ADD COLUMN last_clicked_at TEXT'],
  ['settings', 'value', 'ALTER TABLE settings ADD COLUMN value TEXT'],
  ['replies', 'draft_id', 'ALTER TABLE replies ADD COLUMN draft_id INTEGER REFERENCES drafts(id) ON DELETE SET NULL'],
  ['replies', 'company_id', 'ALTER TABLE replies ADD COLUMN company_id INTEGER REFERENCES companies(id) ON DELETE SET NULL'],
  ['replies', 'from_email', 'ALTER TABLE replies ADD COLUMN from_email TEXT'],
  ['replies', 'subject', 'ALTER TABLE replies ADD COLUMN subject TEXT'],
  ['replies', 'snippet', 'ALTER TABLE replies ADD COLUMN snippet TEXT'],
  ['replies', 'imap_message_id', 'ALTER TABLE replies ADD COLUMN imap_message_id TEXT'],
  ['replies', 'status', "ALTER TABLE replies ADD COLUMN status TEXT DEFAULT 'new'"],
  ['replies', 'notes', 'ALTER TABLE replies ADD COLUMN notes TEXT'],
  ['replies', 'received_at', 'ALTER TABLE replies ADD COLUMN received_at TEXT'],
  ['replies', 'created_at', 'ALTER TABLE replies ADD COLUMN created_at TEXT'],
];

function getDatabaseUrl() {
  return (
    process.env.LIBSQL_URL ||
    process.env.TURSO_DATABASE_URL ||
    process.env.NEXT_PUBLIC_LIBSQL_URL ||
    process.env.NEXT_PUBLIC_TURSO_DATABASE_URL ||
    ''
  );
}

function getDatabaseAuthToken() {
  return process.env.LIBSQL_AUTH_TOKEN || process.env.TURSO_AUTH_TOKEN || '';
}

function createDatabaseClient() {
  const url = getDatabaseUrl();
  const authToken = getDatabaseAuthToken();

  if (!url) {
    if (process.env.VERCEL || process.env.NODE_ENV === 'production') {
      throw new Error('Database is not configured. Set LIBSQL_URL and LIBSQL_AUTH_TOKEN.');
    }
    return createClient({ url: 'file:./data/app.db' });
  }

  return createClient(authToken ? { url, authToken } : { url });
}

function getClient() {
  const g = globalThis;
  if (!g.__coldEmailDbClient) {
    g.__coldEmailDbClient = createDatabaseClient();
  }
  return g.__coldEmailDbClient;
}

async function execute(sql, args = []) {
  const client = getClient();
  return client.execute({ sql, args });
}

async function columnExists(client, table, column) {
  const result = await client.execute(`PRAGMA table_info(${table})`);
  return (result.rows || []).some((row) => String(row.name).toLowerCase() === column.toLowerCase());
}

async function ensureSchema() {
  const g = globalThis;
  if (g.__coldEmailDbInitPromise) return g.__coldEmailDbInitPromise;

  g.__coldEmailDbInitPromise = (async () => {
    const client = getClient();
    try {
      await client.execute('PRAGMA foreign_keys = ON');
      for (const statement of SCHEMA_STATEMENTS) {
        await client.execute(statement);
      }
      for (const [table, column, ddl] of LEGACY_COLUMNS) {
        if (!(await columnExists(client, table, column))) {
          await client.execute(ddl);
        }
      }
    } catch (err) {
      g.__coldEmailDbInitPromise = null;
      throw err;
    }
  })();

  return g.__coldEmailDbInitPromise;
}

function splitStatements(sql) {
  return String(sql)
    .split(';')
    .map((s) => s.trim())
    .filter(Boolean);
}

export async function get(sql, args = []) {
  await ensureSchema();
  const result = await execute(sql, args);
  return result.rows?.[0] || null;
}

export async function all(sql, args = []) {
  await ensureSchema();
  const result = await execute(sql, args);
  return result.rows || [];
}

export async function run(sql, args = []) {
  await ensureSchema();
  const statements = splitStatements(sql);
  if (statements.length === 0) {
    return { rowsAffected: 0, lastInsertRowid: null };
  }
  if (statements.length > 1) {
    if (args.length > 0) {
      throw new Error('Multiple SQL statements with bound parameters are not supported.');
    }
    let result = { rowsAffected: 0, lastInsertRowid: null };
    for (const statement of statements) {
      const res = await execute(statement);
      result = {
        rowsAffected: res.rowsAffected ?? 0,
        lastInsertRowid: res.lastInsertRowid ?? null,
      };
    }
    return result;
  }

  const result = await execute(statements[0], args);
  return {
    rowsAffected: result.rowsAffected ?? 0,
    lastInsertRowid: result.lastInsertRowid ?? null,
  };
}

export async function execMany(sql) {
  await ensureSchema();
  let result = { rowsAffected: 0, lastInsertRowid: null };
  for (const statement of splitStatements(sql)) {
    const res = await execute(statement);
    result = {
      rowsAffected: res.rowsAffected ?? 0,
      lastInsertRowid: res.lastInsertRowid ?? null,
    };
  }
  return result;
}
