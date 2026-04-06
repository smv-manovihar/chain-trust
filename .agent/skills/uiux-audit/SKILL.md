---
name: ui-ux-audit
description: >
  Use this skill when asked to audit, review, or scan a codebase or design system for UI/UX
  consistency, component correctness, accessibility baseline, and interaction reliability.
  Triggers: "audit the UI", "check component consistency", "review the design system usage",
  "find icon inconsistencies", "check button styles", "audit terminology", "review user flows",
  "check accessibility", "is the UI consistent?". The agent traces complete end-to-end user
  flows (not single files), learns the project's design system and component conventions before
  writing anything, maintains a living audit_progress.md and a separate audit_traces.md, and
  terminates cleanly when the scan budget is exhausted.
  Do NOT use for backend reliability, security, or performance profiling — those are separate concerns.
compatibility: >
  Tool-agnostic. Works in any AI code editor or agent runtime: Cursor, Windsurf, GitHub Copilot
  Workspace, Zed, JetBrains AI, Cline, Continue, Aider, Claude Code, or any environment with
  read-file and search capabilities. When specialized search or grep tools are available they
  MUST be used instead of manual scanning to stay within token budget. Every step is framed
  as a reading and reasoning task, not a terminal command.
---

# UI/UX Consistency Audit Skill

---

## The Core Philosophy

Before learning any procedure, internalize this:

**UI inconsistency is a trust problem before it is an aesthetic problem.**

A user who clicks a blue "Confirm" button on page A and then encounters a green "Submit" button
on page B doing the exact same action does not think *"the design team is sloppy."* They think
*"am I on the right page? Is this a different action?"* Inconsistency creates doubt. Doubt kills
conversion. At scale, it increases support tickets and erodes brand trust.

Your job is not to redesign the product. Your job is to trace the paths *real users actually
take* through this UI and find the places where: the same concept is named differently in two
screens, an icon means one thing here and another thing there, a primary button appears in the
bottom-right on every screen except one, or a component is built from scratch when a shared
component already exists.

There are two failure modes to avoid:

- **Nitpick fatigue**: flagging every spacing inconsistency as CRITICAL. Developers stop trusting
  the report and the real issues are buried.
- **Surface-level pass**: calling the UI consistent after only reading three component files.
  The worst inconsistencies live in the edge-case flows — error states, empty states, mobile
  breakpoints — that nobody tests manually.

This skill keeps you between those failure modes with a bounded method, a severity rubric with
concrete examples, dual persistent files for findings vs. traces, and explicit rules for when to stop.

---

## Definitions

### What is a Flow?

> **A flow is a complete end-to-end user journey — from the moment a user lands on a trigger
> surface to the moment they receive a terminal outcome (success, error, or exit).**

A flow is **not**:
- A single component file
- A single page render
- A single function inside a component

A flow **is**:
- User opens app → navigates to Settings → changes email → sees confirmation toast → dismissed
- User clicks "Add to Cart" → cart drawer opens → user adjusts quantity → checks out → sees
  order confirmation screen
- User's session expires → sees session-expired modal → clicks "Log in again" → is redirected
  back to where they were

**Why this definition matters:** A button label inconsistency only becomes a real problem when
you see it across the two screens a user visits in sequence. A loading state bug only matters
when you trace the actual async flow from trigger to resolution. File-level reading produces
file-level observations. Flow-level tracing produces user-level reliability findings.

Each flow gets a `FLOW-NNN` ID and lives in `audit_traces.md`. Every issue found is linked
to the flow(s) in which it was observed.

### What is an Issue?

An issue is a finding that a user can observe or be harmed by. It gets an `ISSUE-NNN` ID.
A single issue can surface across multiple flows — if the same broken pattern appears in two
different flows, both `FLOW-NNN` IDs are listed on the issue. The issue is written once, and
the flow trace log records where it appeared.

---

## Phase 0 — Learn the Project Before You Touch Anything

> **This phase is not optional. Do not open a component file until Phase 0 is complete.**

You are about to write findings that will be read by the people who built this UI. If your
remediations reference component names that don't exist, import paths that are wrong, or
styling conventions the team abandoned, they will not trust the report.

Phase 0 has three parts.

