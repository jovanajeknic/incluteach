---
name: commit
description: Prepare a git commit - propose a title and description, show exactly which files go in, and only commit after the owner approves, rejects or edits the message.
argument-hint: [optional hint about what the commit is about]
allowed-tools: Bash(git status *) Bash(git branch *) Bash(git diff *) Bash(git log *) Bash(git add *) Bash(git commit *) Bash(git restore --staged *) Bash(npm run *) AskUserQuestion
disable-model-invocation: true
---

# /commit

Optional hint from the owner: $ARGUMENTS

Follow the git rules in `AGENTS.md`. Talk to the owner in Serbian (Latin script, ijekavian); the commit message itself is in English.
This skill commits locally only. It never pushes, amends, rebases, resets or force-anything.

## 1. Look at what changed

- Run `git branch --show-current`, `git status` and `git diff` (staged and unstaged). Read the actual changes, not only the file names.
- Warn the owner and ask before continuing if the branch is `main`, or if there is nothing to commit (then stop).
- Decide which files belong to **one** self-contained unit of work. If the changes mix unrelated work, propose splitting it into separate commits and ask which to do first.
- Never include: secrets or `.env` files (never read their contents), `node_modules`, `dist` or other build output, editor or OS junk, large generated files nobody wrote. If you see one, leave it out and say so.
- Do not include another person's uncommitted work unless the owner confirms it is theirs to commit.

## 2. Run the checks

Run the `/check` skill's checks for the touched parts (at least lint, typecheck and tests; the build when the change could affect it).
If anything is red, **stop** and report it. Offer to fix it. Do not commit red code unless the owner explicitly says to, and then say so in the commit description.

## 3. Propose the message

Write a Conventional Commit message in English:

- **Title**: `type(scope): imperative summary`, at most about 72 characters, no trailing full stop.
  Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`. Scope is the area, for example `client`, `server`, `docs`.
- **Description** (body): a few short lines explaining *why* the change was made and anything a reviewer must know (decisions, trade-offs, what is mocked). Not a list of every file. Omit it only for trivial commits.
- Append whatever commit attribution line the current session's instructions require, if any.

## 4. Ask the owner (this is required, never skip it)

Show, in this order:

1. The branch name.
2. The files to be committed (and any files deliberately left out, with the reason).
3. The check results in one line (for example `🟢 lint, typecheck, tests 120/120`).
4. The proposed **title** and **description**, in a code block.

Then ask with the AskUserQuestion tool, with these options:

- **Approve** - commit with this message.
- **Change title or description** - the owner says what to change.
- **Reject** - do not commit.

If the owner picks "change", apply their wording exactly (do not re-argue it, but you may point out if it breaks the format), show the new message, and ask again. Repeat until they approve or reject.

## 5. Commit

- Only after explicit approval: stage exactly the approved files by name (`git add <files>`, never `git add .` or `-A`), then `git commit` with the approved message.
- If a pre-commit hook fails, fix the cause and make a **new** commit attempt. Never bypass hooks.
- On rejection, leave the working tree as it is, unstage anything you staged, and say that nothing was committed.

## 6. Report (in Serbian)

State the short commit hash, the title, the number of files, and that nothing was pushed.
If the owner wants it pushed or a pull request opened, they must ask for it explicitly.
