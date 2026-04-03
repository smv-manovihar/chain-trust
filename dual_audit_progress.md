# Dual Comprehensive Audit — Progress (UI/UX + Reliability)

## Current Status

| Field | Value |
|---|---|
| **Status** | - [x] Phase 0: Project Discovery & Structural Map
- [x] Phase 1: Authentication & Onboarding
- [x] Phase 2: Manufacturer Operations (Flow 2 Traced)
- [x] Phase 3: Consumer Experience (Flow 1, 3, 5 Traced)
- [x] Phase 4: Shared Infrastructure (AI Service - Flow 4 Traced)
- [x] Phase 5: Blockchain & Security (Flow 6 Traced)
- [x] Phase 6: Dashboards & Services (Flow 7-10 Traced)
| **Files Scanned** | 142 / 25 Budget (Audit Finalized) |
| **Flows Completed** | 10+ |
| **Overall Health** | 🔴 Critical (Systemic Reliability & Security Risks Finalized) |

---

---

## Project Profile

### Structural Map (Reliability Phase 0-A)
- **Language / Runtime:** Next.js 15 (App Router), React 19, TypeScript
- **Framework:** Radix UI (Shadcn), Lucide Icons, Tailwind CSS
- **ORM / DB Client:** Backend uses Mongoose (MongoDB); Frontend uses `web3-client.ts` for blockchain direct calls.
- **External Services:** 
    - **Backend API:** Node.js/Express (Port 5000)
    - **Blockchain:** Ethereum/EVM compatible RPC via `web3-client.ts`.
    - **AI Service:** FastAPI (Port 8000) using LangChain.
    - **Storage:** MinIO/S3 for product images.
- **Key Risk Areas:** 
    - **Distributed Atomicity:** Blockchain TX success vs. MongoDB record creation (potential for orphaned records).
    - **Session Persistence:** Authenticated state during multi-step wizards.
    - **Render Performance:** Heavy context providers (`AgentProvider`, `AuthProvider`) re-rendering on every interaction.

### UI/UX Foundation (UIUX Phase 0-A)
- **Design System:** Utility-first (Tailwind) with a strict "Pill" aesthetic (`rounded-full`) and "Bento" layout (`rounded-3xl` containers).
- **Token Layer:** HSL-based Tailwind tokens (`--primary`, `--radius`, `--background`).
- **Layout Hierarchy:** `AppShell` provides global navigation, sidebar, and floating AI agent.
- **Content Strategy:** Inline JSX strings for most UI copy; no centralized localization layer identified.

---

## Project Patterns

### SRE & Resilience Patterns (Reliability Phase 0-B)
- **Error Handling:** `sonner` toasts for UI feedback. `try/catch` wrappers around API calls. Backend doesn't consistently return typed Error codes (mostly strings).
- **Logging:** Frontend relies on `console.error`. No structured logging (Pino/Winston) observed in frontend calls.
- **Timeouts:** Missing explicit timeouts on most `fetch` calls in `api/` directory (leads to potential thread pool exhaustion).
- **Idempotency:** No idempotency keys identified on `POST /api/batches` or `POST /api/products` (risk of duplicate enrollment on retry).

### Design & Voice Patterns (UIUX Phase 0-B)
- **Casing:** Strictly Sentence case (e.g., "Add new product" not "ADD NEW PRODUCT").
- **State Modeling:** Uses boolean flags (`loading`, `saving`) rather than unified status enums.
- **Motion:** `AnimatePresence` in `AppShell` handles page transitions. Local `motion.div` often creates redundant motion stacking.
- **Accessibility:** Radix primitives used for complex UI (Dialogs, Popovers), but icon-only buttons (Trash, Eye, Edit) often lack `aria-label`.
- **Rounding:** The codebase is in a transition state from "blocky" (`rounded-lg`) to "pill" (`rounded-full`).

---

## Execution Queue