---

### 0-A. Build the Design System Map

Read only landmark files — files that describe the project's design shape, not its logic.
Answer these four questions:

**Q1: What is the UI stack?**
Look for: `package.json` (identify: React/Vue/Svelte/Angular, CSS framework, component
library, icon library, animation library). Note: Tailwind, shadcn/ui, MUI, Chakra, Radix,
Framer Motion, Lucide, HeroIcons, Font Awesome, etc. Each has its own consistency risks.

**Q2: Is there a design token layer?**
Look for: `tailwind.config.*`, `tokens.ts`, `theme.ts`, `variables.css`, `globals.css`,
`design-system/`, `styles/`. Read the color palette, spacing scale, font sizes, border radii,
shadow levels. These are the ground truth for visual consistency. Every hardcoded hex value
you find in a component that isn't in this token file is a potential inconsistency.

**Q3: What shared components exist?**
Look for: `components/ui/`, `components/common/`, `src/ui/`, `design-system/`, `shared/`.
Build a list of: Button, Input, Modal, Toast, Badge, Card, Dropdown, Select, Table, Icon,
Spinner, Empty state, Error boundary. These are the building blocks. Any custom re-implementation
of a component that already exists in this list is a `ISSUE-NNN` waiting to be written.

**Q4: What are the page/screen boundaries?**
Look for: `pages/`, `app/` (Next.js App Router), `views/`, `screens/`, `routes/`. Read
just the routing config first — every route is a potential screen in a user flow.

Write your answers into the "Project Profile" section of `audit_progress.md`.

---

### 0-B. Learn the Project's UI Conventions

Read 2–3 well-built screens or components — not to find bugs, but to understand how this team
writes UI. You are cataloguing:

- **Naming conventions**: Are props named `onClick` or `handleClick` or `onPress`? Are
  boolean props `isLoading` or `loading`? Is the cancel action labelled "Cancel", "Dismiss",
  "Close", or "Go back"?
- **Button hierarchy**: What does a primary button look like? Secondary? Destructive? Ghost?
  How are they composed — variant prop on a shared `<Button>`, or separate components?
- **Icon usage pattern**: Is there a single `<Icon name="..." />` wrapper, or are icons
  imported directly from the icon library? Are sizes standardized?
- **Spacing and layout pattern**: Flex or Grid? Are gaps hardcoded or token-based?
- **Loading states**: Skeleton screens, spinners, or disabled states? Are they consistent?
- **Error and empty states**: Are these handled inline, in a shared component, or ad-hoc?
- **Typography pattern**: Are text styles composed via a `<Text>` component, via Tailwind
  classes, or inline `style`?

Record what you find in the "Project Patterns" section of `audit_progress.md`.

> **Why this matters:** If you write a remediation that imports `<Spinner />` when the
> codebase always uses `<LoadingIndicator />`, or recommends adding `className="text-red-500"`
> when the project uses a `<Text variant="error">` component, the fix will be rejected and
> it introduces a new inconsistency while reporting an old one. Your remediations must be
> written *in the language this team already speaks*.

---

### 0-C. Calibrate the Consistency Baseline

Before flagging anything, read one complete flow from entry point to terminal state without
writing any issues. Ask:

- Is inconsistency widespread and systemic, or localized to specific screens?
- Are there signals of a recent library migration (e.g., old MUI components coexisting with
  new shadcn/ui components)?
- Are there comments like `// TODO: replace with shared Button` or `// legacy — do not copy`?
- Is responsive design handled consistently, or is mobile clearly an afterthought?

This baseline determines whether a finding is an isolated anomaly or a systemic pattern.
A systemic pattern is always higher severity — because it means every new screen a developer
adds will repeat the mistake without the audit flag.

---

## Phase 1 — Initialize the Audit Files

Create both files before tracing any flow.

---

### `audit_progress.md` — Summary + Living Index

This file is optimized for **human readability and token efficiency**. It contains:
- Project profile (filled once in Phase 0)
- Running issue index (one line per issue, append-only)
- Finding details (one block per issue, append-only with rare updates per mutation rules)

