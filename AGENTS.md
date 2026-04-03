# ChainTrust — AGENTS.md

> **Prime Directive:** This file is the authoritative guide for all AI agents working on ChainTrust.
> Read it fully before making any changes. Every rule here is non-negotiable.

---

## 1. Project Architecture

ChainTrust is a four-tier platform. Know each boundary before touching it.

| Tier | Path | Stack | Role |
|------|------|-------|------|
| **Frontend** | `/frontend` | Next.js + React + Tailwind CSS | Customer & Manufacturer UI |
| **Backend** | `/backend` | Node.js + Express + MongoDB (Mongoose) | Business logic, auth, DB |
| **AI Service** | `/ai-service` | Python + FastAPI + LangChain | Role-aware LLM agent, chat sessions, medical knowledge, situational tools |
| **Blockchain** | — | Specialized APIs via `frontend/api/web3-client.ts` | Immutable source of truth for batch salts & product authenticity |

### Key Pages (Frontend)
- `/customer/cabinet` — "My Medicines" dashboard. Mobile-first medication tracking.
- `/verify` — Consumer verification. Reads blockchain first, enriches with MongoDB. Must fit `h-screen`. Unauthenticated users get a restricted view with a login prompt.
- `/manufacturer/add-product` — Multi-step batch enrollment wizard. Derives cryptographic salts client-side.
- `/manufacturer/batches` — Enrolled batches dashboard with scan counts. Mobile-first row actions.
- `/manufacturer/batches/[id]` — QR generation + `print`-media CSS for grid sheets without UI chrome.

### Backend Key Concepts
- **Batches:** A production run identified by `batchNumber` and `productId`.
- **Unit Salts:** Derived deterministically as `SHA-256(batchSalt + "-" + unitIndex)`.
- **Scan Tracking:** `/api/batches/verify-scan` checks the salt, increments a per-unit counter in MongoDB, and returns scan count (>5 signals potential counterfeit).
- **S3/MinIO:** Used for product packaging images. Backend auto-initializes MinIO buckets on first upload.

---

## 2. Module Boundaries & Import Rules

### ❌ No Dynamic Imports
**Never use dynamic `import()` expressions anywhere in the codebase.**

```ts
// ❌ BANNED — do not do this
const module = await import("../utils/helper");
const { fn } = await import(`../plugins/${name}`);
```

```ts
// ✅ CORRECT — use static top-level imports only
import { fn } from "../utils/helper";
```

This applies to `.ts`, `.tsx`, `.js`, `.mjs`, and every Python module in `/ai-service`. Use static imports exclusively. If a dependency appears to require dynamic import for optional/conditional loading, refactor the module boundary instead.

### Cross-Tier Rules
- Frontend must **never** call MongoDB directly. All DB access goes through `/backend` API routes.
- AI Service must **never** mutate blockchain state. It is read-only and advisory.
- Blockchain calls from the frontend are the **only** exception to the "backend for data" rule — verification must function even when the MongoDB node is unresponsive.

---

## 3. AI Service — LangChain Agent

The AI service is powered by a `langchain.agents.create_react_agent` (or equivalent `create_agent`) LLM agent served via FastAPI.

### Agent Architecture
- The agent is **role-aware**. On session creation, the authenticated user's role is resolved and the correct tool set is injected.
- Tools are split into two categories:

| Category | Scope | Examples |
|----------|-------|---------|
| **Common tools** | Available to all roles | `get_view_data`, medical knowledge retrieval, general Q&A |
| **Role-specific tools** | Injected based on authenticated role | Customer: scan history, "My Medicines" management. Manufacturer: batch stats, recall actions, analytics summaries |

- **Never give a customer-role session access to manufacturer tools**, and vice versa. Tool injection happens at session initialization — do not mutate the tool list after the agent is created.

### `get_view_data` Tool (Situational Awareness)
- This tool allows the agent to "see" what the user currently sees on their page. It aggregates real-time MongoDB data to mirror the frontend's state.
- **Synchronization Rule (mandatory):** Any change to the frontend's data-fetching logic (new dashboard stat, changed filter, modified table source) **must** be mirrored in `get_view_data` within `/ai-service` in the same PR/commit. Stale tool output = incorrect agent responses.

