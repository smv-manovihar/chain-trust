---
name: app-reliability-fix
description: >
  Use this skill after a reliability audit has been completed and the user wants
  to implement the fixes.
  Triggers: "implement the audit fixes", "fix the issues found", "apply the
  remediations", "start fixing", "implement the plan", "fix the reliability
  issues".
  This skill reads audit findings from audit_progress.md, builds a structured
  implementation plan, presents it for user review, incorporates feedback, then
  executes fixes one at a time with a checkpoint after every change.
  Use native artifacts (referenced here as fix_plan.md) to manage these phases for maximum visibility and persistence.
  Do NOT begin editing files until the plan has been reviewed and approved.
  Do NOT use this skill to run a new audit — that is the reliability-audit
  skill's job.
compatibility: >
  Tool-agnostic. Works in any AI code editor or agent runtime: Cursor, Windsurf,
  GitHub Copilot Workspace, Zed, JetBrains AI, Cline, Continue, Aider, Claude
  Code, or any environment with the ability to read and write files. If the
  environment provides specialized tools, these **MUST** be used instead of
  their raw terminal equivalents to take advantage of the agent's optimized
  capabilities.
depends_on: reliability-audit
---

# App Reliability Fix Skill

---

## The Core Philosophy

The gap between finding a bug and safely fixing it in production code is wider
than it looks. A fix that is technically correct can still break the codebase if
it introduces a naming convention the team doesn't use, wraps an error in a class
that doesn't exist yet, or changes behavior in a way that makes a passing test
silently wrong. A fix applied in the wrong order can create a new failure while
patching the old one.

This skill closes that gap. It does three things that naive "just apply the fix"
approaches skip:

- **Plan first, get approval.** Fixes are not free. Each one has a blast radius,
  a dependency on other fixes, and a risk of introducing regression. The user
  needs to see the full picture — including the detailed approach for every fix —
  before any file is touched.
- **Treat user feedback as a first-class input.** The user knows things the audit
  does not — a fix may be intentionally deferred, a pattern may be project policy
  rather than an oversight, or the proposed approach may clash with a library
  decision the team already made. The plan, including each fix's approach, must
  adapt to that knowledge before execution begins.
- **Execute one fix at a time with a visible checkpoint.** Not in a batch. Not
  all CRITICALs first. One at a time, in planned order, with the user able to
  pause or redirect after each change.

---

## What This Skill Reads

This skill's primary input is `audit_progress.md`, produced by the
reliability-audit skill. Before building the plan, re-read the **Project
Patterns** section of that file carefully. Every fix you write will be judged
against those patterns. A fix that uses a different error class, a different
logger, or a different naming convention than what the audit recorded will be
rejected — and rightly so.

If `audit_progress.md` does not exist, or exists but has no entries in the Audit
Log, stop immediately and tell the user:

> "No audit findings found. Run the reliability-audit skill first, then return
> here."

Do not attempt to audit and fix in the same run of this skill.

---

## The Four Phases

| Phase | Name | Output |
|---|---|---|
| 0 | Ingest & Understand | Internal notes; no files written |
| 1 | Build the Implementation Plan | `fix_plan.md` (Native Artifact) |
| 2 | Present for Review | User feedback incorporated into Plan |
| **—** | **HARD STOP** | **No file may be modified until Phase 2 clears** |
| 3 | Execute, Checkpoint, Repeat | `task.md` (Native Artifact) updated; source files edited |
| 4 | Finalize & Verify | `walkthrough.md` (Native Artifact) created |

There is exactly one hard stop: between Phase 2 and Phase 3.

---

## Phase 0 — Ingest & Understand

Read the following, in this order, before writing a single line of the plan.

### 0-A. Read the Audit Findings

Open `audit_progress.md`. Extract every finding from the Audit Log. For each
finding, note:

- Its severity (CRITICAL / HIGH / MEDIUM / LOW)
- Its category (Schema Mismatch, Timeout, N+1, etc.)
- Its file and line range
- Whether it was marked as systemic (affecting multiple files)
- Whether it has an `**Updated:**` block (higher-confidence findings — seen from
  multiple angles during the audit)

Also note the **Total Project Files** and the audit's coverage percentage (Z%) to
understand the scale and representative depth of the findings.

