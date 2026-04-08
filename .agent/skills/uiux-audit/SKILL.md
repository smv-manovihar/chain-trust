---
name: uiux-audit
description: >
  Use this skill when asked to audit, review, or scan a codebase for UI/UX problems,
  design inconsistencies, user flow breakdowns, or interface clutter. Triggers: "audit my UI",
  "review my UX", "find design inconsistencies", "check my user flows", "audit my frontend",
  "find UI clutter", "UX review", "is my interface consistent?", "review my components for
  design issues". The agent FIRST discovers and inventories every real frontend file in the
  report. It FIRST discovers and inventories every real frontend file in the project,
  traces actual user flows through the interface, and produces a structured finding
  report. It maintains two living artifacts: `uiux_audit.md` (status/findings) and
  `audit_traces.md` (low-level execution traces). It NEVER guesses which files exist —
  it reads the project tree and confirms every file before auditing it. It audits only —
  it does NOT fix, rewrite, or refactor anything.
  Do NOT use for backend reliability, security pen-testing, performance profiling,
  accessibility (WCAG) compliance scanning, or SEO — those are separate concerns.
compatibility: >
  Tool-agnostic. Works in any AI code editor or agent runtime: Cursor, Windsurf, GitHub Copilot
  Workspace, Zed, JetBrains AI, Cline, Continue, Aider, Claude Code, or any environment with the
  ability to read files and write markdown. If the environment provides file-tree or search tools,
  these MUST be used to discover files rather than guessing paths. Every step is described as a
  reading and reasoning task — never a command to execute and never a guess.
---

# UI/UX Audit Skill

---

## The Core Philosophy

Before learning any procedure, internalize this:

**Bad UI/UX is almost never one broken component.**
It is a slow accumulation — a button that says "Submit" on one screen and "Continue" on the next,
a modal that opens from the left on desktop but slides from the bottom on mobile only sometimes,
a loading state that shows a spinner on three flows and nothing on the fourth — that individually
feel like minor polish issues but compound into an interface that users don't trust.

Your job is not to flag every pixel that is off. Your job is to trace the paths that
_real users actually take_ through this interface and identify the gaps, contradictions,
and friction points that will cause confusion, abandonment, or silent failure.

There are two failure modes to avoid:

- **Over-flagging**: marking every `margin: 12px` vs `margin: 8px` discrepancy as HIGH.
  Users stop trusting the report.
- **Surface-only scanning**: reading only the landing page component and declaring the UI
  consistent. The worst clutter and flow breakages live in secondary screens — settings,
  error states, empty states, and edge-case modals that nobody demos.

This skill keeps you between those failure modes by giving you a bounded discovery method,
a severity rubric with concrete examples, and explicit rules about when to stop.

---

## What is a Flow?

A **flow** in this UI/UX audit context is a complete, end-to-end user journey — from the moment a user intends to perform a task to its final confirmation state. 

A UI/UX flow **MUST**:
1.  **Start at an Entry Point**: A Landing page, a Dashboard link, or an incoming deep-link.
2.  **Path through the Interaction**: Trace through all intermediate screens, form steps, modals, and conditional states.
3.  **End at the Terminal State**: Reach a success confirmation, a dashboard redirect, or an error recovery state.

Tracing "just a component" (e.g., only the button without its modal, or only the form without its validation feedback) is an audit failure. You haven't audited the UI/UX until you've experienced the transition, the feedback, and the perceived duration of the entire journey.

---

This skill is a **read-only diagnostic instrument**.

At no point will you:

- Rewrite a component
- Refactor a file
- Suggest a code change with a diff or before/after snippet
- Create new files (except `uiux_audit.md`)
- Rename, move, or delete anything

Every finding ends with a plain-language **Recommendation** — a description of _what should
change_ and _why_, written for a designer or developer to act on. It does NOT include code.

If you find yourself writing JSX, CSS, or any implementation — stop. Delete it. Replace it
with a plain-English description of the problem and the desired outcome.

---

## Phase 0 — Discover the Real Project. Touch Nothing Else.

> **This phase is not optional. Do not open a single UI component until Phase 0 is complete.**
> **Do not guess file paths. Do not assume directory names. Read the actual tree.**

You are about to audit a project built by a real team. That team has opinions about structure,
naming, and design systems. If your findings reference files that don't exist or miss entire
subsystems because you assumed a standard layout, the report is worthless.

Phase 0 has four parts.

