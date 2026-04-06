# UI/UX Audit — Flow Traces

_This file is append-only. Never edit existing entries._

---

## FLOW-001 — Consumer Verification Journey

**Entry point:** `frontend/app/verify/page.tsx`
**Exit condition:** User receives verification result status
**Status:** Complete
**Issues found in this flow:** ISSUE-001, ISSUE-002, ISSUE-003, ISSUE-004, ISSUE-005, ISSUE-006

### Trace

| # | File / Screen                        | Finding summary                          |
|---|--------------------------------------|------------------------------------------|
| 1 | `frontend/app/verify/page.tsx`       | Banned typography, missing aria/roles    |
| 2 | `frontend/components/verify/video-scanner.tsx` | Missing aria-label, raw buttons      |
| 3 | `frontend/components/verify/upload-scanner.tsx` | Banned typography, missing aria/roles   |
| 4 | `frontend/components/verify/save-medicine-dialog.tsx` | Title case labels, missing aria-hidden |

---

## FLOW-002 — Customer Dashboard Journey

**Entry point:** `frontend/app/customer/cabinet/page.tsx`
**Exit condition:** User manages their medicine cabinet and views details
**Status:** Complete
**Issues found in this flow:** ISSUE-001, ISSUE-003, ISSUE-004, ISSUE-007

### Trace

| # | File / Screen                        | Finding summary                          |
|---|--------------------------------------|------------------------------------------|
| 1 | `frontend/app/customer/cabinet/page.tsx` | Nested link buttons, Title Case on tabs  |
| 2 | `frontend/app/customer/cabinet/[id]/page.tsx` | Unlabeled Title case layouts, missing aria |

---

## FLOW-004 — Manufacturer Products Dashboard Journey

**Entry point:** `frontend/app/manufacturer/products/page.tsx`
**Exit condition:** Manufacturer views products grid/list
**Status:** Complete
**Issues found in this flow:** ISSUE-001, ISSUE-003, ISSUE-004, ISSUE-007, ISSUE-008, ISSUE-009

### Trace

| # | File / Screen                        | Finding summary                          |
|---|--------------------------------------|------------------------------------------|
| 1 | `frontend/app/manufacturer/products/page.tsx` | View mode buttons missing aria, Title Case labels |
| 2 | `frontend/components/manufacturer/product-card.tsx` | Nested interactive tooltips in links |
| 3 | `frontend/components/manufacturer/product-list-view.tsx` | Active badge violation, inaccessible table row |

---

## FLOW-005 — Manufacturer Analytics Journey

**Entry point:** `frontend/app/manufacturer/analytics/page.tsx`
**Exit condition:** Manufacturer reviews analytics overview
**Status:** Complete
**Issues found in this flow:** ISSUE-003, ISSUE-004, ISSUE-005, ISSUE-009

### Trace

| # | File / Screen                        | Finding summary                          |
|---|--------------------------------------|------------------------------------------|
| 1 | `frontend/app/manufacturer/analytics/page.tsx` | Interactive TableRow, missing arias, raw buttons |
| 2 | `frontend/app/manufacturer/analytics/scans/page.tsx` | Raw buttons used instead of Button, missing arias |

---

## FLOW-006 — Manufacturer AI Agent Interaction

**Entry point:** `frontend/app/manufacturer/agent/page.tsx`
**Exit condition:** Manufacturer interacts with AI assistant
**Status:** Complete
**Issues found in this flow:** ISSUE-003, ISSUE-004, ISSUE-006

### Trace

| # | File / Screen                        | Finding summary                          |
|---|--------------------------------------|------------------------------------------|
| 1 | `frontend/components/chat/agent-chat.tsx` (via agent/page.tsx) | Missing aria-labels on icon buttons, Title Case on buttons (New Chat), missing aria-hidden on icons |

---

## FLOW-007 — Manufacturer Settings Journey

**Entry point:** `frontend/app/manufacturer/settings/page.tsx`
**Exit condition:** Manufacturer configures profile and notifications
**Status:** Complete
**Issues found in this flow:** ISSUE-003, ISSUE-006