Also copy the **Project Patterns** section verbatim. It is the style contract
every fix — and every approach — must satisfy.

### 0-B. Read Every Affected File

Before planning a fix, open and re-read each file named in the findings. Do not
rely on the code snippets in the audit log — those snippets were written at a
point in time. For each file, note:

- What imports it depends on (you may need to add one in your fix)
- What the function signature looks like (the fix must not change the public
  interface unless the plan explicitly accounts for that)
- What tests exist for this function (the fix must not silently break a passing
  test)

### 0-C. Identify Fix Dependencies

Some fixes must happen before others. Map the dependencies explicitly — they
drive the Execution Order in Phase 1.

Common dependency patterns:

- **Shared infrastructure first:** connection pooling, error class definition,
  logger setup must exist before any individual fix can use them.
- **Schema alignment before logic fixes:** if a type definition is wrong, fix the
  type before fixing the code that reads it.
- **Transactions before idempotency:** a transaction wrapper must be in place
  before adding idempotency key validation, or the check and the write won't be
  atomic.
- **Systemic fixes as a group:** findings marked systemic should be fixed
  together in a single step so no partial state exists where some files have the
  fix and others don't.

### 0-D. Draft a Concrete Approach for Every Fix

Before writing `fix_plan.md`, think through the specific implementation for each
finding. For each fix, decide:

- Exactly which lines will change and how
- Which project-pattern constructs will be used (the exact error class, the exact
  logger call, the exact transaction API)
- Whether any new import is required
- What the before/after diff looks like conceptually
- What could go wrong and how the approach mitigates it

These decisions become the **Approach Details** section of `fix_plan.md` and are
the primary thing the user will review and amend before execution begins.

---

## Phase 1 — Build the Implementation Plan

Create a file named `fix_plan.md` in the project root (acting as the native Implementation Plan).

This file is the single source of truth for the implementation. It will be
updated as the user provides feedback (Phase 2) and as fixes are completed
(Phase 3). Sections are updated in place; the Execution Log is append-only.

### fix_plan.md Structure

````markdown
# Fix Implementation Plan

> - **Status:** Draft — Awaiting User Review
> - **Source audit:** `audit_progress.md`
> - **Last updated:** [note what changed and why, on every update]

---

## Project Patterns (from audit)

_(Copied verbatim from audit_progress.md — every fix must match these)_

- **Error handling pattern:**
- **Logging pattern:**
- **Naming conventions:**
- **Return conventions:**
- **Documentation style:**

---

## Fix Inventory

_(All findings from the audit, normalised into fixable units. Each finding
becomes one Fix Item. Systemic findings that span multiple files become one
Fix Item with multiple targets.)_

| ID | Audit Issue ID(s) | Severity | Title | File(s) | Category | Depends On | Status |
|---|---|---|---|---|---|---|---|
| FIX-001 | ISSUE-012, ISSUE-013 | 🚨 CRITICAL | Missing transaction on order creation | `orderService.ts:88` | Database | FIX-004 | Pending |
| FIX-002 | ISSUE-015 | 🚨 CRITICAL | Swallowed exception in payment handler | `paymentController.ts:34` | Exception Handling | — | Pending |
| FIX-003 | ISSUE-031 | 🔴 HIGH | N+1 query in user list endpoint | `userRepository.ts:112` | Database | — | Pending |
| FIX-004 | ISSUE-004 | 🔴 HIGH | DB client instantiated per-request | `db.ts:8` | Database | — | Pending |
| FIX-005 | ISSUE-007 | 🟠 MEDIUM | Missing timeout on OpenAI call | `aiService.ts:56` | Timeout | — | Pending |

---

## Approach Details

_(This is the section to review carefully before approving the plan.
Each Fix Item has its own subsection describing exactly what will be changed,
which project-pattern constructs will be used, and what risks the approach
accounts for. Comment on any subsection — wrong library, wrong error class,
different architectural preference — and the plan will be updated before a
single file is touched.)_

### FIX-001 — Missing transaction on order creation