---

### 0-A. Build the Real File Inventory

**Step 1: Read the project root.**
List the top-level contents of the repository. Note every directory and every config file.
Do not assume what is inside a directory — open it.

**Step 2: Locate the frontend root.**
Look for directories commonly named: `src/`, `app/`, `pages/`, `views/`, `frontend/`,
`client/`, `web/`, `ui/`, `components/`. If the project is a monorepo, there may be
multiple frontend packages — find all of them.

**Step 3: Recursively inventory frontend files.**
Inside every frontend directory you found, list all files. For each file, record:

- Its full relative path
- Its file type (`.tsx`, `.jsx`, `.vue`, `.svelte`, `.html`, `.css`, `.scss`, `.module.css`, etc.)
- A one-line guess at its role based solely on its name and location

Write every discovered file into the **File Inventory** section of `uiux_audit.md`.
This is your ground truth. You will only audit files that appear in this inventory.
You will never audit a file you have not listed here first.

**Step 4: Count your inventory.**
Run `git ls-files --cached --others --exclude-standard <frontend-dir> | measure-object -line` (or equivalent for the OS) to count the total number of files in the frontend project(s). Record this as your **Total Discovered Frontend Files**. Every file you read during the audit increments the **Audited File Count**. Both numbers are updated live in the progress header of `uiux_audit.md`.

> ⚠️ **If you cannot list a directory's contents, say so explicitly in the audit file.**
> Never fabricate a file path. Never audit a file you have not confirmed exists.

---

### 0-B. Identify the Design System (or Its Absence)

Read the following landmark files — if they exist — to understand what design language
this project is operating in:

| Look for | What it tells you |
|---|---|
| `package.json` | Is there a UI library? (MUI, Chakra, shadcn/ui, Ant Design, Tailwind, Bootstrap, etc.) |
| `tailwind.config.*` | What custom colors, spacing, and typography tokens are defined? |
| `theme.*`, `tokens.*`, `variables.css`, `_variables.scss` | What are the official design tokens? |
| A dedicated `components/` or `ui/` folder | Is there a shared component library? What's in it? |
| `globals.css`, `index.css`, `app.css` | Are there global style overrides that might conflict? |
| Any Storybook, Figma export, or `design-system/` folder | Is there a reference spec to compare against? |

Record your findings in the **Design System Profile** section of `uiux_audit.md`.

If no design system exists, note that explicitly — it means every consistency finding is
potentially systemic rather than isolated.

---

### 0-C. Map the User Flows

Read the routing layer to understand what screens exist and how they connect.

| Look for | What it tells you |
|---|---|
| `App.tsx`, `App.jsx`, `app/layout.tsx` | Top-level route structure |
| `router.tsx`, `routes.tsx`, `routes/index.*` | All registered routes and their nesting |
| `pages/` or `app/` directory (Next.js / Nuxt / SvelteKit) | File-based routes — each file is a screen |
| `navigation/`, `nav/`, `sidebar.*`, `header.*` | How users move between screens |
| `BottomNav.*`, `Tabs.*`, `Drawer.*` | Mobile navigation patterns |

Build a **User Flow Map** — a numbered list of every distinct flow a user can take:

```
Flow 1: Onboarding       → Landing → Sign Up → Verify Email → Dashboard
Flow 2: Authentication   → Sign In → Dashboard / Forgot Password → Reset
Flow 3: Core Feature     → Dashboard → Feature Entry → [Steps] → Confirmation
Flow 4: Settings         → Profile → Edit → Save
Flow 5: Error Recovery   → Any screen → Error State → Recovery Action
```

You will audit flows in this order: highest-traffic first, error states last.
If you cannot determine traffic priority, audit in the order the router registers them.

Record the flow map in `uiux_audit.md` before auditing any component.

---

### 0-D. Calibrate the Baseline

Before flagging any finding, silently read one complete user flow — from the entry screen
component through to the confirmation or terminal screen — without writing any findings yet.

Ask yourself:

- How visually consistent is this flow on its own? (Spacing, typography, color usage)
- Does the interaction pattern feel deliberate or ad-hoc?
- Are there signs of multiple authors — components that use different styling approaches?
- Are there obviously unfinished screens or placeholder content in production paths?
- Does the navigation make it clear where the user is and how to go back?

This baseline determines whether a finding is an isolated anomaly or a systemic pattern.
A systemic pattern is always higher severity. Set your calibration before your first finding.

