---
name: uiux-fix
description: >
  Use this skill after a UI/UX audit has been completed and the user wants
  to implement the fixes.
  Triggers: "implement the audit fixes", "fix the UI issues found", "apply the
  UX remediations", "start fixing the design issues", "implement the UX plan",
  "fix the accessibility issues", "fix the design inconsistencies".
  This skill reads audit findings from uiux_audit.md, builds a structured
  implementation plan, presents it for user review, incorporates feedback, then
  executes fixes one at a time with a checkpoint after every change.
  Use native artifacts (referenced here as uiux_fix_plan.md) to manage these phases for maximum visibility and persistence.
  Do NOT begin editing files until the plan has been reviewed and approved.
  Do NOT use this skill to run a new audit — that is the uiux-audit skill's job.
compatibility: >
  Tool-agnostic. Works in any AI code editor or agent runtime: Cursor, Windsurf,
  GitHub Copilot Workspace, Zed, JetBrains AI, Cline, Continue, Aider, Claude
  Code, or any environment with the ability to read and write files. If the
  environment provides specialised tools, these **MUST** be used instead of
  their raw terminal equivalents to take advantage of the agent's optimised
  capabilities.
depends_on: uiux-audit
---

# UI/UX Fix Skill

---

## The Core Philosophy

The gap between spotting a design problem and safely fixing it in a live
codebase is wider than it looks. A change that is visually correct in isolation
can still break the product if it introduces a spacing value outside the
project's scale, swaps a colour that bypasses a design token, hard-codes a
pixel size that violates the responsive grid, or silently removes a semantic
HTML attribute that an assistive technology depended on.

This skill closes that gap. It does three things that naive "just apply the fix"
approaches skip:

- **Plan first, get approval.** UI/UX fixes are not free. Each one has a blast
  radius across themes, component variants, breakpoints, and accessibility
  contracts. The user needs to see the full picture — including the detailed
  approach for every fix — before any file is touched.
- **Treat user feedback as a first-class input.** The user knows things the
  audit does not — a visual inconsistency may be intentional brand expression, a
  WCAG deviation may already have an approved exception, or the proposed
  component swap may conflict with a design-system decision already in progress.
  The plan, including each fix's approach, must adapt to that knowledge before
  execution begins.
- **Execute one fix at a time with a visible checkpoint.** Not in a batch. Not
  all CRITICAL accessibility issues first without pause. One fix at a time, in
  planned order, with the user able to pause or redirect after each change.

---

## What This Skill Reads

This skill's primary input is `uiux_audit.md`, produced by the uiux-audit skill.
Before building the plan, re-read the **Design System Patterns** section of that
file carefully. Every fix you write will be judged against those patterns. A fix
that uses a hard-coded hex instead of the project's colour token, a raw pixel
value instead of the spacing scale, or a component import from the wrong library
will be rejected — and rightly so.

If `uiux_audit.md` does not exist, or exists but has no entries in the Audit
Log, stop immediately and tell the user:

> "No UI/UX audit findings found. Run the uiux-audit skill first, then return
> here."

Do not attempt to audit and fix in the same run of this skill.

---

## The Four Phases

| Phase | Name | Output |
|---|---|---|
| 0 | Ingest & Understand | Internal notes; no files written |
| 1 | Build the Implementation Plan | `uiux_fix_plan.md` (Native Artifact) |
| 2 | Present for Review | User feedback incorporated into Plan |
| **—** | **HARD STOP** | **No file may be modified until Phase 2 clears** |
| 3 | Execute, Checkpoint, Repeat | `task.md` (Native Artifact) updated; source files edited |
| 4 | Finalize & Verify | `walkthrough.md` (Native Artifact) created |

There is exactly one hard stop: between Phase 2 and Phase 3.

---

## Phase 0 — Ingest & Understand

Read the following, in this order, before writing a single line of the plan.

### 0-A. Read the Audit Findings

Open `uiux_audit.md`. Extract every finding from the Audit Log. For each
finding, note:

