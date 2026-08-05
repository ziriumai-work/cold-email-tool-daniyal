import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '.env.local') });

import { all } from './lib/db.js';

async function check() {
  try {
    const companies = await all('SELECT * FROM companies');
    const drafts = await all('SELECT * FROM drafts');
    const replies = await all('SELECT * FROM replies');
    
    console.log('--- SUPABASE DATABASE INSPECTION ---');
    console.log(`Companies Count: ${companies.length}`);
    console.log(`Drafts Count: ${drafts.length}`);
    console.log(`Replies Count: ${replies.length}`);
    
    if (companies.length > 0) {
      console.log('Sample Companies:', companies.slice(0, 3).map(c => ({ id: c.id, name: c.name, draft_status: c.draft_status })));
    }
    if (drafts.length > 0) {
      console.log('Sample Drafts:', drafts.slice(0, 3).map(d => ({ id: d.id, status: d.status, tracking_id: d.tracking_id, open_count: d.open_count, click_count: d.click_count })));
    }
    if (replies.length > 0) {
      console.log('Sample Replies:', replies.slice(0, 3).map(r => ({ id: r.id, status: r.status, subject: r.subject })));
    }
  } catch (e) {
    console.error('Error connecting to Supabase:', e);
  }
  process.exit(0);
}

check();
