# Order rules for future coding agents

These rules apply to every change request in this repository.

1. Understand the issue before editing.
2. Search the relevant UI, API route, and library module before proposing a fix.
3. Prefer a root-cause solution over a quick patch.
4. Keep the implementation production-ready, consistent, and easy to reason about.
5. If the same problem remains unresolved after three careful attempts, stop and ask the user or another LLM for help rather than shipping a weak workaround.
6. Verify the result with the relevant test, build, or runtime check before claiming completion.
7. If the change alters workflow behavior, update the documentation to reflect it.
