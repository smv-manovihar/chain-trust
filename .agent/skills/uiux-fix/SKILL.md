---
name: uiux-fix-implementation
description: >
  Use this skill after a UI/UX audit has been completed and the user wants to
  implement the fixes. Triggers: "implement the UI fixes", "fix the issues found",
  "apply the UI remediations", "start fixing the design issues", "fix the
  inconsistencies", "implement the UX plan".
  This skill reads findings from audit_progress.md (produced by the uiux-audit
  skill), builds a structured implementation plan linking fixes to ISSUE-NNN IDs,
  presents it for user review, incorporates feedback, then executes fixes one at
  a time with a checkpoint after every change. A single fix may resolve multiple
  ISSUE-NNN entries. ISSUE statuses in audit_progress.md are updated after every
  fix. User preferences stated during execution are recorded and honoured for all
  subsequent fixes.
  Do NOT begin editing files until the plan has been reviewed and approved.
  Do NOT use this skill to run a new audit — that is the uiux-audit skill's job.
compatibility: >
  Tool-agnostic. Works in any AI code editor or agent runtime: Cursor, Windsurf,
  GitHub Copilot Workspace, Zed, JetBrains AI, Cline, Continue, Aider, Claude
  Code, or any environment with read/write and search capabilities. When search
  or grep tools are available they MUST be used for ISSUE-NNN and FIX-NNN lookups
  instead of full-file reads — this is the primary mechanism for keeping context
  size bounded across long fix sessions.
depends_on: uiux-audit
---

# UI/UX Fix Implementation Skill

---

## The Core Philosophy

Finding a UI inconsistency is one thing. Fixing it safely — without introducing
a new inconsistency, without breaking a component that 12 screens depend on, and
without making changes the designer would reverse in the next review — is harder.

This skill enforces three practices that naive "just fix it" approaches skip:

**Plan first, get approval — including the per-fix approach.** Every fix has a
blast radius. Changing a shared `<Button>` variant touches every screen that
uses it. Renaming a label in one place requires finding every place the old label
appears. The user needs to see the full picture — and the specific approach for
each fix — before any file is touched.

**A fix may resolve multiple issues at once.** UI inconsistencies often cluster.
The same shared `<Button>` being used incorrectly on five screens is one fix
(update the shared component) that closes five ISSUE-NNN entries simultaneously.
Plan these as a single FIX-NNN; link all resolved issues in the plan and update
all of them in the audit file at once.

**Track user preferences as they emerge and apply them forward.** During a fix
session, the user will reveal things the audit could not know: "we intentionally
use two different icon libraries because the product designer approved both",
"Cancel always goes on the right on this product", "that copy was written by
legal and can't be changed". These are **user preferences** — project policy
revealed during execution. They must be recorded immediately and applied to all
subsequent fix approaches so the agent does not keep proposing fixes the user has
already disqualified.

---

## What This Skill Reads

Primary input: `audit_progress.md` from the uiux-audit skill.
Secondary input: `audit_traces.md` for flow context — **accessed by searching
for specific FLOW-NNN or ISSUE-NNN IDs only, never read in full.**

Before building the plan, read:
- The **Project Profile** table
- The **Project Patterns** table
- The **Shared Component Inventory** table
- The **Issue Index** (one-line rows only — not the full Findings section)

The full Findings blocks are read **per-issue on demand** by searching for
`ISSUE-NNN` — not by reading the Findings section top to bottom. This is
mandatory for context efficiency on audits with many findings.

If `audit_progress.md` does not exist or has an empty Issue Index, stop and say:

> "No audit findings found. Run the uiux-audit skill first, then return here."

Do not attempt to audit and fix in the same run of this skill.

---

## ISSUE-NNN Lookup Protocol

> **This protocol applies throughout all phases of this skill — during planning,
> during execution, and during checkpoints. It is never optional.**

When you need the details of a specific issue:

