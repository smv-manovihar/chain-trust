---
name: uiux-audit
description: >
  Use this skill when asked to audit, review, or scan a codebase or design system for
  UI/UX quality, usability gaps, accessibility violations, visual inconsistencies, or
  user-flow breakdowns. Triggers: audit requests, UX issue finding, pre-launch reviews,
  accessibility checks, user flow tracing, state validation, design system reviews, 
  and heuristic evaluations. The agent traces real user flows end-to-end through
  components, styles, and copy — learning the project's design language before writing
  anything — and terminates cleanly when a scan budget is exhausted. 
  CRITICAL: This skill is strictly for AUDITING AND RECORDING. It must ONLY log 
  findings to the progress document and MUST NOT implement fixes, edit source code, 
  or attempt to apply any remediations. Do NOT use for backend reliability, 
  vulnerability scanning, or performance profiling.
compatibility: >
  Tool-agnostic. Works in any AI code editor or agent runtime that can read files 
  and write markdown. If the environment provides specialized tools, these 
  **MUST** be used instead of their raw terminal equivalents to take 
  advantage of the agent's optimized capabilities. Every step is a reading and
  reasoning task.
---
### ChainTrust Specific Rule
**CRITICAL**: Do NOT modify or suggest modifications to any files within `frontend/components/ui`. These are base primitives and must remain untouched. Any required design system alignments (e.g., pill-style/rounded-full) must be achieved through component-level overrides or wrapper components on the pages/features themselves.
## UI/UX Audit Skill
---

### The Core Philosophy

Before learning any procedure, internalize this absolute rule: **You are an auditor, not an engineer.** **Your strict mandate is to RECORD findings only. You must NEVER implement fixes, edit source files, or write remediations into the codebase.** Fixing is the explicit domain of the `uiux-fix-implementation` skill.

Broken user experiences are almost never caused by a single catastrophic design flaw.
They are caused by a cascade — a button with no disabled state here, an empty list
with no illustration there, a form that submits silently on error, a poorly scaled label on a
small tap target — that individually look like polish issues but compound into user
abandonment, support tickets, and lost conversions under real usage.

Your job is not to nitpick every pixel. Your job is to trace the paths that
*real users actually take* through this interface and identify the gaps that will
confuse first, fail silently, or humiliate the user when they hit an edge case.

There are two failure modes to avoid:
- **Alarm fatigue**: flagging every non-pixel-perfect margin as high severity. Designers
  and engineers stop trusting the report.
- **False polish**: declaring a flow healthy after only reviewing the happy path. The
  worst UX debt lives in error states, empty states, and edge-case interactions where
  nobody designed and nobody tested.

This skill keeps you between those failure modes by giving you a bounded method, a
severity rubric with concrete examples, and explicit rules about when to stop.

---

### Phase 0 — Learn the Project Before You Touch Anything

> **This phase is not optional. Do not open a component file until Phase 0 is complete.**

You are about to write findings and remediations that will be read by the people who
built this product. If your fixes use token names they don't use, component patterns
they've deprecated, or copy styles that break the brand voice, they will not trust the report.

Phase 0 has three parts.

---

#### 0-A. Build the Structural Map

Read only landmark files — files that describe the project's shape, not its logic.
You are answering four questions:

**Question 1: What kind of UI project is this?**
Look for dependency manifest files, package configurations, or build scripts.
Read the dependencies section. Note what UI frameworks, component libraries, styling
systems, animation libraries, and icon sets are in use. These tell you where to look
for reliability risks:
- For component-based libraries with utility classes → check for inconsistent arbitrary values replacing tokens.
- For frameworks with strict design systems → check for theme overrides that break system consistency.
- For cross-platform SDKs → check for widget composition anti-patterns and theme inheritance.
- For frameworks relying heavily on slot composition → check for slot misuse and prop drilling across layout components.

**Question 2: Does a design system or token layer exist?**
Look for global stylesheets, theme configuration files, design token definitions, or dedicated component directories.
Note every token category defined: color, spacing, typography, shadow, radius, z-index.
If no token layer exists, that itself is a finding — every color and spacing value
used raw in components is a divergence waiting to happen.

**Question 3: What is the component hierarchy?**
Look for top-level layout files, root components, or routing configurations.
Read just the top-level layout file first — the file where global navigation, modals, toasts, and error boundaries are registered. This is your
UX skeleton. Every named page or route within it is a potential user flow to trace.

**Question 4: Where is the content layer?**
Look for localization directories, string resource files, or content dictionaries. 
If all copy is inline in templates without a content layer, note it.
Hard-coded inline strings make it impossible to audit tone consistency, scan for
truncation risks, or catch copy that no longer matches the current feature.

