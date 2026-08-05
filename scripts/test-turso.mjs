// Verify the Turso connection + that our schema/queries work remotely.
process.env.LIBSQL_URL = process.argv[2];
process.env.LIBSQL_AUTH_TOKEN = process.argv[3];

const { all, run, get } = await import('../lib/db.js');

console.log('connecting to', process.env.LIBSQL_URL, '...');
await run("INSERT INTO settings (key, value) VALUES ('conn_test', 'ok') ON CONFLICT(key) DO UPDATE SET value = 'ok'");
const row = await get("SELECT value FROM settings WHERE key = 'conn_test'");
console.log('✅ wrote + read back:', row?.value);

const tables = await all("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name");
console.log('✅ tables created on Turso:', tables.map((t) => t.name).join(', '));

await run("DELETE FROM settings WHERE key = 'conn_test'");
console.log('✅ Turso connection works.');
