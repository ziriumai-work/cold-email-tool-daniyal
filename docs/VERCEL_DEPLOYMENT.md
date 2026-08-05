# VERCEL_DEPLOYMENT.md

This document is written for an AI coding agent preparing this project for
production deployment on Vercel. Follow it in order. Do not skip the
"Architecture changes required" section — this project currently relies on
patterns that do not work on Vercel's serverless runtime, and deployment will
appear to succeed while silently not functioning correctly if these are
ignored.

---

## 1. Plan requirement — read this first

This app needs **background scheduling** (scheduled sends, reply polling
every few minutes) and **persistent storage**. Vercel's **Hobby (free) plan**
cannot fully support this:

- Hobby cron jobs can only run **once per day**, at an imprecise time within
  the scheduled hour. Any `vercel.json` cron entry more frequent than daily
  (e.g. every 5 or 15 minutes, which this project needs for reply polling)
  will **fail at deploy time**.
- Hobby functions are capped at **60 seconds** max duration (configurable up
  from a 10s default, but no higher).
- Hobby is licensed for **non-commercial, personal use only**. If this tool
  is used for a business, Hobby is a Terms of Service violation regardless
  of the technical limits above.

**Recommendation: deploy on the Pro plan ($20/month per seat).** Pro allows
per-minute cron schedules and is fine for commercial use. If staying on
Hobby is a hard requirement, see "Alternative: external cron" in Section 4 —
it is a valid workaround, but adds a third-party dependency.

---

## 2. Architecture changes required before deploying

### 2a. `instrumentation.js` + `lib/scheduler.js` will not work as-is on Vercel

`instrumentation.js` currently starts a long-running background loop when the
Node runtime boots. This pattern assumes the process stays alive
continuously (true when running `npm run dev` or the packaged Electron app
locally). **Vercel functions are stateless and short-lived** — a serverless
function spins up to handle one request, then shuts down. Nothing "keeps
running in the background" between requests on Vercel.

Action required:
- Confirm `app/api/cron/send/route.js` and `app/api/cron/replies/route.js`
  are self-contained — each one should perform one full unit of work (send
  all due drafts / check for new replies once) and then return, rather than
  relying on `lib/scheduler.js`'s loop being alive. Vercel Cron will re-invoke
  these routes on the schedule instead of a loop doing so.
- `instrumentation.js` should either detect it's running on Vercel (check for
  the `VERCEL` system environment variable, which Vercel sets automatically)
  and skip starting the local-only background loop, or the loop should be
  left as a local-dev-only convenience with no effect in production.
- Do not treat this as optional — without this change, scheduled sends and
  reply polling will silently never run on Vercel, with no error shown
  anywhere.

### 2b. Local file database will not persist on Vercel

`lib/db.js` defaults to `file:./data/app.db` when `LIBSQL_URL` is unset.
Vercel's filesystem is **ephemeral and read-only outside `/tmp`** — any data
written to a local file during one function invocation is not guaranteed to
exist on the next invocation (each may run on a different underlying
instance), and `/tmp` itself is wiped between deployments.

Action required:
- Production **must** use Turso (`LIBSQL_URL` + `LIBSQL_AUTH_TOKEN` set) —
  this is already supported by the existing code in `lib/db.js`, nothing
  needs to change there. This is purely an environment variable
  configuration step (see Section 3).
- Do not attempt to work around this with a local file path on Vercel; it
  will appear to work in a single request and then lose data unpredictably.

---

## 3. Environment variables to set in Vercel