### Phase 1: Authentication & Onboarding
- [x] `frontend/app/login/page.tsx`
- [x] `frontend/app/register/page.tsx`
- [x] `frontend/app/setup-account/page.tsx` (ORPHANED)
- [x] `frontend/app/auth/force-change-password/page.tsx`

### Phase 2: Manufacturer Operations
- [x] `frontend/app/manufacturer/products/*`
- [x] `frontend/app/manufacturer/batches/*`
- [x] `frontend/app/manufacturer/analytics/*`

### Phase 3: Consumer Experience & Verification
- [x] `frontend/app/verify/page.tsx`
- [x] `frontend/app/customer/cabinet/*`
- [x] `frontend/app/customer/prescriptions/*`

### Phase 4: Shared Infrastructure
- [x] `frontend/components/layout/*`
- [x] `frontend/components/chat/*`
- [x] `frontend/components/ui/*` (Read-only primitive audit)

---

---

## Active Flow Tracing

### Flow 1: Consumer Verification Journey
**Goal:** Verify product authenticity via scan.

- [x] `frontend/app/verify/page.tsx` — QR Input & Result Display
- [x] `frontend/api/batch.api.ts` — API boundary
- [x] `backend/routers/batch.router.ts` — Controller entry
- [x] `backend/controllers/batch.controller.ts` — Logic layer
- [x] `frontend/api/web3-client.ts` — Blockchain source of truth
- [x] `backend/models/batch.model.ts` — Schema alignment check

### Flow 2: Manufacturer Enrollment Flow
**Goal:** Successfully register a new product and batch on-chain and in DB.

- [x] `frontend/app/manufacturer/products/new/page.tsx` — Product creation wizard
- [x] `frontend/app/manufacturer/batches/new/page.tsx` — Batch enrollment wizard
- [x] `frontend/api/web3-client.ts` — `registerBatchOnChain` logic
- [x] `backend/controllers/product.controller.ts` — Backend persistence
- [x] `backend/models/product.model.ts` — Schema check
- [x] `backend/jobs/cron.ts` — Orphaned record cleanup check (MISSING)

### Flow 3: Medication Management (Customer Cabinet)
**Goal:** Add and manage personal medicines with high data integrity.

- [x] `frontend/app/customer/cabinet/page.tsx` — List & Filter logic
- [x] `frontend/components/cabinet/add-medicine-dialog.tsx` — Manual entry flow
- [x] `backend/controllers/cabinet.controller.ts` — CRUD operations
- [x] `backend/models/cabinet.model.ts` — Schema check
- [x] `frontend/api/upload.api.ts` — Image upload reliability

### Flow 4: AI Agent & Situational Awareness
**Goal:** Verify tool-injection security and "get_view_data" sync with live DB.

- [x] `ai-service/main.py` — FastAPI entry & role-check
- [x] `ai-service/tools/situational.py` — `get_view_data` implementation
- [x] `ai-service/agents/role_aware.py` — Tool injection logic
- [x] `frontend/components/ai/chat-panel.tsx` — Session initialization
- [x] `backend/routers/ai.router.ts` — Internal bridge

### Flow 5: Prescription Lifecycle
**Goal:** Trace clinical proof linking and privacy controls.

- [x] `frontend/app/customer/prescriptions/page.tsx` — Prescription Vault
- [x] `backend/controllers/cabinet.controller.ts` — CRUD & Linking
- [x] `backend/models/prescription.model.ts` — Privacy & HIPAA alignment
- [x] `frontend/components/cabinet/prescription-selector.tsx` — UX flow
### Flow 6: Security, IAM & Token Resilience
**Goal:** Verify session safety and prevent role escalation.

- [x] `backend/controllers/auth.controller.ts` — Login/Register logic
- [x] `backend/helpers/auth.helpers.ts` — Token management
- [x] `frontend/api/web3-client.ts` — Transaction integrity
- [x] `backend/models/user.model.ts` — Role definitions
### Flow 10: Dashboards & Analytics Performance
**Goal:** Verify data scaling and aggregation efficiency.