1. Search for `ISSUE-NNN` (e.g., `ISSUE-007`) in `audit_progress.md`
2. Read only the matching finding block — stop reading at the next `---` divider
3. If you need its linked flows, search for the `FLOW-NNN` IDs from that block
   in `audit_traces.md` — read only those sections

**Never read `audit_progress.md` or `audit_traces.md` from top to bottom to
recall an issue.** The Issue Index gives you the one-line summary; the search
gives you the full block on demand. These two operations together cost a fraction
of a full-file read and keep the context window available for reasoning.

---

## The Four Phases

| Phase | Name | Output |
|-------|------|--------|
| 0 | Ingest & Understand | Internal notes; no files written |
| 1 | Build the Implementation Plan | `uiux_fix_plan.md` created |
| 2 | Present for Review | User feedback incorporated into plan |
| **—** | **HARD STOP — no file may be modified until Phase 2 clears** | |
| 3 | Execute, Checkpoint, Repeat | Source files edited; audit file updated |

---

## Phase 0 — Ingest & Understand

### 0-A. Read the Audit Summary

From `audit_progress.md`, read (in order):
1. The **Status** table — get total issue counts at each severity
2. The **Project Profile** table — UI stack, component library, icon library, token file
3. The **Project Patterns** table — button hierarchy, icon usage, action labels, spacing
4. The **Shared Component Inventory** — the ground truth for what shared components exist
5. The **Issue Index** — the one-liner-per-issue table only

Do not read the Findings section yet. Individual findings are fetched by
ISSUE-NNN search in Phase 0-B.

### 0-B. Fetch Full Details for Every Issue

For each ISSUE-NNN in the Issue Index, search for that ID in `audit_progress.md`
and read its full finding block. For each issue note:

- Severity and category
- Files and line ranges affected
- Whether it is systemic (affects multiple files/screens)
- Linked FLOW-NNN IDs (for context if needed — look up via search)
- The remediation already proposed in the audit

### 0-C. Identify Grouping Opportunities

Before writing the plan, identify which issues can be fixed together as a single
FIX-NNN. Group issues when:

- They share the same root cause (e.g., the same shared component missing a
  variant means all screens using the wrong ad-hoc solution get fixed at once)
- They are in the same file and the changes do not conflict
- They represent the same systemic pattern (e.g., all five screens using
  `aria-hidden` incorrectly — one global find-and-fix)
- Fixing one issue would naturally resolve another (e.g., replacing a custom
  spinner with `<Spinner />` everywhere also fixes the sizing inconsistency
  logged as a separate issue)

**When grouping:** the FIX-NNN links all resolved ISSUE-NNN IDs. Each linked
issue gets marked Fixed in the audit file when the fix completes.

### 0-D. Identify Fix Dependencies

Map dependencies before setting execution order:

- **Design token fixes first** — if a color token is wrong, every component
  using it inherits the problem. Fix the token before fixing the components.
- **Shared component fixes before per-screen fixes** — fix the shared `<Button>`
  variant before patching the 8 screens that use it incorrectly.
- **Terminology fixes before component fixes** — if a label is wrong and is
  also inside a component, fix the source-of-truth string first.
- **Systemic fixes as a group** — issues marked systemic should be resolved
  completely in one FIX-NNN, not left partially fixed across some files.

### 0-E. Draft a Concrete Approach for Every Fix

For each FIX-NNN, decide before writing the plan:

- Exactly which lines/props/classes change in which files
- Which shared components, tokens, or utilities will be used (by their exact
  name from the Shared Component Inventory)
- Whether any new import is required
- Whether the change affects a shared component (and therefore every screen that
  uses it — document the blast radius)
- What could go wrong and how the approach prevents it

These decisions become the **Approach Details** subsections in `uiux_fix_plan.md`
and are the primary thing the user reviews before execution.

---

## Phase 1 — Build the Implementation Plan

Create `uiux_fix_plan.md` in the project root.