```markdown
# UI/UX Audit — Progress

_Last updated: after file [X] / flow [FLOW-NNN]_

---

## Status

| Field         | Value                              |
|---------------|------------------------------------|
| Status        | Phase 0 / Scanning / ⛔ Terminated |
| Flows Done    | Y / 5                              |
| Files Read    | X / 25                             |
| Issues Found  | N (C: N · H: N · M: N · L: N)     |

---

## Project Profile

| Field              | Value |
|--------------------|-------|
| UI Stack           |       |
| Component Library  |       |
| Icon Library       |       |
| CSS Approach       |       |
| Token File         |       |
| Router             |       |
| Animation Library  |       |
| Key Risk Areas     |       |

---

## Project Patterns

| Pattern            | Convention Observed |
|--------------------|---------------------|
| Button hierarchy   |                     |
| Icon usage         |                     |
| Loading states     |                     |
| Error states       |                     |
| Empty states       |                     |
| Typography         |                     |
| Spacing/Layout     |                     |
| Action labels      |                     |
| Naming (props)     |                     |

---

## Shared Component Inventory

| Component     | File Path          | Notes             |
|---------------|--------------------|-------------------|
| Button        |                    |                   |
| Input         |                    |                   |
| Modal         |                    |                   |
| Toast/Snack   |                    |                   |
| Icon          |                    |                   |
| Spinner       |                    |                   |
| Badge         |                    |                   |
| Empty State   |                    |                   |
| Error State   |                    |                   |

_(Append rows as discovered. This is the ground truth for "does a shared component exist?"
checking during the audit.)_

---

## Execution Queue

_(Strike through completed items. Mark next item with `← NEXT`.)_
_(Never delete struck-through items — they are the coverage audit trail.)_

- `src/app/page.tsx` ← NEXT

---

## Issue Index

_(One line per issue, append-only. Full details in the Findings section below.)_

| ID        | Sev | Category             | Short Title                        | Flows          |
|-----------|-----|----------------------|------------------------------------|----------------|
| ISSUE-001 | 🔴H | Terminology          | "Submit" vs "Confirm" mismatch     | FLOW-001       |

---

## Findings

_(Full finding blocks. Append-only. See mutation rules for the one exception.)_
```

---

### `audit_traces.md` — Flow Trace Log

This file is **append-only, always**. No exceptions. It records every flow traced —
the screens visited, files read within the flow, and issues surfaced. It is not a summary;
it is the raw audit trail.

```markdown
# UI/UX Audit — Flow Traces

_This file is append-only. Never edit existing entries._

---

## FLOW-001 — [Short Flow Name]

**Entry point:** `src/app/checkout/page.tsx`
**Exit condition:** User sees order confirmation screen
**Status:** Complete / Dead End at [file]
**Issues found in this flow:** ISSUE-001, ISSUE-003

### Trace

| # | File / Screen                        | Finding summary                          |
|---|--------------------------------------|------------------------------------------|
| 1 | `src/app/checkout/page.tsx`          | Custom spinner instead of shared        |
| 2 | `src/components/checkout/Summary.tsx`| "Confirm Order" vs "Place Order" labels |
| 3 | `src/app/confirmation/page.tsx`      | No loading state on page transition     |

---
```

> **Why two files?** `audit_progress.md` is token-efficient for reasoning — the agent reads
> it at the start of every step. `audit_traces.md` is the full audit trail — the agent
> **looks it up by searching for a FLOW-NNN or ISSUE-NNN ID** rather than reading it in full,
> preventing context window bloat on long audits.

---

## Document Mutation Rules

Both files have strict mutation rules. Violating these corrupts the audit trail.

### `audit_traces.md` — Always Append, Never Edit

| Rule | Reason |
|------|--------|
| Every new flow gets a new `## FLOW-NNN` section appended at the end | Flows are facts, not drafts |
| Rows are added to the trace table as files are read within a flow | The trace is built live |
| Existing entries are **never edited** under any condition | The trace is the source of truth |
| If a flow is resumed in a later run, a new `FLOW-NNN` entry is created referencing the prior one | Continuation is a new trace, not a mutation |

### `audit_progress.md` — Mostly Append, Rare Overwrite