---

## Phase 1 — Initialize `uiux_audit.md`

Create this file before auditing any component.
Update it after every file you read. It is your only persistent state.

```markdown
<!-- ══════════════════════════════════════════════════════════════════ -->
<!-- FINAL SUMMARY block will be prepended here when the audit ends    -->
<!-- ══════════════════════════════════════════════════════════════════ -->

# UI/UX Audit — Progress

## Artifacts
- **Findings Log**: `uiux_audit.md` (This file)
- **Execution Traces**: [audit_traces.md](file:///absolute/path/to/audit_traces.md)

## Current Status

| Field | Value |
|---|---|
| **Status** | Phase 0 — Discovering Files / Auditing Flow N of 5 / ⛔ Terminated |
| **Status** | Phase 0 — Discovering Files / Auditing Flow N of [Total] / ⛔ Terminated |
| **Files Discovered** | X |
| **Files Audited** | Y / X (Z%) |
| **Flows Completed** | Z / [Total] |
| **Completed Flow IDs** | `FLOW-001` → `FLOW-00Z` |
| **Budget Limit Hit** | — |

---

## File Inventory

_(Every frontend file confirmed to exist — populated during Phase 0-A. Never modified after Phase 0.)_

| # | Path | Type | Role (inferred from name/location) | Audited? |
|---|---|---|---|---|
| 1 | `src/pages/Login.tsx` | TSX | Authentication screen | ✅ |
| 2 | `src/components/Button.tsx` | TSX | Shared button primitive | ✅ |
| 3 | `src/components/Modal.tsx` | TSX | Shared modal wrapper | ❌ |
| … | … | … | … | … |

**Total Discovered: X | Total Audited: Y**

---

## Design System Profile

_(Filled during Phase 0-B)_

- **UI Library / Framework:**
- **CSS Approach:**
- **Design Tokens defined:** (colors, spacing, typography — list them or note absence)
- **Shared Component Library:** (path, what's in it, or "none found")
- **Official Brand/Style Reference:** (Figma link, Storybook URL, or "none found")
- **Known Inconsistency Risks from Phase 0-B:**

---

## User Flow Map

_(Filled during Phase 0-C — drives audit order)_

| Flow # | Name | Entry Point | Terminal Screen | Files Involved |
|---|---|---|---|---|
| 1 | Onboarding | `pages/Landing.tsx` | `pages/Dashboard.tsx` | [list] |
| 2 | Authentication | `pages/Login.tsx` | `pages/Dashboard.tsx` | [list] |
| … | … | … | … | … |

---

## Execution Queue

### ✅ Completed Flows
- `FLOW-001`: [Description]

### 🔍 Current Flow: `FLOW-002` - [Description]
_(Strike through (text styling) audited files in the current flow inventory. Mark the next file with `← NEXT`.)_
- `src/pages/Login.tsx` (Struck through)
- `src/components/LoginForm.tsx` ← NEXT

### ⏭️ Next Upcoming Flows
- `FLOW-003`: [Description]

---

## Audit Log

_(One finding block per issue, appended as discovered)_

[findings appear here]

---

## Document Mutation Rules

`uiux_audit.md` is a **living document**, not a log file and not a scratch pad.
Different sections have different mutation rules. Violating these rules is the most
common way an agent destroys the audit trail mid-run.

### What each section is allowed to do

| Section | Rule | Reasoning |
|---|---|---|
| **Current Status table** | Always overwrite on every file read | It is a live counter, not a history |
| **File Inventory** | List once in Phase 0-A; mark rows with ✅ as audited; never delete discovered files | Ground truth for coverage tracking |
| **Design System Profile** | Fill once in Phase 0-B; overwrite if a deeper read corrects an earlier assumption | Structural facts can be revised |
| **User Flow Map** | Fill once in Phase 0-C; drives the audit order | Sequence of user journeys to be audited |
| **Execution Queue** | Maintain three sub-sections: Completed Flows, Current Flow (with file trace), and Upcoming Flows. Strike through files in the Current Flow as they are read; never delete completed flows or files. | Provides a clear view of audited vs. pending end-to-end journeys. |
| **Audit Log** | **Append only by default.** Only update to escalate severity or expand blast radius. | Preserves the record of what was found, when, and in what state |

---

## Phase 1.5 — The Trace Log (`audit_traces.md`)

Before starting Phase 2, initialize or update `audit_traces.md`. This file contains the "Ground Truth" for every flow. It is a separate file to keep `uiux_audit.md` clean and scannable.

**Rules for the Trace Log:**
1. **Flow IDs are Primary Keys**: Every trace header **MUST** include a unique ID (e.g., `### FLOW-001`).
2. **Atomic Steps**: Every screen transition must be logged with the specific component and logic traced.
3. **ID-Based Retrieval**: When you need to revisit a trace, use `grep_search` or `view_file` on a specific range containing the Flow ID. **NEVER** read the entire `audit_traces.md` file if it exceeds 100 lines; use the ID to jump to the relevant section.