```markdown
# UI/UX Fix Implementation Plan

> **Status:** Draft — Awaiting User Review
> **Source audit:** `audit_progress.md`
> **Last updated:** [describe what changed and why on every update]

---

## Project Patterns (from audit)

*(Copied verbatim — every fix must match these. Updated if user corrects a
pattern during review; marked *(user-corrected)*.)*

| Pattern           | Convention |
|-------------------|------------|
| Button hierarchy  |            |
| Icon usage        |            |
| Action labels     |            |
| Loading states    |            |
| Error states      |            |
| Spacing/Layout    |            |
| Typography        |            |
| Naming (props)    |            |

---

## User Preferences

*(Append-only. Preferences stated by the user during review or execution are
recorded here immediately and applied to all subsequent fix approaches.
Never delete an entry — if a preference is revised, append the revision with
a note.)*

| # | Preference | Stated during | Applied to |
|---|------------|---------------|------------|
| P-001 | *(example) Cancel button always right-aligned on this product* | Phase 2 review | FIX-004 approach revised |

---

## Fix Inventory

*(All audit issues normalised into fixable units. One FIX-NNN per root cause.
A FIX-NNN may resolve multiple ISSUE-NNN entries. Systemic issues are one
FIX-NNN with multiple targets.)*

| ID      | Severity | Title                                  | Resolves Issues              | File(s)                     | Depends On | Status  |
|---------|----------|----------------------------------------|------------------------------|-----------------------------|------------|---------|
| FIX-001 | 🚨CRIT   | Replace raw div buttons with `<Button>`| ISSUE-004, ISSUE-011         | `Checkout.tsx`, `Cart.tsx`  | —          | Pending |
| FIX-002 | 🔴HIGH   | Unify "Submit"/"Confirm" labels        | ISSUE-001                    | `CheckoutForm.tsx`          | —          | Pending |
| FIX-003 | 🔴HIGH   | Add missing loading state to CTA       | ISSUE-007, ISSUE-009         | `OrderSummary.tsx`          | FIX-001    | Pending |
| FIX-004 | 🟠MED    | Replace custom spinner with `<Spinner>`| ISSUE-003, ISSUE-006, ISSUE-012 | 3 files (see Approach)   | —          | Pending |
| FIX-005 | 🟡LOW    | Add aria-hidden to decorative icons    | ISSUE-015                    | `NavBar.tsx`, `Footer.tsx`  | —          | Pending |

---

## Approach Details

*(Review this section carefully before approving. Each subsection describes
exactly what will change, which components/tokens will be used, and what the
blast radius is. Flag anything wrong — wrong component name, wrong prop,
different preference — and the approach will be revised before any file is
touched.)*

### FIX-001 — Replace raw div buttons with `<Button>`

**Resolves:** ISSUE-004, ISSUE-011
**Files:** `src/components/checkout/Checkout.tsx` lines 44–49,
           `src/components/cart/Cart.tsx` lines 88–91

**Approach:**
Replace `<div onClick={...} className="...">` with `<Button variant="primary"
onClick={...}>` using the shared `Button` component from
`src/components/ui/Button.tsx`. The `variant="primary"` prop matches the
existing usage on adjacent screens confirmed in the Project Patterns record.

**Blast radius:** Contained — `<Button>` is already used on 14 other screens
without issue. Only the two files above are affected; no shared component is
being modified.

**What will not change:** Click handlers, aria-labels, and surrounding layout.

**Risk accounted for:** The current `<div>` has no keyboard support. The
`<Button>` component already handles `onKeyDown` — this is a net accessibility
gain, not a regression risk.

---

### FIX-002 — Unify "Submit" / "Confirm" labels

**Resolves:** ISSUE-001
**Files:** `src/components/checkout/CheckoutForm.tsx` line 112

**Approach:**
Change `"Submit"` to `"Confirm Order"` to match the label used on the
confirmation modal (`ConfirmModal.tsx` line 34) and the pattern established in
Project Patterns ("Confirmation actions → 'Confirm [Object]' format").

**Blast radius:** One label in one file. No shared component touched.

**What will not change:** The `onSubmit` handler, form validation, or layout.

**Risk accounted for:** No translation/i18n keys detected in this project —
the string is a literal. If i18n is added later this will need a key.

---

### FIX-003 — Add missing loading state to CTA

**Resolves:** ISSUE-007, ISSUE-009
**Files:** `src/components/checkout/OrderSummary.tsx` lines 67–74
**Depends on:** FIX-001 must complete first (the button will be a proper
`<Button>` after FIX-001, enabling the `isLoading` prop)

**Approach:**
Add `isLoading={isSubmitting}` to the `<Button>` introduced by FIX-001. The
`isSubmitting` state already exists in the parent component's `useState` — it
is set to `true` on submit and `false` on response. Wire it to the prop.
The `<Button>` component already renders a `<Spinner />` internally when
`isLoading` is true — no additional spinner code needed.

**Blast radius:** Contained to this one component.

**What will not change:** Submission logic, error handling, or layout.

---

### FIX-004 — Replace custom spinner with `<Spinner />`

**Resolves:** ISSUE-003, ISSUE-006, ISSUE-012
**Files:**
- `src/app/settings/page.tsx` lines 23–27
- `src/components/profile/AvatarUpload.tsx` lines 51–55
- `src/components/dashboard/StatsCard.tsx` lines 38–42

**Approach:**
Remove the inline `<div className="animate-spin ...">` pattern in each file and
replace with `<Spinner size="md" />` from `src/components/ui/Spinner.tsx`.
The `size="md"` prop matches the 24 px size used by the custom implementation.

**Blast radius:** Three files, each isolated. The shared `<Spinner>` component
is not being modified — only consumers are being updated.

**What will not change:** The surrounding layout, conditional rendering logic,
or any state that controls visibility.

**Risk accounted for:** The custom spinner used `text-blue-500` for color. The
shared `<Spinner>` uses the `primary` design token — verify this renders the
same color in the current theme before approving. If the color differs and is
intentional, flag it and I will adjust the approach.

---

### FIX-005 — Add aria-hidden to decorative icons

**Resolves:** ISSUE-015
**Files:** `src/components/layout/NavBar.tsx`, `src/components/layout/Footer.tsx`

**Approach:**
Add `aria-hidden="true"` to every icon that appears alongside visible text
labels (e.g., the home, settings, and profile icons in the nav). Icons that
are the sole identifier of an action (standalone icon buttons) will receive
`aria-label` instead — these are identified in ISSUE-015's finding block.

**Blast radius:** Attribute additions only. No visual change, no logic change.

---

## Execution Order

*(Dependencies first, then severity, then blast radius.)*

1. **FIX-004** — No dependencies; isolated consumer-only changes; unblocks visual
   consistency across the most screens
2. **FIX-001** — No dependencies; unblocks FIX-003
3. **FIX-002** — No dependencies; isolated label change; safe to run in parallel
   with FIX-001 but sequenced after for clarity
4. **FIX-003** — Depends on FIX-001 being complete
5. **FIX-005** — No dependencies; low-risk; scheduled last

---

## Deferred / Excluded Items

*(Append-only. Items the user asks to skip or defer are moved here with reason.)*

---

## Execution Log

*(Append-only. One entry per completed FIX-NNN. Never edit a completed entry.)*

<!-- entries appear here as fixes are applied -->
```

