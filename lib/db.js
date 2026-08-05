import { createClient } from '@supabase/supabase-js';

function getSupabaseUrl() {
  return (
    process.env.SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    ''
  );
}

function getSupabaseKey() {
  return (
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    ''
  );
}

function getClient() {
  const g = globalThis;
  if (!g.__coldEmailSupabaseClient) {
    const url = getSupabaseUrl();
    const key = getSupabaseKey();
    if (!url || !key) {
      throw new Error('Supabase database is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.');
    }
    g.__coldEmailSupabaseClient = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return g.__coldEmailSupabaseClient;
}

// Map column aliases if necessary (e.g. name AS company_name)
function mapColumns(colsStr) {
  if (colsStr.trim() === '*') return null;
  const parts = colsStr.split(',').map((p) => p.trim());
  const selectParts = [];
  for (const part of parts) {
    const aliasMatch = part.match(/^(\w+)\s+as\s+(\w+)$/i);
    if (aliasMatch) {
      selectParts.push(aliasMatch[1]);
    } else {
      selectParts.push(part.replace(/^(?:lower|upper|coalesce)\(([^)]+)\)$/i, '$1'));
    }
  }
  return selectParts.join(',');
}

async function handleSelect(client, sql, args) {
  const fromMatch = sql.match(/select\s+(.+?)\s+from\s+(\w+)/i);
  if (!fromMatch) throw new Error(`Could not parse SELECT query: ${sql}`);

  const rawCols = fromMatch[1];
  const tableName = fromMatch[2];
  let query = client.from(tableName).select(rawCols.includes('*') ? '*' : mapColumns(rawCols) || '*');

  let argIndex = 0;

  // Handle WHERE clause
  const whereMatch = sql.match(/where\s+(.+?)(?:\s+order\s+by|\s+limit|$)/i);
  if (whereMatch) {
    const whereStr = whereMatch[1];
    
    // Split by AND (simple condition parsing)
    const conditions = whereStr.split(/\s+and\s+/i);
    for (const cond of conditions) {
      const trimmed = cond.trim();
      
      if (/(?:lower\()?(\w+)\)?\s+in\s*\(([^)]+)\)/i.test(trimmed)) {
        const inMatch = trimmed.match(/(?:lower\()?(\w+)\)?\s+in\s*\(([^)]+)\)/i);
        const col = inMatch[1];
        const statuses = inMatch[2].split(',').map((s) => s.trim().replace(/'/g, ''));
        query = query.in(col, statuses);
      } else if (/(?:lower\()?(\w+)\)?\s+is\s+not\s+null/i.test(trimmed)) {
        const nullMatch = trimmed.match(/(?:lower\()?(\w+)\)?\s+is\s+not\s+null/i);
        query = query.not(nullMatch[1], 'is', null);
      } else if (/(?:lower\()?(\w+)\)?\s*=\s*\?/i.test(trimmed)) {
        const eqMatch = trimmed.match(/(?:lower\()?(\w+)\)?\s*=\s*\?/i);
        const val = args[argIndex++];
        const col = eqMatch[1];
        if (typeof val === 'string' && trimmed.toLowerCase().includes('lower(')) {
          query = query.ilike(col, val);
        } else {
          query = query.eq(col, val);
        }
      } else if (/(?:lower\()?(\w+)\)?\s*=\s*'([^']+)'/i.test(trimmed)) {
        const eqLitMatch = trimmed.match(/(?:lower\()?(\w+)\)?\s*=\s*'([^']+)'/i);
        query = query.eq(eqLitMatch[1], eqLitMatch[2]);
      } else if (/(\w+)\s*=\s*(\d+)/i.test(trimmed)) {
        const numLitMatch = trimmed.match(/(\w+)\s*=\s*(\d+)/i);
        query = query.eq(numLitMatch[1], Number(numLitMatch[2]));
      }
    }
  }

  // Handle ORDER BY clause
  const orderMatch = sql.match(/order\s+by\s+(.+?)(?:\s+limit|$)/i);
  if (orderMatch) {
    const orderParts = orderMatch[1].split(',').map((p) => p.trim());
    for (const part of orderParts) {
      const match = part.match(/^(\w+)(?:\s+(asc|desc))?$/i);
      if (match) {
        query = query.order(match[1], { ascending: (match[2] || 'asc').toLowerCase() === 'asc' });
      }
    }
  }

  // Handle LIMIT clause
  const limitMatch = sql.match(/limit\s+(\d+)/i);
  if (limitMatch) {
    query = query.limit(parseInt(limitMatch[1], 10));
  }

  const { data, error } = await query;
  if (error) {
    // Graceful fallback if table does not exist yet
    if (error.code === '42P01' || error.message?.includes('does not exist')) {
      return [];
    }
    throw error;
  }

  // Handle column aliasing in JS if necessary (e.g. name AS company_name)
  if (rawCols.toLowerCase().includes(' as ')) {
    const aliases = [];
    for (const part of rawCols.split(',')) {
      const aliasMatch = part.trim().match(/^(\w+)\s+as\s+(\w+)$/i);
      if (aliasMatch) aliases.push({ orig: aliasMatch[1], alias: aliasMatch[2] });
    }
    return (data || []).map((row) => {
      const newRow = { ...row };
      for (const { orig, alias } of aliases) {
        if (orig in newRow) {
          newRow[alias] = newRow[orig];
        }
      }
      return newRow;
    });
  }

  return data || [];
}

