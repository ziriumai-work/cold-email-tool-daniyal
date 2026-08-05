# Universal Repository Working Rules for AI Coding Agents

> **Read this file before making any code changes.**
>
> This document defines the mandatory workflow every AI agent must follow when working in this repository. These rules are derived from the project's documentation and are considered higher priority than implementation shortcuts.

---

# Primary Objective

Your responsibility is to improve the project without introducing regressions.

Always prefer:

- correctness
- maintainability
- production readiness
- consistency with the existing architecture

Never optimize for writing less code if it sacrifices quality.

---

# Understand Before Changing Anything

Never begin editing immediately.

First understand:

- the problem
- the existing architecture
- how data flows
- which modules are involved
- possible side effects

Always identify:

- UI
- API
- business logic
- database
- scheduler/background jobs
- deployment implications

before making modifications.

---

# Required Reading Workflow

Before touching any feature, read the related files.

## UI

Read the page/component responsible for the feature.

Examples:

- app/page.js
- app/login/page.js

---

## API

Read the corresponding API route.

Examples:

- app/api/send
- app/api/generate
- app/api/schedule
- app/api/settings
- app/api/import

---

## Business Logic

Read the matching library modules inside:

```
lib/
```

Important modules include:

- db.js
- generate.js
- crawlSite.js
- fetchSite.js
- deepseek.js
- scheduler.js
- mailer.js
- replies.js
- senders.js
- settings.js
- signature.js
- csv.js
- enrich.js

Never duplicate logic that already exists inside these libraries.

---

# Respect Existing Architecture

The project intentionally separates responsibilities.

Follow this pattern:

UI

↓

API Route

↓

Library Module

↓

Database

Never collapse these layers.

Never place business logic inside UI components.

Never bypass API routes.

Never bypass library functions.

---

# Database Rules

Database access must always go through the database layer.

Never:

- create ad-hoc storage
- bypass migrations
- bypass helper methods
- introduce inconsistent schemas

If persistence changes:

- verify schema compatibility
- verify migrations
- verify status transitions

---

# Workflow State Rules

Do not invent new workflow states.

If a new status is required:

update

- database
- API
- UI
- scheduler
- documentation

to keep everything synchronized.

---

# Root Cause Rule

Always solve the root cause.

Never patch visible symptoms.

Bad:

> Add another conditional until it works.

Good:

> Understand why the state became invalid and fix that source.

---

# Minimal Changes

Make surgical edits.

Do not rewrite unrelated code.

Do not refactor unrelated modules.

Do not rename files unless requested.

Do not reorganize folders unless requested.

---

# Production-Ready Standards

Every change should be suitable for production.

Your code should be:

- readable
- maintainable
- strongly typed (when applicable)
- consistent
- reusable
- deterministic

Avoid:

- hacks
- temporary fixes
- duplicated code
- magic values
- unnecessary abstractions

---

# Preserve Existing Patterns

Before introducing a new pattern:

Look for an existing implementation.

Match:

- naming
- structure
- error handling
- logging
- validation
- folder organization

Consistency is more important than personal preference.

---

# Error Handling

Never silently ignore failures.

Provide meaningful:

- validation
- exceptions
- logging
- recovery

Avoid empty catch blocks.

---

# Verification Rules

Never claim success without verification.

Run the appropriate checks whenever possible.

Examples:

- build
- lint
- tests
- runtime validation

Your final report should clearly state:

## Verified

- what was tested

## Not Verified

- what could not be tested

---

# Three Attempt Rule

If the same issue remains unresolved after three careful attempts:

STOP.

Do not continue stacking workarounds.

Instead:

- explain what was tried
- explain why it failed
- ask the user (or another LLM) for clarification

---

# Documentation Rule

Whenever behavior changes:

Update relevant documentation.

Examples:

- deployment
- workflows
- configuration
- new environment variables
- new setup requirements

---

# Deployment Awareness

Before changing deployment-related code, understand:

- Vercel configuration
- environment variables
- cron jobs
- scheduler
- authentication
- Electron desktop configuration (if applicable)

Never remove or rename environment variables without verifying every dependent module.

---

# Scheduler Safety

Background jobs require extra caution.

Changes involving:

- scheduled emails
- polling
- cron
- reply tracking

must preserve:

- idempotency
- duplicate protection
- reliability
- recovery after downtime

---

# Email Generation Rules

Understand the complete generation pipeline before modifying it.

Relevant modules include:

- generate.js
- crawlSite.js
- fetchSite.js
- deepseek.js

Do not change AI prompts, generation flow, or tone without understanding the existing behavior.

---

# Reply Tracking Rules

Before modifying replies:

Understand:

- IMAP flow
- matching logic
- reply state updates
- scheduler interactions

Never break existing reply matching.

---

# Desktop Application Rules

If modifying Electron:

Understand:

- shared Turso database
- embedded configuration
- packaging process
- installer behavior

Do not expose credentials unintentionally.

---

# Security Rules

Never:

- hardcode secrets
- expose tokens
- commit credentials
- weaken authentication
- bypass middleware

Always use environment variables.

---

# Performance Rules

Prefer efficient solutions.

Avoid:

- repeated database queries
- unnecessary renders
- duplicated API requests
- excessive crawling
- blocking operations

---

# Before Finishing

Confirm:

- architecture remains intact
- no unrelated files changed
- no duplicate logic introduced
- documentation updated (if needed)
- tests/build completed where possible

---

# Agent Checklist

Before editing:

- Understand the issue.
- Read the relevant UI.
- Read the API route.
- Read the library module.
- Understand database implications.
- Understand scheduler implications.
- Identify the root cause.

While editing:

- Keep changes minimal.
- Preserve architecture.
- Follow existing patterns.
- Write production-quality code.
- Handle errors properly.

After editing:

- Run verification.
- Update documentation if needed.
- Report verified vs. unverified items.
- Never claim success without evidence.

---

# Guiding Principle

> Read first.
>
> Understand completely.
>
> Change as little as necessary.
>
> Fix the root cause.
>
> Keep the solution production-ready.