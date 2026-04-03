# Fix Implementation Plan (Reliability)

> **Status:** Draft — Awaiting User Review
> **Source audit:** `dual_audit_progress.md`
> **Last updated:** 2026-04-03 — Initial draft for Wave 1.

***

## Project Patterns (from audit)

- **Error handling pattern:** `sonner` toasts for UI. `try/catch` wrappers. Backend returns string messages; needs typed Error codes.
- **Logging pattern:** `console.error` on frontend. No structured logging on backend yet.
- **Naming conventions:** Sentence case for UI. CamelCase for JS/TS.
- **Return conventions:** JSON with `message` and data object.
- **Documentation style:** JSDoc for functions.

***

## Fix Inventory

| ID | Severity | Title | File(s) | Category | Depends On | Status |
|---|---|---|---|---|---|---|
| FIX-001 | 🚨 CRITICAL | Distributed Transaction Reconciliation | `backend/jobs/reconciliation.job.ts`, `backend/controllers/batch.controller.ts` | Distributed Systems | — | Pending |
| FIX-002 | 🔴 HIGH | Systemic N+1 Query in Prescriptions | `backend/controllers/cabinet.controller.ts` | Performance | — | Pending |
| FIX-003 | 🔴 HIGH | Web3 & Axios Timeouts | `frontend/api/web3-client.ts`, `frontend/api/client.ts` | Resilience | — | Pending |
| FIX-004 | 🟠 MEDIUM | Cabinet Entry Idempotency | `backend/controllers/cabinet.controller.ts`, `backend/models/cabinet.model.ts` | Concurrency | — | Pending |
| FIX-005 | 🟠 MEDIUM | Synchronous Geolocation Blocking | `backend/controllers/batch.controller.ts` | Performance | — | Pending |
| FIX-006 | 🟠 MEDIUM | Dynamic Scan Resolution | `backend/controllers/batch.controller.ts`, `backend/models/batch.model.ts`, `backend/models/scan.model.ts` | Performance | — | Pending *(user-revised)* |

***

## Approach Details

### FIX-001 — Distributed Transaction Reconciliation
**Files:** `backend/jobs/reconciliation.job.ts` [NEW], `backend/controllers/batch.controller.ts`
**Approach:** 
1. Create `reconciliation.job.ts` using `node-cron`. It will query `Batch` where `status: 'pending'` and `createdAt < now - 10m`.
2. For each pending batch, check the blockchain via `getOnChainBatch(salt)`. If found, update status to `completed` and save `blockchainHash`.
3. In `batch.controller.ts`, update `createBatch` to handle `status: 'pending'` and return a `202 Accepted` to the frontend once the BC transaction is initiated/submitted.
**Risk accounted for:** Prevents orphaned DB records if the frontend crashes after MetaMask approval but before the final status PATCH.

### FIX-002 — Systemic N+1 Query in Prescriptions
**File:** `backend/controllers/cabinet.controller.ts` lines 343–356
**Approach:**
1. Extract all `_id`s from the `prescriptions` array.
2. Perform a single `CabinetItem.find({ userId, prescriptionIds: { $in: prescriptionIds } })`.
3. Map the results back to each prescription in memory.
**Risk accounted for:** Reduces DB roundtrips from O(N) to O(1).

### FIX-003 — Web3 & Axios Timeouts
**Files:** `frontend/api/web3-client.ts`, `frontend/api/client.ts`
**Approach:**
1. In `web3-client.ts`, wrap `contract.methods.getBatch().call()` in `Promise.race([..., timeoutPromise(15000)])`.
2. In `client.ts`, add `timeout: 10000` to the Axios configuration.
**Risk accounted for:** Prevents UI "infinite loading" states if nodes or backend are unresponsive.

### FIX-004 — Cabinet Entry Idempotency
**Files:** `backend/controllers/cabinet.controller.ts`, `backend/models/cabinet.model.ts`
**Approach:**
1. Add a compound unique index to `cabinetSchema`: `{ userId: 1, productId: 1, isUserAdded: 1 }`.
2. In `addToCabinet`, wrap the save operation in a `try/catch` and specifically handle Mongo Error `11000`.
**Risk accounted for:** Prevents duplicate medications in the cabinet due to rapid double-clicks or retries.

### FIX-005 — Synchronous Geolocation Blocking
**File:** `backend/controllers/batch.controller.ts` line 401
**Approach:**
1. Remove `await` from `getGeoLocation(ip)`.
2. Move `Scan.create` and Geolocation logic into a separate `async` function that runs in the background.
**Risk accounted for:** The user gets their verification result immediately without waiting for external Geolocation API latency.

### FIX-006 — Dynamic Scan Resolution
**Files:** `backend/controllers/batch.controller.ts`, `backend/models/batch.model.ts`, `backend/models/scan.model.ts`
**Approach (User-Revised):**
1. **Model**: Remove `scanCounts` and `totalScans` from `Batch`. The `Scan` model is the solo source of truth.
2. **verifyScan**: Remove atomic `$inc` on `Batch`. Total scans for milestones will be calculated via `Scan.countDocuments({ batch: batch._id })`.
3. **listBatches**: Use a MongoDB Aggregation `$lookup` on the `scans` collection to get total counts per batch efficiently.
4. **getBatchQRData**: Use an aggregation pipeline with `$match` (batch + unitIndex range) and `$group` (by unitIndex) to get counts for the visible page of units.
**Risk accounted for:** Avoids data consistency issues between `Batch` and `Scan`. Performance is maintained via indexed aggregation.

***

## Execution Order

1. **FIX-006** — Base schema change for performance; low risk.
2. **FIX-004** — Data integrity fix for cabinet.
3. **FIX-002** — Immediate performance improvement for prescription list.
4. **FIX-003** — System-wide resilience fix.
5. **FIX-001** — Critical but complex; requires the reconciliation job infra.
6. **FIX-005** — UX improvement; last as it's secondary to safety.

***

## Execution Log

<!-- entries appear here as fixes are applied -->
