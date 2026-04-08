---
name: app-reliability-audit
description: >
  Use this skill when asked to audit, review, or scan a codebase for reliability, resilience, or
  production-readiness issues. Triggers: "audit my codebase", "find reliability issues", "review
  for production", "check for race conditions / timeouts / N+1 queries", "SRE review", "find
  vulnerabilities", "trace user flows". The agent traces real user flows end-to-end, learns the
  project's existing documentation and code patterns before writing anything. It maintains two
  living artifacts: `audit_progress.md` (status/findings) and `audit_traces.md` (low-level execution
  traces). It terminates cleanly when a scan budget is exhausted. The audit agent **NEVER**
  executes code changes or creates implementation plans; its output is the foundation for the
  separate `app-reliability-fix` skill. Do NOT use for security pen-testing, CVE scanning, or
  static type-checking — those are separate concerns.
compatibility: >
  Tool-agnostic. Works in any AI code editor or agent runtime: Cursor, Windsurf, GitHub Copilot
  Workspace, Zed, JetBrains AI, Cline, Continue, Aider, Claude Code, or any environment with the
  ability to read files and write markdown. If the environment provides specialized tools, these
  **MUST** be used instead of their raw terminal equivalents to take advantage of the agent's
  optimized capabilities. Every step is described as a reading and reasoning task, not a command to
  execute.
---

# App Reliability & Resilience Audit Skill

---

## The Core Philosophy

Before learning any procedure, internalize this:

**Production outages are almost never caused by a single catastrophic bug.**
They are caused by a cascade — a missing timeout here, a swallowed exception there,
a schema field that the frontend sends but the backend stopped accepting six weeks ago —
that individually look harmless but compound under real load.

Your job is not to find every imperfection. Your job is to trace the paths that
_real users actually take_ through this system and identify the gaps that will fail
first, fail silently, or fail catastrophically when they do.

There are two failure modes to avoid:

- **Alarm fatigue**: flagging every TODO comment as HIGH severity. Users stop trusting the report.
- **False confidence**: declaring a service healthy after only reading the controllers. The worst
  bugs live in the service and database layers, where nobody looks.

This skill keeps you between those failure modes by giving you a bounded method, a severity rubric
with concrete examples, and explicit rules about when to stop.

---

## What is a Flow?

A **flow** in this audit context is a complete, end-to-end user journey. 
It is **NOT** a single file, a single function, or a small logic block. 

A flow **MUST**:
1.  **Start at an Entry Point**: A UI Component event, a Route change, a backend Router (FastAPI/Nex.js API), or a CLI command.
2.  **Path through the Logic**: Trace through Frontend Hooks, API clients, Backend Services, and logic-heavy utility functions.
3.  **End at the Storage/Boundary**: Reach the Database (MongoDB, PostgreSQL), File Storage (S3), or an External Service call (OpenRouter, Stripe).

Tracing "half a flow" (e.g., just the UI component without its API call, or just the backend service without its DB write) is an audit failure. You haven't audited the reliability until you know how the data is actually handled from the user's intent to its final destination.

---

## Phase 0 — Learn the Project Before You Touch Anything

> **This phase is not optional. Do not open a source file until Phase 0 is complete.**

You are about to write findings and remediations that will be read by the people who built this
codebase. If your fixes use naming conventions they don't use, error handling patterns they don't
follow, or documentation styles they abandoned, they will not trust the report.

Phase 0 has three parts.

---

### 0-A. Build the Structural Map

Read only landmark files — files that describe the project's shape, not its logic.
You are answering four questions:

**Question 1: What kind of project is this?**
Look for: `package.json`, `pyproject.toml`, `go.mod`, `Cargo.toml`, `pom.xml`, `build.gradle`.
Read the dependencies section. Note what frameworks, ORMs, HTTP clients, and AI SDKs are in use.
These tell you where to look for reliability risks (e.g., Prisma = check for missing transactions;
Axios = check for missing timeouts; LangChain = check for streaming and schema parsing).