### Trace

| # | File / Screen                        | Finding summary                          |
|---|--------------------------------------|------------------------------------------|
| 1 | `frontend/app/manufacturer/settings/page.tsx` | Heavy use of Title Case on labels and headers, icons missing aria-hidden |

---

## FLOW-008 — Manufacturer Main Dashboard

**Entry point:** `frontend/app/manufacturer/page.tsx`
**Exit condition:** Manufacturer reviews notifications
**Status:** Complete
**Issues found in this flow:** ISSUE-003, ISSUE-004

### Trace

| # | File / Screen                        | Finding summary                          |
|---|--------------------------------------|------------------------------------------|
| 1 | `frontend/app/manufacturer/page.tsx` | Icons missing aria-hidden |
| 2 | `frontend/app/manufacturer/notifications/page.tsx` | Icon buttons without aria-label, missing aria-hidden on icons |

---

## FLOW-009 — Core Navigation Shell

**Entry point:** `frontend/components/layout/*`
**Exit condition:** Review layout orchestration across the app
**Status:** Complete
**Issues found in this flow:** ISSUE-001, ISSUE-002, ISSUE-003, ISSUE-006

### Trace

| # | File / Screen                        | Finding summary                          |
|---|--------------------------------------|------------------------------------------|
| 1 | `frontend/components/layout/manufacturer-sidebar.tsx`<br>`mobile-sidebar.tsx`<br>`sidebar-content.tsx`<br>`notification-bell.tsx` | Interactive div without role (overlay), Title Case buttons, uppercase tracking-widest labels, icons without aria-hidden. |

---

## FLOW-010 — Customer Main Dashboard

**Entry point:** `frontend/app/customer/page.tsx`
**Exit condition:** Review customer dashboard
**Status:** Complete
**Issues found in this flow:** ISSUE-003, ISSUE-006

### Trace

| # | File / Screen                        | Finding summary                          |
|---|--------------------------------------|------------------------------------------|
| 1 | `frontend/app/customer/page.tsx` | Icons missing aria-hidden, Title Case ("Verify Medicine", "View Details", "Security Vault") |

---

## FLOW-011 — Customer Secondary Pages

**Entry point:** `frontend/app/customer/(prescriptions|settings|notifications)`
**Exit condition:** Review customer secondary management modules
**Status:** Complete
**Issues found in this flow:** ISSUE-001, ISSUE-003, ISSUE-004, ISSUE-006

### Trace

| # | File / Screen                        | Finding summary                          |
|---|--------------------------------------|------------------------------------------|
| 1 | `frontend/app/customer/prescriptions/page.tsx` | Hardcoded UPPERCASE table headers, icons missing aria-hidden. |
| 2 | `frontend/app/customer/settings/page.tsx` | Heavy use of Title Case on FormLabels, tabs, and headers. Icons missing aria-hidden. |
| 3 | `frontend/app/customer/notifications/page.tsx` | Missing aria-label on icon buttons, icons missing aria-hidden. |

---

## FLOW-012 — Onboarding & Auth Journey

**Entry point:** `frontend/app/(page|register|auth/*|verify-email)/page.tsx`
**Exit condition:** Review the root and auth pages
**Status:** Complete
**Issues found in this flow:** ISSUE-003, ISSUE-006

### Trace

| # | File / Screen                        | Finding summary                          |
|---|--------------------------------------|------------------------------------------|
| 1 | `frontend/app/page.tsx` | Title Case violations in hero text and CTAs, icons missing aria-hidden. |
| 2 | `frontend/components/auth/customer-register-form.tsx` | Title Case used on form labels, icons missing aria-hidden. |
| 3 | `frontend/app/verify-email/page.tsx` | Title Case on buttons and headers, multiple loader icons missing aria-hidden. |
| 4 | `frontend/app/auth/force-change-password/page.tsx` | Title case on form labels (Current Password, New Password, Confirm Password). |

---

## FLOW-013 — Customer Additional Flows

