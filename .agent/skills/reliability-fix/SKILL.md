---
name: reliability-fix-implementation
description: >
  Use this skill after a reliability audit has been completed and the user wants to implement
  the fixes. Triggers: "implement the audit fixes", "fix the issues found", "apply the
  remediations", "start fixing", "implement the plan", "fix the reliability issues". This skill
  reads audit findings from audit_progress.md, builds a structured implementation plan, presents
  it for user review, incorporates feedback, then executes fixes one at a time with a checkpoint
  after every change. Do NOT begin editing files until the plan has been reviewed and approved.
  Do NOT use this skill to run a new audit — that is the reliability-audit skill's job.
compatibility: >
  Tool-agnostic. Works in any AI code editor or agent runtime: Cursor, Windsurf, GitHub Copilot
  Workspace, Zed, JetBrains AI, Cline, Continue, Aider, Claude Code, or any environment with
  the ability to read and write files. No terminal, shell, or OS-specific tooling required.
depends_on: reliability-audit
---


# Reliability Fix Implementation Skill

---

## The Core Philosophy

The gap between finding a bug and safely fixing it in production code is wider than it looks.

A fix that is technically correct can still break the codebase if it introduces a naming
convention the team doesn't use, wraps an error in a class that doesn't exist yet, or
changes behavior in a way that makes a passing test silently wrong. A fix applied in the
wrong order can create a new failure while patching the old one — fixing the service layer
before the transaction wrapper is in place, for example.

This skill exists to close that gap. It does three things that naive "just apply the fix"
approaches skip:

1. **It builds a plan first and gets the user to approve it.** Fixes are not free. Each one
   has a blast radius, a dependency on other fixes, and a risk of introducing regression.
   The user needs to see the full picture before any file is touched.

2. **It treats user feedback as a first-class input that reshapes the plan.** The user knows
   things the audit does not — a fix may be intentionally deferred, a pattern may be project
   policy rather than an oversight, a dependency may be scheduled for replacement. The plan
   must adapt to that knowledge before execution begins.

3. **It executes one fix at a time with a visible checkpoint after each change.** Not in a
   batch. Not all CRITICAL fixes first and then HIGH. One at a time, in planned order, with
   the user able to pause or redirect at any checkpoint.

---

## What This Skill Reads

This skill's primary input is `audit_progress.md`, produced by the `reliability-audit` skill.

Before building the plan, re-read the **Project Patterns** section of that file carefully.
Every fix you write will be judged against those patterns. A fix that uses a different error
class, a different logger, or a different naming convention than what the audit recorded will
be rejected — and rightly so.

If `audit_progress.md` does not exist, or exists but has no entries in the Audit Log, stop
immediately and tell the user: *"No audit findings found. Run the reliability-audit skill
first, then return here."* Do not attempt to audit and fix in the same run of this skill.

---

## The Four Phases

```
Phase 0 — Ingest & Understand
Phase 1 — Build the Implementation Plan
Phase 2 — Present for Review  ← HARD STOP. No code changes before this clears.
Phase 3 — Execute, Checkpoint, Repeat
```

There is exactly one hard stop in this skill: between Phase 2 and Phase 3.
No file may be modified until the user has reviewed the plan and given approval.

---

## Phase 0 — Ingest & Understand

Read the following, in this order, before writing a single line of the plan.

### 0-A. Read the Audit Findings

Open `audit_progress.md`. Extract every finding from the Audit Log. For each finding, note:
- Its severity (CRITICAL / HIGH / MEDIUM / LOW)
- Its category (Schema Mismatch, Timeout, N+1, etc.)
- Its file and line range
- Whether it was marked as systemic (affecting multiple files)
- Whether it has an `**Updated:**` block (these are higher-confidence findings — they were
  seen from multiple angles during the audit)

Also note the **Project Patterns** section. Copy these into `fix_plan.md` verbatim.
They are the style contract every fix must satisfy.

### 0-B. Read Every Affected File

Before planning a fix, open and re-read each file named in the findings.

Do not rely on the code snippets in the audit log. Those snippets were written at a point in
time. The file may have changed, the surrounding context may affect the fix approach, or the
snippet may have been abbreviated in a way that hides a dependency.

For each file, note:
- What imports it depends on (you may need to add a new import in your fix)
- What the function signature looks like (your fix must not change the public interface
  unless the plan explicitly accounts for that)
- What tests exist for this function, if any (your fix must not silently break a passing test)

### 0-C. Identify Fix Dependencies

Some fixes must happen before others. A fix that adds a transaction wrapper depends on
the DB client being a shared singleton — if it is currently instantiated per-request,
that must be fixed first or the transaction wrapper will wrap the wrong connection.

Map the dependencies explicitly. You will use them to sequence the plan in Phase 1.

