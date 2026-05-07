# ChainTrust — Feature List

> **Source of truth for all implemented features as of May 2026.**
> Every feature listed here has been verified against the live codebase (frontend routes, backend controllers, and AI service tools). Legacy/unimplemented stubs have been excluded.

---

## Table of Contents

1. [Authentication & Identity](#1-authentication--identity)
2. [Public Verification Engine (`/verify`)](#2-public-verification-engine-verify)
3. [Consumer — Dashboard (`/customer`)](#3-consumer--dashboard-customer)
4. [Consumer — My Medicines (`/customer/cabinet`)](#4-consumer--my-medicines-customercabinet)
5. [Consumer — Prescriptions](#5-consumer--prescriptions)
6. [Consumer — Notifications](#6-consumer--notifications)
7. [Consumer — Account Settings (`/customer/settings`)](#7-consumer--account-settings-customersettings)
8. [Manufacturer — Dashboard (`/manufacturer`)](#8-manufacturer--dashboard-manufacturer)
9. [Manufacturer — Product List (`/manufacturer/products`)](#9-manufacturer--product-list-manufacturerproducts)
10. [Manufacturer — Add Product (`/manufacturer/products/new`)](#10-manufacturer--add-product-manufacturerproductsnew)
11. [Manufacturer — Batch List (`/manufacturer/batches`)](#11-manufacturer--batch-list-manufacturerbatches)
12. [Manufacturer — Create Batch (`/manufacturer/batches/new`)](#12-manufacturer--create-batch-manufacturerbatchesnew)
13. [Manufacturer — Batch Detail (`/manufacturer/batches/[batchNumber]`)](#13-manufacturer--batch-detail-manufacturerbatchesbatchnumber)
14. [Manufacturer — Analytics (`/manufacturer/analytics`)](#14-manufacturer--analytics-manufactureranalytics)
15. [Manufacturer — Scan Details (`/manufacturer/analytics/scans`)](#15-manufacturer--scan-details-manufactureranalyticsscans)
16. [Manufacturer — Account Settings (`/manufacturer/settings`)](#16-manufacturer--account-settings-manufacturersettings)
17. [AI Agent (LangChain / FastAPI)](#17-ai-agent-langchain--fastapi)
18. [Blockchain Integration](#18-blockchain-integration)
19. [Notification System](#19-notification-system)
20. [Backend Rate Limiting & Security](#20-backend-rate-limiting--security)

---

## 1. Authentication & Identity

### 1.1 Local Email/Password Registration
- **Route:** `POST /api/auth/register`
- Users register with name, email, and password.
- Passwords are hashed server-side (bcrypt).
- On registration, an email verification OTP is dispatched automatically.
- Accounts are held unverified until email confirmation is complete.

### 1.2 Email Verification
- **Two verification pathways:**
  - **OTP:** `POST /api/auth/verify-email/otp` — User enters a 6-digit code sent to their inbox. Rate-limited via `emailOpsLimiter`.
  - **Magic Link:** `GET /api/auth/verify-email/:token` — Single-click verification from inbox link.
- `POST /api/auth/resend-verification` resends the OTP/link (rate-limited).
- `GET /api/auth/verification-status/:email` allows the frontend to poll the verification state without auth.

### 1.3 Local Login
- **Route:** `POST /api/auth/login` — Rate-limited via `loginLimiter`.
- Returns a short-lived JWT access token and a long-lived refresh token (stored as an `HttpOnly` cookie device session).
- On success, the backend records a new device session entry for the user.

### 1.4 Google OAuth (Hybrid Flow)
- **Browser redirect flow:** `GET /api/auth/google` → `GET /api/auth/google/callback`
- **Token-based flow (for mobile/SPA):** `POST /api/auth/google-login` — accepts a Google ID token and exchanges it for a ChainTrust JWT session.
- If a Google account matches an existing local account by email, it is automatically linked.
- New Google users are **always assigned `role: 'customer'`** — hardcoded in both the `googleCallback` and `googleLoginWithToken` handlers. There is no intermediate role-selection step for OAuth users. They are immediately redirected to `/customer`.

### 1.5 Token Refresh & Session Management
- `POST /api/auth/refresh` — Issues a new access token using the refresh token cookie. No user interaction required.
- `GET /api/auth/verify` / `GET /api/auth/me` — Returns the authenticated user's profile and role.

### 1.6 Device & Session Management
- `GET /api/auth/devices` — Lists all active device sessions for the authenticated user (device name, last active timestamp, IP).
- `DELETE /api/auth/devices/:deviceId` — Revokes a single device session (remote logout).
- `DELETE /api/auth/devices` — Revokes all device sessions (global logout).
- `POST /api/auth/logout` — Destroys the current device session and clears the refresh token cookie.

### 1.7 Password Management
- `POST /api/auth/forgot-password` — Sends a reset link to the user's email (rate-limited).
- `POST /api/auth/reset-password` — Validates the reset token and sets a new password.
- Settings page (`/customer/settings` and `/manufacturer/settings`) exposes an in-app **Change Password** form (component: `PasswordSettings`) for already-authenticated users.

### 1.8 Email Address Change
- `POST /api/auth/change-email` — Initiates an email change. Sends a verification email to the new address. Protected route.

### 1.9 Account Deletion
- `DELETE /api/auth/me` — Permanently deletes the authenticated user's account. Surfaced in the **Advanced** tab of Settings via `DangerZoneSettings` component.

### 1.10 Role-Based Access Control (RBAC)
- Enforced server-side via `authenticateJWT` and `checkRole` middleware.
- Roles: `customer`, `manufacturer`. (The `employee` role schema exists in the data model but employee invite/management flows are not operational in the current UI.)
- Manufacturer routes accept `['manufacturer', 'employee']` — so the role check infrastructure is in place.

---

## 2. Public Verification Engine (`/verify`)

The verification page is the core consumer-facing feature. It is publicly accessible and requires no login to scan a QR code.

### 2.1 Dual-Mode QR Scanner
- **Camera Mode** (`components/verify/video-scanner.tsx`): Uses `Html5Qrcode` from the `html5-qrcode` library (`html5-qrcode@2.3.8`). On mount, calls `Html5Qrcode.getCameras()` to enumerate available cameras, then starts a scan loop against a DOM region element. Automatically decodes QR codes upon capture.
- **Upload Mode** (`components/verify/upload-scanner.tsx`): Uses `html5QrCode.scanFile(file, true)` from the same `html5-qrcode` library — no separate library. The image is decoded client-side via a hidden processing div required by the library.
- Mode toggle is persistent in UI state. The component gracefully handles camera permission denial.

### 2.2 Client-Side Cryptographic Pre-Validation
- Before any network call, the frontend extracts the `unitSalt` from the scanned QR payload.
- A `SHA-256` hash is computed client-side using `@/lib/crypto-utils`.
- This hash is compared against the expected derivation pattern (`batchSalt + "-" + unitIndex`) to catch corrupted or malformed QR codes before hitting the network.

### 2.3 Blockchain Verification
- **Entry point:** `frontend/api/web3-client.ts` — the sole blockchain interface in the frontend.
- The derived `unitSalt` is submitted to the smart contract to check if it was registered.
- Blockchain RPC responses are cached with a **300-second TTL** in the session to prevent redundant on-chain reads for the same QR code.
- Verification **functions even if the MongoDB backend is unresponsive** — blockchain is always queried first.

### 2.4 Backend Scan Recording (`POST /api/batches/verify-scan`)
- This endpoint is public (no auth required) but accepts an optional JWT for enriching scan metadata with user identity.
- On each scan, the backend:
  1. Validates the `unitSalt` against the stored `batchSalt` and `unitIndex`.
  2. Increments a per-unit scan counter in the `scans` collection.
  3. Records the scanner's IP address, geolocation, and timestamp using a **two-tier strategy**:
     - **Primary (synchronous):** `geoip-lite` performs a local, offline IP lookup immediately — this never blocks the scan response.
     - **Secondary (background, fire-and-forget):** `getGeoLocation()` (`backend/utils/geo.util.ts`) calls `https://freeipapi.com/api/json/{ip}` (no API key required) for higher-precision city/region enrichment. The result is logged but does not affect the response.
  4. Calculates a **suspiciousness score** (`calculateSuspiciousness`) based on scan history (velocity, unique visitors, and IP frequency).
  5. If flagged as suspicious, automatically dispatches a `suspicious_scan` notification to the manufacturer.
  6. Returns the full product metadata enriched from MongoDB.
- Rate-limited via `verificationLimiter`.

### 2.5 Interactive Result Card (`InteractiveResultCard`)
The result card provides three distinct visual states:

| State | Trigger | Visual |
|---|---|---|
| **Authentic** | Blockchain confirmed, `isRecalled: false`, `isSuspicious: false` | Green checkmark, product name, expiry date, manufacturer info |
| **Suspicious** | `isSuspicious: true` (Velocity, mass-scan, or impossible travel) | Orange/amber warning, reason for suspicion, counter-sign advice |
| **Recalled** | `isRecalled: true` (set via backend + blockchain recall action) | Red alert, recall reason, "Do not use" advisory |

### 2.6 Suspicious Scan Detection Logic
The backend employs a multi-factor fraud detection engine (`backend/utils/suspicious.util.ts`) that analyzes the history of a specific unit index to identify potential clones:
- **Impossible Travel (Velocity Check):** Uses the Haversine formula to calculate the distance between consecutive scans. Flags units moving at impossible speeds (e.g., >500km in <2 hours).
- **Mass-Scan Threshold:** Flags any unit index scanned by more than 3 unique visitors.
- **Geographic Dispersion:** Flags units detected in more than 2 unique cities within a 24-hour window.
- **IP Flooding:** Flags units receiving 5+ scans within 1 hour or scans from 3+ distinct IPs simultaneously.

### 2.7 Add to My Medicines (Authenticated Users)
- If the user is logged in and the scan is authentic, the result card shows an **Add to My Medicines** button.
- Tapping it opens the cabinet add-item flow pre-populated with the scanned product's data (name, brand, batch number, expiry date, product ID).
- For unauthenticated users, the card shows a login prompt instead.

### 2.8 Unauthenticated Restricted View
- Unauthenticated users can still scan and verify. They see the product's authenticity status and basic metadata.
- A login prompt banner is shown beneath the result card, encouraging sign-in to unlock the full feature set (My Medicines, dose tracking).

---

## 3. Consumer — Dashboard (`/customer`)

### 3.1 Inventory Stats Strip
Fetched from `GET /api/cabinet/stats`. Displays:
- **Total medicines** in cabinet
- **Doses due today** (count of items with a scheduled dose for today)
- **Expiring soon** (items with expiry within 30 days)
- **Active recalls** (cabinet items whose linked batch has `isRecalled: true`)

All four counters update in real time on page load with an AbortController-guarded fetch.

### 3.2 Upcoming Doses
- Fetched from `GET /api/cabinet/upcoming`.
- Lists medicines with their next scheduled dose time. Sorted chronologically.
- Each row links to the item's cabinet detail page.

### 3.3 Safety Alerts Feed
- Lists cabinet items that are either recalled or expiring within 30 days.
- Recalled items show a red "Recalled" badge; expiring items show an amber "Expiring" badge.
- Displayed as a scrollable card list.

### 3.4 Recent Scan History
- Fetched from `GET /api/cabinet/recent-scans`.
- Shows the user's most recent verification scans (regardless of whether the item is in cabinet).
- Includes product name, scan timestamp, and verification result (Authentic/Suspicious/Recalled).

---

## 4. Consumer — My Medicines (`/customer/cabinet`)

This is the primary medicine management interface. Data source: `cabinet_items` MongoDB collection.

### 4.1 Cabinet Item CRUD

#### List Cabinet
- **Route:** `GET /api/cabinet/list`
- Returns all cabinet items for the authenticated user, sorted by `updatedAt` descending.
- Enriched server-side with recall status and blockchain verification flag.

#### Add Item
- **Route:** `POST /api/cabinet/add`
- Items can be added in two ways:
  - **Via scan:** QR code scan → result card → "Add to My Medicines" (pre-populated form).
  - **Manually:** "Add Medicine" button opens a form within the cabinet page.
- Stored fields: `name`, `brand`, `composition`, `expiryDate`, `dosage`, `unit` (pills/ml/mg/etc.), `currentQuantity`, `totalQuantity`, `frequency`, `doctorName`, `notes`, `batchNumber`, `productId`, `batchId` (if scanned), `salt` (unit salt for live scan count tracking).
- `isUserAdded: true` flag is set for manually added items (not scanned).

#### Edit Item
- **Route:** `PUT /api/cabinet/:id`
- Opens a responsive dialog (bottom drawer on mobile, centered on desktop) with all editable fields.
- Edit is optimistically reflected in the UI.

#### Remove Item
- **Route:** `DELETE /api/cabinet/:id`
- Requires confirmation via `AlertDialog`. Destructive, non-reversible.

#### View Item Detail
- **Route:** `GET /api/cabinet/:id`
- Individual item view at `/customer/cabinet/[id]` showing full metadata, dose history log, and reminder schedule.

### 4.2 Dose Tracking

#### Mark Dose Taken
- **Route:** `POST /api/cabinet/mark-taken/:id`
- Decrements `currentQuantity` by the item's `dosage` amount.
- Creates a `dosage_log` entry with timestamp, `doseAmount`, and `wasPunctual` flag.
- **Frequency-aware punctuality:** `wasPunctual` is `true` only if the dose is taken within ±3 hours (`WINDOW_MINUTES`) of a reminder that is actually scheduled for today's calendar day (validated via `isOccurrenceOnDay`). Off-day doses are always recorded as Late.
- **Daily Completion Flag (`isDoseDoneToday`):** The response includes `isDoseDoneToday: boolean`, computed by comparing the number of dose logs for today against the number of reminders scheduled for today. When `true`, the frontend disables the Take Dose button until the next UTC day.
- **Button States (List & Detail pages):**
  - **"Take Dose"** / **"Mark as taken"** — default active state.
  - **"Recently Taken"** (5-min cooldown on list) / **"Dose Recorded"** (4-hour window on detail) — prevents accidental double-logging.
  - **"Done Today"** / **"All doses done today"** (green, disabled) — all scheduled doses for the UTC day are logged.

#### Undo Last Dose
- **Route:** `POST /api/cabinet/undo-dose/:id`
- Finds the most recent `dosage_log` entry for the item, deletes it, and restores `currentQuantity` by `doseAmount`.
- The Undo action clears the "Done Today" state in the frontend, re-enabling the Take Dose button.

#### Dose History Log
- **Route:** `GET /api/cabinet/logs/:id`
- Returns paginated `dosage_log` entries for an item, sorted by most recent.
- Displayed in the item detail view as a timestamped history feed with Punctual (green) / Late (amber) indicators.

### 4.3 Adherence Streak Tracking
- `currentStreak` is computed from `dosage_logs` by `calculateStreak` in the backend controller.
- **Frequency-aware:** A day counts toward the streak only if the user logged at least one dose on a day when a reminder was actually scheduled (per its `frequencyType`, `daysOfWeek`, or `interval`). Logging on an off-day does not advance or break the streak.
- **UTC-normalized:** All date boundary checks use `setUTCHours(0,0,0,0)` to avoid server-timezone drift. This matches the `isOccurrenceOnDay` utility which also uses UTC.
- **Staleness prevention:** `getPersonalCabinet` runs a fire-and-forget background `refreshStreak` for any item whose `lastStreakUpdate` predates today's UTC midnight. The corrected value is served on the next page load without blocking the response.
- Displayed as an orange flame badge (`bg-orange-500/20`, `fill-orange-500`) in the top-right of each medication card (list page) and as a pulsing badge in the Adherence Hero section (detail page).

### 4.4 Reminder Scheduler
Each cabinet item can have multiple reminder times (`reminderTimes[]` array on schema).

Each reminder entry contains:
- `time` (HH:MM, stored as a full datetime)
- `mealContext`: `before_meal`, `after_meal`, `with_meal`, `no_preference`
- `frequencyType`: `daily`, `weekly`, `interval_days`, `interval_months`
- `daysOfWeek` (for `weekly` type)
- `interval` (for interval types)

The backend's notification dispatcher uses a **Look-ahead strategy**: at each scheduled check, it loads all upcoming doses for the next dispatch window and schedules Node.js `setTimeout` timers for the precise due time — eliminating early/late delivery from window-based cron rounding.

### 4.5 Cabinet Category & Search
- Client-side search filters items by name, brand, or composition.
- Items are grouped visually by status (Active, Expiring, Recalled).

### 4.6 Live Scan Count Enrichment
- For scanned items, the cabinet list view cross-references the `scans` collection to show how many times the associated QR unit has been scanned globally.
- A scan count > 5 on a cabinet item's unit shows a visual warning ("Suspicious activity detected on this unit").

---

## 5. Consumer — Prescriptions

### 5.1 Upload Prescription
- **Route:** `POST /api/cabinet/prescriptions/upload`
- Accepts PDF or image files.
- Stored in S3/MinIO. The backend records a `prescription` document with: `userId`, `label` (user-provided name), `fileUrl`, `content` (OCR-extracted text via Tesseract).
- The OCR-extracted `content` field enables the AI agent to search prescriptions by drug name or instruction text.

### 5.2 List Prescriptions
- **Route:** `GET /api/cabinet/prescriptions/list`
- Returns all prescriptions for the authenticated user, sorted by `createdAt` descending.

### 5.3 Delete Prescription
- **Route:** `DELETE /api/cabinet/prescriptions/:id`
- Soft-deletes the document and removes the associated file from S3/MinIO.

### 5.4 Link Prescription to Cabinet Item
- During "Add Item" or "Edit Item", a multiselect allows linking one or more prescription documents to a cabinet item.
- The `prescriptionIds` array on `ICabinetItem` stores the references.
- Linked prescriptions are shown in the item detail view with a link to open the file.

---

## 6. Consumer — Notifications

### 6.1 In-App Notification Bell
- Fixed in the `AppShell` navbar. Shows an unread count badge.
- Fetched from `GET /api/notifications` — returns up to 50 most recent notifications, sorted by `createdAt` descending.
- A **50-notification hard cap** is enforced via a Mongoose `post('save')` hook — oldest notifications are automatically pruned when the cap is exceeded.

### 6.2 Notification Types (Customer)
| Type | Trigger | Channel |
|---|---|---|
| `batch_recall` | A recalled batch matches a user's cabinet item | In-App + Email |
| `medicine_expiry` | A cabinet item's expiry is within the configured window | In-App + Email |
| `dose_reminder` | A scheduled reminder time is due | In-App + Email |
| `low_stock` | `currentQuantity` falls below a per-item threshold | In-App + Email |
| `system` | Platform announcements | In-App |

### 6.3 Mark as Read
- `PATCH /api/notifications/:id/read` — marks a single notification read.
- `PATCH /api/notifications/read-all` — bulk marks all notifications as read.

---

## 7. Consumer — Account Settings (`/customer/settings`)

The settings page has four tabs, all URL-synced (`?tab=`):

### 7.1 General Tab
- **Personal Profile form:** Full Name, Phone Number, City, Street Address, Postal Code, Country. Email is displayed read-only (email changes use a separate flow).
- **Route:** `PUT /api/users/profile` — saves updated fields.

### 7.2 Security Tab
- **Google Account Connection (`GoogleConnection` component):** Shows whether a Google account is linked. Allows connecting/disconnecting Google OAuth.
- **Change Password (`PasswordSettings` component):** Form for current password + new password. Validates minimum length. Sends `POST /api/auth/change-password`.
- **Privacy Controls:** Placeholder card with "Coming soon" state — not functional.

### 7.3 Notifications Tab
Granular per-type, per-channel toggle matrix. For each notification type (`batch_recall`, `medicine_expiry`, `dose_reminder`, `low_stock`, `system`):
- **In-App** toggle
- **Email** toggle
- **`dose_reminder` additionally** exposes a **Lead Time** input (minutes before due time to send the notification).
- Changes are persisted immediately via `PUT /api/notifications/preferences`.

### 7.4 Advanced Tab
- **Delete Account (`DangerZoneSettings` component):** Requires the user to type a confirmation phrase. Sends `DELETE /api/auth/me`.

---

## 8. Manufacturer — Dashboard (`/manufacturer`)

### 8.1 KPI Stats Strip
Displays four real-time counters aggregated from the manufacturer's data:
- **Total Products** — count of `products` collection entries for this user.
- **Active Batches** — count of non-recalled, completed-status batches.
- **Total Scans** — sum of all scan events across all batches.
- **Active Recalls** — count of batches with `isRecalled: true`.

### 8.2 Recent Activity Feed
- Lists the last 10 significant events: batch created, batch recalled, new suspicious scan detected.
- Fetched from `GET /api/analytics/timeline` with a 7-day window.

### 8.3 Top Batches by Scan Volume
- Shows the 5 most-scanned batches with a mini bar chart visualization.
- Each row links to the batch's detail page.

### 8.4 Threat Alert Feed
- Lists current suspicious scan incidents (batches/units where scan count > 5 threshold).
- Fetched from `GET /api/analytics/threats`.

---

## 9. Manufacturer — Product List (`/manufacturer/products`)

### 9.1 Product List & Search
- **Route:** `GET /api/products` — returns all products created by the authenticated manufacturer.
- **Real-time debounced search** (500ms) by product name or Product ID.
- **Category filter** — multi-select dropdown (`CategoryFilter` component).
- All filter state is synced to URL query params (shareable, browser-back-preserving).

### 9.2 View Modes
- **Grid view:** Image-forward card layout (`ProductCard` component). Default.
- **List view:** Compact table layout (`ProductListView` component). Desktop only — falls back to grid on mobile.
- Toggle persisted in component state.

### 9.3 Category Management
- `CategoryManagementDialog` component — opens a dialog to create, rename, and delete product categories (persisted server-side via `POST/DELETE /api/products/categories`).

---

## 10. Manufacturer — Add Product (`/manufacturer/products/new`)

A multi-step wizard for registering a new product SKU.

### Step 1 — Product Identity
- Fields: **Product Name**, **Product ID** (auto-generated slug from name, editable), **Brand**, **Categories** (multi-select from managed list), **Unit** (pills, ml, mg, etc.), **Price**, **Composition**, **Description**.

### Step 2 — Product Images
- Multi-image uploader. Files are sent to `POST /api/products/:id/images` and stored in S3/MinIO.
- **Customer-visible image selector:** Manufacturer can designate which uploaded images (by index) are shown to customers during verification. Non-selected images are internal only.
- Image reordering and deletion supported.

### Step 3 — Review & Submit
- Preview of all entered data.
- On confirm, calls `POST /api/products` to create the product record.

**Draft/Resume:** On step transition, the wizard persists the product's partial state to the DB (`wizardState` field on the product document). If the user navigates away and returns, the wizard reads `?id=` from the URL and re-hydrates from `wizardState`.

---

## 11. Manufacturer — Batch List (`/manufacturer/batches`)

### 11.1 Batch List & Search
- **Route:** `GET /api/batches` — returns paginated batches for the authenticated manufacturer.
- Columns: Batch Number, Product Name, Quantity, Status (Active/Recalled), Total Scans.
- **Debounced search** by batch number or product name (500ms).
- **Category filter** by product categories.
- **Server-side pagination** — 25 items per page, with Previous/Next controls.
- All filter/page state is URL-synced.

### 11.2 Dual Layout (Desktop Table / Mobile Cards)
- Desktop (≥1024px): standard shadcn `Table` component.
- Mobile/Tablet: stacked `Card` grid (2 columns on tablet).
- Pending batches navigate to the wizard resume URL (`/manufacturer/batches/new?id=`). Completed batches navigate to the detail page.

### 11.3 CSV Export
- **Export CSV** button generates a client-side CSV containing: Batch Number, Product Name, Product ID, Quantity, Manufacture Date, Status, Total Scans, Blockchain Tx Hash.
- Exported via a programmatic anchor `download` trigger (no server request).

---

## 12. Manufacturer — Create Batch (`/manufacturer/batches/new`)

A 3-step wizard requiring a connected Web3 wallet.

### Wallet Gate
- If no Web3 wallet is connected, the wizard renders a wallet connection prompt instead of the steps.
- Uses the `Web3Context` to trigger wallet connection (MetaMask / WalletConnect).

### Step 1 — Select Product
- Searchable, filterable list of the manufacturer's registered products.
- Selecting a product initiates a **draft batch record** in the DB (`POST /api/batches` with `status: 'pending'`), and the draft `_id` is appended to the URL (`?id=`). This ensures the in-progress batch can be resumed after a page refresh or crash.

### Step 2 — Batch Metadata
- Fields: **Batch Number**, **Quantity (Units)**, **Manufacture Date** (date picker), **Expiry Date** (date picker).
- All validated before allowing progress to step 3.

### Step 3 — Blockchain Deployment
- Summary of all entered data.
- On "Create Batch":
  1. A cryptographically random `batchSalt` is derived: `SHA-256(productId + batchNumber + timestamp + random bytes)`.
  2. `batchSalt` is written to the draft batch record.
  3. The batch data + salt is submitted to the smart contract via `registerBatchOnChain()` in `web3-client.ts`.
  4. On transaction confirmation, the backend is updated with `status: 'completed'` and the `blockchainHash` (transaction hash).
- A progress bar with percentage is shown during blockchain submission.
- On success, the user is offered a direct link to the batch detail page (for printing the QR sheet) or "Done" to return to the list.

**Draft Resume:** The `useWizardPersistence` hook (`localStorage`-backed) and the `wizardState` DB field are used in tandem. Navigating to a pending batch via `?id=` re-hydrates any previously entered form data.

---

## 13. Manufacturer — Batch Detail (`/manufacturer/batches/[batchNumber]`)

### 13.1 Tabs

#### Info Tab
- **Batch metadata card:** Product name, Batch Number, Quantity, Manufacture Date, Expiry Date, Blockchain hash (`blockchainHash`), `batchSalt` (shown in a tooltip for auditability).
- **Total Scans** KPI counter.
- **Suspicious Clusters** KPI counter — counts units where scan count > 5.
- **Scan Analytics Suite** shortcut — links to `/manufacturer/analytics/scans?batchNumber=X`.

#### Batch Units Tab
- Paginated grid of all serialized units (50 per page).
- Each unit card displays:
  - The unit's QR code (rendered client-side using `QrDisplay` component from the unit's `salt`).
  - **Unit ID** (1-based index).
  - **Scan count badge** — color-coded: >5 shows destructive/red badge.
  - Red pulse indicator dot for flagged units (scan count > 5).
- Client-side **search by unit index**.

### 13.2 QR Label Customization (`Settings` dialog)
Persisted per-product via `PUT /api/products/:id`. Options:
- **QR Code Size** (mm) — slider from 20mm to 60mm.
- **Show Product Name** — toggle.
- **Show Batch Number** — toggle.
- **Show Unit Index** — toggle.
- **Grid column count** — auto-calculated from QR size (using `calculateMaxColumns()` utility with 5mm padding).
- Live preview panel showing a rendered QR label at 96 DPI emulation.

### 13.3 Download QR Labels PDF
- **Route:** `GET /api/batches/:batchNumber/pdf` — server generates a PDF with all unit QR labels arranged in a grid per the saved `qrSettings`.
- Downloaded as `batch-{batchNumber}-labels.pdf` via a programmatic anchor trigger.

### 13.4 Recall Action
- **Recall button** → requires wallet connection → confirmation `AlertDialog` → calls `recallProductOnChain()` in `web3-client.ts` → on TX receipt, calls `POST /api/batches/:batchNumber/recall` with the transaction hash.
- On success, backend sets `isRecalled: true` on the batch and fans out `batch_recall` notifications to all users who have that batch in their cabinet.

### 13.5 Restore (Un-Recall) Action
- Symmetric to recall. Calls `restoreProductOnChain()` → `POST /api/batches/:batchNumber/restore`.
- Sets `isRecalled: false` on the batch and dispatches a `batch_restored` notification to all users who have that batch in their cabinet.

---

## 14. Manufacturer — Analytics (`/manufacturer/analytics`)

### 14.1 Date Range Filter
- **Desktop:** `Popover` calendar picker (2-month view, date range).
- **Mobile:** `Drawer` with a single-month calendar.
- All selected date ranges are synced to URL query params (`?from=&to=`).

### 14.2 Scan Volume Chart
- **Route:** `GET /api/analytics/timeline`
- `LineChart` (Recharts) rendering daily scan counts over the selected date range.
- **Three tabs:** Total Scans / By Products / By Batches. Each tab switches the chart's grouping dimension (`groupBy` query param).
- Chart fades to 50% opacity during re-fetch to indicate stale data.

### 14.3 Executive Summary Card
Four static KPI values:
- Products (total)
- Active Batches (total)
- Total Scans (in selected period)
- Security Incidents (suspicious scan count)

### 14.4 Regional Scans (Geographic Distribution)
- **Route:** `GET /api/analytics/geographic`
- `BarChart` (Recharts) — horizontal bar chart of scan counts by city.
- Populated via the two-tier geolocation strategy at scan recording time: `geoip-lite` (synchronous offline lookup) with background enrichment from FreeIPAPI.com.
- Top 10 cities shown.

### 14.5 Batch Performance Table
- Ranks the manufacturer's top 8 batches by total lifetime scan count.
- Includes: Batch Number, Product Name, a proportional scan count bar, and a direct link to the batch detail page.
- Clicking a row navigates to `/manufacturer/analytics/scans?batchNumber=X`.

---

## 15. Manufacturer — Scan Details (`/manufacturer/analytics/scans`)

- **Route:** `GET /api/analytics/details`
- Full paginated scan log table: Scan Timestamp, Product Name, Batch Number, Unit Index, Location (City/Country), Suspicious flag.
- Filter by `batchNumber` (URL param, pre-filled from batch detail page link).
- Fetched for `getThreatAnalytics` data (`GET /api/analytics/threats`) to surface high-risk units.

---

## 16. Manufacturer — Account Settings (`/manufacturer/settings`)

Structurally identical to the consumer settings page, with the same four tabs (General, Security, Notifications, Advanced).

### Manufacturer Notification Types
| Type | Trigger |
|---|---|
| `suspicious_scan` | A unit in any of their batches exceeds the 5-scan threshold |
| `scan_milestone` | A batch reaches a scan count milestone |
| `system` | Platform announcements |

---

## 17. AI Agent (LangChain / FastAPI)

The AI service (`/ai-service`) runs as a standalone FastAPI application (`main.py`). Auth is validated by reading the `accessToken` cookie (or `Authorization: Bearer` header as fallback) and decoding the JWT using the shared `JWT_SECRET`. Role is extracted directly from the token — no second lookup needed.

The agent is constructed in `ChatService` (`service.py`) as a LangChain ReAct agent. Tools are injected at `ChatService` instantiation based on the JWT role and **cannot be changed** for the lifetime of that service call.

### 17.1 Session & Message API

| Method | Route | Description |
|---|---|---|
| `POST` | `/api/ai/session` | Creates a new chat session for the authenticated user. If a `message` is included in the body, also atomically creates the user + assistant placeholder messages and kicks off generation as a FastAPI `BackgroundTask`. Returns `session_id` and `message_id`. |
| `GET` | `/api/ai/sessions` | Lists the user's chat sessions. Supports `search`, `limit`, and `offset` query params. |
| `PUT` | `/api/ai/sessions/{session_id}` | Renames a session. Verifies ownership before updating. |
| `DELETE` | `/api/ai/sessions/{session_id}` | Deletes a session and all its messages. Verifies ownership. |
| `GET` | `/api/ai/{session_id}/messages` | Lists all messages in a session. Verifies ownership. |
| `POST` | `/api/ai/{session_id}/chat` | Sends a new message into an existing session. Stores the user message and assistant placeholder, then runs `ChatService.process_chat` as a `BackgroundTask`. Returns `message_id`. Returns HTTP 429 if a generation is already in progress for this session. |
| `GET` | `/api/ai/{session_id}/stream` | SSE endpoint for real-time token streaming. Subscribes to the `sse_manager` for the session. Returns a single `done` event immediately if no active generation is running. Sets `X-Accel-Buffering: no` to prevent proxy buffering. |
| `PUT` | `/api/ai/{session_id}/messages/{message_id}` | Edits a user message: updates the content, prunes all downstream messages in the branch, and re-runs generation. Returns HTTP 429 if generation is active. |
| `DELETE` | `/api/ai/{session_id}/messages/{message_id}` | Deletes a specific message and all messages that follow it in the conversation. |
| `POST` | `/api/ai/{session_id}/retry/{message_id}` | Retries generation from a specific message: prunes from that point and re-runs `ChatService`. Returns HTTP 429 if generation is active. |
| `POST` | `/api/ai/parse` | **Internal only** — authenticated via `X-Internal-Secret` header (not JWT). Triggers background OCR/text extraction for a prescription file. Called by the backend after a prescription upload. |

- Sessions are user-scoped. Ownership is verified on every session/message endpoint.
- On startup, `chat_store.cleanup_incomplete_tasks()` marks any sessions left in `generating` state (from a previous crash/restart) as `error`.


### 17.2 Common Tools (All Roles)

| Tool | Description |
|---|---|
| `get_user_profile` | Fetches the user's profile: name, role, email, phone, address, auth provider, email verification status, and (for manufacturers) company name + domain. |
| `list_page_guides` | Returns a list of all available tutorial `.md` file names from `/ai-service/tutorials/`. Used to discover what pages can be explained. |
| `get_page_guide` | Reads the tutorial Markdown file for the user's current route. Falls back to a static `route → filename` map; accepts an optional explicit `guide_name`. Returns the full markdown content of the guide. |
| `get_view_data` | Aggregates real-time MongoDB data mirroring what the user currently sees on their page. Accepts an optional `route` override and `params` dict. Used for situational awareness — not for global search. |
| `list_notifications` | Returns up to 50 recent notifications for the user (alerts, recalls, stock warnings, system). |

### 17.3 Customer-Only Tools

| Tool | Description |
|---|---|
| `list_my_medicines` | Lists the user's cabinet items with enrichment: recall status, blockchain verification flag, live scan count, linked prescription labels. Paginated; max 10/call. Sort by `name`, `updatedAt`, or `createdAt`. |
| `search_my_medicines` | Searches cabinet items by name, brand, composition, doctor name, notes, or Product ID. Returns up to 20 results. |
| `add_medicine` | Adds a new medicine to the user's cabinet. Required: `name`, `brand`, `expiry_date`. Optional: `composition`, `medicine_code`, `batch_number`, `prescription_ids`, `dosage`, `unit`, `frequency`, `quantity`, `doctor_name`, `notes`. |
| `update_medicine` | Updates fields on an existing cabinet item by its `medicine_id`. |
| `remove_medicine` | Removes a medicine from the cabinet by `medicine_id`. |
| `mark_dose_taken` | Decrements `currentQuantity` and logs a `dosage_log` entry for an item. |
| `undo_dose` | Reverts the last dose log: restores `currentQuantity` and deletes the `dosage_log` entry. |
| `add_reminder` | Appends a new reminder to a cabinet item's `reminderTimes` array. Accepts: `medicine_id`, `time` (HH:MM 24h), `meal_context`, `frequency_type`, `days_of_week`, `interval`. |
| `remove_reminder` | Removes a reminder by its 0-based `reminder_index` from a cabinet item's `reminderTimes`. |
| `list_prescriptions` | Lists the user's prescription documents (label, doctor, issued date). Excludes raw content. Paginated; max 50/call. |
| `read_prescription` | Reads paginated lines of a prescription's OCR-extracted content by its integer registry index from `list_prescriptions`. |
| `search_prescriptions` | Regex-based full-text search across OCR-extracted prescription content in MongoDB. Returns up to 30 results. |
| `list_upcoming_doses` | Returns upcoming medication doses for the next 24 hours based on the user's reminder schedules. |


### 17.4 Manufacturer-Only Tools

| Tool | Description |
|---|---|
| `get_product_info` | Fetches a single product's full metadata by Product ID (SKU). |
| `list_products` | Lists the manufacturer's products with batch counts. Paginated; max 10/call. Sorted A-Z by name. |
| `search_products` | Searches products by name or Product ID. Returns up to 20 results. |
| `get_batch_details` | Fetches a single batch's complete data: product details, per-unit scan counts, and recent alert history. |
| `list_batches` | Lists the manufacturer's production batches with live scan counts. Paginated; max 10/call. Sorted by most recent. |
| `search_batches` | Searches batches by Batch Number or product name. Returns up to 20 results. |
| `get_scan_geography` | Returns geographic scan distribution (country + city), optionally filtered by date range, Product ID, or Batch Number. |
| `get_threat_intelligence` | Returns suspicious scan patterns (units with scan count > 5, with multiple distinct visitors), optionally filtered by date range, Product ID, or Batch Number. |
| `list_categories` | Returns all unique product categories defined by the manufacturer's company. |

### 17.5 Agent Constraints
- The agent **must not hallucinate** product data, batch numbers, or scan counts. If `get_view_data` returns empty, the agent states it has no data.
- Medical knowledge responses must cite a retrievable source from the knowledge base loaded at startup.
- The agent must not mutate blockchain state. It is read-only and advisory.

---

## 18. Blockchain Integration

All blockchain interactions are handled exclusively through `frontend/api/web3-client.ts`.

### 18.1 Functions

| Function | Purpose |
|---|---|
| `registerBatchOnChain(batchData, walletAddress)` | Registers a new batch's `batchSalt` on the smart contract. Called during batch creation wizard Step 3. |
| `recallProductOnChain(batchSalt, walletAddress)` | Records a recall event for the given `batchSalt` on the contract. |
| `restoreProductOnChain(batchSalt, walletAddress)` | Records a restore (un-recall) event for the given `batchSalt` on the contract. |
| `verifyOnChain(unitSalt)` | Checks if a unit salt was registered on the contract. Called during scan verification. Response cached for 300s. |

### 18.2 Data Anchoring
- `blockchainHash` (transaction hash) is stored on the `IBatch` document after each on-chain write.
- `batchSalt` is the root secret used to derive all per-unit salts: `SHA-256(batchSalt + "-" + unitIndex)`.
- The smart contract stores `batchSalt` hashes — it does not store individual unit salts. Unit validation is a client-side derivation check followed by a contract lookup.

---

## 19. Notification System

### 19.1 Dispatch Channels
- **In-App:** Stored in the `notifications` collection. Surfaced via the bell icon in `AppShell`. Max 50 per user (auto-pruned).
- **Email:** Dispatched via SMTP service (`/backend/services/email.service.ts`). Formatted HTML templates.

### 19.2 Dispatcher Architecture (Look-Ahead Strategy)
- A background cron job runs periodically on the backend.
- Instead of checking "is a dose due right now?" (window-matching), the dispatcher:
  1. Looks ahead into the schedule window.
  2. Identifies the exact next-due timestamp for each reminder.
  3. Schedules a `setTimeout` for each due event to fire at the **precise minute** it is needed.
- This eliminates the timing drift inherent in window-based cron matching.

### 19.3 Notification Preferences Storage
- Stored in the `notificationPreferences` sub-document on the `User` model.
- Per-type, per-channel (inApp/email) boolean toggles.
- `dose_reminder` additionally stores `leadTimeMinutes` (the look-ahead offset for advance reminders).

---

## 20. Backend Rate Limiting & Security

| Limiter | Routes Applied | Configuration |
|---|---|---|
| `loginLimiter` | `POST /api/auth/login` | Strict per-IP rate limit to prevent brute force |
| `emailOpsLimiter` | OTP verify, resend, forgot password, reset password | Moderate per-IP limit for email-based flows |
| `verificationLimiter` | `POST /api/batches/verify-scan` | Per-IP limit to prevent automated scraping of scan data |

- All protected routes require a valid JWT (`authenticateJWT` middleware).
- Optional JWT (`authenticateJWTOptional`) is used on `/verify-scan` to allow unauthenticated scans while enriching authenticated ones.
- `trackUserActivity` middleware records `lastActive` timestamp on every authenticated request.
- RBAC is enforced at the router level via `checkRole(['manufacturer', 'employee'])` for all manufacturer and analytics routes.

---

*Last verified: May 2026 — trace each feature to its source file before modifying this document.*