async function handleInsert(client, sql, args) {
  const insertMatch = sql.match(/insert\s+into\s+(\w+)\s*\(([^)]+)\)\s*values\s*\(([^)]+)\)/i);
  if (!insertMatch) throw new Error(`Could not parse INSERT query: ${sql}`);

  const tableName = insertMatch[1];
  const cols = insertMatch[2].split(',').map((c) => c.trim());
  const valTokens = insertMatch[3].split(',').map((v) => v.trim());

  const isUpsert = /on\s+conflict/i.test(sql);

  const row = {};
  let argIndex = 0;
  for (let i = 0; i < cols.length; i++) {
    const col = cols[i];
    const token = valTokens[i];
    if (token === '?') {
      row[col] = args[argIndex++];
    } else if (token.startsWith("'") && token.endsWith("'")) {
      row[col] = token.slice(1, -1);
    } else if (!isNaN(token)) {
      row[col] = Number(token);
    } else {
      row[col] = token;
    }
  }

  let result;
  if (isUpsert) {
    result = await client.from(tableName).upsert([row]).select();
  } else {
    result = await client.from(tableName).insert([row]).select();
  }

  if (result.error) {
    if (result.error.code === '42P01' || result.error.message?.includes('does not exist')) {
      return { rowsAffected: 0, lastInsertRowid: null };
    }
    throw result.error;
  }
  const inserted = result.data?.[0];
  return {
    rowsAffected: result.data ? result.data.length : 1,
    lastInsertRowid: inserted?.id ?? null,
  };
}

async function handleUpdate(client, sql, args) {
  const updateMatch = sql.match(/update\s+(\w+)\s+set\s+(.+?)(?:\s+where\s+(.+)|$)/i);
  if (!updateMatch) throw new Error(`Could not parse UPDATE query: ${sql}`);

  const tableName = updateMatch[1];
  const setStr = updateMatch[2];
  const whereStr = updateMatch[3] || '';

  let argIndex = 0;
  const updates = {};
  
  // Parse SET assignments (e.g. subject = ?, body = ?, status = 'sent', sent_at = datetime('now'))
  const setParts = setStr.split(',').map((s) => s.trim());
  for (const part of setParts) {
    const assignMatch = part.match(/^(\w+)\s*=\s*(.+)$/i);
    if (!assignMatch) continue;
    const col = assignMatch[1];
    const expr = assignMatch[2].trim();

    if (expr === '?') {
      updates[col] = args[argIndex++];
    } else if (expr.toLowerCase() === "datetime('now')" || expr.toLowerCase() === "datetime('now', '-5 minutes')") {
      if (expr.includes('-5 minutes')) {
        updates[col] = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      } else {
        updates[col] = new Date().toISOString();
      }
    } else if (expr.toLowerCase() === 'null') {
      updates[col] = null;
    } else if (/^coalesce\((.+)\)$/i.test(expr)) {
      const inside = expr.match(/^coalesce\((.+)\)$/i)[1];
      if (inside.includes('?')) {
        const coalescedArg = args[argIndex++];
        updates[col] = coalescedArg || new Date().toISOString();
      } else {
        updates[col] = new Date().toISOString();
      }
    } else if (expr.startsWith("'") && expr.endsWith("'")) {
      updates[col] = expr.slice(1, -1);
    } else if (!isNaN(expr)) {
      updates[col] = Number(expr);
    }
  }

  let query = client.from(tableName).update(updates);

  // Parse WHERE conditions
  if (whereStr) {
    const conditions = whereStr.split(/\s+and\s+/i);
    for (const cond of conditions) {
      const trimmed = cond.trim();

      if (/scheduled_at\s*<=\s*datetime\('now',\s*'-5 minutes'\)/i.test(trimmed)) {
        const fiveMinsAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
        query = query.lte('scheduled_at', fiveMinsAgo);
      } else if (/(?:lower\()?(\w+)\)?\s*=\s*\?/i.test(trimmed)) {
        const eqMatch = trimmed.match(/(?:lower\()?(\w+)\)?\s*=\s*\?/i);
        const val = args[argIndex++];
        const col = eqMatch[1];
        if (typeof val === 'string' && trimmed.toLowerCase().includes('lower(')) {
          query = query.ilike(col, val);
        } else {
          query = query.eq(col, val);
        }
      } else if (/(?:lower\()?(\w+)\)?\s*=\s*'([^']+)'/i.test(trimmed)) {
        const eqLitMatch = trimmed.match(/(?:lower\()?(\w+)\)?\s*=\s*'([^']+)'/i);
        query = query.eq(eqLitMatch[1], eqLitMatch[2]);
      } else if (/(\w+)\s*=\s*(\d+)/i.test(trimmed)) {
        const numLitMatch = trimmed.match(/(\w+)\s*=\s*(\d+)/i);
        query = query.eq(numLitMatch[1], Number(numLitMatch[2]));
      }
    }
  }

  const { data, error } = await query.select();
  if (error) {
    if (error.code === '42P01' || error.message?.includes('does not exist')) {
      return { rowsAffected: 0, lastInsertRowid: null };
    }
    throw error;
  }

  return {
    rowsAffected: data ? data.length : 1,
    lastInsertRowid: null,
  };
}