### Agent Rules
- The agent must **never** hallucinate product data, batch numbers, or scan counts. If `get_view_data` returns no data, the agent must say so — not invent values.
- Medical knowledge responses must cite a retrievable source from the knowledge base. Do not generate medical advice from parametric memory alone.
- Agent sessions are user-scoped. Never share session state between users.

---

## 4. Identification & Data Modeling

| Rule | Detail |
|------|--------|
| **Primary keys** | Use `productId` (SKU/Catalog ID) and `batchNumber` (Production Run ID) for all user-facing interactions, API routing, and business logic. |
| **Never expose `_id`** | Do not use MongoDB's `_id` in frontend URLs or human-readable outputs. |
| **Scoped uniqueness** | `productId` and `batchNumber` must be unique per authenticated user/company. Overlap across different companies is acceptable at the DB level. |
| **Business key resolution** | The UI and API must always resolve IDs in the context of the authenticated session. |

---

## 5. Design Philosophy — Mobile-First, Then Expand

> **Core audience reality:** Consumers (the primary users of `/verify` and `/customer/cabinet`) are on mobile phones. Design every screen for a 375px viewport first. Desktop and laptop layouts are an *enhancement*, not the baseline.

### The Rule
**Write mobile styles as the default. Use `md:` / `lg:` / `xl:` prefixes to progressively enhance for larger screens.** Never write desktop-first styles and attempt to shrink them for mobile.

```tsx
// ✅ CORRECT — mobile default, desktop enhancement
<div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">

// ❌ WRONG — desktop default broken for mobile
<div className="grid grid-cols-3 gap-4">
```

### Mobile Layout Priorities
- Single-column stacked layout at 375px. Every piece of content must be fully readable and actionable without horizontal scrolling.
- Primary CTAs must be within thumb reach — prefer sticky bottom bars or bottom-anchored buttons for critical actions on mobile.
- Body text minimum `text-base` (16px) to prevent iOS auto-zoom on input focus.
- All interactive elements: minimum **44×44px** touch target.
- `:active` tap states are **mandatory** on every interactive element — users need feedback that their tap registered.
- Never use hover-only UI patterns on mobile. Use `@media (hover: none)` to provide tap/toggle alternatives.

### Desktop Enhancement (Progressive)
- Once the mobile layout is solid, use the available horizontal space with multi-column grids.
- Use `grid-cols-1 lg:grid-cols-3` to shift from stacked → side-by-side on larger screens.
- Sidebars, split-pane views, and data tables are **desktop enhancements** — they must degrade to stacked cards or bottom drawers on mobile.
- Manufacturer pages (dashboards, analytics, batch management) are used on desktops more often — these pages may lean heavier into `lg:` layouts, but must still be fully functional on a tablet (`md:` = 768px).

### Viewport Targets
Always verify layouts at these breakpoints before committing:

| Breakpoint | Width | Primary user |
|------------|-------|--------------|
| Mobile S | 375px | Consumer (primary) |
| Mobile L | 430px | Consumer |
| Tablet | 768px | Mixed |
| Laptop | 1024px | Manufacturer |
| Desktop | 1280px+ | Manufacturer |

---

## 6. UI/UX Rules

### Layout
- **No-scroll by default.** Pages should fit within `100vh` / `h-screen` whenever possible.
- Use `flex-1` + `min-h-0` on container columns. Apply `overflow-y-auto` **locally** only (e.g., table body, chat view) — never on the page root.
- **Do not add top-level padding to pages.** `AppShell` already provides `p-4 lg:p-8`. Adding your own causes double-spacing.

### Typography
- **Sentence case everywhere.** No `uppercase`, `capitalize`, or `tracking-widest` on buttons, tabs, headers, badges, or labels.
- **Banned Tailwind classes (general UI):** `uppercase`, `capitalize`, `tracking-widest`.
- **Exception:** Stat cards / KPI counters MAY use uppercase labels (e.g., `TOTAL SCANS`).

