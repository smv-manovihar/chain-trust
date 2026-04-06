# UI/UX Audit — Progress

_Last updated: after file 10 / flow 4_---

## Status

| Field         | Value                              |
|---------------|------------------------------------|
| Status        | Complete (Exhaustive Scan)         |
| Flows Done    | 16 / 10                            |
| Files Read    | 38 / 25                            |
| Issues Found  | 10 (C: 2 · H: 3 · M: 4 · L: 1)     |

---

## Project Profile

| Field              | Value |
|--------------------|-------|
| UI Stack           | Next.js (App Router), React, Tailwind CSS |
| Component Library  | shadcn/ui, Radix UI primitives |
| Icon Library       | lucide-react |
| CSS Approach       | Tailwind CSS with `tailwind.config.ts` and `globals.css` HSL variables |
| Token File         | `tailwind.config.ts`, `app/globals.css` |
| Router             | Next.js App Router (`app/`) |
| Animation Library  | Framer Motion (`framer-motion`), tailwindcss-animate |
| Key Risk Areas     | Mobile-first verification pages vs Manufacturer desktop dashboards, varying authentication states. |

---

## Project Patterns

| Pattern            | Convention Observed |
|--------------------|---------------------|
| Button hierarchy   | `<Button>` with variants (`default`, `outline`, `destructive`). Often styled with `rounded-full` and `font-bold`. |
| Icon usage         | Imported directly from `lucide-react` (no `<Icon>` wrapper). Sized via Tailwind (e.g., `h-5 w-5`). |
| Loading states     | `<LoadingScreen>` component used at root, spinners built with Tailwind `animate-spin` inline. |
| Error states       | `<EmptyState>`, inline status badges, `sonner` toasts for errors. |
| Empty states       | Shared `<EmptyState>` component or ad-hoc placeholders. |
| Typography         | Uses Tailwind utility classes directly (`text-2xl`, `font-black`, `tracking-tight`). |
| Spacing/Layout     | Flex/Grid with token-based gaps (`gap-4`, `p-6`). `max-w-*` constraints. |
| Action labels      | Action-oriented (e.g. "Save to My Medicines", "Scan new"). |
| Naming (props)     | Standard React conventions (`onClick`, `onOpenChange`). |

---

## Shared Component Inventory

| Component     | File Path          | Notes             |
|---------------|--------------------|-------------------|
| Button        | `components/ui/button.tsx` | Standard shadcn ui |
| Input         | `components/ui/input.tsx` | Standard shadcn ui |
| Modal         | `components/ui/dialog.tsx`, `responsive-dialog.tsx` | Dialog and responsive implementations |
| Toast/Snack   | `components/ui/sonner.tsx` | Using `sonner` |
| Badge         | `components/ui/badge.tsx` | |
| Select        | `components/ui/select.tsx` | |
| Table         | `components/ui/table.tsx`  | |
| Spinner       | `components/ui/loading-screen.tsx`, `skeleton.tsx` | Full-screen loading, loading states |
| Empty State   | `components/ui/empty-state.tsx` | Shared empty state card |
| Error State   | N/A | Ad-hoc or `<EmptyState>` |
| Card          | `components/ui/card.tsx` | |

---

## Execution Queue

