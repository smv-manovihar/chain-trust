---
name: uiux-fix-implementation
description: >
  Use this skill after a UI/UX audit has been completed and the user wants to
  implement the fixes. Triggers: "implement the UX fixes", "fix the UI issues
  found", "apply the UX remediations", "start fixing the design issues",
  "implement the accessibility fixes", "fix the broken states".
  This skill reads audit findings from the audit progress document, builds a
  structured implementation plan, presents it for user review, incorporates
  feedback, then executes fixes one at a time with a checkpoint after every
  change. Use native artifacts to manage these phases for maximum visibility
  and persistence.
  Do NOT begin editing files until the plan has been reviewed and approved.
  Do NOT use this skill to run a new audit — that is the uiux-audit skill's job.
compatibility: >
  Tool-agnostic. Works in any AI code editor or agent runtime with the ability 
  to read and write files. No browser automation, screenshot tooling, or 
  OS-specific dependencies required.
depends_on: uiux-audit

---
### ChainTrust Specific Rule
**CRITICAL**: Do NOT modify or suggest modifications to any files within `frontend/components/ui`. These are base primitives and must remain untouched. Any required design system alignments (e.g., pill-style/rounded-full) must be achieved through component-level overrides or wrapper components on the pages/features themselves. Implementation efforts must **NOT** alter the shared library logic under any circumstance.

## UI/UX Fix Implementation Skill

---

### The Core Philosophy

The gap between finding a UX problem and safely fixing it in a live codebase is
wider than it looks. A fix that is visually correct can still break the design
system if it introduces a raw value in a token-driven codebase, rewrites a
shared component that dozens of screens depend on, or changes accessibility attributes in
a way that conflicts with the team's established patterns.

This skill closes that gap by enforcing three principles:

- **Plan first, get approval.** UI fixes are not free. Each has a blast radius. 
  The user needs to see the full picture — including the detailed approach for every fix —
  before any file is touched.
- **Treat user feedback as a first-class input.** The user knows things the audit
  does not. The plan must adapt to product decisions, brand reviews, and missing assets 
  before execution begins.
- **Execute one fix at a time with a visible checkpoint.** Not in a batch. Not
  all criticals at once. One at a time, in planned order, with the user able to
  pause or redirect after every single change.

---

### What This Skill Reads

This skill's primary input is the progress document produced by the UI/UX audit skill.
Before building the plan, carefully extract the established **Project Patterns** (token usage, component composition, state modeling, and copy voice). 
Every fix you write will be judged against those patterns. 

If no audit findings exist, stop immediately and tell the user to run the audit skill first.

---

### The Four Phases

| Phase | Name | Output |
|---|---|---|
| 0 | Ingest & Understand | Internal notes; no files written |
| 1 | Build the Implementation Plan | `uiux_fix_plan.md` (Artifact) |
| 2 | Present for Review | User feedback incorporated into Plan |
| **—** | **HARD STOP** | **No file may be modified until Phase 2 clears** |
| 3 | Execute, Checkpoint, Repeat | `uiux_fix_plan.md` updated; source files edited |

---

### Phase 0 — Ingest & Understand

Read the following, in this order, before writing a single line of the plan.

#### 0-A. Read the Audit Findings
Extract every finding from the audit log, noting its severity, category, target location, systemic flags, and any updated confidence blocks. Copy the **Project Patterns** section verbatim into your working notes.

#### 0-B. Read Every Affected File
Before planning a fix, open and re-read each target file. Note:
- Existing design tokens, primitives, or utility classes available.
- Existing prop contracts and state shapes (do not change public interfaces blindly).
- Existing test coverage for the affected states.
- Whether the component is globally shared or page-local.

#### 0-C. Identify Fix Dependencies
Map dependencies explicitly to drive the Execution Order:
- **Token layer before component fixes:** Create missing tokens before using them.
- **Shared primitives before page-level fixes:** Fix the root component before fixing its call sites.
- **Infrastructure before implementation:** Create shared accessibility hooks/utilities before adding references to them.
- **Systemic fixes grouped:** Fix systemic issues at the highest shared layer, not one instance at a time.
- **Copy patterns before copy fixes:** Establish the pattern before writing the strings.

#### 0-D. Draft a Concrete Approach for Every Fix
For each fix, decide:
- Exactly which lines will change.
- Which specific tokens, primitives, and accessibility patterns will be used.
- What side effects the change could have on shared components.
- Whether the fix requires a design decision or external asset (icons, illustrations, brand review).

---

### Phase 1 — Build the Implementation Plan

Create a file named `uiux_fix_plan.md` in the project root. This is the single source of truth.

#### uiux_fix_plan.md Structure

