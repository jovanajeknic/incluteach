---
name: check
description: Run all project checks (format, lint, type check, tests, build) and report one clear verdict - green if everything passed, red with the failures if not.
allowed-tools: Bash(npm run *) Bash(npm ci) Bash(npm install) Bash(git status *) Bash(git branch *) Bash(ls *)
disable-model-invocation: true
---

# /check

Run every automated check for the parts of the project that exist, then report a single verdict.
Report to the owner in Serbian (Latin script, ijekavian). Keep the output short.

## What to run

Find which parts exist: `client/` (frontend) and, once it is created, `server/` (backend).
For each part that has a `package.json`, run the scripts below from that folder, in this order.
**Run every check even if an earlier one fails**, so the owner sees all problems at once. Only skip a check if the script does not exist in `package.json`, and list it as "skipped (no script)".

1. `npm run format:check`
2. `npm run lint`
3. `npm run typecheck`
4. `npm test`
5. `npm run build`

If `node_modules/` is missing in a part, run `npm ci` there first (or `npm install` if there is no lockfile). Mention that you did.

Do not edit code, change configuration, or skip, loosen or delete a test or rule to get a pass. This skill only reports. If a failure is trivial to fix (for example formatting), say so and offer to fix it; do not do it unasked.

## How to report

If **everything** passed in every part:

> 🟢 **ZELENO** - sve provjere su prošle (client: format, lint, typecheck, test, build)

Otherwise start with:

> 🔴 **CRVENO** - palo je N od M provjera

Then a compact table per part: one row per check with 🟢 / 🔴 / ⚪ (skipped) and, for each failure, the file and line and the first meaningful error message (not the whole log). Add the test count when tests ran (for example `120/120`).
Finish with one line on the most likely next step.

Never report green unless every check that ran exited successfully. If a check could not run at all (missing tool, crash), that is not green: report it as 🔴 and say why.

Things this skill does not cover, so never present it as proof of them: how the UI looks in a real browser, manual accessibility checks, and the Playwright flows once they exist. Mention these in one short line when the verdict is green and the change was visual.