| Section | Rule |
|---------|------|
| Status table | Overwrite on every file read — it is a live counter |
| Project Profile & Patterns | Fill once in Phase 0; overwrite if a deeper read corrects an assumption. Mark corrections with `*(revised)*` |
| Shared Component Inventory | Append rows as discovered; never remove |
| Execution Queue | Strike through completed items; append newly discovered files; never delete |
| Issue Index | **Append-only** — one row per issue, forever |
| Findings section | **Append-only** with one exception (see below) |

### The One Finding Update Exception

A finding block may be updated **only** when:

1. A later flow reveals the issue affects more surfaces than originally described (blast radius expanded)
2. A later flow reveals the issue is more severe than originally assessed (severity escalation)
3. A later flow reveals the issue is partially fixed — it exists in some screens but not others

**When updating:** append an `**Updated:**` block *below* the original text. Never rewrite
the original. Show old and new severity explicitly if it changed.

```markdown
### ISSUE-007 · 🔴 HIGH — Custom spinner used instead of shared `<Spinner />`
*(original finding text stays exactly as written)*

**Updated — Blast radius expanded**
After tracing FLOW-004, the same custom spinner appears in `src/app/settings/page.tsx`
and `src/components/profile/AvatarUpload.tsx`. Systemic upgrade rule applied.
**Severity: HIGH → CRITICAL.** Now affects 5+ screens. See also: FLOW-004.
```

**Never:**
- Silently rewrite severity, file path, or code snippet
- Delete a finding because you later thought it was minor
- Merge two findings into one without preserving both entries
- Update a finding with context from a flow it was not linked to

---

## Phase 2 — The Execution Loop

Repeat these four steps until a budget limit is reached.

---

### Step 2-A. Select the Next File

At the start of every step, read only the **Status table** and **Execution Queue** from
`audit_progress.md` — not the full file. Take the top unmarked item.

Files must be chosen by following the actual user journey — the next screen or component
that the user would encounter — not alphabetically and not by gut feel.

If you cannot locate the next file in the user journey after genuine effort, that is a
**Dead End**. Three consecutive Dead Ends → trigger budget termination.

---

### Step 2-B. Read and Analyze

Read the file. Check all eight audit categories below. Apply all eight to every file —
skipping a category because a screen "looks consistent" is how the worst inconsistencies
survive audits.

---

### Step 2-C. Record

For each issue found:
1. Append a row to the Issue Index in `audit_progress.md`
2. Append the full finding block to the Findings section of `audit_progress.md`
3. Append a row to the current flow's trace table in `audit_traces.md`

For each downstream screen or component discovered: add to Execution Queue if not already
present. Strike through the current file. Update Status table.

---

### Step 2-D. Looking Up Flows for an Issue

When the agent needs to recall what screens are involved in a specific issue's flows —
for example, to check blast radius before writing a remediation — it **must use search
or grep** to locate the `FLOW-NNN` entry in `audit_traces.md` by ID. It must **not**
re-read the entire `audit_traces.md` file. This is the primary mechanism for keeping
context size bounded on long audits.

```
search "FLOW-002" in audit_traces.md  →  jump to that section only
```

---

### Step 2-E. Check Budget

```
flows_completed  >= 5   →  TERMINATE (Max Flows)
files_read       >= 25  →  TERMINATE (Max Files)
dead_ends_in_row >= 3   →  TERMINATE (Dead End)
otherwise               →  return to Step 2-A
```

**A flow is complete** when the trace has reached the terminal UI state for that journey
(success screen, error message, empty state, or modal dismissed), or when it hits a Dead End.

---

## The Eight Audit Categories

Ordered from most-commonly-missed to most-commonly-checked. Apply all eight to every file.

---

### Category 1 — Terminology & Label Consistency

> *The single most common source of user confusion. Often invisible in code review because
> it requires reading two screens simultaneously.*

Every action the user can take has a name. That name must be identical across every surface
where the action appears.

**Check every label in this file against the Project Patterns record:**

