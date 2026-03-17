# ChainTrust - System Context & Principles

## UI/UX Principles
1. **Contained Layout Design (Preference for No-Scroll):**
   - While not strictly enforced, applications and dashboards should aim to fit within the viewport height (`100vh` or `h-screen`) whenever possible for a superior UX.
   - Use multi-column grids (e.g., `grid-cols-1 lg:grid-cols-3`) to utilize horizontal space instead of stacking content vertically.
   - Use `flex-1` and `min-h-0` on container columns, applying `overflow-y-auto` only locally where inner content absolutely must scroll (like a table body or chat view), avoiding global page scroll.
2. **Component Density:**
   - Reduce excessive padding (`p-8` -> `p-4` or `p-6`) when combining multiple cards on a single screen.
   - Use compact text sizes (`text-sm`, `text-xs`) for metadata to keep interfaces tight without losing readability.
3. **Card-Based Layouts:**
   - Group related functions together in visually distinct boundaries (e.g., `Card` components).
   - Use subtle borders or slight background tints (`bg-muted/50`, `bg-green-500/10`) to delineate status without overwhelming the user.
4. **Immediate Feedback:**
   - Display loading states (`Loader2`, skeletons) prominently.
   - Provide clear, bold status indicators (e.g., Green checkmarks for Authentic, Red alerts for Counterfeit/Recalled).

## Frontend Context
- **Framework:** Next.js (React) with Tailwind CSS.
- **Key Pages:**
  - `/verify-product`: Consumer-facing verification. Fetches directly from the blockchain for decentralized validation, then enriches with MongoDB metadata. Designed to fit in `h-screen`.
  - `/manufacturer/add-product`: Multi-step wizard for enrolling batches. Derives cryptographic salts client-side before sending to backend.
  - `/manufacturer/batches`: Dashboard showing enrolled batches and their scan counts.
  - `/manufacturer/batches/[id]`: QR generation page with `print`-media CSS to directly output grid sheets without the UI chrome.
- **Blockchain Integration:** Handled via APIs in `frontend/api/web3-client.ts` and `frontend/lib/blockchain-utils.ts`. 
  - **Core Rule:** The UI should ALWAYS prefer blockchain data as the root source of truth for product verification, using the DB only for rich metadata (high-res images, dynamic scan counts). Verification must function even if the MongoDB node is unresponsive.

## Backend Context
- **Framework:** Node.js, Express, MongoDB (`mongoose`).
- **Key Concepts:**
  - **Batches:** A batch represents a production run. Custom `batchNumber` and `productId` are used.
  - **Unit Salts:** QR codes embed a unit index. The exact salt is deterministically derived via `SHA-256(batchSalt + "-" + unitIndex)`.
  - **Scan Tracking:** When a QR is scanned, the `/api/batches/verify-scan` endpoint checks the salt, increments a tracking counter in MongoDB for that specific unit, and returns the scan count to alert the consumer of potential counterfeits (e.g., >5 scans).
  - **S3/MinIO:** Used for decentralized-style or self-hosted image storage for product packaging. The backend is configured to automatically initialize MinIO buckets on first upload.