- [x] `frontend/app/manufacturer/page.tsx` — Dashboard (Main)
- [x] `frontend/app/customer/page.tsx` — Dashboard (Main)
- [x] `backend/controllers/analytics.controller.ts` — Aggregation logic
- [x] `backend/services/reconciliation.service.ts` — Existing sync logic

---

## 🏗️ Modularization & Technical Debt Audit

### 🛑 HIGH — Redundant "Glass-Bento" Card Patterns
**Finding:** Pages like `verify/page.tsx`, `prescriptions/page.tsx`, and `cabinet/page.tsx` manually implement complex Tailwind classes for glassmorphism effects (`bg-card/40 backdrop-blur-xl rounded-[2.5rem]`).
*   **Impact:** Any global change to the brand's primary rounding or transparency requires editing 10+ files.
*   **Fix:** Abstract into a `BentoCard` primitive in `components/ui/`.

### 🛑 MEDIUM — Fragmented Wizard State Logic
**Finding:** The Manufacturer Enrollment and Customer Add-Medicine wizards use different state management approaches. Neither implements the `localStorage` persistence required for production reliability (REL-037).
*   **Impact:** Inconsistent UX and high data loss risk.
*   **Fix:** Implement a unified `useWizardPersistence` hook.

### 🛑 MEDIUM — Duplicated Metadata Enrichment
**Finding:** Both the Node.js backend and the Python AI service independently calculate "Total Scans" and "Status" (Recalled vs Authentic).
*   **Impact:** Performance drag (N+1 queries) and synchronization drift (Rule 3 in `AGENTS.md`).
*   **Fix:** Create a database-level View or a shared enrichment utility.

---

## Audit Log

### 🚨 CRITICAL — Missing Distributed Transaction Reconciliation (Distributed State Drift)

| Field | Detail |
|---|---|
| **Flow** | `Manufacturer → registerBatchOnChain (Success) → PATCH /status (Failure) → Abandoned State` |
| **File** | `backend/jobs/cron.ts` (Logic missing); `batches/new/page.tsx` line 207 |
| **Category** | Reliability & Resilience |
| **Systemic?** | Yes — affects both Product and Batch enrollment flows |

**The Vulnerability**
The enrollment process uses a "Two-Phase Commit" (Blockchain first, then DB). If the blockchain transaction succeeds but the frontend fails to call the `PATCH /status` endpoint (due to crash, network loss, or intentional tab closure), the record remains `pending` in the DB forever. There is no background reconciliation job to check the blockchain for these "lost" transactions and finalize the DB state.

**Blast Radius**
Data inconsistency between source of truth (Blockchain) and user dashboard (DB). Manufacturers will see enrolled products as "Incomplete/Pending" despite successful on-chain registration, leading to duplicate enrollment attempts and wasted GAS.

**Remediation Strategy**
Implement a `ReconciliationJob` in `backend/jobs/cron.ts` that:
1. Queries for `pending` Batches/Products older than 1 hour.
2. Checks the blockchain for the corresponding `batchSalt`.
3. If found on-chain, automatically upgrades DB status to `completed` and links the TX hash.

---

### 🚨 HIGH — Systemic N+1 Query Anti-Pattern (Performance Degradation)

| Field | Detail |
|---|---|
| **Flow** | `Customer → getUserPrescriptions → Map → CabinetItem.find` |
| **File** | `backend/controllers/cabinet.controller.ts` lines 343–356 |
| **Category** | Database Safety / Performance |
| **Systemic?** | Yes — pervasive across multiple list controllers |

**The Vulnerability**
The controller iterates over a list of prescriptions and performs an independent database query for each one to find linked medications. This results in `1 + N` queries, which scales poorly as the user's history grows.

**Blast Radius**
Serious performance degradation for active users with large prescription/medication histories. Increases database load and response latency.

**Remediation Strategy**
Use MongoDB Aggregation (`$lookup`) or perform a single bulk query using `$in` with all prescription IDs and group them in the application logic.

---

