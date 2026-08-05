import { all } from './lib/db.js';

const rows = await all(
  'SELECT id, tracking_id, opened_at, open_count, clicked_at, click_count FROM drafts ORDER BY id DESC LIMIT 1'
);

console.log(rows);
process.exit(0);