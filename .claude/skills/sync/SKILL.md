---
name: sync
description: Fetch from GitHub, show what changed on main and on teammates' branches, and safely bring the current branch up to date with main without losing any work.
allowed-tools: Bash(git fetch *) Bash(git status *) Bash(git branch *) Bash(git log *) Bash(git diff *) Bash(git merge *) Bash(git merge-base *) Bash(git rev-list *) Bash(git merge-tree *) Bash(git rev-parse *) Bash(git pull --ff-only *) AskUserQuestion
disable-model-invocation: true
---

# /sync

Keep the owner's branch current with the team's work, without ever risking anyone's changes.
Follow the git rules in `AGENTS.md`. Report to the owner in Serbian (Latin script, ijekavian), in plain beginner-friendly words.

**Never** use force push, `reset --hard`, `checkout --` / `restore` on modified files, `clean`, `rebase`, `stash drop`, or delete any branch. Never push. This skill only fetches and merges.

## 1. Check the starting point

- Run `git branch --show-current` and `git status`.
- If there are uncommitted changes, **do not merge**. Tell the owner which files are modified and suggest `/commit` first (or ask if they want to continue with the read-only report only). A merge on top of unfinished work can tangle it.

## 2. Fetch and look

- `git fetch origin --prune`
- Report what is new since the owner's branch last met `main`:
  - Commits on `origin/main` that the current branch does not have (count, then author and subject for each, newest first, at most about 15).
  - Commits on the current branch that are not on `origin/main` yet (the owner's own work).
  - Other remote branches updated recently or not yet merged (name, author, how many commits ahead of `main`, last commit subject). These are teammates' work in progress.
- Show which files changed on `main` since the branch point, and flag the ones the owner has also changed on their branch: these are where conflicts could appear. Use `git diff --name-only` on both sides and intersect them.
- Do a dry run before touching anything: `git merge-tree --write-tree HEAD origin/main`. Say plainly whether the merge is expected to be clean or to conflict, and in which files.

## 3. Update the branch

- If the current branch is `main`: `git pull --ff-only origin main`. If that cannot fast-forward, stop and explain.
- Otherwise, if `origin/main` has new commits and the working tree is clean: ask the owner with AskUserQuestion whether to bring `main` into the branch now. Options: **Merge main into my branch** / **Only show the report, change nothing**.
  - On yes: `git merge origin/main` (a normal merge commit; keep history, do not rebase). Use the default message.
- If the branch is already up to date, say so and change nothing.

## 4. If there are conflicts

Do not guess. Stop at the first sign of a conflict and:

1. List the conflicted files and explain in a sentence each what both sides changed.
2. Offer two paths: resolve them together (go file by file, keep both sides' intent, ask when it is not obvious), or `git merge --abort` to return to exactly the state before `/sync`.
3. Never resolve a conflict by simply choosing one side without the owner knowing, and never drop a teammate's lines silently.

After any conflict resolution, run the `/check` skill's checks before finishing the merge commit.

## 5. Report (in Serbian)

- Where the branch stands now relative to `origin/main` (ahead / behind).
- What came in from the team, in one or two lines.
- What other branches teammates are working on.
- That nothing was pushed, and the next step if any (for example `/check`, or `/pr` when the work is ready).
