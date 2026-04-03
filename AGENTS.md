# ChainTrust - System Context & Principles

## Project Architecture
ChainTrust is a multi-tier pharmaceutical supply chain verification platform:
1. **Frontend (`/frontend`)**: A Next.js (React) application with Tailwind CSS. It serves two primary user roles: Customers (Consumers) and Manufacturers.
2. **Backend (`/backend`)**: A Node.js and Express server that handles core business logic, authentication, and database interactions with MongoDB.
3. **AI Service (`/ai-service`)**: A Python-based microservice (FastAPI) that powers the AI assistant. It manages chat sessions, medical knowledge retrieval, and executes situational tools.
4. **Blockchain**: A decentralized ledger used as the immutable source of truth for batch salts and product authenticity. Handled via specialized APIs.

## UI/UX Principles
1. **Contained Layout Design (Preference for No-Scroll):**
   - While not strictly enforced, applications and dashboards should aim to fit within the viewport height (`100vh` or `h-screen`) whenever possible for a superior UX.
   - Use multi-column grids (e.g., `grid-cols-1 lg:grid-cols-3`) to utilize horizontal space instead of stacking content vertically.
   - Use `flex-1` and `min-h-0` on container columns, applying `overflow-y-auto` only locally where inner content absolutely must scroll (like a table body or chat view), avoiding global page scroll.
   - **Padding Consistency**: All authenticated pages are wrapped in `AppShell`, which provides standard padding (`p-4 lg:p-8`). Pages should NOT add their own top-level padding to avoid double-spacing.
2. **Typography Principles**:
   - **Strict Casing Rule**: STOP USING `uppercase` in UI elements. All buttons, tabs, headers, badges, and labels must use **standard sentence case** (e.g., "Save changes", not "SAVE CHANGES").
   - **Banned Classes**: Do not use `uppercase`, `capitalize`, or `tracking-widest` for general UI components.
   - **Exception**: "Stat Cards" (e.g., dashboard counters, KPI displays) MAY use uppercase for labels (e.g., "TOTAL SCANS") to provide structural emphasis.
3. **Component Density:**
   - Reduce excessive padding (`p-8` -> `p-4` or `p-6`) when combining multiple cards on a single screen.
   - Use compact text sizes (`text-sm`, `text-xs`) for metadata to keep interfaces tight without losing readability.
4. **Card-Based Layouts:**
   - Group related functions together in visually distinct boundaries (e.g., `Card` components).
   - Use subtle borders or slight background tints (`bg-muted/50`, `bg-green-500/10`) to delineate status without overwhelming the user.
5. **Immediate Feedback:**
   - Display loading states (`Loader2`, skeletons) prominently.
   - Provide clear, bold status indicators (e.g., Green checkmarks for Authentic, Red alerts for Counterfeit/Recalled).
6. **Mobile-First Responsive Design:**
   - **Page Headers:** Use `flex-col sm:flex-row` for headers. Titles should be `text-2xl` on mobile and `text-3xl` on desktops.
   - **Button Collapse:** Universally understood actions (Delete, Refresh, Print, Export) should collapse to icons or compact versions on `sm` screens. Use `hidden sm:inline` for button text.
   - **Sticky Headers:** Application layouts should use the `useScrollDirection` hook to auto-hide the header on scroll-down and show it on scroll-up for mobile users.
   - **Grid Adaptability:** Use `grid-cols-1` or `grid-cols-2` on mobile, scaling to `md:grid-cols-3` or `lg:grid-cols-4` for dashboards.
7. **No-Status Redundancy (Implied Validity)**:
   - The "Verified" badge is strictly banned in manufacturer-facing dashboards (Batches, Products, Analytics) for normal active states.
   - Validity is implied; badges should only be used for exceptional, actionable, or negative states (e.g., Recalled, High Risk, Restored).
8. **Animation Control**:
   - Do NOT add `AnimateIn` or other entrance animations to components or pages that are wrapped in `AppShell`. 
   - The `AppShell` component already handles page-level entrance animations (opacity and Y-axis translation). 
   - Adding secondary animations causes flickering and redundant motion.

## Mobile-First Adaptation Standards
1. **Component Selection Guide**:
   - **Interactive Form Overlays**: Any overlay with more than 2 input fields MUST use `ResponsiveDialog`. This ensures a centered dialog on desktop and a bottom-aligned drawer on mobile.
   - **Quick Selection/Pickers**: Use `Popover` for simple toggles or quick-pick lists (e.g., Category Filter) on both mobile and desktop.
   - **Destructive/Critical Confirmations**: Use `AlertDialog` for irreversible actions (Delete, Reset).
   - **Contextual Viewers**: Use `ResponsiveDialog` with `variant="fullscreen"` for document viewing or complex detail views.
2. **Overflow & Scroll Management**:
   - **Local Scrolling**: Use `ScrollArea` for lists inside drawers or dialogs. Avoid global page scrolling whenever a contained scrolling area can suffice.
   - **Drawer Constraints**: Drawers should use `max-h-[95dvh]` on mobile to maintain visual context (slivers of the background) and keep the drag-to-dismiss handle visible.
   - **Popover Alignment**: Ensure popovers are centered or appropriately anchored on mobile to prevent clipping. Use `modal={true}` for calendar pickers inside containers to avoid z-index conflicts.