- **Audit Issue ID(s):** ISSUE-012, ISSUE-013
- **File:** `orderService.ts` lines 85–102
- **Approach:**
Wrap the `insertOrder()` + `decrementInventory()` calls in a single
`db.transaction(async (trx) => { ... })` block using the project's shared `db`
singleton (fixed by FIX-004). Both calls will receive `trx` as their connection
argument. If either throws, the transaction rolls back automatically.
- **Error handling:** On transaction failure, catch the error and throw
`new ServiceError('ORDER_CREATION_FAILED', 'Order could not be saved')`; log
with `logger.error({ userId, orderId, cause: error.message })`.
- **What will not change:** The function's public signature
`createOrder(userId, items): Promise<Order>` remains identical.
- **Risk accounted for:** Without FIX-004, `db` would be a per-request instance
and the transaction would only cover one of the two writes. FIX-004 must land
first — see Execution Order.

---

### FIX-002 — Swallowed exception in payment handler

- **Audit Issue ID(s):** ISSUE-015
- **File:** `paymentController.ts` lines 34–51
- **Approach:**
Wrap the `stripe.charges.create()` call in a `try/catch`. The existing bare
`catch (e) {}` block will be replaced with:

```ts
catch (error) {
  logger.error({ userId, orderId, stripeError: error.message }, 'Payment failed');
  throw new ServiceError('PAYMENT_FAILED', 'Payment could not be processed');
}
```
````

**What will not change:** No new imports needed — `ServiceError` and `logger`
are already imported in this file. Function signature unchanged.
**Risk accounted for:** The current silent swallow means callers assume success
even on Stripe failure. After this fix, callers receive a thrown `ServiceError`
and must handle it — verify no caller is relying on the silent-success behaviour
before approving this approach.

---

### FIX-003 — N+1 query in user list endpoint

- **Audit Issue ID(s):** ISSUE-031
- **File:** `userRepository.ts` lines 110–125
- **Approach:**
Replace the `for` loop that calls `getUserById()` per user with a single
`getUsersByIds(ids: string[])` call using `WHERE id = ANY($1)`. The new batch
method will be added to `userRepository.ts` directly above the existing
`getUserById()` function, following the same JSDoc + return-type conventions.
- **What will not change:** `getUserById()` is left in place (other callers depend
on it). Only the list-building loop in `listUsers()` changes.
- **Risk accounted for:** If the `ids` array is empty, `ANY($1)` returns zero rows
safely — no special-case guard needed.

---

### FIX-004 — DB client instantiated per-request

- **Audit Issue ID(s):** ISSUE-004
- **File:** `db.ts` lines 6–14
- **Approach:**
Move `new Pool(config)` out of the request handler and into module-level scope
so that a single `Pool` instance is exported. The exported name stays `db` to
avoid touching every import site.
- **What will not change:** No other file needs to change for this fix.
**Risk accounted for:** Node's module cache guarantees the module-level `Pool`
is initialised once per process. Verify that `db.ts` is not dynamically
`require()`'d in tests with `jest.resetModules()` — if it is, note this in the
checkpoint so the test suite can be reviewed.

---

### FIX-005 — Missing timeout on OpenAI call

- **Audit Issue ID(s):** ISSUE-007
- **File:** `aiService.ts` line 56
- **Approach:**
Add `timeout: 30_000` to the options object passed to `openai.chat.completions
.create()`. If the project's OpenAI client version supports `signal`, use
`AbortSignal.timeout(30_000)` instead for cleaner cancellation semantics.
- **What will not change:** Function signature and return type unchanged.
- **Risk accounted for:** A 30-second default is a starting point — if the project
has a documented SLA shorter than that, flag the value to the user at the
checkpoint and let them adjust.

---

## Execution Order

_(Sorted by: dependencies first, then severity, then blast radius. Non-obvious
ordering decisions are explained.)_

1. **FIX-004** — DB singleton must exist before any transaction wrapper can work
2. **FIX-002** — CRITICAL with no dependencies; safe to fix immediately after infrastructure
3. **FIX-001** — CRITICAL but depends on FIX-004; now safe
4. **FIX-003** — HIGH, isolated, no cross-dependencies
5. **FIX-005** — MEDIUM; scheduled last to avoid interrupting critical fixes

---

## Deferred / Excluded Items

_(Empty until user review. Items the user asks to skip or defer are moved here
with a reason.)_

---

## Execution Log