- ~`d:/Coding/ChainTrust/frontend/app/verify/page.tsx`~
- ~`frontend/components/verify/video-scanner.tsx`~
- ~`frontend/components/verify/upload-scanner.tsx`~
- ~`frontend/components/verify/save-medicine-dialog.tsx`~
- ~`frontend/app/customer/cabinet/page.tsx`~
- ~`frontend/app/customer/cabinet/[id]/page.tsx`~
- ~`frontend/app/manufacturer/batches/page.tsx`~
- ~`frontend/app/manufacturer/products/page.tsx`~
- ~`frontend/components/manufacturer/product-card.tsx`~
- ~`frontend/components/manufacturer/product-list-view.tsx`~
- ~`frontend/app/manufacturer/analytics/page.tsx`~
- ~`frontend/app/manufacturer/analytics/scans/page.tsx`~
- `frontend/app/manufacturer/agent/page.tsx` ← DONE
- `frontend/components/chat/agent-chat.tsx` ← DONE
- `frontend/app/manufacturer/settings/page.tsx` ← DONE
- `frontend/app/manufacturer/page.tsx` ← DONE
- `frontend/app/manufacturer/notifications/page.tsx` ← DONE
- `frontend/components/layout/app-shell.tsx` ← DONE
- `frontend/components/layout/manufacturer-sidebar.tsx` ← DONE
- `frontend/components/layout/mobile-sidebar.tsx` ← DONE
- `frontend/components/layout/sidebar-content.tsx` ← DONE
- `frontend/app/customer/page.tsx` ← DONE
- `frontend/app/customer/prescriptions/page.tsx` ← DONE
- `frontend/app/customer/settings/page.tsx` ← DONE
- `frontend/app/customer/notifications/page.tsx` ← DONE
- `frontend/app/page.tsx` ← DONE
- `frontend/components/auth/customer-register-form.tsx` ← DONE
- `frontend/app/verify-email/page.tsx` ← DONE
- `frontend/app/auth/force-change-password/page.tsx` ← DONE
- `frontend/app/customer/agent/page.tsx` ← DONE
- `frontend/app/customer/cabinet/add/page.tsx` ← DONE
- `frontend/app/manufacturer/batches/new/page.tsx` ← DONE
- `frontend/app/manufacturer/products/[productId]/page.tsx` ← DONE

---

## Issue Index

| ID        | Sev | Category             | Short Title                        | Flows          |
|-----------|-----|----------------------|------------------------------------|----------------|
| ISSUE-001 | 🔴H | Styling              | Banned text classes on labels      | FLOW-001, 002, 004, 009, 011|
| ISSUE-002 | 🚨C | Accessibility        | Interactive div missing key roles  | FIXED          |
| ISSUE-003 | 🟠M | Icons                | Decorative icons lack aria-hidden  | FLOW-001..016 |
| ISSUE-004 | 🚨C | Accessibility        | Icon buttons missing aria-labels   | FIXED          |
| ISSUE-005 | 🟡L | Component Usage      | Raw buttons used instead of Button | PARTIAL (FIX-003) |
| ISSUE-006 | 🟠M | Terminology          | Title case used on field labels    | FLOW-001, 006, 007, 009..016 |
| ISSUE-007 | 🚨C | Accessibility        | Interactive buttons nested in Link | FIXED          |
| ISSUE-008 | 🟠M | Component Usage      | Banned badge usage for active states| FIXED          |
| ISSUE-009 | 🔴H | Accessibility        | Interactive TableRow missing keyboard | FIXED          |
| ISSUE-010 | 🟠M | UX                   | Icon-only buttons lack Tooltip wrappers | FLOW-001..016  |

---

## Findings

---

### ISSUE-001 · 🟠MED — Banned text classes on labels

| Field     | Detail |
|-----------|--------|
| Category  | Styling |
| Flows     | FLOW-001 |
| Files     | `frontend/app/verify/page.tsx` |
| Systemic? | Yes |

**The Problem**
AGENTS.md explicitly bans `uppercase` and `tracking-widest` on labels, badges, or headers (except stat counters). The component `InteractiveResultCard` and the result grid use `uppercase tracking-widest` on "Batch of medicines", "Exp. date", "Product media assets", "Expiration", "Unit serial", "Provenance". Also, buttons use Title Case ("Continue Browsing", "Login Now") instead of the prescribed sentence case.
```tsx
<p className="text-muted-foreground text-[10px] font-bold mb-1 uppercase tracking-widest">
  Batch of medicines
</p>
```
**User Impact**
Creates an inconsistent textual hierarchy compared to the rest of the application that follows strict sentence case.

**Remediation**
Remove `uppercase` and `tracking-widest` from non-counter typography. Use sentence case for button labels (`Continue browsing`, `Login now`).

**Updated — Blast radius expanded**
After tracing FLOW-001, the same `uppercase` class violation is used in `frontend/components/verify/upload-scanner.tsx` for the "Please wait" indicator.
**Severity: MEDIUM → HIGH.** Systemic issue across verification flow screens.