**Question 2: What are the service boundaries?**
Look for: `docker-compose.yml`, `Dockerfile`, `k8s/`, `.env.example`, `config/`.
Note every external service this codebase calls: databases, payment providers, AI APIs, queues,
storage buckets, email services. Each one is a timeout risk and a schema boundary.

**Question 3: What is the entry-point hierarchy?**
Look for files named: `routes`, `router`, `app`, `server`, `main`, `index`, `api`, `urls`.
Read just the routing file first — the file where all URL paths are registered. This is your
flow map. Every route is a potential user flow to trace.

**Question 4: Where are the data models?**
Look for: `*.prisma`, `schema.sql`, `models.py`, `*.model.ts`, `*.schema.ts`, `*.entity.ts`,
`types.ts`, `interfaces.ts`. These are the ground truth. You will cross-check every data
transformation you encounter against these definitions.

**Question 5: How many files are in the project?**
Run `git ls-files --cached --others --exclude-standard | measure-object -line` (or equivalent for the OS) to count the total number of files that are NOT ignored by `.gitignore`. This ensures your audit progress is tracked against the actual project size.

Write your answers into the "Project Profile" section of `audit_progress.md` (see template below).

---

### 0-B. Learn the Documentation Pattern

Read 2–3 existing well-documented files in the codebase — not to find bugs, but to understand
how this team writes. You are looking for:

- **Comment style**: Do they use JSDoc / docstrings / inline comments / none?
- **Error message format**: Do errors include a code, a user-facing message, and an internal
  message separately? Or are they plain strings?
- **Naming conventions**: camelCase, snake_case, PascalCase — per layer?
- **Logging pattern**: Do they use a structured logger (Winston, Pino, structlog) with fields,
  or plain `console.log`? What fields do they include — `userId`, `requestId`, `traceId`?
- **Return type conventions**: Do functions return `{ data, error }` tuples? Throw exceptions?
  Return `Result<T, E>` types? Resolve/reject promises?
- **Test structure**: Do tests exist? What do they cover? What do they skip?

Record what you find in the "Project Patterns" section of `audit_progress.md`.

> **Why this matters for remediations:** If you write a fix using `throw new Error("message")`
> in a codebase where every error is a typed `AppError` with a `code` field, your fix will be
> rejected. If you write a fix that adds `console.log` in a codebase that uses structured Pino
> logging, it creates a new inconsistency while fixing an old one. Your remediations must be
> written _in the language this team already speaks_.

---

### 0-C. Calibrate the Quality Baseline

Before flagging issues, calibrate your severity to what is _normal_ for this codebase.
Silently read one complete user flow from router to DB without flagging anything yet. Ask:

- Is error handling completely absent, or present but inconsistent?
- Are there signs of a recent refactor — some files modernized, some in an older style?
- Are there comments signaling known problems (`// TODO: add timeout`, `// FIXME: race condition`)?
- Is defensive coding (validation, fallbacks) the norm, or is the codebase optimistic by default?

This baseline determines whether a finding is an isolated anomaly or a systemic pattern.
A systemic pattern is always higher severity than an isolated one — because it means the issue
will recur every time someone adds a new feature, not just in the one file where you found it.

---

## Phase 1 — Initialize `audit_progress.md`

Create this file in the project root before scanning any source files.
Update it after every single file you read. It is your only persistent state.