---

## Phase 2 — Present for Review

**Hard stop. No source file may be modified until explicit user approval.**

Present `uiux_fix_plan.md` to the user. Your message must cover:

### 1. Headline Summary

Plain-English count of: total issues, fixes planned, how many fixes resolve
multiple issues at once. Example:

> "The audit found 15 issues. I've grouped them into 5 fixes — 3 of those
> fixes each resolve 2 or more issues simultaneously, so you get full coverage
> in fewer changes."

### 2. Multi-Issue Fix Call-Out

Explicitly highlight which FIX-NNN entries resolve more than one ISSUE-NNN,
and why they were grouped. This helps the user understand the grouping logic
and catch any groupings they disagree with.

### 3. Approach Details Direction

Explicitly direct the user to the Approach Details section:

> "The **Approach Details** section is the most important part to review — it
> describes exactly what each fix will change: which component, which prop,
> which line, and what the blast radius is. Please read each subsection and
> flag anything that conflicts with a project decision I may not know about:
> wrong component name, wrong variant, a label that was intentionally different,
> a spinner color that was approved by the designer. This is the moment to
> catch that — before any file is touched."

### 4. Blast Radius Call-Out

Flag any fix that modifies a shared component (not just its consumers), since
those changes affect every screen in the product. Ask the user to confirm the
proposed approach for those specifically.

