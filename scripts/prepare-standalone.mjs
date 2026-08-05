// After `next build`, the standalone server needs the static assets and the
// public folder copied next to it.
import { cpSync, mkdirSync, existsSync } from 'node:fs';

mkdirSync('.next/standalone/.next/static', { recursive: true });
cpSync('.next/static', '.next/standalone/.next/static', { recursive: true });

if (existsSync('public')) {
  cpSync('public', '.next/standalone/public', { recursive: true });
}

console.log('standalone prepared (static + public copied)');