_(Append-only. One entry per completed fix. Never edit a completed entry.)_

<!-- entries appear here as fixes are applied -->

---

## Verification Plan

### Automated Tests
- Run `npm test` or `pytest` as applicable for each changed file.
- Verify happy path and failure path for each fix.

### Manual Verification
- Manually trigger the affected flow in the browser or via API calls.
- Verify that previous "silent" errors are now logged and handled.

````

---

## Phase 2 — Present for Review

This is the hard stop. Do not touch any source file until you have explicit
approval.

Present `fix_plan.md` to the user. Your message must cover:

1. **Headline summary** — plain-English count of findings at each severity level.
   Do not make the user parse the table to get this.

2. **Execution order rationale** — one sentence justifying the first two or three
   ordering decisions.

3. **Approach Details call-out** — explicitly direct the user to the Approach
   Details section and tell them this is the most important part to review:

   > "The **Approach Details** section describes exactly what each fix will do —
   > which API, which error class, which log fields, which lines change. Please
   > read each subsection and tell me if anything looks wrong before I write a
   > single line of code. Wrong library? Different architectural preference?
   > Error class name that doesn't exist in this project? This is the right
   > moment to catch that."

4. **Three gating questions:**
   - Are there any fixes to skip entirely (intentional pattern, code being
     replaced, already fixed in another branch)?
   - Are there any fixes to defer (not skip forever, just do later)?
   - Are there any approaches in the Approach Details you want changed before
     execution starts?

5. **Clear approval prompt** — tell the user exactly what to say to start
   execution, e.g.: *"Reply 'approved' to begin, or share your feedback and I'll
   update the plan before we start."*

### Handling User Feedback

When the user responds with feedback, do not start executing. Update the plan
first. Apply exactly one of these operations to `fix_plan.md` per piece of
feedback:

| User says | Operation on fix_plan.md |
|---|---|
| "Skip FIX-003, that's intentional" | Move FIX-003 to Deferred/Excluded with reason |
| "Defer FIX-005 until after the release" | Move FIX-005 to Deferred/Excluded with reason |
| "Do FIX-002 last, not first" | Update Execution Order; note the reason |
| "For FIX-001, use `pg.transaction()` not Prisma's `$transaction`" | Update FIX-001's Approach Details subsection; mark *(user-revised)* |
| "The timeout should be 10 s, not 30 s" | Update FIX-005's Approach Details subsection; mark *(user-revised)* |
| "The error class is `ServiceError`, not `AppError`" | Update Project Patterns section; mark *(user-corrected)*; update every Approach Details subsection that referenced the old name |
| "There's a FIX-006 you missed — add rate limiting to /api/export" | Add FIX-006 to Fix Inventory **and** a new Approach Details subsection; place it in Execution Order |

After applying all feedback, update the plan's status line to
`Revised — Awaiting Final Approval` and list what changed in the Last updated
field.

Present the updated plan and ask for final approval. Repeat — update, present,
await — until the user explicitly approves.

**Never interpret silence as approval.** If the user goes quiet after you present
the plan, wait.

---

## Phase 3 — Execute, Checkpoint, Repeat

Execution begins only after explicit user approval. Follow this loop for every
fix in the Execution Order, one at a time.

### Step 3-A. Announce the Fix

Before editing any file, post a short message that echoes the approved approach
from Approach Details:

```

Applying FIX-002 — Swallowed exception in payment handler (Issues: ISSUE-015)
File: src/controllers/paymentController.ts lines 34–51
Approach (as approved): Wrapping stripe.charges.create() in try/catch; on
failure throw new ServiceError('PAYMENT_FAILED', ...) and log
{ userId, orderId, stripeError } via logger.error.
(No other files touched in this step.)

````

This gives the user a final chance to object before the file changes.

### Step 3-B. Apply the Fix

Edit only the files listed for this Fix Item. Do not "while I'm here" fix
adjacent issues. The fix must:

- Match the approach in the approved Approach Details subsection exactly
- Match the error handling, logging, naming, and documentation patterns from
  Project Patterns
- Not change the public interface of the function unless the Fix Item explicitly
  says so
- Not add new package dependencies without announcing them in Step 3-A

### Step 3-C. Update task.md and Implementation Plan

Immediately after applying the fix, update the `task.md` (native Task artifact) checklist and append an entry to the Execution Log in `fix_plan.md`.

For completed fixes:
1. Append a log entry to `fix_plan.md`:

```markdown
### ✅ FIX-002 — Swallowed exception in payment handler (Issues: ISSUE-015)
**Completed**
- **Files changed:** `src/controllers/paymentController.ts`
- **What was done:** Wrapped `stripe.charges.create()` in try/catch. On failure,
  logs `{ userId, orderId, stripeError: error.message }` via `logger.error` and
  throws `new ServiceError('PAYMENT_FAILED', 'Payment could not be processed')`.
