---
name: new-feature
description: Implement a new feature or change that the project owner describes after the command, following the rules in AGENTS.md. Asks questions, presents a short plan, waits for approval, implements, verifies with /check and commits locally.
argument-hint: <what you want built, e.g. "make the Publish button ask for confirmation">
disable-model-invocation: true
---

# /new-feature

The owner's request: $ARGUMENTS

If the request above is empty, ask the owner what they want built and stop there.

Follow the rules in `AGENTS.md`. It is the source of truth; this file only lays out the order of work.
Talk to the owner in Serbian (Latin script, ijekavian). Code, identifiers, comments and commit messages are in English.

## 1. Understand the current state

- Run `git status` and `git branch --show-current`. Never overwrite or discard existing changes, including a teammate's.
- If the current branch is `main`, or already holds unrelated work, create a new branch for this task (`feat/<short-name>`, or `fix/<short-name>`). Say which branch you chose.
- Read the files the request touches, plus the relevant part of `docs/FRONTEND-PLAN.md` and `docs/DESIGN.md` for UI work.
- If the feature talks to the backend (upload, save, load), read `docs/API-CONTRACT.md` if it exists. Build against the contract. If the endpoint is missing or different, do not invent one: tell the owner to run `/api-contract` first, or ask whether to proceed with a clearly marked provisional mock.
- Follow the existing conventions (folder structure, naming, Serbian UI text kept in `client/src/text/sr-Latn.ts`, mocks following the agreed API format).

## 2. Ask before guessing

If anything affects functionality, data or architecture and the request does not settle it, ask the owner.
Ask all open questions in one message, each with a recommended answer, so the owner can reply quickly.
Do not ask about things you can find in the code or docs, and do not ask about trivial details.

## 3. Present a short plan and wait

For a new feature or a larger change, give the owner a short plan and **wait for approval before writing any code**:

- What will change (files or areas) and what will stay untouched.
- Assumptions you are making.
- Acceptance criteria: concrete, checkable statements of what "done" means.
- How it will be verified (which tests, which checks, what is checked by hand).
- New dependencies, if any, each with one line on what it is for. Avoid them unless clearly needed.

A small, clear fix (a typo, a colour, an obvious one-line bug) does not need a plan. Say what you are fixing and go ahead.

## 4. Implement

- Work in small steps and touch only what the request needs. Do not add unrelated features or refactors.
- Handle invalid input, errors, empty states and loading states.
- Add meaningful tests for the important behaviour and edge cases.
- Never remove or weaken a test or check to get a pass.
- Never put secrets in code. Do not read `.env` files.

## 5. Verify

- Run the `/check` skill. Fix real failures in the code; do not silence them.
- For UI work, also confirm the layout on phone width and desktop width, and basic accessibility (labels, keyboard use, contrast). If you cannot look at it in a browser, say so plainly.
- Do not claim something works without verifying it. Say what you could not verify.

## 6. Commit locally

- Commit only the files that belong to this task, in a Conventional Commit message in English (for example `feat(client): ask for confirmation before publishing`).
- Before committing, show a short summary of what is being committed and the `/check` result.
- Do not push, open a pull request or merge into `main` unless the owner explicitly asks.

## 7. Report back (in Serbian)

Keep it short and beginner-friendly:

- **Done:** what was implemented.
- **Verified:** which checks passed, and what was checked by hand.
- **Not verified / missing:** anything left open.
- **Real vs. mocked vs. planned:** make the difference explicit.
- Any agreement worth recording goes into the project docs, not only the chat.