```markdown
<!-- ══════════════════════════════════════════════════════════════════ -->
<!-- FINAL SUMMARY block will be prepended here when the audit ends    -->
<!-- ══════════════════════════════════════════════════════════════════ -->

# Reliability Audit — Progress

## Artifacts
- **Findings Log**: `audit_progress.md` (This file)
- **Execution Traces**: [audit_traces.md](file:///absolute/path/to/audit_traces.md)

## Current Status

| Field | Value |
|---|---|
| **Status** | Phase 0 — Learning Project / Scanning Flow N of 5 / ⛔ Terminated |
| **Files Read** | X / [Total Files] (Z%) |
| **Flows Completed** | Y / 5 |
| **Budget Limit Hit** | — |

---

## Project Profile

_(Filled during Phase 0-A)_

- **Language / Runtime:**
- **Framework:**
- **ORM / DB Client:**
- **External Services:**
- **Total Project Files:** (excluding .gitignore)
- **Key Risk Areas Identified:**

---

## Project Patterns

_(Filled during Phase 0-B — drives consistent remediations)_

- **Error handling pattern:**
- **Logging pattern:**
- **Naming conventions:**
- **Return conventions:**
- **Documentation style:**
- **Test coverage:**

---

## Execution Queue

### ✅ Completed Flows
- `FLOW-001`: [Description]

### 🔍 Current Flow: `FLOW-002` - [Description]
_(Strike through (text styling) completed files within the current flow. Mark the next file with `← NEXT`.)_
- `src/routes/index.ts` ← NEXT

### ⏭️ Next Upcoming Flows
- `FLOW-003`: [Description]

---

## Audit Log

_(See Document Mutation Rules below for what may and may not be changed here.)_
```

---

## Document Mutation Rules

`audit_progress.md` is a **living document**, not a log file and not a scratch pad.
Different sections have different mutation rules. Violating these rules is the most
common way an agent destroys the audit trail mid-run.

### What each section is allowed to do

| Section | Rule | Reasoning |
|---|---|---|
| **Current Status table** | Always overwrite on every file read | It is a live counter, not a history |
| **Project Profile** | Fill once in Phase 0-A; overwrite if a deeper read corrects an earlier assumption | Structural facts can be revised; mark the correction with `*(revised)*` |
| **Project Patterns** | Fill once in Phase 0-B; overwrite if a later file reveals the pattern was wrong | Same as above — one source of truth, corrections are fine |
| **Execution Queue** | Maintain three sub-sections: Completed Flows, Current Flow (with file trace), and Upcoming Flows. Strike through files in the Current Flow as they are read; never delete completed flows or files. | Provides a clear view of audited vs. pending end-to-end journeys. |
| **Audit Log** | **Append only by default.** The one exception is described below. | Preserves the record of what was found, when, and in what state |

---

### The One Exception — Updating an Existing Finding

You may update a previously written finding **only** when one of these conditions is true:

1. **The finding advanced**: a later file in the same flow reveals the vulnerability is more
   severe than originally assessed (e.g., you logged it as HIGH, then found it has no
   transaction wrapper making it CRITICAL).

2. **The finding's blast radius changed**: a later file shows the same flaw affects more
   surfaces than the original finding described.

3. **The finding was partially resolved in the codebase**: you discover that a fix exists in
   some files but not others, changing it from "isolated" to "partially addressed".

**When you update an existing finding, you must:**

- Add an `**Updated:**` block immediately below the original content — do not rewrite the
  original text above it.
- State what changed and why.
- If severity changed, show the old and new severity explicitly.

```markdown
### 🚨 HIGH — Missing Timeout on Stripe API Call

_(original finding text stays exactly as written)_

**Updated — [reason for update]**
After reading `src/services/webhookService.ts` (file 14), the same missing timeout pattern
appears on the webhook retry path, which runs under higher concurrency than the checkout flow.
**Severity escalated: HIGH → CRITICAL.** Blast radius now includes webhook processing, not
just checkout. Remediation must also be applied to `src/services/webhookService.ts` lines 34–41.
```

**What you must never do:**

- Silently rewrite a finding's severity, file location, or code snippet without an `**Updated:**` block
- Delete a finding because a later file suggested it might not be a problem after all
  (downgrade via `**Updated:**` block instead)
- Merge two findings into one without preserving both original entries
- Add the `**Updated:**` block to a finding that belongs to a different flow than the one
  currently being traced (cross-flow contamination corrupts the audit trail)

---

## Phase 1.5 — The Trace Log (`audit_traces.md`)

Before starting Phase 2, initialize `audit_traces.md`. This document contains the step-by-step traces for every user flow audited. A **flow** is defined as an end-to-end user journey (e.g., from a UI action or API route all the way to the database or an external service). Tracing only a small step or a single file is NOT a flow. Traces are linked to findings in `audit_progress.md` via unique Flow IDs.

