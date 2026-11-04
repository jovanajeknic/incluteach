---
name: api-contract
description: Design or update one API endpoint in docs/API-CONTRACT.md, the written agreement between frontend and backend (address, who may call it, request, response, errors), then check the frontend and backend against it.
argument-hint: <the capability you need, e.g. "teacher uploads a lesson PDF"> | check
disable-model-invocation: true
---

# /api-contract

The owner's request: $ARGUMENTS

If the request above is empty, ask which capability or endpoint to define and stop there.

The contract is the single page that frontend and backend are both built against, so they fit together.
Follow `AGENTS.md`. Talk to the owner in Serbian (Latin script, ijekavian), in beginner-friendly words (explain terms like "endpoint" or "status code" briefly the first time). The contract file itself, code and comments are in English.

This skill defines and checks contracts. It does **not** build UI or backend code: if the request describes a button, a page or a server function, extract the API need from it, define that, and tell the owner the UI part is done with `/new-feature` (and the server part is a separate backend task). Never write a mock handler or an endpoint implementation here.

## Modes

- **Define** (default): the request describes a capability. Go through steps 1-6.
- **Check** (request is `check`): do step 5 only, for every endpoint in the contract, and report.

## 1. Gather context

- Read `docs/API-CONTRACT.md` if it exists. If it does not, you will create it in step 4 from the template below.
- Read `docs/FRONTEND-PLAN.md`: the decisions already made, the "For the backend developer" and "Joint" open questions, and section 8 (mock and real API approach).
- Look at what the frontend already expects: the Zod schemas and the data interfaces under `client/src/features/` (for example `features/lessons/data`) and `client/src/shared/api/` if it exists. Reuse their names and shapes instead of inventing new ones.
- If `server/` exists, look at what is already implemented there.
- Check the endpoint is not already in the contract. If it is, you are updating it, not duplicating it.

## 2. Ask before guessing

Ask all open questions in one message, each with a recommended answer. Typical things to settle, depending on the endpoint:

- Who may call it (teacher, class teacher, parent, student) and which records they may touch. Access is enforced on the backend (AGENTS.md section 6).
- Limits and validation: allowed file types, maximum size, field lengths, required fields.
- One step or several (for example upload separate from lesson creation), and whether the work is slow (then a processing status, polling or push).
- What must never be returned (other students' data, a parent's text going to the AI, secrets).
- Does AI-generated content need teacher approval before students see it (it always does, per AGENTS.md).

Do not decide the project-wide open questions on your own (authentication mechanism, error format, base URL, contract format, QR cards). If the endpoint depends on one, write it as `TBD (open question: ...)` and tell the owner it needs agreeing with the teammate.

## 3. Propose and wait

Show the endpoint in the template below, in the chat, and **wait for approval** before writing the file. Keep it short; point out each assumption.

## 4. Write the contract

After approval, add the endpoint to `docs/API-CONTRACT.md` (create the file with the header below if it is missing). Keep endpoints grouped by area (Auth, Lessons, Students, ...) and keep each one in the same template.

New or changed endpoints get `Status: proposed`. Only the owner **and** the teammate agreeing makes it `agreed`; you may set `agreed` only if the owner says the teammate has agreed. Tell the owner that the teammate must review before anyone builds against it.

File header (when creating):

```markdown
# API contract

Agreement between the frontend (`client/`) and the backend. Both sides build against this file.
Status values: `proposed` (written, not yet agreed with the teammate) -> `agreed` -> `implemented`.
Changing an `agreed` endpoint needs both developers' approval. Mocks in the frontend must follow this file.

## Common rules

- Format of this contract: Markdown (provisional - TBD whether to move to OpenAPI).
- Base URL: TBD
- Authentication: TBD (open question)
- Error format: TBD (open question). Until agreed, endpoints list only the status codes.
- Fictional data only in development.
```

Endpoint template:

```markdown
### POST /lessons/{lessonId}/source-file

- **Status**: proposed
- **Purpose**: one sentence.
- **Who may call it**: roles, and the access rule (for example "only the teacher assigned to this lesson").
- **Request**: path/query parameters and body, as a field table (name, type, required, rules). For uploads state content type and limits.
- **Success response**: status code and body (field table or a short fictional example).
- **Errors**: each status code with the situation that causes it (400 invalid input, 401 not signed in, 403 not allowed, 404 not found, 413 too large, 500 ...).
- **Notes**: security, privacy, slow work/status, anything a developer would otherwise guess.
- **Used by (frontend)**: the screens/features that call it.
```

## 5. Check both sides against the contract

- **Frontend**: compare the endpoint with the Zod schemas and data interfaces the screens use. List every difference (field names, optional vs required, missing error states, missing loading/empty handling). Do not change frontend code; report the differences so they can become a `/new-feature` task.
- **Backend**: if `server/` has the endpoint, compare path, method, validation, status codes and access rules against the contract, and list differences. If it does not exist yet, say "not implemented".
- In **check** mode, do this for every endpoint and report a table: endpoint, status, frontend 🟢/🔴, backend 🟢/🔴/⚪ (not built), with the first difference for each 🔴.

## 6. Report (in Serbian)

- What was added or changed in the contract, and where.
- The frontend/backend differences you found.
- What still needs agreeing with the teammate (list the exact questions).
- Next steps, for example: the button/page is a `/new-feature` task; the mock handler follows once FE-04 exists; the server endpoint is a backend task.
- Mention that nothing was committed (use `/commit`).