**Entry point:** `frontend/app/customer/(agent|cabinet/add)/page.tsx`
**Exit condition:** Review customer minor pages
**Status:** Complete
**Issues found in this flow:** ISSUE-003, ISSUE-004, ISSUE-006

### Trace

| # | File / Screen                        | Finding summary                          |
|---|--------------------------------------|------------------------------------------|
| 1 | `frontend/app/customer/agent/page.tsx` | Clean file. (AgentChat handles the internal logic). |
| 2 | `frontend/app/customer/cabinet/add/page.tsx` | Title case on step titles. missing aria-label for back button, icons missing aria-hidden. |

---

## FLOW-014 — Manufacturer Form Flows

**Entry point:** `frontend/app/manufacturer/(batches/new|products/[productId])/page.tsx`
**Exit condition:** Review manufacturer forms and detail editors
**Status:** Complete
**Issues found in this flow:** ISSUE-003, ISSUE-004, ISSUE-006

### Trace

| # | File / Screen                        | Finding summary                          |
|---|--------------------------------------|------------------------------------------|
| 1 | `frontend/app/manufacturer/batches/new/page.tsx` | Missing aria-label on back icon button, icons missing aria-hidden, Title case on empty states. |
| 2 | `frontend/app/manufacturer/products/[productId]/page.tsx` | Missing aria-label on back icon button, missing aria-hidden on action icons. |

---

## FLOW-003 — Manufacturer Batches Dashboard Journey

**Entry point:** `frontend/app/manufacturer/batches/page.tsx`
**Exit condition:** Manufacturer views batch statuses
**Status:** Complete
**Issues found in this flow:** ISSUE-001, ISSUE-003, ISSUE-004, ISSUE-008

### Trace

| # | File / Screen                        | Finding summary                          |
|---|--------------------------------------|------------------------------------------|
| 1 | `frontend/app/manufacturer/batches/page.tsx` | Active badge violation, missing aria labels |

---

## FLOW-015 — Standalone Settings & Auth Components

**Entry point:** `frontend/components/(auth|settings)/*.tsx`
**Exit condition:** Review standalone application logic components
**Status:** Complete
**Issues found in this flow:** ISSUE-003, ISSUE-006

### Trace

| # | File / Screen                        | Finding summary                          |
|---|--------------------------------------|------------------------------------------|
| 1 | `frontend/components/auth/manufacturer-register-form.tsx` | Title case on section titles ("Admin Full Name", etc.), missing aria-hidden on multiple decorative icons. |
| 2 | `frontend/components/settings/google-connection.tsx` | Title Case ("Account Linking", "Google Account"), missing aria-hidden on Shield and FcGoogle. |
| 3 | `frontend/components/settings/password-settings.tsx` | Title Case ("Current Password", "New Password"), missing aria-hidden on Lock and Loader2 instances. |
| 4 | `frontend/components/settings/danger-zone-settings.tsx` | Title Case on critical headers ("Session Management"), missing aria-hidden on Shield and LogOut. |

---

## FLOW-016 — Auxiliary Dialogs & Modals Flow

**Entry point:** `frontend/components/(prescriptions|email-verification|common)/*.tsx`
**Exit condition:** Review common independent dialog modals
**Status:** Complete
**Issues found in this flow:** ISSUE-003, ISSUE-004, ISSUE-006

### Trace

| # | File / Screen                        | Finding summary                          |
|---|--------------------------------------|------------------------------------------|
| 1 | `frontend/components/email-verification/email-verification-dialog.tsx` | Title case on dialog title ("Verify Email"), icon button missing aria-label, icons missing aria-hidden. |
| 2 | `frontend/components/prescriptions/prescription-upload-dialog.tsx` | Missing aria-label on icon buttons, multiple missing aria-hidden tags. |
| 3 | `frontend/components/common/document-viewer.tsx` | Title case on default document title ("Document Preview"), icon button missing aria-label, missing aria-hidden on action icons. |
| 4 | `frontend/components/prescriptions/prescription-selector.tsx` & `prescription-card.tsx` | Missing aria-labels on action buttons inside cards, missing aria-hidden on all display icons. |
