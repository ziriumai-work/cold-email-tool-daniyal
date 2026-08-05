# Deploying to Vercel

This app needs a hosted database (Turso) and Vercel Cron for scheduled sends +
reply checks. Follow these steps in order.

## 1. Create a Turso database (free)

1. Go to **turso.tech** → sign up.
2. Install the CLI (or use the dashboard) and create a database, e.g. `cold-email`.
3. Get two values:
   - **Database URL** — looks like `libsql://cold-email-yourname.turso.io`
   - **Auth token** — created from the database's "Tokens" section.
4. Keep these for step 3. (The app creates its tables automatically on first run.)

## 2. Push the code to GitHub

```bash
cd cold-email-tool
git init
git add .
git commit -m "Cold email tool"
# create an empty repo on github.com, then:
git remote add origin https://github.com/<you>/cold-email-tool.git
git push -u origin main
```

`.env.local`, `node_modules`, and `data/*.db` are gitignored — your secrets are NOT pushed.

## 3. Import to Vercel

1. Go to **vercel.com** → **Add New → Project** → import your GitHub repo.
2. Framework preset: **Next.js** (auto-detected). Don't deploy yet — add env vars first.
3. In **Environment Variables**, add all of these (values from your `.env.local`
   plus the Turso values):

   | Variable | Value |
   |---|---|
   | `LIBSQL_URL` | your Turso database URL |
   | `LIBSQL_AUTH_TOKEN` | your Turso auth token |
   | `APP_PASSWORD` | the shared password your team will use |
   | `SESSION_SECRET` | any long random string |
   | `CRON_SECRET` | any long random string |
   | `SMTP_HOST` | `mail.spacemail.com` |
   | `SMTP_PORT` | `465` |
   | `SMTP_SECURE` | `true` |
   | `SMTP_USER` | your Spacemail address |
   | `SMTP_PASS` | your Spacemail password |
   | `FROM_NAME` | your name |
   | `FROM_EMAIL` | your Spacemail address |
   | `IMAP_HOST` | `mail.spacemail.com` |
   | `IMAP_PORT` | `993` |
   | `DEEPSEEK_API_KEY` | your DeepSeek key |
   | `DEEPSEEK_MODEL` | `deepseek-v4-flash` |

4. Click **Deploy**.

## 4. After the first deploy

1. Copy your live URL (e.g. `https://cold-email-tool.vercel.app`).
2. Add one more env var and redeploy:
   - `LOGO_URL` = `https://<your-app>.vercel.app/logo.png`
   (so the signature logo renders from a public URL on serverless).

## 5. Scheduling (important)

- The cron jobs in `vercel.json` run **every minute** (sends) and **every 3 minutes** (replies).
- **Minute-level cron requires the Vercel Pro plan (~$20/mo).** On the free Hobby
  plan, crons run about once per day, so scheduled sends would be imprecise.
  Manual "Send now" and "Check replies now" work on any plan.

## 6. Use it

- Visit your URL → you'll be asked for the **team password** (`APP_PASSWORD`).
- Share that password with your team. That's the only access control.

---

### Local development

Leave `LIBSQL_URL` and `APP_PASSWORD` blank in `.env.local` — the app uses a local
SQLite file and skips the login. The in-process scheduler runs automatically while
`npm run dev` is open.