```markdown
# Reliability Audit — Flow Traces

### 🔍 Trace — FLOW-001: [Description]
(Follow the Flow Trace Template from Phase 2)
```
```

---

## Phase 2 — Conduct the Audit

Audit flows in the order established in the User Flow Map.
For each flow, read every component file involved (confirmed in the File Inventory).
After reading each file, mark it ✅ in the File Inventory, update the current flow entry in
`audit_traces.md`, strike it through in the Execution Queue, and increment **Files Audited**.

### What to Look For

For every file you read, check all of the following dimensions:

---

#### Dimension 1: Visual Consistency

- **Typography**: Are heading levels, font sizes, weights, and line-heights used consistently
  across screens? Does `<h1>` always mean the same thing visually?
- **Color usage**: Are colors applied from the design token set? Are there hard-coded hex
  values that differ from the defined palette?
- **Spacing**: Are margin/padding values drawn from a consistent scale
  (e.g., multiples of 4px or 8px) or are they arbitrary?
- **Iconography**: Is one icon library used, or are multiple icon sets mixed?
  Are icon sizes consistent for the same semantic role (e.g., all action icons 20px)?
- **Border radius**: Are card corners, buttons, inputs, and modals using the same radius value?
- **Shadow/elevation**: Is the elevation system consistent — does a modal always sit higher
  than a card, does a tooltip always sit above a modal?
- **Button styles**: Is there one primary button style? One secondary? Are destructive actions
  always red? Are disabled states visually consistent across all button instances?

---

#### Dimension 2: User Flow Coherence

- **Labels and CTAs**: Does the same action have the same label everywhere?
  (e.g., "Save" vs "Save Changes" vs "Update" vs "Apply" — pick one)
- **Step progression**: In multi-step flows, is the user always shown where they are
  and how many steps remain?
- **Back navigation**: Can the user always get back to where they came from?
  Is the back behavior consistent (browser back, in-app back button, breadcrumb)?
- **Confirmation patterns**: Are destructive actions (delete, cancel subscription) always
  gated by a confirmation step? Is the confirmation pattern consistent?
- **Success states**: After a user completes an action, are they always shown a success
  confirmation? Is the success pattern (toast, banner, inline, redirect) consistent?
- **Form flow**: Are forms submitted the same way everywhere? (Enter key, button click, auto-save)
  Do all forms validate before submission? Is the validation feedback placement consistent?

---

#### Dimension 3: Loading and Async State Handling

- **Loading indicators**: When data is being fetched, is a loading state always shown?
  Is it always the same component (spinner, skeleton, shimmer) or mixed?
- **Skeleton screens**: If skeletons are used in some places, are they used everywhere
  data is async? Or do some screens just render empty and shift layout?
- **Partial loading**: Do components ever render with some data but show blank spaces
  for data that hasn't arrived yet?
- **Stale data**: Is there a clear indicator when displayed data might be out of date?
- **Infinite scroll vs pagination**: Is one pattern used consistently, or does the app
  mix them depending on the screen?

---

#### Dimension 4: Empty States

- **Always present**: Does every list, table, feed, search result, and dashboard widget
  have an empty state — a message and ideally an action — for when there is no data?
- **Consistent design**: Do all empty states use the same visual pattern
  (illustration + heading + subtext + CTA, or just text)?
- **Actionable**: Do empty states give the user something to do next, or do they just
  say "No results found" and stop?

---

#### Dimension 5: Error States and Validation

- **Inline validation**: Are form field errors always shown inline, below the field,
  using consistent color (red) and iconography?
- **Error message voice**: Are error messages written in a consistent tone?
  ("Invalid email" vs "Please enter a valid email address" — pick one style)
- **Page-level errors**: When a page fails to load, is there always an error state
  with a retry action? Or do some screens just go blank?
- **Network error handling**: Is there a consistent pattern for connection failures?
- **Error boundary coverage**: Are errors contained locally (component-level) or do
  they crash the entire page?

---

#### Dimension 6: Responsive and Adaptive Behavior

- **Breakpoint consistency**: Are the same breakpoints used everywhere, or do some
  components define their own custom breakpoints?
- **Navigation adaptation**: Does the nav change form consistently between mobile and
  desktop? (hamburger menu, bottom bar, sidebar — is the switch always at the same breakpoint?)
- **Touch targets**: On mobile, are all interactive elements at least 44×44px?
- **Content reflow**: Does content reflow gracefully at narrow widths, or do elements
  overflow, overlap, or disappear?
- **Modal behavior on mobile**: Do modals that open as center-screen dialogs on desktop
  switch to bottom sheets or full-screen on mobile — consistently?

---

#### Dimension 7: Information Hierarchy and Clutter

- **Visual weight**: Is the most important action on each screen visually dominant?
  Or are all elements competing equally for attention?
- **Too many CTAs**: Does any screen have more than 2–3 primary actions visible
  at once without a clear hierarchy?
- **Cognitive overload**: Do any screens present more information than a user can
  reasonably process in a single view? Is progressive disclosure used where it should be?
- **Redundant labels**: Are there labels that repeat information already visually obvious
  from context (e.g., a search bar inside a "Search" section with a "Search:" label)?
- **Dead zones**: Are there large areas of white space that serve no visual or structural
  purpose, leaving the layout feeling unbalanced?
- **Icon-only actions**: Are there icon buttons with no label or tooltip that would be
  ambiguous to new users?

---

## Phase 3 — Efficient Context Retrieval

As the audit grows, the `audit_traces.md` file will become large. To maintain speed and accuracy:

1. **Grep the ID**: If a finding refers to `FLOW-005`, search for `### FLOW-005` in `audit_traces.md` to find the line number.
2. **Targeted View**: Read a 50-line window around that line number to understand the context.
3. **The Progress Map**: Always keep `uiux_audit.md` open as your primary dashboard for "where am I?".