Write your answers into the "Project Profile" section of your progress document.

---

#### 0-B. Learn the Design Language

Read a few existing well-built screens or components — not to find bugs, but to understand
how this team designs and codes. You are looking for:

- **Token usage**: Do they use design tokens consistently, or mix tokens with arbitrary
  values? Note the specific token naming conventions.
- **Component pattern**: Do they build with atomic primitives assembled into composites,
  or do they write large monolithic page-level components?
- **State modeling**: How do they represent loading, error, empty, and success states in
  component props? Is it handled via union types or boolean flags?
- **Animation/transition style**: What animation libraries or native transitions are utilized? What is the standard duration and easing?
- **Accessibility conventions**: Do they use semantic markup consistently? Do they include
  required accessibility roles, labels, and live regions? Do interactive elements always have visible focus styles?
- **Copy voice**: Scan a variety of button labels, error messages, and empty-state texts. Is the
  voice formal or conversational? Sentence case or title case? Active or passive? Do
  error messages tell the user what to do, or only what went wrong?
- **Test coverage**: Do component tests exist? Do they test keyboard navigation? Do they
  test error and empty states, or only the happy path?

Record what you find in the "Project Patterns" section of your progress document.

---

#### 0-C. Calibrate the Quality Baseline

Before flagging issues, calibrate your severity to what is *normal* for this codebase.
Silently trace one complete user flow from entry to confirmation without flagging anything yet.
Ask:

- Are accessible attributes completely absent, inconsistently present,
  or present but occasionally wrong?
- Are state variants designed for every component, some components,
  or almost none?
- Are design tokens used everywhere, only in the theme file, or only sometimes?
- Is there evidence of a recent design system migration — some components on the new system,
  others on the old?
- Are there comments or markers signaling known UX debt?

This baseline determines whether a finding is an isolated anomaly or a systemic pattern.
A systemic pattern is always higher severity than an isolated one — because it means the
problem will recur every time someone adds a new component, not just in one screen.

---

### Phase 1 — Initialize Progress Document

Create a progress tracking markdown file in the project root before scanning any source files.
Update it after every single file you read. It is your only persistent state. **You are strictly forbidden from modifying any file other than `uiux_audit_progress.md` during this entire skill execution.**

```markdown
## UI/UX Audit — Progress

### Current Status

| Field | Value |
|---|---|
| **Status** | Phase 0 — Learning Project / Scanning Flow N of X / Terminated |
| **Files Read** | X / Limit |
| **Flows Completed** | Y / Limit |
| **Budget Limit Hit** | — |

***

### Project Profile
*(Filled during Phase 0-A)*

- **Language / Framework:**
- **Component Library / Styling System:**
- **Design Token Layer:**
- **Content / Localization Layer:**
- **Key Risk Areas Identified:**

***

### Project Patterns
*(Filled during Phase 0-B — drives consistent remediations)*

- **Token usage pattern:**
- **Component composition style:**
- **State modeling convention:**
- **Animation/transition style:**
- **Accessibility conventions:**
- **Copy voice and casing:**
- **Test coverage:**

***

### Execution Queue

*(Strike through completed items. Mark the next file clearly.)*

- `<path to root component>` ← NEXT

***

### Audit Log

*(See Document Mutation Rules below for what may and may not be changed here.)*
```

---

#### Document Mutation Rules

The progress document is a **living document**, not a log file and not a scratch pad.
Different sections have different mutation rules.

- **Current Status table:** Always overwrite on every file read. It is a live counter, not a history.
- **Project Profile:** Fill once in Phase 0-A; overwrite if a deeper read corrects an earlier assumption.
- **Project Patterns:** Fill once in Phase 0-B; overwrite if a later file reveals the pattern was wrong.
- **Execution Queue:** Strike through completed items; append new items as discovered; never delete struck-through items.
- **Audit Log:** **Append only by default.** One exception described below.

**The One Exception — Updating an Existing Finding**

You may update a previously written finding **only** when one of these conditions is true:

1. **The finding advanced**: a later file reveals the issue is more severe than originally
   assessed.
2. **The blast radius changed**: a later file shows the same flaw affects more surfaces
   than the original finding described.
3. **The finding was partially addressed**: you discover the fix exists in some components
   but not others, changing it from "isolated" to "partially addressed".

**When you update an existing finding, you must:**
- Add an explicit update block immediately below the original content — do not rewrite the
  original text.
- State what changed and why.
- If severity changed, show the old and new severity explicitly.

**What you must never do:**
- Silently rewrite a finding's severity, file, or code snippet without an update block.
- Delete a finding because a later file suggested it might not be a real problem.
- Merge two findings into one without preserving both original entries.
- Add an update block to a finding that belongs to a different flow.

