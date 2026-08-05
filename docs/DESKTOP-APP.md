# Building the desktop app (.exe) for your team

This packages the tool as a Windows desktop app your teammates install and run.
Everyone's copy talks to the **same Turso database**, so you all share one set of
companies, drafts, and replies.

## Prerequisites (one-time)

1. **Create a Turso database** (free) at [turso.tech](https://turso.tech). Copy:
   - the **Database URL** (`libsql://...turso.io`)
   - an **Auth token**
   (Shared data requires Turso — a local file can't be shared between machines.)

## Step 1 — Fill in the config

Open **`electron/app.config.json`** and set every value:

```json
{
  "LIBSQL_URL": "libsql://your-db.turso.io",
  "LIBSQL_AUTH_TOKEN": "your-turso-token",
  "APP_PASSWORD": "a-password-your-team-will-type",
  "SESSION_SECRET": "any-long-random-string",
  "SMTP_USER": "you@yourcompany.com",
  "SMTP_PASS": "your-mailbox-password",
  "FROM_NAME": "Your Name",
  "FROM_EMAIL": "you@yourcompany.com",
  "DEEPSEEK_API_KEY": "sk-...",
  ...
}
```

> ⚠️ These values get embedded in the installer you share. Anyone you give the
> installer to will have these credentials. Only share it with your team.

## Step 2 — Build the installer

```bash
npm run dist
```

This builds the app and produces an installer in **`dist-app/`**, named something
like **`Cold Email Tool Setup 0.1.0.exe`**.

## Step 3 — Share it

Send `Cold Email Tool Setup …​.exe` to your teammates (Drive, WeTransfer, etc.).
They double-click to install, then launch **Cold Email Tool** from the Start menu.

- They'll be asked for the **team password** (`APP_PASSWORD`).
- Everyone sees the same shared data (via Turso).
- Scheduled sends can't double-fire — only one running copy ever sends a given email.

## Updating the app later

When we change the code, re-run `npm run dist`, and re-share the new installer
(or set up auto-update later).

---

### Notes & limits
- **Each teammate's app must be open** for *their* actions; scheduled sends/reply
  checks run in whichever copies are open. With everyone closed, nothing fires
  until someone opens it (then overdue items are caught up).
- For true 24/7 automation regardless of who's online, an always-on host is better
  — but the desktop app is fine for normal working hours.