3. **Touch Target Standards**:
   - **Sizing**: Minimum touch target size is 44x44px for primary actions.
   - **Buttons**: Use `h-12` (mobile) and `h-10` (desktop) for standard actions.
   - **Visibility**: Action buttons in lists (Edit, Delete) must ALWAYS be visible on mobile. Do not use `group-hover:opacity-0` for critical mobile actions.
4. **Header Information Density**:
   - **Minimal Descriptions**: Use minimal to no descriptions in Dialog/Drawer headers.
   - **Contextual Info**: If detailed context is required, replace the `DialogDescription` text with a small "Info" button (info icon). Detailed context should only be shown on interaction (e.g., via Tooltip or Popover).

7. **"My Medicines" Rename:**
   - Always refer to the user's saved medications as "My Medicines" instead of "Cabinet".
   - Local storage keys should use `my_medicines`.

## Identification & Data Modeling
1. **Primary Identifiers**: Use `productId` (SKU/Catalog ID) and `batchNumber` (Production Run ID) as the primary keys for all user-facing interactions, API routing, and business logic.
2. **Technical vs. Business Unique Keys**: 
   - While MongoDB uses `_id` for technical uniqueness at the document level, the system must enforce uniqueness for `productId` and `batchNumber` within the scope of a single user/company. 
   - Overlapping IDs between different companies/users are acceptable at the database level, but the UI and API should always resolve them in the context of the authenticated session.
3. **Consistency**: Avoid exposing or relying on `_id` in frontend URLs or human-readable communications. Always prioritize the business identifiers for unique identification.

## Frontend Context
- **Framework:** Next.js (React) with Tailwind CSS.
- **Key Pages:**
  - `/customer/cabinet`: User's "My Medicines" dashboard. Track active medications and alerts. Designed for mobile-first tracking.
  - `/verify`: Consumer-facing verification. Fetches directly from the blockchain for decentralized validation, then enriches with MongoDB metadata. Designed to fit in `h-screen`. Logged-out users get a restricted view with a login prompt for saving to "My Medicines".
  - `/manufacturer/add-product`: Multi-step wizard for enrolling batches. Derives cryptographic salts client-side before sending to backend.
  - `/manufacturer/batches`: Dashboard showing enrolled batches and their scan counts. Supports mobile-first refreshing and row actions.
  - `/manufacturer/batches/[id]`: QR generation page with `print`-media CSS to directly output grid sheets without the UI chrome.
- **Blockchain Integration:** Handled via APIs in `frontend/api/web3-client.ts`. 
  - **Core Rule:** The UI should ALWAYS prefer blockchain data as the root source of truth for product verification, using the DB only for rich metadata (high-res images, dynamic scan counts). Verification must function even if the MongoDB node is unresponsive.

## Backend Context
- **Framework:** Node.js, Express, MongoDB (`mongoose`).
- **Key Concepts:**
  - **Batches:** A batch represents a production run. Custom `batchNumber` and `productId` are used.
  - **Unit Salts:** QR codes embed a unit index. The exact salt is deterministically derived via `SHA-256(batchSalt + "-" + unitIndex)`.
  - **Scan Tracking:** When a QR is scanned, the `/api/batches/verify-scan` endpoint checks the salt, increments a tracking counter in MongoDB for that specific unit, and returns the scan count to alert the consumer of potential counterfeits (e.g., >5 scans).
  - **S3/MinIO:** Used for decentralized-style or self-hosted image storage for product packaging. The backend is configured to automatically initialize MinIO buckets on first upload.

## AI Service & Situational Awareness
1. **Situational Tool (`get_view_data`)**: The AI agent uses the `get_view_data` tool to "see" what the user sees on their current page. This tool aggregates real-time data from MongoDB to mimic the frontend's state.
2. **Synchronization Rule**: Any changes to the frontend's data-fetching logic (e.g., adding a new stat to a dashboard, changing a filter, or modifying a table's data source) MUST be mirrored in the `get_view_data` tool within the `ai-service`. This ensures the assistant remains context-aware and accurate.

## UI Terminology Standards
Always use the following fixed terminology in the UI. Do not invent new terms.

| Concept | Allowed Term | Banned / Avoid |
| :--- | :--- | :--- |
| Unique Product Type | **Product ID** | Registry ID, PID, Commercial Designation, SKU, NDC, etc. |
| Product List | **Product List** | Registry, Inventory, SKU List |
| Product Name | **Product Name** | Commercial Designation, Title |
| Production Run | **Batch** | Run, Lot, Registry Item |
| Serialized Units | **Batch Units** | Unit Registry, Serial List, QR List |
| Data & Charts | **Analytics** | Intelligence, Suite, Data Insights |
| Verification Source | **Blockchain** | Global Ledger, Registry, Chain |
| Regulatory Action | **Recall / Restore** | Protocol Action, Governance |

## Documentation & Tutorials
1. **Tutorial Updates**: AI agents MUST update the corresponding tutorial files in `ai-service/tutorials` whenever they make UI changes to the pages or components described in those tutorials. This ensures user-facing documentation remains synchronized with the latest UI enhancements.