- **What was not changed:** Function signature unchanged. No new dependencies.
- **Tests affected:** `paymentController.test.ts` — existing happy-path test still
  passes. No test existed for the failure path; noted as a follow-up gap.
- **Approach deviation:** None — implemented exactly as described in Approach Details.
```

2. Update `task.md` to mark the fix as completed.
3. Locate the issue in `audit_progress.md` and prepend `✅ FIXED — ` to its title.

For deferred items (items moved to "Deferred / Excluded" in `fix_plan.md`):
1. Locate the issue in `audit_progress.md`.
2. Prepend `⏭️ DEFERRED — ` to its title.
3. Replace the **Remediation** section with a **Deferred Reason** section using the user's reasoning from `fix_plan.md`.
4. If an "Audit Legend" does not exist at the top of `audit_progress.md`, add one:

```markdown
## Audit Legend

- `✅ FIXED` — Issue resolved in the codebase.
- `🔴 CRITICAL` / `🔴 HIGH` / `🟠 MEDIUM` / `🟡 LOW` — Active audit findings.
- `⏭️ DEFERRED` — Acknowledged by user but out of scope (e.g. intentional pattern, planned refactor, or low priority).
```

### Step 3-D. The Checkpoint

After every single fix — not after every batch, after every single fix — post:

```
Checkpoint after FIX-002
✅ Done: FIX-002 — Swallowed exception in payment handler (Issues: ISSUE-015)
⏳ Next: FIX-001 — Missing transaction on order creation (orderService.ts:88)
        Planned approach: wrap insertOrder() + decrementInventory() in
        db.transaction(trx => ...); throw ServiceError on failure.

fix_plan.md and task.md have been updated. Review the change before I continue.
Reply 'continue' to apply FIX-001, 'pause' to stop here, or share feedback
to adjust the approach before the next fix.
```

Then stop. Do not proceed until the user responds.

### Step 3-E. Handle Checkpoint Responses

| User says | What to do |
|---|---|
| "continue" / "go ahead" / "yes" | Apply the next fix; return to Step 3-A |
| "pause" / "stop" / "hold on" | Write the Pause Summary (Step 3-F); stop |
| "skip this one" | Move the next Fix Item to Deferred/Excluded; announce the new next item; wait |
| "change the approach to X" | Update the Approach Details subsection for the next Fix Item; re-announce (Step 3-A) with the revised approach; wait |
| "actually add this other fix first" | Add to Fix Inventory + Approach Details; insert before current next item in Execution Order; announce; wait |

### Step 3-F. Finalize (walkthrough.md)

Once all fixes are complete, create a `walkthrough.md` (native Walkthrough artifact) summarizing the changes, the tests performed, and the final state of the codebase. Include code snippets of the most significant fixes.

### Step 3-G. Pause Summary

If the user pauses, write a summary at the top of `fix_plan.md`:

```markdown
<!-- ═══════════════════════════════════════════════════════════════════ -->

## 📋 Implementation Summary — [Paused | Complete]

**Paused by:** User request / All fixes applied _(keep one)_
**Fixes completed:** N of M total planned

### Applied Fixes

| ID | Title | File(s) | Audit Issue ID(s) | Approach deviation? |
|---|---|---|---|---|
| FIX-002 | Swallowed exception in payment handler | `paymentController.ts` | ISSUE-015 | None |
| FIX-004 | DB client singleton | `db.ts` | ISSUE-004 | None |

### Remaining Fixes

