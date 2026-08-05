import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '.env.local') });

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Error: Supabase environment variables are not set in .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function migrate() {
  try {
    const dataDumpPath = path.join(__dirname, 'data_dump.json');
    if (!fs.existsSync(dataDumpPath)) {
      console.error(`Error: ${dataDumpPath} does not exist.`);
      process.exit(1);
    }
    
    const dump = JSON.parse(fs.readFileSync(dataDumpPath, 'utf8'));
    console.log('Starting migration to Supabase...');
    
    // 1. Migrate Companies
    const companyIdMap = {};
    for (const c of dump.companies) {
      console.log(`Migrating company: ${c.name}`);
      
      // Check if company already exists by name
      const { data: existing } = await supabase
        .from('companies')
        .select('id')
        .eq('name', c.name)
        .maybeSingle();
        
      if (existing) {
        console.log(`Company "${c.name}" already exists in Supabase with ID: ${existing.id}`);
        companyIdMap[c.id] = existing.id;
      } else {
        const { data: inserted, error } = await supabase
          .from('companies')
          .insert([{
            name: c.name,
            website: c.website,
            contact_email: c.contact_email,
            phone: c.phone,
            all_emails: c.all_emails,
            created_at: c.created_at
          }])
          .select()
          .single();
          
        if (error) {
          console.error(`Error inserting company ${c.name}:`, error);
          throw error;
        }
        console.log(`Inserted company "${c.name}" with new ID: ${inserted.id}`);
        companyIdMap[c.id] = inserted.id;
      }
    }
    
    // 2. Migrate Drafts
    const draftIdMap = {};
    for (const d of dump.drafts) {
      console.log(`Migrating draft for company old_id ${d.company_id}`);
      const newCompanyId = companyIdMap[d.company_id];
      if (!newCompanyId) {
        console.warn(`Skipping draft ${d.id}: company mapping not found for old_id ${d.company_id}`);
        continue;
      }
      
      // Check if draft already exists by subject and company_id
      const { data: existing } = await supabase
        .from('drafts')
        .select('id')
        .eq('company_id', newCompanyId)
        .eq('subject', d.subject)
        .maybeSingle();
        
      if (existing) {
        console.log(`Draft with subject "${d.subject}" already exists in Supabase with ID: ${existing.id}`);
        draftIdMap[d.id] = existing.id;
      } else {
        const { data: inserted, error } = await supabase
          .from('drafts')
          .insert([{
            company_id: newCompanyId,
            subject: d.subject,
            body: d.body,
            research_summary: d.research_summary,
            offer: d.offer,
            status: d.status,
            error: d.error,
            sent_at: d.sent_at,
            scheduled_at: d.scheduled_at,
            scheduled_tz: d.scheduled_tz,
            message_id: d.message_id,
            sender_key: d.sender_key,
            sender_name: d.sender_name,
            sender_email: d.sender_email,
            replied_at: d.replied_at,
            created_at: d.created_at,
            tracking_id: d.tracking_id,
            opened_at: d.opened_at,
            open_count: d.open_count,
            last_opened_at: d.last_opened_at,
            clicked_at: d.clicked_at,
            click_count: d.click_count,
            last_clicked_at: d.last_clicked_at
          }])
          .select()
          .single();
          
        if (error) {
          console.error(`Error inserting draft:`, error);
          throw error;
        }
        console.log(`Inserted draft with subject "${d.subject}" with new ID: ${inserted.id}`);
        draftIdMap[d.id] = inserted.id;
      }
    }
    
    // 3. Migrate Replies
    for (const r of dump.replies) {
      console.log(`Migrating reply for draft old_id ${r.draft_id}`);
      const newCompanyId = companyIdMap[r.company_id];
      const newDraftId = draftIdMap[r.draft_id];
      
      // Check if reply already exists by imap_message_id
      const { data: existing } = await supabase
        .from('replies')
        .select('id')
        .eq('imap_message_id', r.imap_message_id)
        .maybeSingle();
        
      if (existing) {
        console.log(`Reply with imap_message_id "${r.imap_message_id}" already exists in Supabase.`);
      } else {
        const { error } = await supabase
          .from('replies')
          .insert([{
            draft_id: newDraftId || null,
            company_id: newCompanyId || null,
            from_email: r.from_email,
            subject: r.subject,
            snippet: r.snippet,
            imap_message_id: r.imap_message_id,
            status: r.status,
            notes: r.notes,
            received_at: r.received_at,
            created_at: r.created_at
          }]);
          
        if (error) {
          console.error(`Error inserting reply:`, error);
          throw error;
        }
        console.log(`Inserted reply: ${r.subject}`);
      }
    }
    
    // 4. Migrate Settings
    for (const s of dump.settings) {
      console.log(`Migrating setting: ${s.key}`);
      const { error } = await supabase
        .from('settings')
        .upsert([{ key: s.key, value: s.value }]);
        
      if (error) {
        console.error(`Error upserting setting ${s.key}:`, error);
        throw error;
      }
    }
    
    console.log('Migration completed successfully!');
  } catch (e) {
    console.error('Migration failed:', e);
  }
  process.exit(0);
}

migrate();
