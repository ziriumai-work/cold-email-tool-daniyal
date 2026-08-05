# Start here for future agents

Read this file first before making any change to this repository.

## Purpose of this project

This is a cold outreach automation tool for generating, reviewing, sending, scheduling, and tracking outbound emails. The project is not a general-purpose website or marketing app; it is a workflow-oriented system for sending personalized outreach from a small team.

## What to understand before editing

Before changing anything, read the relevant UI file, the matching API route, and the underlying library module together. The architecture is intentionally split so the UI remains thin and the business logic lives in lib.

## Non-negotiable working rules

1. Make surgical edits only.
   - Understand the problem deeply first.
   - Trace the relevant data flow from the UI to the API route to the library module.
   - Do not patch symptoms when the underlying issue requires a more complete fix.

2. Prefer production-ready solutions.
   - Solve the root cause, not the visible symptom.
   - Keep the change consistent with the existing patterns in the repository.
   - Preserve reliability, error handling, and data safety.

3. Do not take shortcuts.
   - Avoid hacky one-off fixes unless the requirement explicitly calls for them.
   - If a solution is unclear or risky, pause and ask for clarification instead of shipping a brittle patch.

4. If you are stuck, escalate.
   - If the same issue appears three times without meaningful progress, stop and ask the user or another LLM for help rather than continuing with a cheap workaround.

5. Verify before claiming success.
   - Run the relevant checks or tests after your change.
   - Report what was verified and what was not.

## Expected workflow for changes

- Start by locating the relevant UI and API route.
- Read the business logic in the corresponding lib file.
- Check the database schema and existing status handling if persistence is involved.
- Make the smallest change that solves the actual problem.
- Validate the behavior with the appropriate command or test.

## Project-specific guidance

- The main dashboard is in app/page.js and is the best place to understand the end-to-end workflow.
- Email generation is handled mainly by lib/generate.js and lib/crawlSite.js.
- Sending and scheduling are handled by lib/mailer.js and lib/scheduler.js.
- Reply tracking depends on lib/replies.js and the replies table.
- The database layer in lib/db.js is central; many changes will need to respect its schema and migration behavior.

## Do not do these things

- Do not add UI logic that should live in an API route or library module.
- Do not bypass the database layer with ad-hoc storage in the frontend.
- Do not invent new workflow states without updating the existing logic and UI.
- Do not change the generation behavior without understanding the intended email tone and constraints.

## When in doubt

If you are uncertain about the correct implementation, read the existing code paths first, explain the intended fix clearly, and only then implement a minimal, robust change.