### Component Density
- Reduce padding: prefer `p-4` or `p-6` over `p-8` when combining multiple cards on one screen.
- Use `text-sm` / `text-xs` for metadata to keep interfaces tight.

### Card-Based Layouts
- Group related functions in `Card` components with subtle borders or background tints.
- Use `bg-muted/50` or `bg-green-500/10` for status delineation — not heavy color fills.

### Status & Badges
- **"Verified" badge is banned** on manufacturer-facing pages (Batches, Products, Analytics) for normal active states. Validity is implied.
- Only use badges for exceptional, actionable, or negative states: `Recalled`, `High Risk`, `Restored`.

### Feedback & Loading
- Always show loading states (`Loader2`, skeletons) prominently.
- Bold, unambiguous status indicators: green checkmark = Authentic, red alert = Counterfeit / Recalled.

### Animations
- **Do NOT add `AnimateIn` or entrance animations** to any component or page wrapped in `AppShell`.
- `AppShell` already handles page-level entrance (opacity + Y-axis translation). Secondary animations cause flickering.

---

## 7. Component Selection Guide

| Scenario | Component |
|----------|-----------|
| Overlay with **> 2 input fields** | `ResponsiveDialog` — centered dialog on desktop, bottom drawer on mobile |
| Quick selection / pickers | `Popover` |
| Destructive / irreversible actions | `AlertDialog` |
| Document viewing or complex detail views | `ResponsiveDialog` with `variant="fullscreen"` |
| Lists inside drawers or dialogs | `ScrollArea` — never global page scroll |

### Additional Component Rules
- Page headers: `flex-col sm:flex-row`. Title: `text-2xl` mobile → `text-3xl` desktop.
- Universal action buttons (Delete, Refresh, Print, Export): collapse to icon-only on `sm`. Use `hidden sm:inline` for button text labels.
- Use the `useScrollDirection` hook for auto-hide-on-scroll-down / show-on-scroll-up sticky headers on mobile.
- Drawers: `max-h-[95dvh]` to keep the drag-to-dismiss handle visible and show a background sliver.
- Popovers: use `modal={true}` for calendar pickers to prevent z-index conflicts.
- Action buttons in lists (Edit, Delete): **always visible on mobile** — never use `group-hover:opacity-0`.
- Dialog / Drawer headers: keep minimal. Replace long `DialogDescription` text with a small `Info` icon button; show detail only on interaction.

---

## 8. Terminology Standards

Use **exactly** these terms. Deviations will be rejected.

| Concept | ✅ Use | ❌ Avoid |
|---------|--------|---------|
| Unique product type | **Product ID** | Registry ID, PID, SKU, NDC, Commercial Designation |
| Product list | **Product List** | Registry, Inventory, SKU List |
| Product name | **Product Name** | Commercial Designation, Title |
| Production run | **Batch** | Run, Lot, Registry Item |
| Serialized units | **Batch Units** | Unit Registry, Serial List, QR List |
| Data & charts | **Analytics** | Intelligence, Suite, Data Insights |
| Verification source | **Blockchain** | Global Ledger, Registry, Chain |
| Regulatory action | **Recall / Restore** | Protocol Action, Governance |
| User's saved medications | **My Medicines** | Cabinet, Saved Meds |

- Local storage key for saved medications: `my_medicines` (not `cabinet` or any other variant).

---

## 9. Blockchain Integration

- **Blockchain is the root source of truth for product verification.** Always prefer blockchain data over MongoDB for verification logic.
- MongoDB is used **only** for rich metadata enrichment: high-res images, dynamic scan counts, etc.
- Verification must function even if the MongoDB node is unresponsive.
- All blockchain calls are handled via `frontend/api/web3-client.ts`. Do not replicate this logic elsewhere.

---

## 10. Documentation & Tutorials

When making UI changes to any page or component described in `/ai-service/tutorials`:

1. **Identify** the corresponding tutorial file(s).
2. **Update** them to reflect the new UI in the same PR/commit as the code change.
3. **Verify** that all steps and terminology in the tutorial match the updated UI exactly.

Leaving tutorials out of sync with the live UI is a bug, not a backlog item.

---

*Last updated: April 2026 — keep this file current with every architectural decision.*