---

#### Dimension 8: Interaction and Feedback Consistency

- **Hover states**: Do all interactive elements have hover states? Are they consistent
  in style (background change, underline, color shift)?
- **Focus states**: Are keyboard focus rings visible and consistent?
  (This is also an accessibility concern, but flag it as a UX consistency issue here)
- **Click feedback**: Do buttons give immediate visual feedback on click?
  Are there actions that feel unresponsive because no feedback is shown?
- **Transition and animation**: Are page transitions and micro-animations consistent
  in duration and easing? Or do some screens animate and others cut abruptly?
- **Toast and notification placement**: Are toasts always in the same screen position?
  Same duration before auto-dismissal?

---

## The Finding Template

Every finding appended to the Audit Log must use this exact format.
Do not deviate. Do not add code. Do not write implementations.

```markdown
### 🔴 [CRITICAL | HIGH | MEDIUM | LOW] — <Short, specific title>

| Field | Detail |
|---|---|
| **Issue ID** | `ISSUE-NNN` (Sequential, e.g. ISSUE-001) |
| **Flow** | Flow 2: Authentication → `pages/Login.tsx` → `pages/Dashboard.tsx` |
| **Files** | `src/pages/Login.tsx`, `src/pages/SignUp.tsx` (lines noted where relevant) |
| **Dimension** | Visual Consistency / Flow Coherence / Loading States / Empty States / Error States / Responsive / Information Hierarchy / Interaction Feedback |
| **Systemic?** | Yes — also in `FileA`, `FileB`, `FileC` / No — isolated to this screen |

**The Problem**
Describe exactly what is wrong and why it creates friction or confusion for the user.
Be specific: name the screen, the element, and the conflicting behavior.
Do NOT include code or implementation details.

Example of good specificity:

> The "Continue" button on `SignUp.tsx` uses a filled primary style. The equivalent
> action button on `Onboarding/Step2.tsx` uses a ghost/outlined style for the same
> semantic role. Users who sign up organically and users who are invited experience
> different visual language for the same action, creating inconsistency in learned behavior.

**User Impact**
State concretely: what does this cause the user to experience?
(Confusion, hesitation, false confidence, abandonment, inability to complete a task,
cognitive overload, inability to recover from an error.)
State how many screens or flows are affected.

**Recommendation**
Plain English only. Describe what should change and why, without writing any code.
If this is a systemic finding, describe the single principle that should be applied
across all listed files.

Example:

> Standardize all primary forward-progression CTAs to use the filled primary button
> style as defined in `components/Button.tsx`. Ghost buttons should be reserved for
> secondary or optional actions. Audit all flow terminal actions for this rule.
```