---

### Phase 2 — The Execution Loop

Repeat these four steps until a budget limit is hit.

#### Step 2-A. Select the Next File
Take the top unmarked item from your Execution Queue. Always follow the actual render
tree — the component that the *current* file renders or imports next — not alphabetical
order, not what sounds interesting.
If you cannot locate the next component in the render chain after genuine effort, that
is a Dead End. Three consecutive Dead Ends → trigger budget termination.

#### Step 2-B. Read and Analyze
Read the file. Evaluate it against all seven audit categories below. Apply all seven to
every file — skipping a category because a component "looks fine" is how the worst UX
debt survives audits.

#### Step 2-C. Record and Extend
For each issue found: append a finding to the Audit Log using the finding template.
For each child component, page, or utility imported: add the target file to the Execution
Queue if it has not already been read. Strike through the current file. Update the Files
Read count.

#### Step 2-D. Check Budget
Terminate if the maximum flows are completed, maximum files are read, or a set number of dead ends are reached consecutively.
A **flow is complete** when the trace has reached the final confirmation, success, or
terminal error state of that user journey — or when it has hit a Dead End on that flow.

---

### The Seven Audit Categories

Ordered from most-commonly-missed to most-commonly-checked. Read them in this order.

#### Category 1 — State Coverage

Every component that fetches data, submits a form, or reflects a list has at least four
states: **loading**, **error**, **empty**, and **populated**. In most codebases, only the
populated state is designed and implemented. 

**Check every data-dependent surface in this order:**

| State | What its absence looks like |
|---|---|
| **Loading** | Component renders nothing, flickers, or shows stale data while a new fetch is in flight. No spinner, skeleton, or progress indicator. |
| **Error** | API call rejects → white screen, unhandled promise, or generic text rendered to the DOM. No retry affordance. No human-readable message. |
| **Empty** | List returns zero items → empty space or layout that collapses in a visually broken way. No illustration, no guidance, no CTA. |
| **Partial / Degraded** | Some data loads successfully, some fails. The component renders the successful part with no indication that the rest failed. |
| **Optimistic** | A mutation is sent; the UI updates immediately before confirmation. If the mutation fails, is the optimistic update reverted? Is the user told it was reverted? |
| **Stale** | Cached data is shown while a background refresh runs. Is the user informed the data may be out of date? Can they force a refresh? |

---

#### Category 2 — Accessibility & Inclusivity

Look for:
- **Missing focus indicators**: Focus styles removed or overridden without a replacement. 
- **Non-semantic interactive elements**: Generic block elements functioning as buttons. 
- **Images without alt text**: Informational images with missing or empty alternative text attributes.
- **Form inputs without labels**: Input fields with no associated label element or accessibility label attributes. 
- **Color as the only differentiator**: Error states, required field markers, or status badges distinguished only by color.
- **Insufficient color contrast**: Text against its background below accessibility thresholds. 
- **Missing live regions**: Async content updates that appear without live region attributes.
- **Modal and dialog traps**: Modals that fail to trap keyboard focus or lack an escape key handler.
- **Skip navigation**: Long pages lacking a skip-to-main-content link.

---

#### Category 3 — Design System Consistency

Look for:
- **Raw values replacing tokens**: Hardcoded colors, pixel values, and font sizes written directly in component styles.
- **Inconsistent component variants**: Core components bypassed by manually styling native elements.
- **Z-index anarchy**: Hardcoded stacking values causing unpredictable stacking behavior.
- **Spacing outside the scale**: Margins and paddings that do not align to the established spacing scale.
- **Shadow and radius inconsistency**: Values that differ from design tokens by small arbitrary margins.
- **Typography not from the type scale**: Line heights, letter spacings, or font weights completely bypassing the type system.

---

#### Category 4 — User Flow Continuity

Check every transition in a flow in this order:

| Transition | What breakage looks like |
|---|---|
| **Entry → First Meaningful Interaction** | Page loads with no visible primary action, or the primary call-to-action is hidden without scroll hints. |
| **Form → Submission** | Form submits but the button has no loading state, no disabled state, and no feedback — user double-submits. |
| **Submission → Confirmation** | Successful action returns no confirmation: no toast, no page change, no inline success message. |
| **Confirmation → Next Step** | Success screen or state has no call-to-action guiding the user forward. |
| **Error → Recovery** | Error state has no actionable guidance: no retry button, no link to support, no explanation of what to correct. |
| **Deep Link → Authenticated Flow** | User arrives via a shared link while unauthenticated. After login, they are redirected to a root dashboard, not back to the original destination. |
| **Destructive Action → Confirmation** | A delete, cancel, or irreversible action executes immediately on single click with no confirmation dialog. |
| **Back Navigation** | Pressing back discards unsaved form state without a warning. |