Common dependency patterns:
- **Shared infrastructure first**: connection pooling, error class definition, logger
  setup must exist before any individual fix can use them
- **Schema alignment before logic fixes**: if a type definition is wrong, fix the type
  before fixing the code that reads it — otherwise you'll fix the symptom, not the cause
- **Transactions before idempotency**: a transaction wrapper must be in place before adding
  idempotency key validation, or the idempotency check and the write won't be atomic
- **Systemic fixes as a group**: findings marked systemic should be fixed together in a
  single step (same pattern applied to all affected files) to avoid partial states where
  some files have the fix and others don't

---

## Phase 1 — Build the Implementation Plan

Create a file named `fix_plan.md` in the project root.

This file is the single source of truth for the implementation. It will be updated
as the user provides feedback (Phase 2) and as fixes are completed (Phase 3). It follows
the same mutation rules as `audit_progress.md` — sections are updated in place, the
execution log is append-only.

### `fix_plan.md` Structure

````markdown
# Fix Implementation Plan

> **Status:** Draft — Awaiting User Review
> **Source audit:** `audit_progress.md`
> **Last updated:** [note what changed and why, on every update]

---

## Project Patterns (from audit)
*(Copied verbatim from audit_progress.md — every fix must match these)*

- **Error handling pattern:**
- **Logging pattern:**
- **Naming conventions:**
- **Return conventions:**
- **Documentation style:**

---

## Fix Inventory

*(All findings from the audit, normalized into fixable units. Each finding becomes one Fix
Item. Systemic findings that span multiple files become one Fix Item with multiple targets.)*

| ID | Severity | Title | File(s) | Category | Depends On | Status |
|---|---|---|---|---|---|---|
| FIX-001 | 🚨 CRITICAL | Missing transaction on order creation | `orderService.ts:88` | Database | FIX-004 | Pending |
| FIX-002 | 🚨 CRITICAL | Swallowed exception in payment handler | `paymentController.ts:34` | Exception Handling | — | Pending |
| FIX-003 | 🔴 HIGH | N+1 query in user list endpoint | `userRepository.ts:112` | Database | — | Pending |
| FIX-004 | 🔴 HIGH | DB client instantiated per-request | `db.ts:8` | Database | — | Pending |
| FIX-005 | 🟠 MEDIUM | Missing timeout on OpenAI call | `aiService.ts:56` | Timeout | — | Pending |

---

## Execution Order

*(Sorted by: dependencies first, then severity, then blast radius. Explain the reasoning
for any non-obvious ordering decision.)*

1. **FIX-004** — DB client must be a singleton before any transaction wrapper can work
2. **FIX-002** — CRITICAL with no dependencies; safe to fix immediately
3. **FIX-001** — CRITICAL but depends on FIX-004 being done first
4. **FIX-003** — HIGH, isolated, no cross-dependencies
5. **FIX-005** — MEDIUM, can be done at any time but scheduled here to not interrupt critical fixes

---

## Deferred / Excluded Items

*(Empty until user review. Items the user asks to skip or defer are moved here with a reason.)*

---

## Execution Log

*(Append-only. One entry per completed fix. Never edit a completed entry.)*

<!-- entries appear here as fixes are applied -->
````

---

## Phase 2 — Present for Review

> **This is the hard stop. Do not touch any source file until you have explicit approval.**

Present `fix_plan.md` to the user and ask for review. Your message must cover:

1. **A plain-English summary** of what you found and how many fixes are planned at each
   severity level. Do not make the user parse the table to get the headline.

2. **The proposed execution order** with a one-sentence justification for the first two or
   three ordering decisions. The user needs to understand why FIX-004 comes before FIX-001.

3. **Three specific questions** that need answers before execution can begin safely:
   - Are there any fixes the user wants to **skip entirely** — because the pattern is
     intentional, the code is being replaced, or it's already fixed in another branch?
   - Are there any fixes the user wants to **defer** — not skip forever, just do later?
   - Are there any fixes where the user wants to **change the approach** — a different
     error class, a different library, a different architectural decision than what the
     audit remediation suggested?

4. **A clear prompt for approval**: tell the user exactly what to say to start execution.
   For example: *"Reply 'approved' to begin, or share your feedback and I'll update the
   plan before we start."*

### Handling User Feedback

When the user responds with feedback, do not start executing. Update the plan first.

**For each piece of feedback, apply exactly one of these operations to `fix_plan.md`:**