### 5. Four Gating Questions

- Are there any fixes to **skip entirely** (intentional pattern, being replaced,
  already fixed in another branch)?
- Are there any fixes to **defer** (not skip forever, just not now)?
- Are there any **groupings to split** (two issues you want fixed separately
  rather than together)?
- Are there any **approaches to revise** in the Approach Details before execution?

### 6. Clear Approval Prompt

> "Reply **'approved'** to begin, or share feedback and I'll update the plan
> before we start. Once approved, I'll apply one fix at a time and pause for
> your confirmation at each checkpoint."

---

### Handling User Feedback During Review

When the user responds with feedback, update the plan **before** starting
execution. Apply exactly one of these operations per piece of feedback:

| User says | Operation |
|-----------|-----------|
| "Skip FIX-002, that label was intentional" | Move to Deferred/Excluded with reason; record as User Preference P-NNN |
| "Defer FIX-005 until after the next release" | Move to Deferred/Excluded with reason |
| "Split FIX-001 — fix Checkout.tsx this sprint, Cart.tsx next" | Split into FIX-001a and FIX-001b; update Issue links on each; re-order |
| "For FIX-004, use `<LoadingDot />` not `<Spinner />`" | Update Approach Details subsection; mark *(user-revised)*; record as User Preference P-NNN |
| "Cancel should always be on the left on this product" | Record as User Preference P-NNN; scan all Approach Details for button placement and revise |
| "The icon library we use is Lucide only — ignore HeroIcons findings" | Record as User Preference P-NNN; move affected issues to Deferred/Excluded |
| "Add a fix for ISSUE-016 you missed" | Add to Fix Inventory + Approach Details; place in Execution Order |
| "Group ISSUE-013 with FIX-003" | Update FIX-003's Resolves column; fetch and merge ISSUE-013 details into Approach Details |

After applying feedback:
- Update the plan's status to `Revised — Awaiting Final Approval`
- Describe what changed in the Last updated field
- Re-present and await approval

**Never interpret silence as approval.**

---

## Phase 3 — Execute, Checkpoint, Repeat

Execution begins only after explicit approval. One fix at a time.

---

### Step 3-A. Fetch the Issue Details Before Each Fix

Before announcing a fix, search for each linked ISSUE-NNN in `audit_progress.md`
to refresh context. Read only the matching finding blocks — do not re-read the
full file. This ensures the fix is applied to the right lines even if the
approach was written during an earlier session.

```
Search "ISSUE-004" in audit_progress.md → read block → stop at next ---
Search "ISSUE-011" in audit_progress.md → read block → stop at next ---
```

Apply any User Preferences that are relevant to this fix before proceeding.

---

### Step 3-B. Announce the Fix

Post a short message before touching any file:

```
Applying FIX-001 — Replace raw div buttons with <Button>
Resolves: ISSUE-004, ISSUE-011
Files: src/components/checkout/Checkout.tsx (lines 44–49)
       src/components/cart/Cart.tsx (lines 88–91)
Approach (as approved): Replacing <div onClick> with <Button variant="primary"
onClick>. No shared component modified. Keyboard support and focus management
improved as a side effect.
User preferences applied: none applicable to this fix.
(No other files touched in this step.)
```

This gives the user a final chance to object before any file changes.

---

### Step 3-C. Apply the Fix

Edit only the files listed for this FIX-NNN. The fix must:

- Match the approved Approach Details exactly
- Use the exact component names, prop names, and token names from the Shared
  Component Inventory and Project Patterns record
- Not change any logic, state, or handler that is not part of the fix
- Not add new package dependencies without announcing them in Step 3-B
- Not "while I'm here" fix adjacent issues — those go in the Fix Inventory

---

### Step 3-D. Update `audit_progress.md` — Issue Statuses

After applying the fix, update the status of every linked ISSUE-NNN in the
Issue Index of `audit_progress.md`. Use search to locate each row — do not
re-read the full file.

**Status markers:**

| Outcome | Marker | When to use |
|---------|--------|-------------|
| ✅ Fixed | `✅ Fixed · FIX-NNN` | Fix applied and complete |
| ⏸ Deferred | `⏸ Deferred · [reason]` | User asked to defer |
| ⛔ Excluded | `⛔ Excluded · [reason]` | User asked to skip permanently |
| ⚠️ Partial | `⚠️ Partial · FIX-NNN` | Fix applied to some files but not all |

Update the Issue Index row for each linked ISSUE-NNN:

```markdown
<!-- Before -->
| ISSUE-004 | 🔴H | Buttons | Raw div used as button | FLOW-001 |

<!-- After -->
| ISSUE-004 | 🔴H | Buttons | Raw div used as button | FLOW-001 | ✅ Fixed · FIX-001 |
```

> The Issue Index is the audit file's status surface. It must always reflect
> the current state of every issue. Reading the Issue Index alone should tell
> anyone the full resolution status of the audit without opening the Findings
> section.

---

### Step 3-E. Write the Execution Log Entry

Append an entry to the Execution Log in `uiux_fix_plan.md` immediately after:

```markdown
### ✅ FIX-001 — Replace raw div buttons with `<Button>`

**Completed**

| Field              | Detail |
|--------------------|--------|
| Issues resolved    | ISSUE-004 ✅, ISSUE-011 ✅ |
| Files changed      | `src/components/checkout/Checkout.tsx`, `src/components/cart/Cart.tsx` |
| What was done      | Replaced `<div onClick>` with `<Button variant="primary" onClick>` in both files. Keyboard navigation now works on both elements. |
| What was not changed | Click handlers, aria-labels, surrounding layout |
| Shared component modified? | No — only consumers updated |
| User preferences applied | None applicable |
| Approach deviation | None — implemented exactly as approved |
| Follow-up noted    | `Cart.tsx` has a third button on mobile breakpoint (line 103) not in the original issue scope — logged for next audit run |
```

Update FIX-001's status in the Fix Inventory from `Pending` → `✅ Done`.

> If the fix deviated from the approved approach, the **Approach deviation**
> field must explain what changed and why. Never silently diverge from the
> approved approach.

---

### Step 3-F. The Checkpoint

After every single fix, post:

```
Checkpoint after FIX-001
✅ Done: FIX-001 — Replace raw div buttons with <Button>
         Resolved: ISSUE-004 ✅, ISSUE-011 ✅

⏳ Next: FIX-002 — Unify "Submit"/"Confirm" labels (CheckoutForm.tsx line 112)
         Approach: Change "Submit" → "Confirm Order" to match ConfirmModal.tsx.
         Resolves: ISSUE-001

uiux_fix_plan.md and audit_progress.md have both been updated.
Reply 'continue' to apply FIX-002, 'pause' to stop here, or share feedback
to adjust the approach before the next fix.
```