| ID | Severity | Title | Audit Issue ID(s) | Reason not yet applied |
|---|---|---|---|---|
| FIX-001 | 🚨 CRITICAL | Missing transaction on order creation | ISSUE-012, ISSUE-013 | Paused by user |
| FIX-003 | 🔴 HIGH | N+1 in user list | ISSUE-031 | Paused by user |

### Deferred / Excluded

| ID | Title | Audit Issue ID(s) | Reason |
|---|---|---|---|
| FIX-005 | Missing timeout on OpenAI call | ISSUE-007 | User: defer until post-release |

### Follow-up Gaps Noted During Implementation

_(Issues noticed while applying fixes that are not in the original audit and
have not been fixed — for the next audit run or manual review.)_

- `paymentController.ts` — no test for the payment failure path
- `orderService.ts` — `updatedAt` set in application code rather than DB
  trigger; risk of drift if a write bypasses the service layer

### To Resume

Open a new session, reference `fix_plan.md`, and say:
"Resume implementation from FIX-001 — the plan is already approved."

<!-- ═══════════════════════════════════════════════════════════════════ -->
```

---

## What a Fix Must Never Do

| Rule | Reasoning |
|---|---|---|
| Never fix more than one Fix Item in a single edit | Mixing two fixes makes the checkpoint meaningless |
| Never deviate from the approved Approach Details without announcing it | Silent deviations break the review contract |
| Never change a public function's signature without it being in the Fix Item | Signature changes break callers |
| Never add a new package dependency without announcing it before the edit | New dependencies affect the whole project |
| Never rewrite surrounding code not part of the fix | "While I'm here" rewrites introduce unplanned changes |
| Never mark a Fix Item Done if the fix is partial | Mark it ⚠️ Partially Applied and note what remains |
| Never skip the checkpoint | "Trivial" fixes have caused production incidents |
| Never edit `audit_progress.md` beyond status synchronization | The fixer may prepend `✅ FIXED — ` or `⏭️ DEFERRED — ` to titles and update the body ONLY for Deferred items to include the user's reasoning. |

---

## Keeping fix_plan.md Consistent

| Section | Mutation rule |
|---|---|
| Status line | Overwrite on every phase transition |
| Last updated field | Overwrite; always describe what changed and why |
| Project Patterns | Overwrite if user corrects a pattern; mark _(user-corrected)_ |
| Fix Inventory table | Status column overwrites; all other columns fixed once written |
| **Approach Details** | **Overwrite per subsection if user revises an approach; mark _(user-revised)_ and note what changed** |
| Execution Order | Overwrite when reordering; note the reason |
| Deferred / Excluded | Append-only |
| Execution Log | Append-only; never edit a completed entry |
| Pause/Completion Summary | Written once at the top; overwrite only when resuming |

---

## Anti-Patterns That Break Safe Implementation

| Anti-Pattern | Why It Is Dangerous | Correction |
|---|---|---|
| Starting execution before plan approval | Fixes applied to an unseen plan conflict with user decisions | Hard stop at Phase 2 |
| Skipping Approach Details review | User may object to the specific API, error class, or structure used | Explicitly direct user to the Approach Details section in Phase 2 |
| Applying multiple fixes in one edit | A regression cannot be isolated to a single cause | One Fix Item = one edit = one checkpoint |
| Treating user silence as approval | The user may be reviewing carefully or be interrupted | Explicitly wait; re-prompt if needed |
| Deviating from approved approach without announcement | Breaks the review contract; user approved one thing, got another | Announce any deviation at the checkpoint; document it in the Execution Log |
| Writing fixes that don't match the project's error class or logger | The team rejects the fix; the vulnerability stays open | Re-read Project Patterns before every fix |
| Marking a fix Done before verifying it is syntactically valid | A fix with a syntax error is worse than no fix | Read the changed file back after editing |
| Adding "bonus fixes" not in the plan | Unreviewed changes bypass the safety model | Add to Fix Inventory + Approach Details; get it reviewed at a checkpoint |
| Illegally editing `audit_progress.md` | Altering audit data destroys the project record | Only edit `audit_progress.md` to synchronize status (Fixed/Deferred) and reasons; never rewrite trace payloads or other metadata. |
| Vague Execution Log entries ("fixed the issue") | Makes the log useless for understanding what changed | Always specify files, lines, what was added, what was not changed, tests affected, approach deviation |