| Label type | What inconsistency looks like |
|------------|-------------------------------|
| **Confirmation actions** | "Submit" on form A, "Confirm" on form B, "Save" on form C — all doing the same operation |
| **Cancellation actions** | "Cancel", "Dismiss", "Close", "Go back", "Never mind" — mixed across modals |
| **Destructive actions** | "Delete" on one screen, "Remove" on another for the same domain object |
| **Empty state copy** | "No items found" vs "Nothing here yet" vs "You have no items" — inconsistent tone |
| **Error message tone** | Formal in some places ("An error occurred"), casual in others ("Oops! Something went wrong") |
| **Field labels** | "Email Address" on sign-up, "Email" on sign-in, "Your email" in settings |
| **Domain object names** | The same entity called "order", "purchase", and "transaction" in different screens |

**How to check without tooling:**
- Read every visible label, button text, heading, placeholder, and helper text in the file.
- Cross-reference against the Project Patterns record for "Action labels."
- Use search to find all other occurrences of the same concept in other files.
- Ask: "If a user read this label on this screen after reading the other screen, would they
  pause and wonder if these are the same action?"

---

### Category 2 — Component Usage Consistency

> *Custom components built next to a shared component that already exists are a maintenance
> time-bomb. They diverge silently and create two sources of truth.*

**Check every UI element in this file against the Shared Component Inventory:**

- Is a `<Button>` being built from a raw `<button>` or `<div onClick>` when a shared
  `<Button>` component exists?
- Is a loading indicator built inline (custom `animate-spin` div) when a `<Spinner>` exists?
- Is a modal built with `useState` + inline JSX when a shared `<Modal>` exists?
- Is a toast notification triggered via `setState` when a shared `useToast()` hook or
  `<Toast>` system exists?
- Are form inputs built as raw `<input>` when shared `<Input>`, `<Select>`, or `<Textarea>`
  components exist?

**Also check within this file:**
- Is the same visual element implemented twice in the same file with different markup?
- Are there props passed to a shared component that override its design tokens (e.g.,
  `className="bg-blue-700"` on a component that has its own color system)?

---

### Category 3 — Icon Consistency

> *Icon libraries grow organically. A codebase that starts with Lucide often acquires
> HeroIcons and Font Awesome as developers copy-paste examples. The user sees visual chaos.*

**Check every icon in this file:**

| Check | What inconsistency looks like |
|-------|-------------------------------|
| **Library mixing** | `lucide-react` icons on most buttons, `@heroicons/react` on two others, an inline SVG for one special case |
| **Size inconsistency** | Icons at `w-4 h-4`, `w-5 h-5`, `w-6 h-6`, and `size={20}` in the same file, without a documented sizing scale |
| **Semantic inconsistency** | Trash icon used for both "Delete" and "Archive"; Pencil icon used for both "Edit" and "Rename" |
| **Style inconsistency** | Outline icons mixed with filled icons in the same menu or toolbar |
| **Missing icon wrapper** | Icon used directly from library when project has an `<Icon>` wrapper component that handles sizing and ARIA |
| **Decorative icons without aria-hidden** | An icon beside a text label that is purely decorative but has no `aria-hidden="true"` |
| **Interactive icons without aria-label** | A standalone icon button (no visible label) missing an `aria-label` |

---

### Category 4 — Button & Interactive Element Consistency

> *Buttons are the primary contract between the UI and the user. Inconsistent button hierarchy
> tells the user nothing about what is primary and what is secondary.*

**Check every interactive element in this file:**

| Check | What inconsistency looks like |
|-------|-------------------------------|
| **Variant misuse** | A destructive action (e.g., "Delete Account") using a primary/CTA button style instead of a destructive variant |
| **Hierarchy violation** | Two primary-styled buttons in the same view, giving the user two equally-weighted calls to action |
| **Placement inconsistency** | "Cancel" left / "Confirm" right in one modal; reversed in another modal on the same screen |
| **Size inconsistency** | Buttons at different sizes in the same action group without a clear reason |
| **Loading state absent** | A button that triggers an async action with no loading state — the user can click twice |
| **Disabled state missing** | A submit button active when the form is invalid; no visual indication the action is unavailable |
| **Raw div/span as button** | `<div onClick={...}>Click me</div>` — not keyboard-navigable, no role, not accessible |
| **Inconsistent affordance** | Some clickable cards/rows have hover states; others don't, despite the same interaction |

---

### Category 5 — Visual & Styling Consistency