**Rules for the Trace Log:**
1. **Flow IDs are Primary Keys**: Every trace header **MUST** include a unique ID (e.g., `### FLOW-001`).
2. **Atomic Steps**: Every file transition must be logged with the specific function and logic traced.
3. **ID-Based Retrieval**: When you need to revisit a trace, use `grep_search` or `view_file` on a specific range containing the Flow ID. **NEVER** read the entire `audit_traces.md` file if it exceeds 100 lines; use the ID to jump to the relevant section.

```markdown
# Reliability Audit — Flow Traces

### 🔍 Trace — FLOW-001: [Description]
(Follow the Flow Trace Template from Phase 2)
```

---

## Phase 2 — The Execution Loop

Repeat these four steps until a budget limit is hit.

---

### Step 2-A. Select the Next File

Take the top unmarked item from your Execution Queue. This must always be chosen by following
the actual execution path — the file that the _current_ file calls or imports next — not by
alphabetical order, not by guessing, not by what sounds interesting.

If you cannot locate the next file in the call chain after genuine effort, that is a Dead End.
Three consecutive Dead Ends → trigger budget termination.

---

### Step 2-B. Read and Analyze

Read the file. Evaluate it against all seven audit categories below. Apply all seven to every
file — skipping a category because a file "looks fine" is how the worst bugs survive audits.

---

### Step 2-C. Record and Extend

For each issue found: append a finding to the Audit Log using the finding template.
For each downstream call or import found: add the target file to the Execution Queue if it has
not already been read. Update the current flow entry in `audit_traces.md`. Strike through the
current file. Update the Files Read count.

---

### Step 2-D. Check Budget

```
flows_completed >= 5    →  TERMINATE (Max Flows)
files_read >= BUDGET    →  TERMINATE (Max Files)
dead_ends_in_a_row >= 3 →  TERMINATE (Dead End)
otherwise               →  return to Step 2-A
```

**BUDGET calculation:** Use `max(25, 5% of Total Project Files)` unless the user specifies otherwise.
A **flow is complete** when the trace has reached the storage layer (DB read/write) or an
external service call, or when it has hit a Dead End on that specific flow.

---

## Phase 3 — Efficient Context Retrieval

As the audit grows, the `audit_traces.md` file will become large. To maintain speed and accuracy:

1. **Grep the ID**: If a finding refers to `FLOW-005`, search for `### FLOW-005` in `audit_traces.md` to find the line number.
2. **Targeted View**: Read a 50-line window around that line number to understand the context.
3. **The Progress Map**: Always keep `audit_progress.md` open as your primary dashboard for "where am I?".

---

## The Seven Audit Categories

They are ordered from most-commonly-missed to most-commonly-checked.
Read them in this order to build the habit of checking what others skip.

---

### Category 1 — Schema & Model Alignment

> _This is the most commonly missed category in modern systems, and the highest-risk category
> in any codebase that includes an AI layer._

Every place data crosses a boundary is a potential silent mismatch. A mismatch does not
always throw an error — it silently drops fields, stores wrong values, or serves corrupted data.

**Check every boundary crossing in this order:**

| Boundary | What mismatches look like |
|---|---|
| **Frontend → API** | Form sends `user_id` (snake_case); backend reads `userId` (camelCase). Field renamed in one place, not the other. Optional field on frontend treated as required on backend. **Mismatch**: Pydantic model defines a field as required, but TypeScript interface marks it as optional (`field?: type`), or vice versa. |
| **Pydantic / TS Optionality** | **Abuse of Optional**: Fields that are logically required (e.g., `project_id`, `user_id`, or core metadata) are marked as `Optional[T]` or `T | None`. This forces downstream code to handle nulls that should never exist, leading to `AttributeError` or `undefined` access risks. |
| **API → Service** | Controller destructures 4 fields; service function expects 5. A field added to the API contract not yet added to the service interface. |
| **Service → DB** | ORM model has `createdAt`; DB column is `created_at`. Nullable in DB but required in the model. Enum values in code don't match the DB constraint. |
| **API → AI Service** | Request sends a structured object; prompt template expects specific keys that aren't guaranteed. Response parsing assumes a JSON shape the model sometimes deviates from. Token limits assumed in parsing logic. |
| **AI Response → DB** | AI-generated content written to DB without validation against schema. Required DB fields that are optional in the AI response. |
| **API Response → Frontend** | Backend DTO includes a field the frontend component expects under a different name or type. Deleted backend fields still referenced in frontend code. |