- Its severity (CRITICAL / HIGH / MEDIUM / LOW)
- Its category (Accessibility, Visual Hierarchy, Spacing & Layout, Typography,
  Interaction & States, Responsive Design, Design System Deviation,
  Colour & Contrast, Navigation, Form UX, etc.)
- Its file(s) and component(s) affected, with line or selector references
- Whether it was marked as systemic (affecting multiple components or screens)
- Whether it has an `**Updated:**` block (higher-confidence findings — observed
  from multiple angles during the audit)
- Whether it carries a WCAG criterion reference (e.g. WCAG 2.1 AA 1.4.3) —
  these are legally significant in many jurisdictions and must not be silently
  deferred

Also note the **Total Files Audited** and coverage percentage to understand the
scale and representative depth of the findings.

Also copy the **Design System Patterns** section verbatim. It is the style
contract every fix — and every approach — must satisfy.

### 0-B. Read Every Affected File and Component

Before planning a fix, open and re-read each file named in the findings. Do not
rely on the code snippets in the audit log — those snippets were written at a
point in time. For each file or component, note:

- Which design tokens, theme variables, or CSS custom properties it already
  imports (your fix must use these, not raw values)
- Which existing component variants exist (the fix must not silently break a
  variant not tested in the audit)
- Which ARIA attributes or semantic HTML elements are present (removing or
  altering these is a separate risk surface from visual changes)
- Whether the component has a Storybook story or snapshot test (the fix must
  not cause an unintended visual regression in the test suite)
- Whether the component is shared across multiple pages or routes (a change
  here has a wider blast radius than it may appear)

### 0-C. Identify Fix Dependencies

Some fixes must happen before others. Map the dependencies explicitly — they
drive the Execution Order in Phase 1.

Common dependency patterns:

- **Token definitions before usage fixes:** if a colour token or spacing
  variable does not yet exist in the design token file, create it before fixing
  the component that should use it.
- **Shared component fixes before page-level fixes:** if a `Button` component
  has incorrect focus styles, fix the component first — then page-level fixes
  that override those styles become coherent.
- **Base typography scale before heading fixes:** if the type scale is wrong
  at the root level, fix it before normalising individual heading sizes.
- **Responsive breakpoints before layout fixes:** if the breakpoint values
  themselves are wrong, fix them before adjusting the layout rules that
  reference them.