> *Hardcoded values and one-off overrides compound over time into a visual system that
> nobody owns and nobody trusts.*

**Check every style value in this file:**

| Check | What inconsistency looks like |
|-------|-------------------------------|
| **Hardcoded colors** | `bg-[#3B82F6]` instead of `bg-primary`; `color: "#FF0000"` instead of a semantic token |
| **Off-scale spacing** | `p-[13px]` or `mt-[7px]` instead of a spacing scale value; arbitrary values in brackets |
| **Inconsistent border-radius** | `rounded`, `rounded-md`, `rounded-lg`, and `rounded-full` mixed without a documented rule |
| **Shadow inconsistency** | `shadow`, `shadow-md`, `shadow-xl`, `drop-shadow` mixed without a visual hierarchy rationale |
| **Font size off-scale** | `text-[15px]` instead of `text-sm` or `text-base` |
| **Z-index chaos** | Magic numbers (`z-[999]`, `z-[9999]`) instead of a documented z-index scale |
| **Dark mode partial coverage** | Light mode classes present, dark mode variants absent on interactive states |
| **Responsive breakpoint gap** | A layout correct at desktop with no mobile breakpoint handling |

---

### Category 6 — Navigation & Layout Consistency

> *Navigation is the user's map. Inconsistent nav structure means the user is perpetually
> re-learning the application.*

**Check every navigation element and layout structure in this file:**

| Check | What inconsistency looks like |
|-------|-------------------------------|
| **Active state inconsistency** | Active nav items styled differently across different pages |
| **Breadcrumb inconsistency** | Present on some nested pages, absent on others at the same depth |
| **Back navigation inconsistency** | A back button on page A, a breadcrumb on page B, nothing on page C — same depth in the hierarchy |
| **Page title inconsistency** | Some pages have an `<h1>` heading, others use the nav label, others have nothing |
| **Layout shift on load** | Content reflows after data loads because no skeleton/placeholder holds the space |
| **Scroll position inconsistency** | Page scrolls to top on route change in some flows, preserves position in others |
| **Modal vs page for same intent** | Some confirmation flows open a modal; others navigate to a new page |
| **Empty state missing** | A list or grid view with no empty state — the user sees a blank screen when there's no data |

---

### Category 7 — Loading, Error & Empty State Coverage

> *Edge states are the most commonly skipped in development and the most visible to users
> when something goes wrong. A loading state is not a nice-to-have.*

**For every data-fetching component in this file, check:**

| State | What a missing state looks like |
|-------|---------------------------------|
| **Loading** | Data area is blank or flickers while loading; no spinner, skeleton, or placeholder |
| **Error** | Caught error is not shown to the user; component renders as if nothing happened |
| **Empty** | Query returns zero results; component renders an empty container with no message |
| **Partial data** | Some fields arrive null/undefined and crash the render instead of gracefully degrading |
| **Stale data** | User edits data in one tab, returns, sees old data — no refetch-on-focus or cache invalidation |
| **Optimistic update failure** | Optimistic update applied, backend rejects, UI stuck in updated state |

**Also check transitions:**
- Does the transition from loading → content cause a layout shift?
- Is the error state dismissable, or does it lock the user out of the screen?
- Does the empty state give the user a next action (e.g., "Add your first item" button)?

---

### Category 8 — Accessibility Baseline

> *Accessibility issues double as usability issues. A missing focus ring hurts keyboard users
> and power users equally. This audit checks baseline — it is not a full WCAG audit.*

**Check every interactive and semantic element in this file:**

| Check | What a violation looks like |
|-------|-----------------------------|
| **Focus visibility** | `:focus` style removed or invisible; user cannot tell what is focused |
| **Keyboard navigation order** | Tab order does not follow visual reading order |
| **Missing ARIA roles** | `<div onClick>` without `role="button"`; `<ul>` menu without `role="menu"` |
| **Missing ARIA labels** | Icon buttons, icon-only nav items, form inputs without `<label>` or `aria-label` |
| **Color-only information** | Status communicated only by color ("red = error") with no text or icon |
| **Contrast** | Low-contrast text noted when visually obvious (do not run a contrast calculator — flag only clear violations) |
| **Modal focus trap** | Modal opens but focus is not moved into it; user can Tab behind the modal |
| **Modal escape** | Modal cannot be closed with the Escape key |
| **Alt text** | `<img>` without `alt`; decorative images without `alt=""` |
| **Skip link** | Long pages or apps with no skip-to-content link for keyboard users |