**Updated — Blast radius expanded (v2)**
During FLOW-002, widespread usage of Title Case in buttons and labels ("Add Medicine", "Take Dose", "Show Inactive", "Details & Media" tab) replaces the required sentence case. Fits pattern of ignoring the typography rule.

**Updated — Blast radius expanded (v3)**
Found during FLOW-009 inside `frontend/components/layout/sidebar-content.tsx` using `uppercase` and `tracking-wider` for nav group labels.

---

### ISSUE-002 · 🔴HIGH — Interactive div missing key roles

| Field     | Detail |
|-----------|--------|
| Category  | Accessibility |
| Flows     | FLOW-001 |
| Files     | `frontend/app/verify/page.tsx` |
| Systemic? | No — isolated |

**The Problem**
The physical tilt card in `InteractiveResultCard` has `onClick={resetCardPosition}` and `onTouchEnd` on a `<div>` element, but it lacks `role="button"`, `tabIndex={0}`, and any keyboard event handlers (`onKeyDown`).
```tsx
<div
  ref={cardRef}
  onMouseMove={handleCardMouseMove}
  onMouseLeave={handleCardMouseLeave}
  onClick={resetCardPosition}
  onTouchEnd={resetCardPosition}
  style={{ transform: ... }}
>
```
**User Impact**
Keyboard and screen-reader users cannot trigger the card reset action, breaking the interactive experience for them.

**Remediation**
Add `role="button"`, `tabIndex={0}`, and an `onKeyDown` handler to the interactive div.
```tsx
<div
  role="button"
  tabIndex={0}
  onKeyDown={(e) => e.key === 'Enter' && resetCardPosition()}
  onClick={resetCardPosition}
  // ...
>
```

**Updated — Blast radius expanded**
After tracing FLOW-001, the same pattern of an interactive `<div>` / `<motion.div>` lacking accessibility roles (`role="button"`, `tabIndex`, keyboard handlers) appears in `frontend/components/verify/upload-scanner.tsx` for the main dropzone. Systemic upgrade rule applied.
**Severity: HIGH → CRITICAL.** This creates focus-trap dead zones globally.

**Updated — Blast radius expanded (v2)**
Found in `frontend/components/layout/mobile-sidebar.tsx` (FLOW-009) where a background overlay `div` manages `onClick` dismissals without semantic roles.

---

### ISSUE-003 · 🟡LOW — Decorative icons lack aria-hidden

| Field     | Detail |
|-----------|--------|
| Category  | Icons |
| Flows     | FLOW-001 |
| Files     | `frontend/app/verify/page.tsx` |
| Systemic? | Yes |

**The Problem**
Icons used for visual enhancement (`AlertTriangle`, `CheckCircle2`, `ShieldCheck`, `Clock`, `PackageCheck`, `Building2`, `BookmarkPlus`) do not have `aria-hidden="true"`.
```tsx
<Clock className="h-5 w-5" />
<PackageCheck className="h-5 w-5" />
```
**User Impact**
Screen readers will announce generic or redundant information, adding noise to the page reading experience.

**Remediation**
Add `aria-hidden="true"` to all decorative icons.
```tsx
<Clock className="h-5 w-5" aria-hidden="true" />
```

**Updated — Blast radius expanded**
After tracing FLOW-001, the same decorative icons missing `aria-hidden` pattern appears in `frontend/components/verify/video-scanner.tsx` (e.g., `<ImageIcon>`, `<SwitchCamera>`). Systemic upgrade rule applied.
**Severity: LOW → MEDIUM.** Now affects multiple files/components within the core verification flow.

**Updated — Blast radius expanded (v2)**
Also found throughout `frontend/components/verify/upload-scanner.tsx` (`<Camera>`, `<ScanLine>`, `<CheckCircle2>`, `<QrCode>`, `<UploadCloud>`).

**Updated — Blast radius expanded (v3)**
Also found throughout `frontend/components/verify/save-medicine-dialog.tsx` (`<Clock>`, `<Package>`, etc.).

