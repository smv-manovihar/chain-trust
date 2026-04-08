# App Reliability & Resilience Audit — Flow Traces

_This file is append-only. Never edit existing entries._

---

## FLOW-R001 — Frontend <-> Backend <-> AI Boundary for "My Medicines"

**Entry point:** `AddMedicineArgs`, `UpdateMedicineArgs`
**Exit condition:** Data safely persisted in MongoDB without corruption
**Status:** Complete
**Issues found in this flow:** ISSUE-R001

### Trace

| # | File / Screen | Finding summary |
|---|---|---|
| 1 | `ai-service/tools.py` | `dosage` typed as String, `quantity` typed as Int |
| 2 | `backend/models/cabinet.model.ts` | `dosage` requires Number, splits into `currentQuantity` & `totalQuantity` |
| 3 | `ai-service/tool_store.py` | PyMongo inserts arbitrary kwargs, bypassing Mongoose validation |
| 4 | `frontend/lib/validation.ts` | `validateDosage` validates as String, continuing the mismatch circle |

---

## FLOW-R002 — AI Analytics Data Alignment

**Entry point:** `get_verification_data` / `get_manufacturer_batches_data`
**Exit condition:** Agent accurately returns scan counts and suspicious behavior
**Status:** Complete
**Issues found in this flow:** ISSUE-R002

### Trace

| # | File / Screen | Finding summary |
|---|---|---|
| 1 | `ai-service/tool_store.py` | Agent queries `batch.get("scanCounts")` |
| 2 | `backend/models/batch.model.ts` | `scanCounts` is non-existent. |
| 3 | `backend/models/scan.model.ts` | Scans are mapped exclusively to this separate collection. |

---

## FLOW-R003 — Alerts & Notifications Boundary

**Entry point:** `get_manufacturer_dashboard_data` / `get_batch_details`
**Exit condition:** Agent reads the identical threat feed regardless of the view
**Status:** Complete
**Issues found in this flow:** ISSUE-R003

### Trace

| # | File / Screen | Finding summary |
|---|---|---|
| 1 | `ai-service/tool_store.py` (Dashboard) | Reads unread counts from `alerts` / `notifications` |
| 2 | `ai-service/tool_store.py` (Batch details) | Reads from `db["alerts"]` |

---

## FLOW-R004 — API Client Timeouts

**Entry point:** `frontend/api/client.ts`
**Status:** Complete
**Issues found in this flow:** ISSUE-R004

### Trace
| # | File / Screen | Finding summary |
|---|---|---|
| 1 | `frontend/api/client.ts` | `timeout: 50000` is hardcoded globally. |
 
 ---
 
+## FLOW-R005 — Manufacturer Enrollment & Wizard State
+
+**Entry point:** `NewProductWizard.tsx` / `NewBatchPage.tsx`
+**Exit condition:** Consistent state recovery and validation
+**Status:** Complete
+**Issues found in this flow:** ISSUE-R008
+
+### Trace
+| # | File / Screen | Finding summary |
+|---|---|---|
+| 1 | `frontend/lib/validation.ts` | `validateBatchId` regex mismatch with real UI inputs. |
+| 2 | `backend/models/product.model.ts` | `wizardState` is raw `Mixed`, susceptible to breaking on schema change. |
+
+---
+
+## FLOW-R006 — AI Service Document Extraction & OCR
+
+**Entry point:** `/api/ai/parse`
+**Exit condition:** Full data recovery from medical documents
+**Status:** Complete
+**Issues found in this flow:** ISSUE-R007
+
+### Trace
+| # | File / Screen | Finding summary |
+|---|---|---|
+| 1 | `ai-service/utils/file_reader.py` | `ocr_pages_done < 5` hardwired limit. |
+| 2 | `ai-service/utils/file_reader.py` | 50MB file size ceiling potentially blocks high-res scans. |
+
+---
+
+## FLOW-R007 — Documentation & Tutorial Alignment
+
+**Entry point:** `ai-service/tutorials/customer-cabinet.md`
+**Exit condition:** Tutorials match current production UI capabilities
+**Status:** Complete
+**Issues found in this flow:** ISSUE-R010
+
+### Trace
+| # | File / Screen | Finding summary |
+|---|---|---|
+| 1 | `ai-service/tutorials/customer-cabinet.md` | Suggests `showInactive=true` query param. |
+| 2 | `frontend/app/customer/cabinet/page.tsx` | UI supports `Switch` but router doesn't sync `showInactive` to URL. |
+