---

## The Finding Template

Every finding appended to the Findings section of `audit_progress.md` must use this format.
Token efficiency matters — be specific, not verbose.

```markdown
---

### ISSUE-NNN · [🚨CRIT | 🔴HIGH | 🟠MED | 🟡LOW] — <Short, specific title>

| Field     | Detail |
|-----------|--------|
| Category  | Terminology / Component Usage / Icons / Buttons / Styling / Navigation / State Coverage / Accessibility |
| Flows     | FLOW-001, FLOW-003 |
| Files     | `src/components/Checkout/Summary.tsx` lines 34–41 |
| Systemic? | Yes — also in `FileA.tsx`, `FileB.tsx` / No — isolated |

**The Problem**
One paragraph. What is wrong and why does it harm the user. Paste the specific markup
or code (≤ 12 lines) that demonstrates the issue. Do not paraphrase code — show it.

**User Impact**
One sentence. What does a real user experience when this issue fires?

**Remediation**
Write the fix using this project's component names, class conventions, and prop patterns
as recorded in Phase 0-B. Show before/after. If the fix must be applied to multiple files,
show it once and list all affected files.
```

---

## Severity Rubric

Consult this table for every issue. Never assign severity from intuition alone.
If a finding spans rows, use the higher severity.

| Severity | Condition | Concrete examples |
|----------|-----------|-------------------|
| **🚨 CRITICAL** | User cannot complete a core flow, or is actively misled into a destructive action. No workaround. | Destructive button styled as primary CTA with no confirmation; form submission silently swallows an error and shows "Success"; navigation link routes to wrong screen |
| **🔴 HIGH** | Significant user confusion or friction on a primary flow. User may abandon or make errors. Hard to catch without a walkthrough. | "Submit" vs "Confirm" on two screens in the same checkout flow; missing loading state on the primary CTA; icon meaning reversed between two adjacent screens |
| **🟠 MEDIUM** | Visible inconsistency that breaks trust but does not block the user. Degrades experience at scale or for returning users. | Custom spinner coexisting with shared Spinner on different screens; off-scale spacing visible at desktop; error state has no dismiss action; hardcoded color that diverges from token in dark mode |
| **🟡 LOW** | Minor inconsistency or code smell. No immediate user impact; accumulates technical debt. | Commented-out component import; unused prop on a shared component; aria-hidden missing on a decorative icon; slightly different border-radius on a non-interactive card |

**Systemic upgrade rule:** if the same issue appears across 3+ screens or components,
escalate one level. Systemic 🟠 MEDIUM → 🔴 HIGH. Systemic 🟡 LOW → 🟠 MEDIUM.
State the upgrade reason explicitly.

---

## Final Summary Block

When any budget limit is reached, prepend this block to the very top of `audit_progress.md`.

```markdown
<!-- ══════════════════════════════════════════════════════════════════ -->
## ⛔ FINAL SUMMARY — Audit Complete

**Terminated by:** Max Flows / Max Files / Dead End
**Files read:** X / 25  |  **Flows completed:** Y / 5

### Overall Health: 🔴 Critical Risk / 🟠 High Risk / 🟡 Moderate / 🟢 Healthy

*(One paragraph: (a) the most dangerous single issue and what user action it will
corrupt; (b) the most pervasive pattern across flows and how many files it appears in;
(c) which audit category had the highest finding density; (d) whether the issues are
isolated or systemic.)*

### Finding Counts

| Severity    | Count |
|-------------|-------|
| 🚨 CRITICAL | N     |
| 🔴 HIGH     | N     |
| 🟠 MEDIUM   | N     |
| 🟡 LOW      | N     |
| **Total**   | **N** |

### Top 3 Fixes — In Priority Order

1. **ISSUE-NNN** `[file, lines]` — what it is. Fix: what to do.
2. **ISSUE-NNN** `[file, lines]` — what it is. Fix: what to do.
3. **ISSUE-NNN** `[file, lines]` — what it is. Fix: what to do.

### Entry Points for the Next Audit Run

*(Files still in the Execution Queue not reached in this run.)*

- `path/to/screen.tsx` — why it is high-priority to scan next

<!-- ══════════════════════════════════════════════════════════════════ -->
```

