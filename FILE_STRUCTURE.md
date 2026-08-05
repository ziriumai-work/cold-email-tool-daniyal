# File structure and purpose

This document explains what each major folder and file is responsible for in one line so future agents can orient themselves quickly.

## Root level

- package.json defines the Next.js, Electron, and script entry points for development, build, packaging, and testing.
- next.config.mjs configures Next.js runtime behavior and build settings for the app.
- middleware.js protects routes with a shared password when authentication is enabled.
- instrumentation.js starts the background scheduler when the Node runtime is active.
- vercel.json defines Vercel cron jobs for scheduled sends and reply polling.
- DEPLOY.md contains deployment steps for Vercel and the required environment variables.
- DESKTOP-APP.md documents the desktop packaging workflow for Electron.
- .env.example provides a template for local environment setup.
- pid.txt stores a process identifier used by local launch helpers.
- sample-companies.csv and test-kabulrugs.csv are example CSV files for importing companies.
- nyc-realestate-leads.csv is a sample lead dataset used for testing or demos.

## app/

- app/layout.js defines the root layout and base document shell for the Next.js app.
- app/page.js contains the main dashboard UI for importing companies, generating drafts, sending emails, and tracking replies.
- app/login/page.js contains the sign-in screen for the team password.
- app/api/ contains all server API routes used by the UI and background jobs.

## app/api/companies/

- app/api/companies/route.js lists companies and deletes all imported data as needed by the dashboard.

## app/api/cron/

- app/api/cron/send/route.js runs scheduled email sends when the cron endpoint is triggered.
- app/api/cron/replies/route.js runs reply polling when the cron endpoint is triggered.

## app/api/drafts/

- app/api/drafts/route.js lists drafts and updates subject, body, or status values.

## app/api/enrich/

- app/api/enrich/route.js is the API endpoint for enrichment-related logic if it is used in future flows.

## app/api/generate/

- app/api/generate/route.js creates a new draft for one company from either AI research or a custom prompt.

## app/api/import/

- app/api/import/route.js accepts CSV content and imports companies into the database.

## app/api/login/

- app/api/login/route.js handles login, password validation, and session cookie issuance.

## app/api/replies/

- app/api/replies/route.js lists replies and updates their status or notes.

## app/api/schedule/

- app/api/schedule/route.js stores a future send time for an approved draft or cancels it.

## app/api/send/

- app/api/send/route.js sends a single approved draft through the configured sender account.

## app/api/senders/

- app/api/senders/route.js exposes the available sender identities to the UI.

## app/api/settings/

- app/api/settings/route.js saves and loads signature and sender-specific settings.

## lib/

- lib/db.js manages database initialization, schema creation, migrations, and common SQL access helpers.
- lib/generate.js contains the two-step AI generation pipeline for research and cold email writing.
- lib/crawlSite.js crawls a company website and extracts signals that inform the outreach angle.
- lib/fetchSite.js is a helper module for fetching and parsing website content.
- lib/deepseek.js wraps the DeepSeek API and adds retry and JSON parsing resilience.
- lib/mailer.js sends outbound email with signatures, headers, and SMTP transport setup.
- lib/replies.js reads the IMAP inbox and matches incoming replies to sent drafts.
- lib/scheduler.js sends due scheduled emails and polls for replies in the background.
- lib/senders.js parses sender account configuration and resolves the active sender.
- lib/settings.js stores simple key-value settings in the database.
- lib/signature.js builds the plaintext and HTML signature used in outbound messages.
- lib/csv.js parses CSV content into a list of company rows.
- lib/enrich.js contains enrichment helpers for future company data expansion.

## electron/

- electron/main.cjs launches the packaged standalone Next.js server and opens the Electron window.

## public/

- public/ contains static assets such as the logo image used by the login page and email signature.

## scripts/

- scripts/test-*.mjs are lightweight command-line probes for SMTP, DeepSeek, generation, scheduling, replies, and other subsystems.
- scripts/prepare-standalone.mjs prepares the build output for the Electron desktop app.
- scripts/check-model.mjs checks the configured DeepSeek model availability.
- scripts/clear-all.mjs clears all data from the local database.
