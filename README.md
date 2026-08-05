# Cold Email Tool

This repository contains a full-stack cold outreach assistant built with Next.js, a local SQL database, and SMTP/IMAP integrations. It helps a team import target companies, generate personalized email drafts from website research, review and approve drafts, send them, schedule sends, and monitor replies from an inbox.

## What this project does

The tool is designed for a very specific workflow:

1. Import a list of companies from CSV.
2. Generate a draft email for each company using website research plus a prompt.
3. Review and approve the generated draft.
4. Send it immediately or schedule it for a future time.
5. Monitor replies from an IMAP inbox and track them as lead activity.

The core value is that each draft is not a generic template; it is generated with a small research pipeline that crawls a company website, extracts signals, and uses those signals to write a more relevant and specific outreach email.

## Current architecture

The app is organized as a Next.js application with:

- A React dashboard in the browser for managing companies, drafts, and replies.
- API routes under app/api for CRUD actions, generation, sending, scheduling, reply checks, and authentication.
- Library modules under lib for business logic such as crawling, generation, mail sending, DB access, and scheduling.
- Optional Electron packaging for desktop use.
- Optional Vercel deployment with cron endpoints for scheduled sends and reply checks.

## Main workflow

### 1. Company ingestion

A CSV upload is parsed and imported into the companies table. Each company has a name, website, contact email, and phone number when available.

### 2. Draft generation

When a user generates a draft, the app:

- loads the company record,
- finds the selected sender account,
- crawls the company website,
- creates a research brief from the site content,
- asks a language model to produce a subject and email body,
- saves the draft to the database.

### 3. Review and approval

Drafts are stored with status values such as pending, approved, scheduled, sent, replied, rejected, or error. The UI allows users to manually adjust subject/body and change status.

### 4. Sending and scheduling

The app can send a draft immediately or store a future send time. Scheduled sends are processed by the scheduler and optionally by Vercel cron endpoints.

### 5. Reply handling

The tool can connect to an IMAP inbox, look for new replies, and match them to previously sent drafts. Those replies are stored and can be updated with a lead stage or notes.

## Core logic by area

### Frontend

The main UI is in app/page.js and provides:

- company import,
- draft generation controls,
- draft review and editing,
- send and schedule actions,
- signature settings,
- reply tracking.

### API layer

The API routes in app/api are thin wrappers around the domain logic in lib. They validate input, call the appropriate library modules, and return JSON responses for the UI.

### Database layer

The database layer is implemented in lib/db.js. It uses libSQL and supports both:

- a local file database for development, and
- a remote Turso database for production or hosted deployments.

The schema includes tables for companies, drafts, replies, and settings.

### Email generation

The generation pipeline is centered around lib/generate.js and uses two steps:

- research: inspect the company website and derive a concrete business angle,
- writing: compose a short cold email with a subject and body.

The generation supports two modes:

- ai mode: crawl the website and generate a personalized outreach note,
- custom mode: polish an email or instruction string supplied by the user without website crawling.

### Crawling / website intelligence

lib/crawlSite.js crawls the homepage and a few internal pages, extracts visible text, and builds signals such as catalog size, missing contact page, thin content, and other website issues that can inform the outreach angle.

### Sending and delivery

lib/mailer.js sends email through SMTP and applies a signature and List-Unsubscribe header. The sending process is controlled by the API route and scheduler.

### Reply monitoring

lib/replies.js connects to IMAP, reads the inbox, and attempts to match replies to sent drafts using headers and address heuristics.

### Scheduling

lib/scheduler.js monitors due scheduled emails and sends them when their time arrives. It also checks for replies periodically.

## Environment variables

The app expects a configuration file with environment variables such as:

- SMTP_HOST, SMTP_PORT, SMTP_SECURE, SMTP_USER, SMTP_PASS
- IMAP_HOST, IMAP_PORT, IMAP_USER, IMAP_PASS
- DEEPSEEK_API_KEY, DEEPSEEK_MODEL
- LIBSQL_URL, LIBSQL_AUTH_TOKEN
- APP_PASSWORD, SESSION_SECRET
- CRON_SECRET
- FROM_NAME, FROM_EMAIL

For local use, the app can run without login if APP_PASSWORD is not set, and it can use a local file-based database when LIBSQL_URL is not set.

## Run locally

Install dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

The dashboard will be available at localhost:3000.

## Packaging and deployment

The project supports:

- a desktop Electron app via npm run electron,
- a standalone Next.js build via npm run standalone,
- deployment to Vercel with cron endpoints for scheduled sends and reply checks.

More deployment details are described in DEPLOY.md.

## Important implementation notes

- The system is intentionally workflow-oriented rather than a generic email platform.
- Most business logic lives in lib and is used by API routes instead of being embedded directly in page components.
- The generation pipeline favors concrete, relevant outreach angles over generic marketing language.
- The database layer is designed to be resilient and supports schema auto-creation and lightweight migrations.

## Recommended future maintenance approach

When changing this project, prefer:

- small, surgical edits,
- reading the relevant route and library module together before changing behavior,
- preserving the existing workflow rather than introducing opaque abstractions,
- updating documentation when the data flow or architecture changes.