Then stop. Do not proceed until the user responds.

---

### Step 3-G. Capture User Preferences During Execution

When the user says anything during a checkpoint that reveals a project
convention, design decision, or constraint — not just feedback on the specific
fix, but something that applies more broadly — record it immediately as a
User Preference in `uiux_fix_plan.md`:

```markdown
| P-002 | "Confirm" label only used on modals; forms always use "Save" | After FIX-002 checkpoint | FIX-006 approach revised; ISSUE-014 approach pre-revised |
```

Then immediately scan all remaining Approach Details subsections for conflicts
with the new preference and revise them before the next fix. Announce the
revision at the next checkpoint.

**A preference once recorded is permanent for this session.** If the user later
contradicts a preference, append the new entry with a note referencing the
original — do not delete the original.

---

### Step 3-H. Handle Checkpoint Responses

| User says | What to do |
|-----------|------------|
| "continue" / "go ahead" | Apply next fix; return to Step 3-A |
| "pause" / "stop" | Write Pause Summary (Step 3-I); stop |
| "skip this one" | Move next FIX-NNN to Deferred/Excluded; mark linked issues `⏸ Deferred` in audit_progress.md; announce new next item; wait |
| "change the approach to X" | Update the Approach Details subsection; mark *(user-revised)*; record as User Preference if broadly applicable; re-announce (Step 3-B); wait |
| "also fix ISSUE-NNN in this step" | Fetch ISSUE-NNN details by search; if compatible with current fix, add to FIX-NNN's Resolves list and update the approach; if not compatible, create a new FIX-NNN and insert in Execution Order |
| "that label was intentional — revert it" | Revert the change; mark the linked issue `⛔ Excluded`; record the reason as User Preference; update audit_progress.md |
| "this preference applies everywhere" | Record as User Preference; scan all remaining Approach Details for conflicts; revise and announce before next step |

---

### Step 3-I. Pause / Completion Summary

When the user pauses or all fixes are complete, prepend this summary to the
top of `uiux_fix_plan.md`:

```markdown
<!-- ══════════════════════════════════════════════════════════════════ -->
## 📋 Implementation Summary — [Paused | Complete]

**Paused by:** User request / All fixes applied
**Fixes completed:** N of M planned
**Issues resolved:** N of N total (✅ N fixed · ⏸ N deferred · ⛔ N excluded)

### Applied Fixes

| ID      | Title                              | Issues Resolved                | Deviation? |
|---------|------------------------------------|--------------------------------|------------|
| FIX-001 | Replace raw div buttons            | ISSUE-004 ✅, ISSUE-011 ✅     | None       |
| FIX-004 | Replace custom spinner             | ISSUE-003 ✅, ISSUE-006 ✅, ISSUE-012 ✅ | None |

### Remaining Fixes

| ID      | Severity | Title                    | Issues         | Reason not applied |
|---------|----------|--------------------------|----------------|--------------------|
| FIX-003 | 🔴HIGH   | Add loading state to CTA | ISSUE-007, ISSUE-009 | Paused by user |

### Deferred / Excluded Issues

| Issue     | Title                          | Status          | Reason |
|-----------|--------------------------------|-----------------|--------|
| ISSUE-001 | "Submit" vs "Confirm" label    | ⛔ Excluded     | User: label intentional — legal copy |
| ISSUE-015 | Decorative icons missing aria  | ⏸ Deferred      | User: defer to accessibility sprint |

### User Preferences Recorded This Session

| #     | Preference                                   | Applied to |
|-------|----------------------------------------------|------------|
| P-001 | Cancel always right-aligned on this product  | FIX-003 revised |
| P-002 | Forms use "Save"; modals use "Confirm"       | FIX-002 excluded; FIX-006 revised |

### Follow-up Gaps Noted During Implementation

*(Issues noticed while applying fixes that are not in the original audit.)*

- `Cart.tsx` line 103 — third button on mobile breakpoint uses raw `<div>`; not
  in original audit scope; recommend adding to next audit run
- `CheckoutForm.tsx` — no loading state on the secondary "Save for later" action;
  similar to ISSUE-007 but not captured; recommend adding to Issue Index

### To Resume

Open a new session, reference `uiux_fix_plan.md` and `audit_progress.md`, and say:
"Resume UI/UX fixes from FIX-003 — the plan is already approved. User preferences
P-001 and P-002 must be honoured."
<!-- ══════════════════════════════════════════════════════════════════ -->
```