After writing the summary, send this notification:

> **Audit paused — [limit name] reached.**
> `audit_progress.md` has [N] issues across [Y] flows ([X] files). `audit_traces.md` has the
> full flow trace log. Most urgent: **ISSUE-NNN** — [one sentence on the issue and user impact].
> To continue: start a new run; the Execution Queue in `audit_progress.md` lists remaining files.

---

## Anti-Patterns That Invalidate an Audit

| Anti-Pattern | Why It Is Wrong | Correction |
|---|---|---|
| Tracing a single component file and calling it a "flow" | Misses the cross-screen inconsistencies that matter most | A flow ends at a terminal UI state — success, error, or exit |
| Reading `audit_traces.md` in full to recall a flow | Blows the context window on long audits | Search for `FLOW-NNN` by ID to jump to that section only |
| Writing a remediation that uses a component not in the Shared Component Inventory | Creates a new inconsistency while fixing an old one | Cross-check the inventory in `audit_progress.md` before writing any fix |
| Flagging a design preference as an issue | Wastes developer attention and erodes trust | Ask: "Does this cause user confusion or block a flow?" If no, skip it |
| Assigning CRITICAL to a visual inconsistency that doesn't affect interaction | Destroys trust in the severity system | Use the rubric; when unsure between CRITICAL and HIGH, choose HIGH |
| Reading the same file twice | Wastes budget and double-counts in Max Files | Check the Execution Queue before opening any file |
| Writing a finding without a code or markup snippet | Makes findings unverifiable | Always include ≤ 12 lines of the offending markup |
| Updating `audit_traces.md` in-place | Corrupts the audit trail | `audit_traces.md` is always append-only, no exceptions |
| Assigning a new ISSUE-NNN to a problem already found in a different flow | Creates duplicate findings | Search `audit_progress.md` Issue Index before writing a new finding |
| Appending a new flow entry that edits a prior flow's trace table | Cross-flow contamination | New flow = new `## FLOW-NNN` block; prior blocks are immutable |

---

## Per-File Mental Checklist

Run this silently before marking any file done. Do not include verbatim in `audit_progress.md`.

```
Terminology
  [ ] Every action label consistent with Project Patterns record
  [ ] Every domain object name consistent with Project Patterns record
  [ ] Error and empty state copy tone consistent

Component Usage
  [ ] No shared component re-implemented from scratch in this file
  [ ] No design token overrides on shared components (hardcoded className overrides)
  [ ] Shared component used with correct props, not hacked via className

Icons
  [ ] Icons from same library as Project Patterns record
  [ ] Icon sizes on-scale or documented
  [ ] Decorative icons have aria-hidden; interactive icon buttons have aria-label
  [ ] No semantic reversal (same icon, different meaning vs. adjacent screens)

Buttons & Interactives
  [ ] Only one primary-hierarchy CTA per view
  [ ] Destructive actions use destructive variant
  [ ] Confirm/Cancel placement matches Project Patterns record
  [ ] Async actions have loading state; form submits have disabled state while loading
  [ ] No raw <div> or <span> used as a button

Styling
  [ ] No hardcoded color values outside the token file
  [ ] No off-scale spacing (arbitrary bracket values)
  [ ] Border-radius and shadow on-scale
  [ ] Dark mode variants present if the project supports dark mode
  [ ] Mobile breakpoints handled

Navigation & Layout
  [ ] Active states consistent with Project Patterns record
  [ ] Empty states present on all list/grid views
  [ ] Page has an h1 heading consistent with other pages at the same level

State Coverage
  [ ] Loading state present on every async data fetch
  [ ] Error state present and user-dismissable
  [ ] Empty state present and actionable

Accessibility
  [ ] All interactive elements keyboard-reachable
  [ ] All inputs have visible labels
  [ ] No color-only information conveyance
  [ ] Modal has focus trap and Escape-to-close
  [ ] Images have alt text (or alt="" if decorative)
```