| User says | Operation on fix_plan.md |
|---|---|
| "Skip FIX-003, that's intentional" | Move FIX-003 to Deferred/Excluded with reason "User confirmed intentional by design" |
| "Defer FIX-005 until after the release" | Move FIX-005 to Deferred/Excluded with reason "User: defer until post-release" |
| "Do FIX-002 last, not first" | Update Execution Order; note the change and the user's reason |
| "For FIX-001, use `pg.transaction()` not Prisma's `$transaction`" | Update FIX-001's approach note in the Fix Inventory table |
| "The error class is `ServiceError`, not `AppError`" | Update Project Patterns section; note the correction |
| "There's actually a FIX-006 you missed — add rate limiting to /api/export" | Add FIX-006 to the Fix Inventory and place it in the Execution Order |

After applying all feedback, update the plan's status line from `Draft — Awaiting User Review`
to `Revised — Awaiting Final Approval` and list what changed in the `Last updated` field.

Present the updated plan to the user and ask for final approval. Repeat this loop — update,
present, await approval — until the user explicitly approves.

**Never interpret silence as approval.** If the user goes quiet after you present the plan,
wait. Do not begin execution.

---

## Phase 3 — Execute, Checkpoint, Repeat

Execution begins only after explicit user approval. Then follow this loop for every fix
in the Execution Order, one at a time.

---

### Step 3-A. Announce the Fix

Before editing any file, post a short message:

> **Applying FIX-002** — Swallowed exception in payment handler
> File: `src/controllers/paymentController.ts` lines 34–51
> Approach: Wrap the Stripe call in a try/catch; on failure throw a `ServiceError` with
> code `PAYMENT_FAILED` and log the original error with `logger.error({ userId, orderId })`.
> *(No other files touched in this step.)*

This gives the user a final chance to object before the file changes.

---

### Step 3-B. Apply the Fix

Edit only the files listed for this Fix Item. Do not "while I'm here" fix adjacent issues
you notice — those either already have a Fix Item in the plan, or they should be added as
a new item to the Fix Inventory and reviewed before touching them.