**How to check without tooling:**

- Read the Pydantic model (Backend) and the corresponding TypeScript interface (Frontend) side-by-side.
- **Rule of Thumb**: If it's in the database as `NOT NULL`, it should NOT be `Optional` in Pydantic or `?` in TypeScript unless it's truly generated by the server post-creation.
- Trace every place that type is created, transformed, and consumed.
- At each step, ask: "Does every field the consumer expects exist and have the right type in what the producer sends?"
- Pay special attention to `any`, untyped assertions, and absent validation at boundaries.

**In AI-augmented systems, also check:**

- Is the AI response parsed with hard-coded field name strings? If the API response shape
  changes, this breaks silently.
- Is streaming output accumulated before parsing, or parsed per-chunk? Chunk-level parsing
  of a structure that spans chunks will silently corrupt the result.
- Is prompt output validated before it reaches the database?

---

### Category 2 — Exception & Error Handling

**The rule: every error must do exactly one of three things — bubble up, be logged with
context, or be explicitly handled with a recovery path. An error that does none of these
three is a silent failure, and silent failures are always CRITICAL or HIGH.**

Look for:

- **Swallowed exceptions**: empty catch blocks, a catch that returns `null` or `undefined`,
  a `.catch(() => {})`, a Python `except: pass`. These are CRITICAL when they wrap payment,
  write, or auth operations.
- **Lost async errors**: a promise-returning function called without `await`. If it rejects,
  nobody knows — not the user, not the logs, nobody.
- **Context-free error messages**: `throw new Error("Something went wrong")` with no
  information about what operation failed, for which user, with what input. Undiagnosable
  in production.
- **Missing error propagation**: an error is caught and logged, but the caller receives a
  success response. The user is told everything is fine when it is not.
- **Inconsistency with the project's error pattern**: if the project uses typed `AppError`
  objects with a `code` field and you see a raw string throw, that is a schema mismatch in
  the error layer itself.

**When writing remediations**, use the error class and logging pattern learned in Phase 0-B.
Do not introduce a new pattern.

---

### Category 3 — Timeout & Back-Pressure

**Any call that crosses a process boundary needs an explicit timeout. Without one, a slow
dependency will hold a thread open indefinitely and eventually exhaust the thread pool,
cascading a single slow upstream into a full service outage.**

Identify every call that leaves the current process:

- HTTP requests to external APIs (payment providers, AI services, storage, email, SMS)
- Database queries — especially ones without `LIMIT` on potentially large datasets
- Queue publishes and consumer polls
- File I/O on remote filesystems or object stores

For each one, ask:

- Is a timeout explicitly set at the call site?
- Is it set only in the client constructor, making it invisible at the call site and creating
  a false sense of safety when the constructor config changes?

Also check:

- **Retry logic without backoff**: retrying immediately on failure creates a thundering herd
  under outage conditions. Every retry loop must use exponential backoff with jitter.
- **No circuit breaker on high-traffic dependencies**: if an AI API goes down, does every
  in-flight request queue up behind it, or is there a fast-fail or fallback?
- **Unbounded loops over data**: a function that processes every record in a table without
  chunking will time out or exhaust memory on production data volumes.

---

### Category 4 — Database Safety

**Three problems. Each causes a different class of outage, and all three can coexist.**

**N+1 Queries**
A loop that contains a DB call inside it is an N+1 unless the DB call is a bulk fetch.
Read the loop body. Ask: "Could this run 1,000 times on a single request?" If yes, it must
be replaced with a single query that fetches all required records at once. N+1 patterns are
always at least HIGH on endpoints called frequently.

**Missing Transactions**
Any operation requiring two or more DB writes to succeed or fail _together_ must be wrapped
in a transaction. Look for:

- Create order → deduct inventory (two writes, no transaction = partial success is possible)
- Create user → create profile (must be atomic or you get users with no profile)
- Delete parent → delete children (must be atomic or you get orphaned child records)

**Connection Creation Per-Request**
Creating a new database connection inside a request handler is almost always a bug.
The ORM or DB client should be instantiated once at startup and reused across requests.
Look for the ORM client constructor being called inside a function that runs per-request.

---

### Category 5 — Concurrency & Race Conditions

**Two requests arriving within milliseconds of each other should produce the same result
as two requests arriving an hour apart. If they don't, there is a race condition.**

Look for:

- **Check-then-act without atomicity**: `if (record does not exist) { create record }` is
  safe only if the check and the create are atomic. Without atomicity, two concurrent requests
  both pass the check and both create the record, duplicating data. The fix is an `upsert`
  with a unique constraint or a DB-level lock — not an application-level lock.
- **Missing idempotency on state-mutating endpoints**: payment, order, subscription, and
  withdrawal endpoints must be idempotent. If a client retries after a timeout, the operation
  must not execute twice. Look for idempotency key validation before processing begins.
- **Shared mutable state**: module-level variables or singleton caches mutated without
  synchronization in a multi-threaded or multi-process environment.
- **Optimistic concurrency without version checking**: if two users update the same record,
  the later write silently overwrites the earlier one unless version numbers or `updatedAt`
  timestamps are checked before writing.

---

### Category 6 — Rate Limiting & Back-Pressure

**A service without rate limiting can be taken down by a single misbehaving client —
including its own retry logic.**

Look for:

- Public-facing endpoints without rate limiting middleware. Note whether the absence is
  intentional (documented, internal-only on a private network) or an oversight.
- Background jobs with no concurrency cap. A job that spawns a worker per queue item will
  create thousands of workers under backlog conditions.
- Outbound calls to rate-limited upstream services (AI APIs, payment providers, SMS) without
  a rate-limiter or 429-handler on the caller side.
- Webhook receivers without signature verification. Unverified webhooks can be flooded by
  anyone with the endpoint URL to trigger DB writes or billing operations.

---

### Category 7 — Orphaned & Redundant Code

**Orphaned code does not stay harmless. It gets triggered by a cron job nobody remembers,
referenced by a new feature added without checking, or quietly drains resources.**

Look for:

- **Dead exports**: functions, classes, or constants exported from a file that nothing in
  the codebase imports. Verify by reading the file's exports and searching for their usage.
- **Commented-out code blocks**: code commented out without explanation is either a
  half-removed feature or a disabled safety check. Both are reliability risks.
- **TODO / FIXME / HACK comments on critical paths**: a `// TODO: add timeout here` in a
  payment flow is HIGH, not LOW. The comment proves the author knew the risk.
- **Duplicate logic**: the same transformation applied in two places. When one is updated,
  the other usually is not. Data inconsistency follows.
- **DB schema fields absent from API response DTOs**: these are schema drift artifacts.
  The field may contain sensitive data being silently omitted, or it may be required by
  a consumer that hasn't surfaced the bug yet.

---

## The Flow Trace Template

For every flow audited, before listing findings, you **MUST** record the "Ground Truth Trace". This is not a summary; it is a step-by-step account of the files and functions read to reach the conclusion. 

**IMPORTANT**: A trace is **incomplete** unless it reaches a boundary (persistence layer or external service) or hits a definitive dead end. Tracing only the "middle" of a flow is an audit failure.

### 🔍 Trace — Flow [ID]: [Short Description]

| Field | Detail |
|---|---|
| **ID** | `FLOW-NNN` |
| **Status** | `Trace Completed` / `In Progress` |
| **Primary File** | `router.py` |

| Step | File | Function/Logic | Action taken |
|---|---|---|---|
| 1 | `router.py` | `POST /resource` | Analyzed input validation and background task trigger. |
| 2 | `service.py` | `create_resource` | Traced dependency injection and business logic sequence. |
| 3 | `store.py` | `save_to_db` | Verified atomic write and error bubbling to service. |
| 4 | `storage.py` | `upload_to_s3` | Checked for blocking I/O and timeout configurations. |