---

#### Category 5 — Feedback & Affordance Fidelity

Look for:
- **Buttons without loading states**: A button that triggers an async action but does not disable itself or show an indicator while in flight.
- **Inputs without validation feedback**: A form field that accepts invalid input silently and only reveals the error on submit.
- **Actions without undo or confirmation**: Irreversible actions executing on a single click.
- **Affordance mismatch**: An element that looks interactive but is not, or an element that is interactive but does not look it.
- **Hover and active states missing**: Interactive elements with no hover, focus, or active visual state.
- **Async feedback gaps**: A background operation that provides no progress signal or estimated time.
- **Notification conflicts**: Multiple alerts stacked without a queue or dismissal order.

---

#### Category 6 — Responsive & Adaptive Integrity

Look for:
- **Fixed widths and heights on fluid containers**: Hardcoded dimensions causing overflow on narrow viewports.
- **Inadequate touch targets**: Interactive elements whose hit area is smaller than minimum mobile guidelines.
- **Overflow without scroll**: Content wider than the viewport with no horizontal scroll, causing layouts to break.
- **Text that does not reflow**: Text that truncates without tooltips or forces a horizontal scroll.
- **Missing responsive media handling**: Media loading without responsive properties.
- **Modals not adapted for mobile**: Desktop dialogs rendering as tiny centered boxes on mobile viewports.
- **Keyboard obstruction on mobile**: Form inputs obscured by the software keyboard with no scroll adjustment.

---

#### Category 7 — Content & Copy Quality

Look for:
- **Placeholder text used as a label**: Input fields with no visible label other than placeholder text.
- **Generic error messages**: Vague failure text with no specificity about what the user should do.
- **Jargon and internal terminology**: Error codes or internal system names surfaced to users.
- **Mismatched verb tense and voice**: Inconsistent active/passive voice in the same flow.
- **Truncation without tooltip**: Text truncated with an ellipsis on fields the user needs to read in full.
- **Missing confirmation copy**: Success states indicating completion with no indication of *what* was done.
- **Call-to-action copy describing the click, not the outcome**: Generic interaction text instead of descriptive outcome-based copy.
- **Placeholder content in production paths**: Dead text or developer placeholders on the main user flow.

---

### The Finding Template

Every finding appended to the Audit Log must use this exact format.

```markdown
### [CRITICAL | HIGH | MEDIUM | LOW] — <Short, specific title>

| Field | Detail |
|---|---|
| **Flow** | `<Step A → Step B → Step C>` |
| **File** | `<Path to file> lines <start>–<end>` |
| **Category** | <Applicable Category Name> |
| **Systemic?** | Yes — also in <other files> / No — isolated |

**The Vulnerability**
Describe exactly what is wrong and why it harms the user or the business. Paste the
specific code (≤ 15 lines) or copy excerpt that demonstrates the flaw. Do not paraphrase
code — show it.

**Blast Radius**
State concretely: which users are affected, how the failure manifests, and whether recovery is possible or the flow is permanently broken for those users.

**Remediation Strategy**
Describe the proposed fix using the codebase's own style. **DO NOT IMPLEMENT THIS FIX.** Write the strategy as an instruction for the engineer (or the implementation agent). If the fix requires a design token addition or a new component variant, say so explicitly.
```

---

### Severity Rubric

Assign severity using this list. If a finding spans severity, use the higher one.
Never assign severity from intuition alone — consult this rubric every time.

- **CRITICAL**: Complete flow termination for a class of users. Data loss, silent corruption of user state, or a keyboard/screen-reader user unable to complete the primary user action at all. Fails on every occurrence.
- **HIGH**: Significant user-facing failure or abandonment risk under normal usage. Hard to recover from without manual intervention. Affects a specific but meaningful user segment. 
- **MEDIUM**: Degrades the experience measurably but the user can still complete the task. Causes friction, confusion, or reduced confidence. 
- **LOW**: Polish issue, minor inconsistency, dead content, or documentation gap. No user blocked; experienced users unaffected. 

**Systemic upgrade rule**: if the same issue appears in three or more components or
screens, escalate one severity level. A systemic medium becomes high. A systemic low
becomes medium. State the upgrade reason explicitly in the finding.

---

### The Final Summary Block

When any budget limit is reached, prepend a final summary block to the very top of
your progress document. This makes it the first thing the user reads. Highlight the overall structural health, systemic risks identified, and highest-priority fixes required.