**Updated — Blast radius expanded (v4)**
Also systemic across `frontend/app/customer/cabinet/page.tsx` and `[id]/page.tsx` (over 10+ instances in FLOW-002).

**Updated — Blast radius expanded (v5)**
Also systemic across `agent-chat.tsx` (FLOW-006) and `settings/page.tsx` (FLOW-007).

---

### ISSUE-006 · 🟠MEDIUM — Title case used on field labels

| Field     | Detail |
|-----------|--------|
| Category  | Terminology |
| Flows     | FLOW-001 |
| Files     | `frontend/components/verify/save-medicine-dialog.tsx` lines 171, 192, 213, 243, 266, 299, 322 |
| Systemic? | No — isolated to this dialog for now |

**The Problem**
AGENTS.md mandates "Sentence case everywhere. No uppercase, capitalize... on buttons, tabs, headers, badges, or labels." The save medicine dialog uses Title Case for all form field labels ("Current Amount", "Total Pack Size", "Unit Type", "Dosage Amount", "Prescribing Doctor").
```tsx
<FormLabel className="text-xs font-semibold text-muted-foreground/70 ml-1">
  Total Pack Size
</FormLabel>
```
**User Impact**
Creates textual inconsistency against the established sentence case convention used elsewhere in the application, which makes the UI feel less cohesive.

**Remediation**
Convert form labels to sentence case (e.g. "Total pack size", "Unit type", "Prescribing doctor").
```tsx
<FormLabel className="text-xs font-semibold text-muted-foreground/70 ml-1">
  Total pack size
</FormLabel>
```

**Updated — Blast radius expanded**
Found heavily in `frontend/components/chat/agent-chat.tsx` ("New Chat", "Chat History", "Delete Chat") mapped to FLOW-006.

**Updated — Blast radius expanded (v2)**
Found heavily in `frontend/app/manufacturer/settings/page.tsx` ("Company Profile", "Corporate Name", "Alert Preferences", "Security Alerts") mapped to FLOW-007.

**Updated — Blast radius expanded (v3)**
Found in layout components (`notification-bell.tsx`, `mobile-sidebar.tsx`) during FLOW-009 using Title Case ("View All Notifications", "View Details", "Get Started").

---

### ISSUE-004 · 🔴HIGH — Icon buttons missing aria-labels

| Field     | Detail |
|-----------|--------|
| Category  | Accessibility |
| Flows     | FLOW-001 |
| Files     | `frontend/components/verify/video-scanner.tsx` lines 267, 276 |
| Systemic? | No — isolated |

**The Problem**
Two floating control buttons for switching to upload and flipping the camera only contain SVG icons without any accessible text (`aria-label`).
```tsx
<button
  onClick={handleFlipCamera}
  className="pointer-events-auto h-14 w-14 rounded-full bg-black/40..."
>
  <SwitchCamera className="h-6 w-6 text-white" />
</button>
```
**User Impact**
Screen reader users will hear "button" without any context as to what the button does, making these critical camera controls completely inaccessible.

**Remediation**
Add descriptive `aria-label` attributes to any icon-only `<button>` or `<Button>` elements.
```tsx
<button
  onClick={handleFlipCamera}
  aria-label="Switch camera"
  // ...
>
```

---

### ISSUE-005 · 🟡LOW — Raw buttons used instead of Button

| Field     | Detail |
|-----------|--------|
| Category  | Component Usage |
| Flows     | FLOW-001 |
| Files     | `frontend/components/verify/video-scanner.tsx` lines 200, 267, 276 |
| Systemic? | No — isolated |

**The Problem**
The component builds floating interactive buttons using raw `<button>` elements with heavy manual styling instead of composing the shared `<Button>` component with the `icon` size variant.
```tsx
<button
  onClick={onClose}
  className="absolute top-6 right-6 z-50 h-10 w-10 bg-black/40 backdrop-blur-md rounded-full flex items-center justify-center border border-white/20 active:bg-white/20 hover:bg-white/10 transition-all active:scale-95"
  aria-label="Close scanner"
>
```
**User Impact**
Increases technical debt and diverges from global focus/ring styles that rely on `<Button>`.