**What we were doing:**
[Brief 2-3 sentence paragraph explaining the user flow being simulated and the specific reliability concerns being tested].

---

## The Finding Template

Every finding appended to the Audit Log must use this exact format.

```markdown
### 🚨 [CRITICAL | HIGH | MEDIUM | LOW] — <Short, specific title>

| Field | Detail |
|---|---|
| **Issue ID** | `ISSUE-NNN` (Sequential, e.g. ISSUE-001) |
| **Trace ID** | `FLOW-NNN` |
| **File** | `src/services/inventoryService.ts` lines 88–112 |
| **Category** | Schema Mismatch / Exception Handling / Timeout / N+1 Query / Race Condition / Rate Limiting / Orphaned Code |
| **Systemic?** | Yes — also in `fileA.ts`, `fileB.ts` / No — isolated |

**The Vulnerability**
Describe exactly what is wrong and why it is dangerous. Paste the specific code
(≤ 15 lines) that demonstrates the flaw. Do not paraphrase code — show it.

**Blast Radius**
State concretely: what fails, for how many users, how silently, and whether recovery
is automatic or requires a manual intervention or deploy.

**Remediation**
Write the fix using the codebase's own style — its error classes, logger, naming
conventions, and return conventions as recorded in the Project Patterns section.
Show a before/after code snippet. If the fix requires a DB migration or config
change, say so explicitly. If this is a systemic finding, show the fix once and
note that it must be applied to all listed files.
```

---

## Severity Rubric

Assign severity using this table. If a finding spans rows, use the higher severity.
Never assign severity from intuition alone. Consult this table every time.

| Severity | Condition | Concrete examples |
|---|---|---|
| **CRITICAL** | Data loss, silent corruption, complete service outage, or security boundary crossed. Fails on every occurrence, not just under load. | Multi-step write with no transaction; swallowed exception around a payment call; auth middleware missing on a write endpoint; AI response written to DB without type validation |
| **HIGH** | Significant user-facing failure under moderate load. Hard to recover without a deploy or manual DB fix. | Missing timeout on an external HTTP call; N+1 query in a frequently called handler; missing idempotency on a payment retry endpoint; check-then-act without a unique constraint |
| **MEDIUM** | Degrades gracefully but causes visible errors or measurable performance regression at scale. | Missing pagination on a list endpoint used in a loop; retry logic without backoff; structured logger replaced with plain log on an error path; schema field present in DB but absent from API DTO |
| **LOW** | Code smell, dead code, minor inconsistency, documentation gap. No immediate user impact. | Dead export nobody imports; TODO comment not on a critical path; commented-out code block without explanation; enum value mismatch that is never sent at runtime |

**Systemic upgrade rule**: if the same issue appears in three or more files, escalate one
severity level. A systemic MEDIUM becomes HIGH. A systemic LOW becomes MEDIUM. State the
upgrade reason explicitly in the finding.

---

## The Final Summary Block

When any budget limit is reached, prepend this block to the very top of `audit_progress.md`.
This makes it the first thing the user sees when they open the file.

```markdown
<!-- ══════════════════════════════════════════════════════════════════ -->

## ⛔ FINAL SUMMARY — Audit Complete

**Terminated by:** Max Flows / Max Files / Dead End _(keep one)_
**Files read:** X / [Total Files] (Z%) | **Flows completed:** Y / 5

### Overall Health: 🔴 Critical Risk / 🟠 High Risk / 🟡 Moderate / 🟢 Healthy

_(One paragraph. State: (a) the most dangerous single finding and what it will cause
when it fires in production; (b) the most pervasive pattern across flows and how many
files it appears in; (c) the layer — API / Service / DB / AI boundary — with the
highest finding density; (d) whether the issues are isolated or systemic.)_

### Finding Counts

| Severity | Count |
|---|---|
| 🚨 CRITICAL | N |
| 🔴 HIGH | N |
| 🟠 MEDIUM | N |
| 🟡 LOW | N |
| **Total** | **N** |

### Top 3 Fixes — In Priority Order

1. **[File, line range]** — what it is. Fix: what to do.
2. **[File, line range]** — what it is. Fix: what to do.
3. **[File, line range]** — what it is. Fix: what to do.

### Entry Points for the Next Audit Run

_(Files still in the Execution Queue not reached in this run.)_

- `path/to/file.ts` — why it is high-priority to scan next
- `path/to/file.ts` — why

<!-- ══════════════════════════════════════════════════════════════════ -->
```