async function handleDelete(client, sql, args) {
  const deleteMatch = sql.match(/delete\s+from\s+(\w+)(?:\s+where\s+(.+)|$)/i);
  if (!deleteMatch) throw new Error(`Could not parse DELETE query: ${sql}`);

  const tableName = deleteMatch[1];
  const whereStr = deleteMatch[2] || '';

  let query = client.from(tableName).delete();

  if (whereStr) {
    let argIndex = 0;
    const conditions = whereStr.split(/\s+and\s+/i);
    for (const cond of conditions) {
      const trimmed = cond.trim();
      if (/(?:lower\()?(\w+)\)?\s*=\s*\?/i.test(trimmed)) {
        const eqMatch = trimmed.match(/(?:lower\()?(\w+)\)?\s*=\s*\?/i);
        const val = args[argIndex++];
        query = query.eq(eqMatch[1], val);
      } else if (/(?:lower\()?(\w+)\)?\s*=\s*'([^']+)'/i.test(trimmed)) {
        const eqLitMatch = trimmed.match(/(?:lower\()?(\w+)\)?\s*=\s*'([^']+)'/i);
        query = query.eq(eqLitMatch[1], eqLitMatch[2]);
      }
    }
  } else {
    query = query.neq('id', -999999);
  }

  const { data, error } = await query.select();
  if (error) {
    if (error.code === '42P01' || error.message?.includes('does not exist')) {
      return { rowsAffected: 0, lastInsertRowid: null };
    }
    throw error;
  }

  return {
    rowsAffected: data ? data.length : 1,
    lastInsertRowid: null,
  };
}

function splitStatements(sql) {
  return String(sql)
    .split(';')
    .map((s) => s.trim())
    .filter(Boolean);
}

export async function get(sql, args = []) {
  const rows = await all(sql, args);
  return rows[0] || null;
}

export async function all(sql, args = []) {
  const client = getClient();
  return handleSelect(client, sql.trim(), args);
}

export async function run(sql, args = []) {
  const client = getClient();
  const statements = splitStatements(sql);
  if (statements.length === 0) {
    return { rowsAffected: 0, lastInsertRowid: null };
  }

  let result = { rowsAffected: 0, lastInsertRowid: null };
  for (const statement of statements) {
    const rawSql = statement.trim();
    const lowerSql = rawSql.toLowerCase();

    if (lowerSql.startsWith('insert')) {
      result = await handleInsert(client, rawSql, args);
    } else if (lowerSql.startsWith('update')) {
      result = await handleUpdate(client, rawSql, args);
    } else if (lowerSql.startsWith('delete')) {
      result = await handleDelete(client, rawSql, args);
    } else if (lowerSql.startsWith('select')) {
      const rows = await handleSelect(client, rawSql, args);
      result = { rowsAffected: rows.length, lastInsertRowid: null };
    }
  }
  return result;
}

export async function execMany(sql) {
  const statements = splitStatements(sql);
  let result = { rowsAffected: 0, lastInsertRowid: null };
  for (const statement of statements) {
    result = await run(statement);
  }
  return result;
}

export async function runBulkInsert(table, rows) {
  if (!rows || rows.length === 0) return { rowsAffected: 0 };
  const client = getClient();
  const chunkSize = 50;
  let totalAffected = 0;
  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize);
    const { data, error } = await client.from(table).insert(chunk).select();
    if (error) {
      if (error.code === '42P01' || error.message?.includes('does not exist')) {
        return { rowsAffected: 0 };
      }
      throw error;
    }
    totalAffected += data ? data.length : chunk.length;
  }
  return { rowsAffected: totalAffected };
}