```markdown
# UI/UX Fix Implementation Plan

> **Status:** Draft — Awaiting User Review
> **Source audit:** `<Reference to audit file>`
> **Last updated:** [note what changed and why, on every update]

***

## Project Patterns (from audit)
*(Copied verbatim from the audit document)*

***

## Fix Inventory
*(Table listing ID, Severity, Title, Target Files, Category, Dependencies, and Status)*

***

## Approach Details
*(A dedicated subsection for every Fix Item. Detail exactly what will change, which tokens/components will be used, what will NOT change, and what risks are accounted for. This is what the user reviews.)*

### FIX-001 — <Title>
- **Target:** `<Location>`
- **Approach:** `<Detailed technical description of the implementation>`
- **What will not change:** `<Explicitly state untouched logic/props>`
- **Risk accounted for:** `<Describe mitigations for regressions>`

***

## Execution Order
*(List fixes sorted by dependencies first, then severity, then blast radius. Explain non-obvious ordering.)*

***

## Design Assets Needed
*(Table listing Fix IDs and the required external assets like icons, illustrations, or copy approvals that block them.)*

***

## Deferred / Excluded Items
*(Empty until user review. Moved items go here with a reason.)*

***

## Execution Log
*(Append-only. One entry per completed fix. Never edit a completed entry.)*
```

---

### Phase 2 — Present for Review

**This is the hard stop. Do not touch any source file until you have explicit approval.**

Present the implementation plan to the user. Your message must cover:
- **Headline summary:** Count of findings by severity and a brief summary of the highest-severity issue.
- **Execution order rationale:** Justify the first few sequencing decisions.
- **Design Assets call-out:** Explicitly flag any fixes blocked by missing assets or required reviews.
- **Approach Details call-out:** Direct the user to review the specific technical approaches for alignment with their architecture.
- **Gating questions:** Ask if anything should be skipped, deferred, or technically adjusted.
- **Clear approval prompt:** Instruct the user exactly how to approve or provide feedback.

#### Handling User Feedback
Do not start executing upon receiving feedback. Update the plan first.
- If a user skips/defers a fix: Move it to Deferred/Excluded with the stated reason.
- If a user reorders: Update Execution Order and note the reason.
- If a user changes an approach/token/copy: Update the corresponding Approach Details subsection and mark it `*(user-revised)*`.
- Update the plan status to `Revised — Awaiting Final Approval` and re-present it until explicit approval is given.
- **Never interpret silence as approval.**

---

### Phase 3 — Execute, Checkpoint, Repeat

Execution begins only after explicit user approval. Follow this loop for every fix, one at a time.

#### Step 3-A. Announce the Fix
Before editing any file, post a short message echoing the approved approach so the user has a final chance to object.

#### Step 3-B. Apply the Fix
Edit only the files listed for the current Fix Item.
- Match the approved approach exactly.
- Use only established tokens, primitives, and copy patterns.
- Do not introduce unapproved dependencies or alter public prop interfaces without prior agreement.
- Do not "while I'm here" fix adjacent issues.

#### Step 3-C. Write the Execution Log Entry
Append an entry to the Execution Log in the plan document detailing:
- Files changed.
- What was done (and what was not changed).
- Tests affected or noted gaps.
- Any necessary deviations from the planned approach (must be explicitly justified).
- Mark the item as done in the Fix Inventory.

#### Step 3-D. The Checkpoint
After every single fix, post a checkpoint to the user:
- State what was just completed.
- State the next planned fix and its approach.
- Explicitly ask the user to reply to continue, pause, or adjust the next approach.
- **Stop and wait for the user to respond.**

#### Step 3-E. Handle Checkpoint Responses
- Proceed if approved.
- Generate a Pause Summary if paused.
- Adjust the plan and re-announce if the user modifies the upcoming approach or flags a missing asset.

#### Step 3-F. Pause / Completion Summary
If paused or completed, prepend a summary block to the implementation plan detailing:
- Status (Paused or Complete).
- Tables of Applied Fixes, Remaining Fixes, and Deferred Items.
- Follow-up gaps noticed during implementation but outside the original scope.
- Outstanding design assets needed.
- Instructions on how to resume the session.

---

### What a Fix Must Never Do

- **Never fix more than one item in a single edit:** Prevents isolating visual regressions.
- **Never deviate from the approved Approach silently:** Breaks the review contract.
- **Never change a component's public interface unprompted:** Breaks upstream consumers.
- **Never introduce new unannounced dependencies:** Affects bundle sizes and lockfiles.
- **Never rewrite surrounding unrelated code:** Introduces unreviewed risks.
- **Never bypass token systems:** Do not use raw hardcoded values if a token exists.
- **Never write copy that violates the established project voice:** It will be rejected.
- **Never mark a fix as Done if partial:** Mark it as partially applied with remaining steps.
- **Never edit the original audit document:** The audit progress document is an immutable record.

---

### Keeping the Plan Consistent

- **Status & Last Updated:** Overwrite on every transition and explain what changed.
- **Project Patterns & Approach Details:** Overwrite if user corrects them, marking them as revised.
- **Fix Inventory:** Update the status column only.
- **Deferred/Excluded & Execution Log:** Strictly append-only.
- **Pause Summary:** Written once at the top; overwritten only upon resuming.