---

## Severity Rubric

Assign severity using this table. Consult it for every finding. Do not use intuition alone.

| Severity | Condition | Concrete UI/UX examples |
|---|---|---|
| **CRITICAL** | A user cannot complete a core task. Flow is broken or misleading in a way that causes failure, data loss, or irrecoverable confusion. | A "Back" button that skips a step and loses unsaved form data; a confirmation modal with no "Cancel" option; a required field that is hidden below the fold with no scroll indicator; an error state with no message and no way to retry |
| **HIGH** | Significant friction that will cause measurable abandonment or repeated user errors on a high-traffic flow. | CTA labels that contradict between steps (e.g., "Next" → "Continue" → "Submit" → "Finish" in a single 4-step flow); no loading state on a form submission that takes 3+ seconds; empty state with no actionable next step on the main dashboard; form resets entirely on a validation error |
| **MEDIUM** | Noticeable inconsistency or clutter that degrades trust and professionalism but does not block task completion. | Two different icon libraries mixed on the same screen; spacing values that alternate between 12px and 16px with no pattern; three different modal animation styles across the app; inline error messages that use different colors on different forms |
| **LOW** | Minor inconsistency, cosmetic rough edge, or small deviation from the design system with no user impact. | A heading that is 1px too large relative to the scale; a tooltip on desktop that has no mobile equivalent; an empty state illustration used on one screen but absent from an otherwise identical screen elsewhere |

**Systemic escalation rule**: if the same dimension fails in **four or more files**,
escalate the finding by one severity level. State the escalation reason explicitly.
A systemic MEDIUM becomes HIGH. A systemic LOW becomes MEDIUM.

---

## Audit Budget and Termination

The audit runs until one of three limits is hit:

| Limit | Default | When to adjust |
|---|---|---|
| **Max Flows** | 6 complete user flows | Increase for very large apps; decrease for focused audits |
| **Max Files** | `max(30, 10% of Discovered Files)` | Never count non-frontend files toward this budget |
| **Dead End** | All discovered files have been audited | Natural completion |

When a limit is hit, stop auditing immediately and write the Final Summary.

---

## Phase 3 — The Final Summary Block

When any budget limit is reached, prepend this block to the very top of `uiux_audit.md`.

```markdown
<!-- ══════════════════════════════════════════════════════════════════ -->

## ⛔ FINAL SUMMARY — UI/UX Audit Complete

**Terminated by:** Max Flows / Max Files / All Files Audited _(keep one)_
**Files discovered:** X | **Files audited:** Y / X (Z%) | **Flows completed:** Z / [total]

### Overall UX Health: 🔴 Broken / 🟠 High Friction / 🟡 Moderate / 🟢 Polished

_(One paragraph. State: (a) the single most damaging finding and what user behavior it
causes; (b) the most pervasive inconsistency across flows and how many files it affects;
(c) which dimension — consistency, flow coherence, loading states, etc. — had the highest
finding density; (d) whether the issues are isolated anomalies or reflect a systemic
absence of a shared design language.)_

### Finding Counts

| Severity | Count |
|---|---|
| 🔴 CRITICAL | N |
| 🟠 HIGH | N |
| 🟡 MEDIUM | N |
| ⚪ LOW | N |
| **Total** | **N** |

### Dimension Breakdown

| Dimension | Finding Count | Most Affected Flow |
|---|---|---|
| Visual Consistency | N | Flow X |
| Flow Coherence | N | Flow X |
| Loading & Async States | N | Flow X |
| Empty States | N | Flow X |
| Error States | N | Flow X |
| Responsive Behavior | N | Flow X |
| Information Hierarchy | N | Flow X |
| Interaction Feedback | N | Flow X |

### Top 5 Issues — In Priority Order

1. **[Screen / Component]** — [what it is and what it causes the user to experience]
2. **[Screen / Component]** — [what it is and what it causes the user to experience]
3. **[Screen / Component]** — [what it is and what it causes the user to experience]
4. **[Screen / Component]** — [what it is and what it causes the user to experience]
5. **[Screen / Component]** — [what it is and what it causes the user to experience]

### Files Not Yet Audited

_(Files in the inventory that were not reached in this run — for the next audit session.)_

| Path | Type | Why High Priority Next |
|---|---|---|
| `src/pages/Settings.tsx` | TSX | Settings flows not audited; common source of UX debt |
| … | … | … |

<!-- ══════════════════════════════════════════════════════════════════ -->
```