---

## Keeping `uiux_fix_plan.md` Consistent

| Section | Mutation rule |
|---------|--------------|
| Status line | Overwrite on every phase transition |
| Last updated field | Overwrite; describe what changed and why |
| Project Patterns | Overwrite if user corrects; mark *(user-corrected)* |
| **User Preferences** | **Append-only always — never delete or overwrite an entry** |
| Fix Inventory | Status column overwrites; all other columns fixed once written |
| **Approach Details** | **Overwrite per subsection on user revision; mark *(user-revised)* and note what changed** |
| Execution Order | Overwrite when reordering; note the reason |
| Deferred / Excluded | Append-only |
| **Execution Log** | **Append-only — never edit a completed entry** |
| Pause/Completion Summary | Written once at top; overwrite only when resuming |

## Keeping `audit_progress.md` Consistent

This skill has **one permitted write operation** on the audit file: updating the
status column of ISSUE-NNN rows in the Issue Index table. All other sections of
`audit_progress.md` are read-only for this skill.

| Operation | Permitted? |
|-----------|-----------|
| Add status marker to Issue Index row | ✅ Yes — after each fix |
| Rewrite a Finding block | ❌ No — that belongs to the audit skill |
| Update the Status table (Files Read, etc.) | ❌ No |
| Add new issues to the Issue Index | ❌ No — use the follow-up gaps section in `uiux_fix_plan.md` |

---

## Anti-Patterns That Break Safe Implementation

| Anti-Pattern | Why It Is Dangerous | Correction |
|---|---|---|
| Reading `audit_progress.md` top-to-bottom to recall an issue | Blows context window on large audits | Always search for `ISSUE-NNN` by ID; read only the matching block |
| Starting execution before plan approval | Unapproved fixes conflict with user decisions | Hard stop at Phase 2 — no exceptions |
| Skipping Approach Details review | User may object to specific component, prop, or label choice | Explicitly direct user to Approach Details in Phase 2 |
| Applying multiple fixes in one edit | A regression cannot be isolated | One FIX-NNN = one edit = one checkpoint |
| Not recording a user preference stated during a checkpoint | The next fix repeats the same mistake the user just corrected | Every project-policy statement → User Preferences table immediately |
| Not scanning remaining Approach Details after a preference is recorded | Later fixes contradict the preference the user just stated | Scan and revise all remaining approaches before the next step |
| Marking an issue Fixed before the fix is complete across all listed files | Issue Index shows false resolution | Only mark ✅ Fixed when every file in the Fix Item is updated |
| Using a component name not in the Shared Component Inventory | Introduces a new inconsistency while fixing an old one | Cross-check the Inventory before every fix approach |
| Treating user silence as approval | User may be reviewing carefully | Explicitly wait; re-prompt if needed |
| Deviating from the approved Approach Details without announcing it | Breaks the review contract | Announce any deviation in Step 3-B; document it in the Execution Log |
| Writing "while I'm here" fixes not in the plan | Unreviewed changes bypass the safety model | Log as follow-up gap; add to Fix Inventory + Approach Details for next session |
| Applying a shared component fix without documenting blast radius | Touches every screen invisibly | Always state blast radius in Approach Details for any shared component change |
| Editing Execution Log entries retroactively | Corrupts the implementation record | Execution Log is append-only — corrections go in a new entry |