After writing the summary, send the user one notification message in this format:

> **Audit paused — [limit name] reached.**
> `audit_progress.md` contains [N] findings across [Y] flows ([X] files read).
> Most urgent: [one sentence on the highest-severity finding and its blast radius].
> To continue: start a new run — the queue in `audit_progress.md` shows remaining files.

---

## Anti-Patterns That Invalidate an Audit

If you catch yourself doing any of these, stop and correct before continuing.

| Anti-Pattern | Why It Is Wrong | Correction |
|---|---|---|
| Reading files alphabetically instead of following the call chain | Produces file-level observations, not a flow-level reliability picture | Always follow imports and function calls to the next file |
| Writing fixes that use different error classes or logging than the project | The team will reject it and it introduces new inconsistency | Rewrite using the patterns recorded in Phase 0-B |
| Stopping a flow trace at the service layer | The most dangerous bugs live in the data layer | A flow is not complete until the storage boundary is reached |
| Flagging a missing feature as a vulnerability | Audits find failure modes in existing functionality, not missing functionality | Ask: "Does this cause existing features to fail?" If no, skip it |
| Assigning CRITICAL to an edge-case-only failure | Destroys trust in the severity system | Use the rubric table; when unsure between CRITICAL and HIGH, choose HIGH |
| Reading the same file twice | Wastes budget and double-counts toward Max Files | Check the Execution Queue before opening any file |
| Writing a finding without the code snippet | Makes findings unverifiable | Always include the ≤ 15 line excerpt |
| Treating `as any` or untyped assertions as LOW by default | Severity depends on what data it touches | If it touches payment, auth, or AI output, it is at least MEDIUM |
| Writing a remediation that ignores the project's doc pattern | Comments, JSDoc, and inline notes should match the project's style | Reread 0-B and mirror the existing documentation style in your fix |

---

## Per-File Mental Checklist

Run through this silently before marking any file as done.
You do not need to include this verbatim in `audit_progress.md`.

```
Schema Alignment
  [ ] Every field read from input exists in the upstream type definition
  [ ] No mismatch between Backend Pydantic models and Frontend TypeScript interfaces (naming/types)
  [ ] Core logical identifiers (IDs, required metadata) are NOT marked as 'Optional' or 'Nullable'
  [ ] Every field written to DB or sent to external service matches the destination schema
  [ ] AI response fields are validated before use or persistence

Exception Handling
  [ ] No catch block silently swallows a failure on a write or external call
  [ ] Every async call that can reject is either awaited or has a .catch handler
  [ ] Errors include enough context to diagnose in production (user, operation, input shape)

Timeouts
  [ ] Every outbound call has an explicit timeout
  [ ] Retry logic uses backoff, not immediate re-attempt

Database Safety
  [ ] DB client not constructed inside a per-request function
  [ ] No loop containing an individual DB query (N+1 check)
  [ ] Multi-step writes wrapped in a transaction

Concurrency
  [ ] No check-then-act pattern without an atomicity guarantee
  [ ] State-mutating endpoints validate an idempotency key before processing

Rate Limiting
  [ ] Endpoint has rate limiting, or its absence is intentional and documented
  [ ] Background job has a concurrency cap

Orphaned Code
  [ ] All exports are imported somewhere in the codebase
  [ ] No TODO/FIXME comments on reliability-critical paths
  [ ] No unexplained commented-out code blocks

Documentation Consistency
  [ ] New code added in remediations matches the project's comment and doc style
  [ ] Error messages match the project's error class and message format
  [ ] Log calls use the project's logger and include the project's standard fields
```