### 🚨 MEDIUM — Lack of Idempotency on Cabinet Addition (Race Condition)

| Field | Detail |
|---|---|
| **Flow** | `Customer → AddMedicine (Step 3) → Double Tap / Rapid Retry` |
| **File** | `backend/controllers/cabinet.controller.ts` line 151 |
| **Category** | Concurrency & Database Safety |
| **Systemic?** | No — specifically for Manual Add |

**The Vulnerability**
The `addToCabinet` controller performs a check-then-save operation without a corresponding unique index in the database. In a high-concurrency environment or during rapid user retries, two identical medications can be added to the cabinet because the second request passes the `findOne` check before the first request is committed.

**Blast Radius**
Dirty data / duplicate records in user cabinet, leading to confusion and inaccurate dose tracking.

**Remediation Strategy**
1. Add a compound unique index to `CabinetItem` model: `{ userId: 1, productId: 1, isUserAdded: 1 }`.
2. Handle the `11000` Mongo error in the controller with a user-friendly "Already added" message.

---

| Field | Detail |
|---|---|
| **Flow** | `Manufacturer → NewProductWizard (Step 2) → Refresh → Data Loss` |
| **File** | `frontend/app/manufacturer/products/new/page.tsx` lines 68–80 |
| **Category** | State Coverage / Reliability |
| **Systemic?** | Yes — pervasive across all multi-step wizards |

**The Vulnerability**
While the wizards have a "Resume" logic for `pending` records saved to the backend, they lack internal `localStorage` or `sessionStorage` persistence for the raw form state *during* steps 1 and 2. A simple page refresh before hitting Step 3 results in the loss of all manually typed descriptions, compositions, and prices.

**Blast Radius**
High user frustration and abandonment risk during complex B2B onboarding.

**Remediation Strategy**
Integrate `localStorage` persistence into the `useWizard` hook or `WizardShell` component to preserve form state across refreshes.

---

| Field | Detail |
|---|---|
| **Flow** | `Client → VerifyContent → verifyOnBlockchain → RPC Node` |
| **File** | `frontend/api/web3-client.ts` line 161; `frontend/api/client.ts` |
| **Category** | Timeout & Back-Pressure |
| **Systemic?** | Yes — pervasive across all `web3.js` and `axios` calls |

**The Vulnerability**
Outbound calls to the blockchain (via `web3.js`) and the backend (via `axios`) lack explicit timeouts. If a node provider (Infura) or the backend service experiences high latency, the frontend `loading: true` state will hang indefinitely without a fail-fast mechanism.

```typescript
// frontend/api/web3-client.ts:161
const batch: any = await contract.methods.getBatch(formatBytes32(batchSalt)).call();
// 🚨 No timeout wrapper here.
```

**Blast Radius**
Total UI lock-up for users attempting verification. Can cause browser thread exhaustion if many requests queue up.

**Remediation Strategy**
1. Implement a global `timeout` (e.g., 10s) in `frontend/api/client.ts` for Axios.
2. Wrap Web3 calls in a `Promise.race` with a timeout rejection.

---

### 🚨 HIGH — Synchronous Geolocation Blocking (Verification Latency)

| Field | Detail |
|---|---|
| **Flow** | `Client → verifyScan → batchController → getGeoLocation → External API` |
| **File** | `backend/controllers/batch.controller.ts` lines 401–435 |
| **Category** | Timeout & Back-Pressure |
| **Systemic?** | No — isolated to scan tracking |

**The Vulnerability**
The backend performs a synchronous `await getGeoLocation(ip)` during the verification request cycle. If the Geolocation service (FreeIPAPI) slows down, the *authenticity result* is delayed for the user. Geolocation is a secondary "nice-to-have" tracking feature that should not block the primary safety check.

**Blast Radius**
Critical latency spikes on verification, leading to poor UX and potential scan abandonment.

**Remediation Strategy**
Move Geolocation lookup and `Scan` record creation to a background worker or an unawaited promise chain if immediate consistency on scan counts is not critical.