Go to **Vercel Dashboard → your project → Settings → Environment Variables**.
Add each variable below for the **Production** environment (and Preview too,
if preview deployments should also function — recommended to use a separate
Turso database for Preview so test data doesn't mix with production).

Do **not** commit real values into the repository. `.env.local` is already
gitignored — keep it that way.

| Variable | Notes |
|---|---|
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS` | Sending mailbox credentials |
| `FROM_NAME`, `FROM_EMAIL` | Default sender identity |
| `SENDER_ACCOUNTS` | JSON array of sender identities — keep this as a single-line JSON string, no line breaks |
| `IMAP_HOST`, `IMAP_PORT`, `IMAP_USER`, `IMAP_PASS` | Reply polling inbox. Leave `IMAP_USER`/`IMAP_PASS` blank only if intentionally reusing `SMTP_USER`/`SMTP_PASS` |
| `APP_PASSWORD` | Set this in Vercel even if left blank locally — required to enable team login on the public deployment |
| `SESSION_SECRET` | Long random string, different from any value used elsewhere |
| `DEEPSEEK_API_KEY`, `DEEPSEEK_MODEL` | AI generation |
| `LIBSQL_URL`, `LIBSQL_AUTH_TOKEN` | **Required for Vercel** — see Section 2b. Not needed for local dev |
| `APP_BASE_URL` | Set to the real deployed URL, e.g. `https://your-project.vercel.app` (or custom domain once attached). Required for the open/click tracking feature to generate correct links |
| `CRON_SECRET` | See Section 4 — required to secure the two cron routes |

None of these need a `NEXT_PUBLIC_` prefix — they are all read server-side
only (in API routes and `lib/`), never in browser-rendered code. Do not add
that prefix; doing so would expose these secrets to the client bundle.

Reminder: any change to environment variables in Vercel only applies to
**new** deployments — trigger a redeploy after adding or editing variables.

---

## 4. Cron jobs

This project needs two scheduled routes to run periodically:
- `app/api/cron/send/route.js` — sends due scheduled drafts
- `app/api/cron/replies/route.js` — polls IMAP for new replies

### If on Vercel Pro (recommended)

Confirm `vercel.json` contains both entries, for example:

```json
{
  "crons": [
    { "path": "/api/cron/send", "schedule": "*/5 * * * *" },
    { "path": "/api/cron/replies", "schedule": "*/5 * * * *" }
  ]
}
```

Adjust frequency as needed — every 5 minutes is a reasonable default for
both. Vercel automatically sends a `CRON_SECRET` bearer token in an
`Authorization` header when it invokes these routes if `CRON_SECRET` is set
as an environment variable. Both route handlers must verify this header
before doing any work:

```js
const auth = request.headers.get('authorization');
if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
  return new Response('Unauthorized', { status: 401 });
}
```

Confirm this check exists in both cron routes. Without it, anyone who
discovers the route URL could trigger sends or reply checks directly.

### If staying on Hobby (workaround, not preferred)

Hobby cron can only run once daily, which is too infrequent for reply
polling and scheduled sends to feel responsive. If Pro isn't an option:
- Remove the `crons` block from `vercel.json` entirely (a too-frequent
  schedule will fail the whole deployment on Hobby).
- Use a free external scheduler (e.g. cron-job.org, or a GitHub Actions
  workflow on a schedule) to send an HTTP GET request to
  `https://your-deployment-url/api/cron/send` and `/api/cron/replies` every
  few minutes, with header `Authorization: Bearer <CRON_SECRET>` — same
  `CRON_SECRET` value, just set and verified manually rather than
  auto-injected by Vercel.
- This works, but means uptime of the scheduling behavior now depends on a
  third-party service staying available, not just Vercel.

---

## 5. Function duration

`app/api/send/route.js` already declares `export const maxDuration = 60;` —
this fits within the Hobby plan's 60-second ceiling, so no change needed
there. If any other route (e.g. `lib/crawlSite.js` being called from
`/api/generate`, which may take longer due to crawling multiple pages) risks
exceeding 60 seconds, either:
- add the same `export const maxDuration = 60;` export to that route file
  (works on both Hobby and Pro, 60s is the max on Hobby), or
- if more than 60 seconds is genuinely needed, this requires Pro (up to 800s
  with Fluid Compute).

Check `app/api/generate/route.js` specifically before deploying — website
crawling plus an AI call is the most likely candidate to run long.

---

## 6. Build settings

No custom build configuration should be needed — Vercel auto-detects
Next.js projects. Confirm:
- **Framework Preset:** Next.js (auto-detected)
- **Build Command:** `next build` (default, don't override)
- **Install Command:** `npm install` (default) — switching to `npm ci` is
  slightly more reproducible if `package-lock.json` is committed, but not
  required
- **Output Directory:** leave as default (`.next`), do not set this manually

`electron/` and `scripts/` are not part of the web deployment — Vercel will
build only the Next.js `app/` output; no exclusion config is needed for
these, they simply aren't invoked by `next build`.

---

## 7. Pre-deployment checklist

Go through this in order, don't skip steps:

- [ ] Turso database created, `LIBSQL_URL` and `LIBSQL_AUTH_TOKEN` obtained
- [ ] All environment variables from Section 3 added in Vercel dashboard for
      Production (and Preview, if used)
- [ ] `CRON_SECRET` generated (a random 16+ character string) and added as an
      environment variable
- [ ] Both cron routes verify the `Authorization` header against
      `CRON_SECRET`
- [ ] `instrumentation.js` updated to skip the local background loop when
      running on Vercel (check for `process.env.VERCEL`)
- [ ] `vercel.json` cron schedule matches your actual plan (daily only if
      Hobby; more frequent only if Pro, or removed entirely if using an
      external scheduler)
- [ ] `APP_BASE_URL` set to the real deployment URL (update this again if a
      custom domain is attached later)
- [ ] Confirm no `.env` or `.env.local` file is committed to git — check
      `.gitignore` includes both
- [ ] All SMTP/IMAP/API credentials currently in local `.env.local` have been
      rotated if they were ever shared outside the project (e.g. pasted into
      a chat, a screenshot, or a support ticket) before being reused as
      Vercel environment variables
- [ ] First deploy done to a Preview environment (push to a non-main branch)
      before pointing production traffic at it — confirms build succeeds and
      cron/env wiring is correct without risk to real leads
- [ ] After Preview looks correct, merge to the production branch and verify
      the two cron routes actually fire (check Vercel's Cron Jobs log in the
      dashboard, or the external scheduler's own logs if using that path)

---

## 8. Known limitations to communicate back to the user, not silently work around

- Hobby plan cannot run cron more than once daily — do not "fix" this by
  writing custom polling logic inside a single route as a workaround; flag
  it back to the user so they can decide between upgrading to Pro or using
  an external scheduler (Section 4).
- If `LIBSQL_URL` is missing at deploy time, the app will still build and
  run, but will silently fall back to a local file database that does not
  persist — this will look like data randomly disappearing rather than a
  clear error. Confirm `LIBSQL_URL` is actually set before considering
  deployment complete, don't assume it from the presence of `.env.local`
  locally.
