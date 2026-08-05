# Vercel Deployment Checklist

## Pre-Deployment (This Workstation)

- [ ] Run `npm run build` locally and verify no errors
- [ ] All API endpoints tested locally: `/api/companies`, `/api/drafts`, `/api/import`, etc.
- [ ] CSV import tested and working locally
- [ ] `.env.local` file has all required variables
- [ ] Git repository is clean (no uncommitted changes except `.env.local`)
- [ ] Latest code pushed to Git (main branch)

## Vercel Project Setup

- [ ] Vercel account created at [vercel.com](https://vercel.com)
- [ ] Git repository connected (GitHub/GitLab/Bitbucket/Azure DevOps)
- [ ] Project imported into Vercel

## Environment Variables (Set in Vercel Dashboard)

### Turso Variables
- [ ] `LIBSQL_URL` = `libsql://your-database.turso.io`
- [ ] `LIBSQL_AUTH_TOKEN` = (your Turso auth token)

### AI Provider Variables
- [ ] `DEEPSEEK_API_KEY` = `your_deepseek_api_key_here`
- [ ] `DEEPSEEK_MODEL` = `deepseek-v4-flash`

### Email Configuration Variables
- [ ] `SMTP_HOST` = `mail.spacemail.com`
- [ ] `SMTP_PORT` = `465`
- [ ] `SMTP_SECURE` = `true`
- [ ] `SMTP_USER` = `haseeb.a@ziriumai.com`
- [ ] `SMTP_PASS` = `your_smtp_password_here`
- [ ] `FROM_NAME` = `Your Name`
- [ ] `FROM_EMAIL` = `your_email@example.com`
- [ ] `SENDER_ACCOUNTS` = (JSON array from .env.local)
- [ ] `IMAP_HOST` = `mail.spacemail.com`
- [ ] `IMAP_PORT` = `993`

### Security Variables
- [ ] `SESSION_SECRET` = `your_session_secret_here`
- [ ] `APP_PASSWORD` = (your secure team password)
- [ ] `APP_BASE_URL` = (your Vercel app domain once deployed)

**Scopes:** ALL variables should be set to **Production**, **Preview**, and **Development**

## Deployment

- [ ] Click "Deploy" in Vercel Dashboard
- [ ] Wait for build to complete (2-5 minutes)
- [ ] Check deployment logs for any errors
- [ ] Get your Vercel app URL (e.g., `https://cold-email-tool-xxx.vercel.app`)

## Post-Deployment Testing

### API Tests
- [ ] `/api/companies` returns `{"companies": []}`
- [ ] `/api/drafts` returns `{"drafts": []}`
- [ ] `/api/import` accepts CSV and returns success
- [ ] `/api/senders` returns sender list

### UI Tests
- [ ] Home page loads without errors
- [ ] Can see the dashboard UI
- [ ] Can navigate between sections
- [ ] No console errors in browser DevTools

### Feature Tests
- [ ] CSV import works end-to-end
- [ ] Data persists in Turso
- [ ] Email sending configuration visible
- [ ] Signature settings accessible

## Cron Jobs

- [ ] Email sending cron: `/api/cron/send` (every minute)
- [ ] Reply checking cron: `/api/cron/replies` (every 3 minutes)
- [ ] Check Vercel Cron Jobs dashboard for execution logs

## Monitoring

- [ ] Set up Vercel Analytics (optional)
- [ ] Set up Speed Insights (optional)
- [ ] Check Turso dashboard for database activity
- [ ] Monitor function invocations in Vercel

## Custom Domain (Optional)

- [ ] Domain added in Vercel → Settings → Domains
- [ ] DNS records configured
- [ ] SSL certificate auto-generated

## Final Steps

- [ ] Share Vercel app URL with team
- [ ] Update APP_BASE_URL environment variable to final domain
- [ ] Test one more time after final config
- [ ] Document deployment location for team
- [ ] Create backup of environment variables

## Troubleshooting Commands

If deployment fails:

```bash
# Check build output
vercel logs [deployment-url]

# Redeploy current commit
vercel --prod --force

# Check environment variables
vercel env ls

# Pull production env vars locally
vercel env pull
```

## After Deployment

- [ ] Enable auto-deployments (should be automatic)
- [ ] Configure rollback procedure
- [ ] Set up team access on Vercel project
- [ ] Document deployment process for team