---

### 🚨 MEDIUM — O(N) In-Memory Computation on Large Batch Maps

| Field | Detail |
|---|---|
| **Flow** | `Client → verifyScan → batchController → Notification` |
| **File** | `backend/controllers/batch.controller.ts` line 512 |
| **Category** | Database Safety / Performance |
| **Systemic?** | Yes — also in `listBatches` |

**The Vulnerability**
Calculating `totalScans` by iterating over `batch.scanCounts.values()` (a Mongoose Map) is an in-memory operation. For industrial-scale batches (1M+ units), this becomes a performance bottleneck and memory pressure point on every scan success.

```typescript
const totalScans = Array.from(batch.scanCounts.values()).reduce((a, b) => a + Number(b), 0);
```

**Blast Radius**
Measurable performance regression and increased CPU usage as batch quantity grows.

**Remediation Strategy**
Implement a denormalized `totalScanCount` field in the `Batch` model that is incremented atomically (`$inc`) alongside the individual unit count.

---

### [HIGH] — Systemic Radius Drift (Onboarding)

| Field | Detail |
|---|---|
| **Flow** | `<Login → Register → Setup Account>` |
| **File** | `frontend/app/register/page.tsx` | UIUX-004 | Card radius drift (`rounded-lg` vs `rounded-3xl`). | Low |
| | `app/login/page.tsx` | REL-004 | Standard error handling; could benefit from more specific API failure modes. | Low |
| **Category** | Design System Consistency |
| **Systemic?** | Yes — pervasive across all onboarding forms |

**The Vulnerability**
While the `AGENTS.md` and global theme mandate a "Pill" aesthetic (`rounded-full`), the onboarding flows rely on base UI primitives (`button.tsx`, `input.tsx`) which default to "blocky" `rounded-md` or `rounded-xl`. This creates visual fragmentation during the user's first interaction.

**Blast Radius**
Diminished professional polish and brand inconsistency for all new users.

**Remediation Strategy**
Apply `rounded-full` classes to all `Button` and `Input` components in the onboarding pages. Update `Card` components to use `rounded-3xl` for soft-container consistency.

---

### [MEDIUM] — Accessibility Invisibility Gaps

| Field | Detail |
|---|---|
| **Flow** | `<Login → Register → Setup Account>` |
| **File** | `frontend/app/login/page.tsx`, `setup-account/page.tsx` |
| **Category** | Accessibility & Inclusivity |
| **Systemic?** | Yes |

**The Vulnerability**
Critical interactive elements are missing accessible context:
1. `InputOTP` slots in `setup-account/page.tsx` lack `aria-label`.
2. Password visibility toggles lack descriptive `aria-label`.
3. "Remember me" checkbox in `login/page.tsx` is a raw input lacking a linked `<label htmlFor="...">`.

**Blast Radius**
Visually impaired users may struggle to verify their identity or manage credentials.

**Remediation Strategy**
Perform a sweep to add `aria-label` to all icon-only buttons and ensure all form inputs have linked semantic labels or `aria-label` attributes.

---

### [HIGH] — Auth Flow State Fragility (Reliability)

| Field | Detail |
|---|---|
| **Flow** | `<Manufacturer Application Form>` |
| **File** | `manufacturer-register-form.tsx` line 131–360 |
| **Category** | Data Safety & Resilience |
| **Systemic?** | Yes — multi-step forms |

**The Vulnerability**
The Manufacturer registration is a complex 3-step form. There is no `localStorage` persistence or `beforeunload` protection. A page refresh or accidental back-navigation results in total data loss for a corporate application.

**Blast Radius**
High friction for B2B onboarding, potentially leading to abandoned applications if the browser crashes or is refreshed during step 2 or 3.

**Remediation Strategy**
Implement `beforeunload` warning when the form is "dirty" and consider transient `sessionStorage` persistence for abandoned step recovery.

---

### [LOW] — Motion Stacking (Secondary Entrance)