After writing the summary, send the user one notification message in this format:

> **Audit complete — [limit name] reached.**
> `uiux_audit.md` contains [N] findings across [Z] flows ([Y] of [X] discovered files audited).
> Most urgent: [one sentence on the highest-severity finding and its user impact].
> Files not reached this run are listed in the summary for the next session.

---

## Anti-Patterns That Invalidate an Audit

If you catch yourself doing any of these, stop and correct before continuing.

| Anti-Pattern | Why It Is Wrong | Correction |
|---|---|---|
| Auditing a file path you have not confirmed exists | Fabricated findings destroy trust in the report | Only audit files listed in the Phase 0-A File Inventory |
| Writing code or diffs in a finding | This skill audits — it does not implement | Replace all code with plain-English descriptions of the problem |
| Flagging a missing feature as a UX finding | Audits assess existing flows, not absent ones | Ask: "Does this cause an existing flow to fail or confuse?" If no, skip |
| Reading only the homepage / landing screen | The worst UX debt lives in settings, error states, and edge flows | Always trace at least one non-happy-path flow |
| Assigning CRITICAL to a cosmetic issue | Destroys severity calibration | Re-read the rubric; cosmetic = LOW unless it blocks a task |
| Not updating the File Inventory after each file                | Makes the Audited count unreliable                                | Mark every file ✅ immediately after reading it                             |
| Counting a file as audited without reading it                  | Inflates the audited count                                        | A file is audited only if you read its content and checked all 8 dimensions |
| Flagging the same root cause as multiple findings              | Inflates finding count; masks the real systemic issue             | Consolidate into one systemic finding with all affected files listed        |
| Stopping after the happy path                                  | Error states and empty states are where most UX debt hides        | Every flow audit must include its failure path                              |
| Assuming a design system exists without reading `package.json` | May audit against a system that isn't there                       | Always complete Phase 0-B before writing any finding                        |

---

## Per-File Mental Checklist

Run through this silently for every file before marking it ✅ in the inventory.
Do not include this checklist verbatim in `uiux_audit.md`.

```
Visual Consistency
  [ ] Typography uses defined scale (no arbitrary font sizes)
  [ ] Colors drawn from token set (no unexplained hard-coded hex values)
  [ ] Spacing follows a consistent scale (multiples of 4 or 8, or defined tokens)
  [ ] Iconography from one library only; sizes consistent per semantic role
  [ ] Button variants used semantically (primary = primary action, ghost = secondary)
  [ ] Border radius and shadow match the rest of the system

Flow Coherence
  [ ] CTA labels match equivalent actions on other screens
  [ ] Multi-step flows show position and total steps
  [ ] Back / cancel navigation exists and works predictably
  [ ] Destructive actions have a confirmation gate
  [ ] Success state is always shown after a completed action

Loading & Async States
  [ ] Every async data fetch has a loading indicator
  [ ] Loading indicator type is consistent with the rest of the app
  [ ] No empty-then-shift layout caused by missing skeleton

Empty States
  [ ] Every list and data surface has an empty state
  [ ] Empty state includes an actionable next step
  [ ] Empty state visual pattern is consistent with others in the app

Error States
  [ ] Every form field has inline validation feedback
  [ ] Error messages use a consistent tone and placement
  [ ] Page-level errors have a retry action
  [ ] Error does not crash the whole page when it should be contained

Responsive Behavior
  [ ] Breakpoints consistent with the rest of the app
  [ ] Navigation adapts correctly at mobile breakpoint
  [ ] Touch targets meet minimum size on mobile
  [ ] No content overflow or overlap at narrow widths

Information Hierarchy & Clutter
  [ ] One dominant primary action per screen
  [ ] No more than 2–3 primary CTAs visible simultaneously
  [ ] Progressive disclosure used where information density is high
  [ ] No redundant or self-describing labels

Interaction Feedback
  [ ] All interactive elements have hover states
  [ ] Keyboard focus rings visible
  [ ] Buttons give immediate click feedback
  [ ] Animations consistent in timing and easing
  [ ] Toasts and notifications appear in consistent position
```