**The fix must:**
- Match the error handling pattern from Project Patterns
- Match the logging pattern from Project Patterns (use the project's logger, include the
  project's standard fields — `userId`, `requestId`, etc.)
- Match the naming conventions from Project Patterns
- Match the documentation style — if the project uses JSDoc on public functions, add JSDoc;
  if it uses inline comments, add inline comments; if it uses neither, add neither
- Not change the public interface of the function unless the Fix Item explicitly says so
- Not add new dependencies (npm packages, pip packages, etc.) without noting it in the
  announcement and getting implicit approval through the checkpoint

---

### Step 3-C. Write the Execution Log Entry

Immediately after applying the fix, append an entry to the Execution Log in `fix_plan.md`.

```markdown
### ✅ FIX-002 — Swallowed exception in payment handler
**Completed**
**Files changed:** `src/controllers/paymentController.ts`
**What was done:** Wrapped the `stripe.charges.create()` call in try/catch. On failure,
logs `{ userId, orderId, stripeError: error.message }` via the project's `logger.error`
and throws `new ServiceError('PAYMENT_FAILED', 'Payment could not be processed')`.
**What was not changed:** Function signature unchanged. No new dependencies introduced.
**Tests affected:** `paymentController.test.ts` — existing test for the happy path still
passes. No test existed for the failure path; noted as a follow-up gap.
```

Update FIX-002's status in the Fix Inventory table from `Pending` to `✅ Done`.

---

### Step 3-D. The Checkpoint

After every single fix — not after every batch, not after all CRITICALs are done, after
**every single fix** — post a checkpoint message to the user:

> **Checkpoint after FIX-002**
>
> ✅ Done: FIX-002 — Swallowed exception in payment handler
> ⏳ Next: FIX-001 — Missing transaction on order creation (`orderService.ts:88`)
>
> `fix_plan.md` has been updated. Review the change before I continue.
> Reply **'continue'** to apply FIX-001, **'pause'** to stop here, or share feedback to
> adjust the plan before the next fix.

**Then stop. Do not proceed to the next fix until the user responds.**

This is not optional. The checkpoint is what makes execution safe. Without it, a fix
that introduced a subtle regression would be buried under five more changes before the
user noticed anything was wrong.

---

### Step 3-E. Handle Checkpoint Responses

| User says | What to do |
|---|---|
| "continue" / "go ahead" / "yes" | Apply the next fix in the Execution Order; return to Step 3-A |
| "pause" / "stop" / "hold on" | Write the Pause Summary (see below) and stop |
| "skip this one" | Move the next Fix Item to Deferred/Excluded; announce the new next item; wait for 'continue' |
| "change the approach to X" | Update the Fix Item's approach in the Fix Inventory; re-announce (Step 3-A) with the updated approach; wait for 'continue' |
| "actually add this other fix first" | Add the new fix to the Fix Inventory; insert it before the current next item in Execution Order; announce it; wait for 'continue' |

---

### Step 3-F. Pause Summary (when execution is paused mid-run)

If the user pauses or all fixes are complete, write a Pause/Completion Summary at the
top of `fix_plan.md`:

```markdown
<!-- ═════════════════════════════════════════════════════════════════ -->
## 📋 Implementation Summary — [Paused | Complete]

**Paused by:** User request / All fixes applied  *(keep one)*
**Fixes completed:** N of M total planned

### Applied Fixes
| ID | Title | File(s) |
|---|---|---|
| FIX-002 | Swallowed exception in payment handler | `paymentController.ts` |
| FIX-004 | DB client singleton | `db.ts` |

### Remaining Fixes
| ID | Severity | Title | Reason not yet applied |
|---|---|---|---|
| FIX-001 | 🚨 CRITICAL | Missing transaction on order creation | Paused by user |
| FIX-003 | 🔴 HIGH | N+1 in user list | Paused by user |

### Deferred / Excluded
| ID | Title | Reason |
|---|---|---|
| FIX-005 | Missing timeout on OpenAI call | User: defer until post-release |

### Follow-up Gaps Noted During Implementation
*(Issues noticed while applying fixes that are not in the original audit and have not
been fixed — for the next audit run or manual review.)*
- `paymentController.ts` — no test for the payment failure path
- `orderService.ts` — `updatedAt` field set in application code rather than DB trigger;
  risk of drift if a write bypasses the service layer

### To Resume
Open a new session, reference `fix_plan.md`, and say:
"Resume implementation from FIX-001 — the plan is already approved."
<!-- ═════════════════════════════════════════════════════════════════ -->
```

---

## What a Fix Must Never Do

These are absolute rules. No Fix Item, user request, or time pressure overrides them.

| Rule | Reasoning |
|---|---|
| **Never fix more than one Fix Item in a single edit** | Mixing two fixes in one change makes the checkpoint meaningless — you can't know which fix caused a regression |
| **Never change a public function's signature without it being in the Fix Item** | Signature changes break callers; this needs its own Fix Item and its own checkpoint |
| **Never add a new package dependency without announcing it before the edit** | New dependencies affect the whole project, need review |
| **Never rewrite surrounding code that isn't part of the fix** | "While I'm here" rewrites introduce unplanned changes outside the reviewed plan |
| **Never mark a Fix Item Done if the fix is partial** | Partial fixes give false confidence; mark it as `⚠️ Partially Applied` and note what remains |
| **Never skip the checkpoint, even if all remaining fixes look trivial** | "Trivial" fixes have caused production incidents. The checkpoint exists for a reason. |
| **Never edit `audit_progress.md`** | That file belongs to the audit skill. This skill only reads it. |

---

## Keeping `fix_plan.md` Consistent

`fix_plan.md` follows the same mutation rules as `audit_progress.md`:

| Section | Mutation rule |
|---|---|
| **Status line** | Overwrite on every phase transition |
| **Last updated field** | Overwrite; always describe what changed and why |
| **Project Patterns** | Overwrite if the user corrects a pattern; mark with `*(user-corrected)*` |
| **Fix Inventory table** | Status column overwrites (`Pending` → `✅ Done` / `⚠️ Partially Applied` / `Deferred`); all other columns are fixed once written |
| **Execution Order** | Overwrite when reordering based on user feedback; note the change in Last updated |
| **Deferred / Excluded** | Append only; never remove an entry |
| **Execution Log** | Append only; never edit a completed entry |
| **Pause/Completion Summary** | Written once at the top; overwrite only if resuming from pause and the summary needs to reflect new progress |

---

## Anti-Patterns That Break Safe Implementation

| Anti-Pattern | Why It Is Dangerous | Correction |
|---|---|---|
| Starting execution before plan approval | Fixes applied to a plan the user hasn't seen may conflict with decisions they would have made | Hard stop at Phase 2; wait for explicit approval |
| Applying multiple fixes in one edit | A regression cannot be isolated to a single cause | One Fix Item = one edit = one checkpoint |
| Treating user silence as approval | The user may be reviewing carefully or be interrupted | Explicitly wait; re-prompt if needed |
| Writing fixes that don't match the project's error class or logger | The team rejects the fix; the vulnerability stays open | Re-read Project Patterns before every fix |
| Marking a fix Done before verifying the change compiles / is syntactically valid | A fix with a syntax error is worse than no fix | Read the changed file back after editing it |
| Adding "bonus fixes" not in the plan | Unreviewed changes bypass the safety model | Add to Fix Inventory; get it into the plan; apply at the right checkpoint |
| Editing `audit_progress.md` | That file is the audit record; it belongs to the audit skill | Read it; never write it |
| Writing a vague Execution Log entry ("fixed the issue") | Makes the log useless for understanding what changed | Always specify: files changed, lines changed, what was added, what was not changed, tests affected |
