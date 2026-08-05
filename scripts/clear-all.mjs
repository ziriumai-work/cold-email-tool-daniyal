import { execMany } from '../lib/db.js';
await execMany('DELETE FROM replies; DELETE FROM drafts; DELETE FROM companies;');
console.log('cleared companies, drafts, and replies');
process.exit(0);