- **Systemic fixes as a group:** findings marked systemic (e.g. "all form
  labels missing `for` attribute") should be fixed together in a single step
  so no partial state exists where some instances have the fix and others don't.
- **Accessibility fixes before aesthetic fixes:** WCAG violations that affect
  keyboard navigation or screen readers should land before cosmetic changes so
  the product is never in a state that is more accessible than it was, then
  less, then more again.

### 0-D. Draft a Concrete Approach for Every Fix

Before writing `uiux_fix_plan.md`, think through the specific implementation
for each finding. For each fix, decide:

- Exactly which lines, selectors, props, or attributes will change and how
- Which design-system constructs will be used (the exact token name, the exact
  component variant, the exact ARIA pattern, the exact breakpoint variable)
- Whether any new token, variable, or import is required
- What the before/after diff looks like conceptually — including what the
  visual or interaction change will be
- What WCAG criterion the fix satisfies, if applicable
- What could go wrong and how the approach mitigates it (e.g. a colour change
  that also affects a dark-mode variant)

These decisions become the **Approach Details** section of `uiux_fix_plan.md`
and are the primary thing the user will review and amend before execution begins.

---

## Phase 1 — Build the Implementation Plan

Create a file named `uiux_fix_plan.md` in the project root (acting as the native Implementation Plan).

This file is the single source of truth for the implementation. It will be
updated as the user provides feedback (Phase 2) and as fixes are completed
(Phase 3). Sections are updated in place; the Execution Log is append-only.

### uiux_fix_plan.md Structure

````markdown
# UI/UX Fix Implementation Plan

> - **Status:** Draft — Awaiting User Review
> - **Source audit:** `uiux_audit.md`
> - **Last updated:** [note what changed and why, on every update]

---

## Design System Patterns (from audit)

_(Copied verbatim from uiux_audit.md — every fix must match these)_

- **Design system / component library:**
- **Colour token convention:**
- **Spacing scale:**
- **Typography scale:**
- **Breakpoint convention:**
- **Icon library:**
- **Component naming convention:**
- **Dark mode / theming approach:**
- **WCAG conformance target:**

---

## Fix Inventory

_(All findings from the audit, normalised into fixable units. Each finding
becomes one Fix Item. Systemic findings that span multiple components become
one Fix Item with multiple targets.)_

| ID | Audit Issue ID(s) | Severity | Title | File(s) / Component(s) | Category | Depends On | Status |
|---|---|---|---|---|---|---|---|
| FIX-001 | ISSUE-001, ISSUE-002 | 🚨 CRITICAL | Focus indicator missing on all interactive elements | `Button.tsx`, `Input.tsx`, `Link.tsx` | Accessibility | — | Pending |
| FIX-002 | ISSUE-003 | 🚨 CRITICAL | Colour contrast ratio 2.1:1 on body text (requires 4.5:1) | `tokens/color.ts` | Colour & Contrast | — | Pending |
| FIX-003 | ISSUE-011 | 🔴 HIGH | Form inputs missing associated `<label>` elements | `ContactForm.tsx`, `LoginForm.tsx` | Accessibility | — | Pending |
| FIX-004 | ISSUE-008 | 🔴 HIGH | Heading hierarchy skips H2 → H4 on dashboard | `Dashboard.tsx` | Visual Hierarchy | — | Pending |
| FIX-005 | ISSUE-016 | 🟠 MEDIUM | Inconsistent spacing between card components (12px vs 16px) | `CardGrid.tsx` | Spacing & Layout | — | Pending |

---

## Approach Details

_(This is the section to review carefully before approving the plan.
Each Fix Item has its own subsection describing exactly what will be changed,
which design-system constructs will be used, and what risks the approach
accounts for. Comment on any subsection — wrong token name, wrong component
API, different ARIA pattern preferred — and the plan will be updated before a
single file is touched.)_

### FIX-001 — Focus indicator missing on all interactive elements

- **Audit Issue ID(s):** ISSUE-001, ISSUE-002
- **Files:** `Button.tsx`, `Input.tsx`, `Link.tsx`
- **WCAG criterion:** 2.4.7 Focus Visible (AA)
- **Approach:**
Add a `focus-visible` CSS rule to each component using the project's existing
`--color-focus-ring` token (value: `#005FCC`). The rule will be:
`outline: 2px solid var(--color-focus-ring); outline-offset: 2px;`
applied via the component's existing CSS Module / styled-component block.
The `:focus-visible` pseudo-class (not `:focus`) is used so that mouse users
are not affected.
- **What will not change:** Component props, variants, and all other styles
remain unchanged. No new dependencies.
- **Risk accounted for:** Verify that no global CSS reset in the project applies
`outline: none` to these elements after the component styles — if it does, the
selector specificity will need to be raised and this will be flagged at the
checkpoint.

---

### FIX-002 — Colour contrast ratio 2.1:1 on body text

- **Audit Issue ID(s):** ISSUE-003
- **File:** `tokens/color.ts`
- **WCAG criterion:** 1.4.3 Contrast (Minimum) (AA)
- **Approach:**
Update the `--color-text-primary` token from `#9CA3AF` (current, failing) to
`#374151` (new, ratio 7.6:1 on white background). This is a single token
change that propagates automatically to every consumer.
- **What will not change:** All other colour tokens. No component files need to
change — they already reference the token correctly.
- **Risk accounted for:** Verify the new value against the dark-mode background
(`--color-surface-dark`: `#1F2937`) — the updated token achieves 9.2:1 there
as well. If a dark-mode override exists that also hard-codes a text colour,
it will be flagged at the checkpoint.

---

### FIX-003 — Form inputs missing associated `<label>` elements

- **Audit Issue ID(s):** ISSUE-011
- **Files:** `ContactForm.tsx`, `LoginForm.tsx`
- **WCAG criterion:** 1.3.1 Info and Relationships (A), 3.3.2 Labels or Instructions (A)
- **Approach:**
Replace the current `<span>` used as a visual label with a proper `<label>`
element using the `htmlFor` prop linked to the existing `id` on each `<input>`.
If no `id` exists, add one using the convention `${fieldName}-input` (matching
the project's existing naming pattern visible in `SignupForm.tsx`).
- **What will not change:** Visual appearance is unchanged — the `<label>` will
receive the same CSS class as the current `<span>`. No props, validation
logic, or layout change.
- **Risk accounted for:** Check that `react-hook-form` or the form library in
use does not programmatically set `aria-labelledby` in a way that would
duplicate labelling. If it does, prefer the library's own label association
API and note the deviation at the checkpoint.

---

### FIX-004 — Heading hierarchy skips H2 → H4 on dashboard

- **Audit Issue ID(s):** ISSUE-008
- **File:** `Dashboard.tsx`
- **WCAG criterion:** 1.3.1 Info and Relationships (A)
- **Approach:**
Change the widget section headings from `<h4>` to `<h2>` (they are the first
heading level below the page `<h1>`). The visual size is controlled by the
`.widget-heading` CSS class, not the HTML element — so this change is
semantics-only and has no visual impact.
- **What will not change:** Visual appearance unchanged. No other files affected.
- **Risk accounted for:** Confirm no JavaScript in the page uses
`querySelectorAll('h4')` to drive behaviour (e.g. an accordion). If it does,
update the selector to use a `data-` attribute instead.

---

### FIX-005 — Inconsistent spacing between card components

- **Audit Issue ID(s):** ISSUE-016
- **File:** `CardGrid.tsx`
- **Approach:**
Standardise the `gap` value in the card grid to `spacing-4` (16px) — the
value used by the majority of instances and documented as the canonical card
gap in the design system docs. The three instances currently using `spacing-3`
(12px) will be updated.
- **What will not change:** Card width, padding, or any other layout property.
- **Risk accounted for:** Verify the 16px gap does not cause the four-column
layout to overflow its container at the 1280px breakpoint — at that width the
available width per card shrinks by 4px total, which is within safe limits.
Flag if a custom breakpoint override is using the 12px value intentionally.

---

## Execution Order

_(Sorted by: dependencies first, then WCAG severity, then blast radius. Non-
obvious ordering decisions are explained.)_

1. **FIX-002** — Token change with zero file dependencies; fixes the contrast
   failure at its root so all subsequent fixes inherit the correct values
2. **FIX-001** — CRITICAL accessibility; no dependencies; safe immediately
3. **FIX-003** — CRITICAL accessibility; isolated to two form files
4. **FIX-004** — HIGH accessibility; semantics-only; isolated to one file
5. **FIX-005** — MEDIUM cosmetic; last to avoid touching layout during
   accessibility fixes

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

### Manual Verification
- Visual inspection of changed components across different breakpoints.
- Accessibility audit (e.g., using Screen Reader or Lighthouse) on the affected pages.
- Verify that design tokens are correctly applied.
````

---

## Phase 2 — Present for Review

This is the hard stop. Do not touch any source file until you have explicit
approval.

Present `uiux_fix_plan.md` to the user. Your message must cover:

1. **Headline summary** — plain-English count of findings at each severity
   level, and how many carry a WCAG criterion (and therefore have legal or
   contractual weight). Do not make the user parse the table to get this.

2. **Execution order rationale** — one sentence justifying the first two or
   three ordering decisions, especially why token/system-level fixes land before
   component-level fixes.

3. **Approach Details call-out** — explicitly direct the user to the Approach
   Details section and tell them this is the most important part to review:

   > "The **Approach Details** section describes exactly what each fix will do —
   > which token, which ARIA pattern, which HTML element, which CSS rule, and
   > which lines change. Please read each subsection and tell me if anything
   > looks wrong before I write a single line of code. Wrong token name? A
   > different ARIA pattern your team prefers? A WCAG exception already approved
   > for this element? This is the right moment to catch that."

4. **Three gating questions:**
   - Are there any fixes to skip entirely (intentional design decision, element
     being replaced, already fixed in another branch or design-system PR)?
   - Are there any fixes to defer (not skip forever, just do after a release or
     pending a design review)?
   - Are there any approaches in the Approach Details you want changed before
     execution starts?

5. **Clear approval prompt** — tell the user exactly what to say to start
   execution, e.g.: *"Reply 'approved' to begin, or share your feedback and
   I'll update the plan before we start."*

### Handling User Feedback

When the user responds with feedback, do not start executing. Update the plan
first. Apply exactly one of these operations to `uiux_fix_plan.md` per piece of
feedback:

| User says | Operation on uiux_fix_plan.md |
|---|---|
| "Skip FIX-005, the 12px gap is intentional" | Move FIX-005 to Deferred/Excluded with reason |
| "Defer FIX-004 until the design system migration is done" | Move FIX-004 to Deferred/Excluded with reason |
| "Do FIX-003 before FIX-001" | Update Execution Order; note the reason |
| "For FIX-001, use `box-shadow` instead of `outline` — our reset nukes outlines" | Update FIX-001's Approach Details subsection; mark *(user-revised)* |
| "The focus ring colour token is `--focus-ring`, not `--color-focus-ring`" | Update Design System Patterns; mark *(user-corrected)*; update every Approach Details subsection that referenced the old name |
| "FIX-002's new value needs to work on our brand-yellow background too, not just white" | Update FIX-002's Approach Details with the additional contrast check; mark *(user-revised)* |
| "There's a FIX-006 you missed — the modal has no focus trap" | Add FIX-006 to Fix Inventory **and** a new Approach Details subsection; place it in Execution Order |

After applying all feedback, update the plan's status line to
`Revised — Awaiting Final Approval` and list what changed in the Last updated
field.

Present the updated plan and ask for final approval. Repeat — update, present,
await — until the user explicitly approves.

**Never interpret silence as approval.** If the user goes quiet after you
present the plan, wait.

---

## Phase 3 — Execute, Checkpoint, Repeat

Execution begins only after explicit user approval. Follow this loop for every
fix in the Execution Order, one at a time.

### Step 3-A. Announce the Fix

Before editing any file, post a short message that echoes the approved approach
from Approach Details:

```
Applying FIX-003 — Form inputs missing associated <label> elements (Issues: ISSUE-011)
Files: ContactForm.tsx, LoginForm.tsx
WCAG: 1.3.1 Info and Relationships (A), 3.3.2 Labels or Instructions (A)
Approach (as approved): Replacing <span> label elements with <label htmlFor>
linked to each input's id. Using id convention "${fieldName}-input" to match
SignupForm.tsx. Visual appearance unchanged — same CSS class applied.
(No other files touched in this step.)
```

This gives the user a final chance to object before the file changes.

### Step 3-B. Apply the Fix

Edit only the files listed for this Fix Item. Do not "while I'm here" fix
adjacent issues. The fix must:

- Match the approach in the approved Approach Details subsection exactly
- Use only tokens, variables, component variants, ARIA patterns, and naming
  conventions from Design System Patterns
- Not change the visual appearance of any element not explicitly named in the
  Fix Item
- Not add new package dependencies without announcing them in Step 3-A
- Not alter existing ARIA attributes or semantic elements beyond what the Fix
  Item specifies

After editing, read the changed file back to verify:

- No syntax error was introduced
- The design token / ARIA attribute / HTML element referenced actually exists
  in the project
- No unintended adjacent lines were changed

### Step 3-C. Update task.md and Implementation Plan

Immediately after applying the fix, update the `task.md` (native Task artifact) checklist and append an entry to the Execution Log in `uiux_fix_plan.md`.

For completed fixes:
1. Append a log entry to `uiux_fix_plan.md`:

```markdown
### ✅ FIX-003 — Form inputs missing associated `<label>` elements (Issues: ISSUE-011)
**Completed**
- **Files changed:** `ContactForm.tsx`, `LoginForm.tsx`
- **What was done:** Replaced all `<span>` label elements with `<label htmlFor>`
  elements. Added `id` attributes to inputs using the `${fieldName}-input`
  convention. CSS class unchanged — visual appearance identical.
- **WCAG criteria satisfied:** 1.3.1 (A), 3.3.2 (A)
- **What was not changed:** Validation logic, form layout, component props.
- **Tests affected:** `ContactForm.test.tsx` snapshot updated to reflect the
  `<label>` element. Functionality tests still pass.
- **Approach deviation:** None — implemented exactly as described in Approach Details.
```

2. Update `task.md` to mark the fix as completed.
3. Locate the issue in `uiux_audit.md` and prepend `✅ FIXED — ` to its title.

For deferred items (items moved to "Deferred / Excluded" in `uiux_fix_plan.md`):
1. Locate the issue in `uiux_audit.md`.
2. Prepend `⏭️ DEFERRED — ` to its title.
3. Replace the **Remediation** section with a **Deferred Reason** section using the user's reasoning from `uiux_fix_plan.md`.
4. If an "Audit Legend" does not exist at the top of `uiux_audit.md`, add one:

```markdown
## Audit Legend

- `✅ FIXED` — Issue resolved in the codebase.
- `🔴 CRITICAL` / `🔴 HIGH` / `🟠 MEDIUM` / `🟡 LOW` — Active audit findings.
- `⏭️ DEFERRED` — Acknowledged by user but out of scope (e.g. intentional pattern, planned refactor, or low priority).
```

### Step 3-D. The Checkpoint

After every single fix — not after every batch, after every single fix — post:

```
Checkpoint after FIX-003
✅ Done: FIX-003 — Form inputs missing associated <label> elements (ContactForm.tsx, LoginForm.tsx) (Issues: ISSUE-011)
⏳ Next: FIX-004 — Heading hierarchy skips H2 → H4 on dashboard (Dashboard.tsx)
        Planned approach: Change <h4> widget headings to <h2>; visual size
        controlled by .widget-heading CSS class — no visual change.

uiux_fix_plan.md and task.md have been updated. Review the change before I continue.
Reply 'continue' to apply FIX-004, 'pause' to stop here, or share feedback
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

Once all fixes are complete, create a `walkthrough.md` (native Walkthrough artifact) summarizing the changes, visual/accessibility tests performed, and screenshots/recordings if possible.

### Step 3-G. Pause Summary

If the user pauses, write a summary at the top of `uiux_fix_plan.md`:

```markdown
<!-- ═══════════════════════════════════════════════════════════════════ -->

## 📋 UI/UX Implementation Summary — [Paused | Complete]

**Paused by:** User request / All fixes applied _(keep one)_
**Fixes completed:** N of M total planned
**WCAG violations resolved:** N of M

### Applied Fixes

| ID | Title | File(s) | WCAG Criteria | Audit Issue ID(s) | Approach deviation? |
|---|---|---|---|---|---|
| FIX-002 | Colour contrast ratio on body text | `tokens/color.ts` | 1.4.3 AA | ISSUE-003 | None |
| FIX-003 | Form inputs missing `<label>` | `ContactForm.tsx`, `LoginForm.tsx` | 1.3.1, 3.3.2 | ISSUE-011 | None |

### Remaining Fixes

| ID | Severity | Title | Audit Issue ID(s) | Reason not yet applied |
|---|---|---|---|---|
| FIX-001 | 🚨 CRITICAL | Focus indicator missing | ISSUE-001, ISSUE-002 | Paused by user |
| FIX-004 | 🔴 HIGH | Heading hierarchy skip | ISSUE-008 | Paused by user |

### Deferred / Excluded

| ID | Title | Audit Issue ID(s) | Reason |
|---|---|---|---|
| FIX-005 | Inconsistent card spacing | ISSUE-016 | User: 12px gap intentional per designer |

### Follow-up Gaps Noted During Implementation

_(Issues noticed while applying fixes that are not in the original audit and
have not been fixed — for the next audit run or a manual design review.)_

- `ContactForm.tsx` — error messages surface via colour only; no icon or text
  pattern to satisfy WCAG 1.4.1 Use of Color (A) — not in this audit's scope
- `Dashboard.tsx` — motion in the widget refresh animation may need
  `prefers-reduced-motion` guard (WCAG 2.3.3 AAA)

### To Resume

Open a new session, reference `uiux_fix_plan.md`, and say:
"Resume UI/UX implementation from FIX-001 — the plan is already approved."

<!-- ═══════════════════════════════════════════════════════════════════ -->
```

---

## What a Fix Must Never Do

| Rule | Reasoning |
|---|---|
| Never fix more than one Fix Item in a single edit | Mixing two fixes makes the checkpoint meaningless and regressions untraceable |
| Never deviate from the approved Approach Details without announcing it | Silent deviations break the review contract |
| Never use a raw colour hex, pixel value, or spacing number when a token exists | Breaks design system consistency and makes future theming changes incomplete |
| Never remove or alter an ARIA attribute without it being explicitly part of the Fix Item | Accessibility attributes have a wider blast radius than they appear |
| Never change the visual appearance of elements not named in the Fix Item | "While I'm here" style tweaks introduce unplanned changes |
| Never rewrite surrounding code not part of the fix | "While I'm here" rewrites introduce unplanned changes |
| Never mark a Fix Item Done if the fix is partial | Mark it ⚠️ Partially Applied and note what remains |
| Never skip the checkpoint | "Trivial" fixes have caused production incidents |
| Never edit `uiux_audit.md` beyond status synchronization | The fixer may prepend `✅ FIXED — ` or `⏭️ DEFERRED — ` to titles and update the body ONLY for Deferred items to include the user's reasoning. |

---

## Keeping uiux_fix_plan.md Consistent

| Section | Mutation rule |
|---|---|
| Status line | Overwrite on every phase transition |
| Last updated field | Overwrite; always describe what changed and why |
| Design System Patterns | Overwrite if user corrects a pattern; mark _(user-corrected)_ |
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
| Starting execution before plan approval | Fixes applied to an unseen plan conflict with user decisions and design intent | Hard stop at Phase 2 |
| Skipping Approach Details review | User may object to the token name, ARIA pattern, or HTML element used | Explicitly direct user to Approach Details in Phase 2 |
| Applying multiple fixes in one edit | A visual regression or accessibility failure cannot be isolated to a single cause | One Fix Item = one edit = one checkpoint |
| Treating user silence as approval | The user may be reviewing carefully, checking with a designer, or running a screen reader test | Explicitly wait; re-prompt if needed |
| Deviating from approved approach without announcement | Breaks the review contract; user approved one pattern, got another | Announce any deviation at the checkpoint; document it in the Execution Log |
| Using hard-coded values instead of design tokens | The fix passes visually today but breaks on theme switch, dark mode, or the next design-system update | Re-read Design System Patterns before every fix |
| Marking a fix Done before verifying visuals | An invisible component is worse than an ugly one | Always check rendering metrics if applicable |
| Adding "bonus fixes" not in the plan | Unreviewed changes bypass the safety model and can alter interactions the user didn't approve | Add to Fix Inventory + Approach Details; get it reviewed at a checkpoint |
| Illegally editing `uiux_audit.md` | Altering audit data destroys the project record | Only edit `uiux_audit.md` to synchronize status (Fixed/Deferred) and reasons; never rewrite trace payloads or other metadata. |
| Vague Execution Log entries ("fixed the styles") | Makes the log useless for understanding what changed | Always specify files, elements, token names, WCAG criteria addressed, what was not changed, tests affected, approach deviation |
| Fixing WCAG violations without noting the criterion | Removes traceability for compliance reporting | Every accessibility fix must record which criterion it satisfies |