**Remediation**
Replace `<button>` implementations with shadcn/ui `<Button>` variants.

**Updated — Blast radius expanded**
Also found in `frontend/app/manufacturer/analytics/page.tsx` and `frontend/app/manufacturer/analytics/scans/page.tsx` for tab selection and batch selection.
```tsx
<Button
  variant="ghost"
  size="icon"
  onClick={onClose}
  className="absolute top-6 right-6 z-50 rounded-full bg-black/40 backdrop-blur-md border border-white/20 hover:bg-white/10 hover:text-white"
  aria-label="Close scanner"
>
  <X className="h-5 w-5 text-white" />
</Button>
```

---

### ISSUE-007 · 🚨CRITICAL — Interactive buttons nested in Link

| Field     | Detail |
|-----------|--------|
| Category  | Accessibility |
| Flows     | FLOW-002 |
| Files     | `frontend/app/customer/cabinet/page.tsx` |
| Systemic? | Yes |

**The Problem**
The medication card on the dashboard wraps the entire UI block in a Next.js `<Link>` element, but the card contains two nested interactive `<Button>` elements ("Take Dose" and Delete).
```tsx
<Link href={`/customer/cabinet/${med._id}`}>
  <Card>
    {/* ... */}
    <Button onClick={(e) => handleTakeDose(e)}>Take Dose</Button>
  </Card>
</Link>
```
**User Impact**
Creates massive accessibility errors (invalid HTML5). Screen reader users hear broken and mixed announcements. Keyboard focus (`Tab`) behaves unpredictably or skips the nested buttons altogether.

**Remediation**
Remove the wrapping `<Link>` from the `Card`. Move the navigation strictly to a specific anchor target (e.g., wrap the medicine name, or add a dedicated "View details" button), keeping the main actions distinct and focusable.

---

### ISSUE-008 · 🟠MEDIUM — Banned badge usage for active states

| Field     | Detail |
|-----------|--------|
| Category  | Component Usage |
| Flows     | FLOW-003 |
| Files     | `frontend/app/manufacturer/batches/page.tsx` |
| Systemic? | Yes |

**The Problem**
AGENTS.md explicitly states: "Status & Badges - 'Verified' badge is banned on manufacturer-facing pages for normal active states. Validity is implied. Only use badges for exceptional, actionable, or negative states." The batches page violates this by displaying an "Active" badge inside the table and grid cards.
```tsx
<Badge variant="outline" className="border-emerald-500/20 bg-emerald-500/10 text-emerald-600">
  Active
</Badge>
```
**User Impact**
Creates visual noise. The core principle of the manufacturer dashboard is "validity is implied", so explicitly highlighting normal operations adds cognitive load and violates the minimalist standard.

**Remediation**
Remove the "Active" badge entirely from manufacturer data grids. Display plain text or simply omit the status if it's the default, reserving badges only for `Recalled`, `Invalid`, or `High Risk`.

**Updated — Blast radius expanded (v2)**
Found again in `frontend/components/manufacturer/product-list-view.tsx` (`<Badge>Active</Badge>`).

---

### ISSUE-009 · 🔴HIGH — Interactive TableRow missing keyboard support

| Field     | Detail |
|-----------|--------|
| Category  | Accessibility |
| Flows     | FLOW-004 |
| Files     | `frontend/components/manufacturer/product-list-view.tsx` |
| Systemic? | No — but common table pattern |

**The Problem**
The `TableRow` component uses `onClick` and `cursor-pointer` to act as a navigation target, but lacks keyboard focus (`tabIndex={0}`) and keyboard handlers (`onKeyDown`).
```tsx
<TableRow 
  key={product._id} 
  className="cursor-pointer"
  onClick={() => router.push(...)}
>
```
**User Impact**
Keyboard-only users cannot navigate using the table rows. The only fallback is if there's a duplicate button inside the row, but the row itself acts as a focus trap or dead zone.

**Remediation**
Add `tabIndex={0}` and an `onKeyDown` handler listening for `Enter` or `Space` to trigger the same routing function.

