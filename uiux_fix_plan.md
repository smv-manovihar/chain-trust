# UI/UX Fix Implementation Plan

> **Status:** Draft — Awaiting User Review
> **Source audit:** `dual_audit_progress.md`
> **Last updated:** 2026-04-03 — Initial draft for Wave 1.

***

## Project Patterns (from audit)

- **Casing:** Strictly Sentence case (e.g., "Add new product").
- **State Modeling:** Loading flags; needs status enums.
- **Rounding:** Pill aesthetic (`rounded-full`) for interactions, Bento containers (`rounded-3xl`).
- **Accessibility:** Radix primitives used; icon-only buttons missing labels.
- **Motion:** `AnimatePresence` in `AppShell`; local motion often redundant.

***

## Fix Inventory

| ID | Severity | Title | Target Files | Category | Dependencies | Status |
|---|---|---|---|---|---|---|
| FIX-001 | 🔴 HIGH | Systemic Radius Alignment | `frontend/app/(auth)/...`, `frontend/app/manufacturer/...` | Design System | — | Pending |
| FIX-002 | 🟠 MEDIUM | Accessibility Context Fill | `frontend/app/setup-account/page.tsx`, `frontend/app/login/page.tsx` | Accessibility | — | Pending |
| FIX-003 | 🔴 HIGH | Wizard Data Persistence | `frontend/hooks/useWizardPersistence.ts` [NEW], `frontend/app/manufacturer/products/new/page.tsx` | UX Safety | — | Pending |
| FIX-004 | 🟡 LOW | Removal of Redundant Entrance Motion | `frontend/app/(auth)/...`, `frontend/components/auth/...` | Motion | — | Pending |

***

## Approach Details

### FIX-001 — Systemic Radius Alignment
**Target:** Onboarding pages and Manufacturer dashboards.
**Approach:** 
1. In `app/login/page.tsx` and `app/register/page.tsx`, apply `rounded-full` to all `Button` and `Input` instances.
2. Ensure `Card` wrappers use `rounded-3xl`.
3. **CRITICAL**: No changes to `frontend/components/ui/` primitives. Overrides done via Tailwind classes.
**What will not change:** Internal `Button` logic or base primitive styles.
**Risk accounted for:** Prevents breaking global styles by isolating overrides to specific features.

### FIX-002 — Accessibility Context Fill
**Target:** `setup-account/page.tsx` [OTP slots], `login/page.tsx` [Checkboxes].
**Approach:** 
1. Add `aria-label="Digit {index + 1}"` to `InputOTPSlot` components.
2. Link the "Remember me" checkbox to a semantic `<label>` using `htmlFor`.
3. Add `aria-label="Toggle password visibility"` to eye-icon buttons.
**What will not change:** Component functionality or layout.
**Risk accounted for:** Improves Screen Reader compliance without visual regressions.

### FIX-003 — Wizard Data Persistence
**Target:** `frontend/hooks/useWizardPersistence.ts` [NEW], `products/new/page.tsx`.
**Approach:** 
1. Create `useWizardPersistence` hook that syncs `data` to `localStorage` on change.
2. In `products/new/page.tsx`, utilize the hook to "Resume" if a draft exists.
3. CLEAR the draft only on successful submission.
**What will not change:** Backend API or wizard step logic.
**Risk accounted for:** Mitigates user frustration on accidental refresh/back navigation.

### FIX-004 — Removal of Redundant Entrance Motion
**Target:** Onboarding forms in `frontend/components/auth/`.
**Approach:** 
1. Identify `animate-in fade-in` or `motion.div` wrappers on root elements already inside `AppShell`.
2. Remove them to ensure steady page entrance.
**What will not change:** Interactive animations (hovers, clicks).
**Risk accounted for:** Eliminates the "flicker" or "double-jump" effect during navigation.

***

## Execution Order

1. **FIX-001** — High visibility design system alignment.
2. **FIX-002** — Essential accessibility hardening.
3. **FIX-003** — Critical functional UX safety.
4. **FIX-004** — Polish and performance refinement.

***

## Design Assets Needed

| ID | Asset | Status |
|---|---|---|
| — | None | Ready |

***

## Deferred / Excluded Items

- None.

***

## Execution Log

<!-- entries appear here as fixes are applied -->