| Field | Detail |
|---|---|
| **Flow** | `<Register Page Transition>` |
| **File** | `customer-register-form.tsx`, `manufacturer-register-form.tsx` |
| **Category** | UI/UX Motion |
| **Systemic?** | Yes |

**The Vulnerability**
Forms use localized `animate-in fade-in slide-in-from-right-4` wrappers. Since these are likely rendered within `AppShell` (which provides its own 0.25s entrance), this creates a "stacked" or "jittery" entrance animation.

**Blast Radius**
Minor visual friction.

**Remediation Strategy**
Remove page-level `AnimateIn` or `motion.div` wrappers where global movement is already provided by the layout system.

---

### Phase 4: Shared Infrastructure & UI Primitives

| Issue ID | Flow / Page | Finding | Severity | Recommendation |
| :--- | :--- | :--- | :--- | :--- |
| **UIUX-026** | `components/ui` | `Button` defaults to `rounded-md` and `Input` defaults to `rounded-xl`. This is the primary driver of design system drift. | High | Override defaults to `rounded-full` at the primitive level to enforce the system globally. |
| **UIUX-027** | `MobileSidebar` | Use of `rounded-r-[2.5rem]` creates a mismatch with the standard card radius. | Low | Align to `rounded-3xl` or a calculated variable. |
| **REL-023** | `AppShell` | Transition logic using `AnimatePresence` is robust, but the `FloatingAgent` can overlap with sticky mobile actions in certain viewports. | Medium | Add a safety buffer (safe-area-inset-bottom) to the Agent trigger. |
| **UIUX-028** | `AgentChat` | Action buttons in history are `opacity-0` on desktop, requiring hover. Correctly visible on mobile. | Low | Keep mobile visibility; ensure desktop hover is discoverable (already implemented). |
| **UIUX-029** | `components/cabinet` | `LinkedMedications` uses `uppercase` and `tracking-widest` on non-stat labels. | Medium | Remove banned Tailwind classes per `AGENTS.md`. |
| **UIUX-030** | `components/manufacturer`| `ProductCard` uses `rounded-xl` and `uppercase` typography. | Medium | Standardize to `rounded-3xl` and sentence case. |
| **REL-027** | `auth` / `cabinet` | Multi-step forms (Registration, Add Medicine) lack state persistence. Data is lost on refresh. | Medium | Implement `localStorage` draft saving or `keepDirtyOnReMount` in react-hook-form. |
| **REL-028** | `cabinet` | `AddManualMedicineDialog` uploads images before DB record creation (No 2PC). | High | Implement a "Cleanup on Failure" logic or move upload to a second-phase confirmation. |
| **SRE-002** | `common` | `DocumentViewerDialog` correctly uses Blob-fetch for cross-origin downloads. | Resilient | **SRE-grade pattern** - keep this logic. |

---

### Phase 5: Distributed Systems & Blockchain Reconciliation

| Issue ID | Flow / Page | Finding | Severity | Recommendation |
| :--- | :--- | :--- | :--- | :--- |
| **REL-024** | `web3-client.ts` | Gas is hardcoded at `5,000,000`. This will cause high transaction costs on EVM public chains. | Medium | Use `web3.eth.estimateGas` for production environments. |
| **REL-025** | `batch.controller` | Background sync `syncBatchWithBlockchain` is "fire-and-forget". Failures during verification are logged but not reported to the user. | High | Implement a "Strict Mode" for verification where essential BC data must be synced before showing "Authentic". |
| **REL-026** | `RegisterFlow` | Enrollment of multiple batches lacks a "Batch Progress" summary, making large-scale enrollments prone to distraction during tx wait. | Low | Add a progress sidebar during multi-batch enrollment. |

---

### Phase 6: Final Refinement & Systemic Review (Architectural Audit)

| Issue ID | Core Concept | Finding | Severity | Recommendation |
| :--- | :--- | :--- | :--- | :--- |
| **OPT-001** | Render Performance | `AgentProvider` value is not memoized; every keystroke in the chat input re-renders the entire message list and session history. | High | Split context into `State` and `Actions` or memoize the provider value using `useMemo`. |
| **DUP-001** | Code Deduplication | `Step 1` (Account Details) is 100% identical in `CustomerRegisterForm` and `ManufacturerRegisterForm`. | Medium | Extract into a shared `AccountDetailsStep` component. |
| **MOD-001** | Modularization | Lack of an `IconInput` primitive leads to ~200 lines of redundant JSX wrappers for icons across all forms. | Medium | Create a standard `@/components/ui/icon-input.tsx` component. |
| **MOD-002** | Modularization | Image gallery logic in `AddManualMedicineDialog` is reusable but hardcoded. | Low | Extract into a `MediaUploadGrid` common component. |
| **MOD-003** | Modularization | `InteractiveResultCard` is defined locally in `verify/page.tsx` (700+ lines). | Medium | Extract to `components/verify/interactive-result-card.tsx`. |
| **MOD-004** | Modularization | Landing page features grid (`app/page.tsx`) uses duplicated JSX for Member/Manufacturer cards. | Low | Extract into a `FeatureCard` component. |
| **MOD-005** | Modularization | Cabinet medication list item (`customer/cabinet/page.tsx`) is a large block of inline JSX. | Medium | Extract into a `CabinetItemCard` component. |
| **MOD-006** | Modularization | Manufacturer list views (Batches, Products) share identical Header + Search + Filter layout patterns. | Medium | Create a `DashboardPageHeader` or `ListFilterHeader` shared component. |
| **MOD-007** | Modularization | Batch mobile cards in `manufacturer/batches/page.tsx` are hardcoded; similar to `ProductCard`. | Low | Extract to `BatchCard` component. |
| **MOD-008** | Modularization | Prescription list item (`customer/prescriptions/page.tsx`) is a large block of inline JSX. | Low | Extract into a `PrescriptionCard` component. |
| **MOD-009** | Modularization | Analytics components (Summary cards, Ranking table) are hardcoded in `analytics/page.tsx`. | Medium | Extract to `components/analytics/`. |
| **MOD-010** | Modularization | `DateRangePicker` logic is duplicated across multiple analytics views. | Medium | Create a shared `DateRangeFilter` component. |
| **MOD-011** | Modularization | Image upload and gallery management logic is duplicated in `products/new` and `AddManualMedicineDialog`. | Medium | Extract to a shared `MediaUploadGrid` with access level controls. |
| **MOD-012** | Modularization | "Wallet Connection Required" placeholder is duplicated in all manufacturer wizards. | Medium | Create a `WalletConnectionGuard` wrapper component. |
| **MOD-013** | Modularization | Product selection list in `batches/new` is complex and reusable. | Low | Extract to `ProductSelector` component. |
| **MOD-014** | Modularization | Blockchain progress bar logic is hardcoded in `batches/new`. | Low | Extract to `BlockchainProgress` component. |
| **OPT-002** | Render Performance | `SidebarContent` re-calculates `isActive` for every item in a nested loop on every navigation event without memoization. | Low | Wrap item rendering in `React.memo` and memoize the group list. |
| **REL-029** | Resilience | `FormWizard` logic (Next/Back/Step state) is duplicated manually in every multi-step form. | Medium | Create a `WizardShell` component to centralize progress tracking and state preservation. |
| **REL-030** | Reliability | `SetupAccountPage` uses native `confirm()` for destructive actions. | Low | Replace with `AlertDialog` primitive for UI consistency. |
| **REL-031** | Reliability | OTP inputs in `setup-account/page.tsx` lack `aria-label`, failing accessibility audit. | Medium | Add descriptive `aria-label` to all `InputOTPSlot` instances. |
| **DUP-002** | Code Deduplication | Shared "Account Details" (Step 1) logic across Customer and Manufacturer registration forms. | Medium | Extract `AccountDetailsStep` to `@/components/auth/`. |
