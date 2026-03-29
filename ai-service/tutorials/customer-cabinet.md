# Route: /customer/cabinet (My Medicines)

The "My Medicines" page is the user's comprehensive personal medication archive and inventory management suite.

## Layout Overview
- **Dynamic Floating Header**: A sticky, responsive header that collapses into a compact bar upon scroll. It contains:
  - **Dynamic Context**: Welcomes the user and summarizes the total medication count.
  - **Global Actions**: Buttons for "Add Manual Entry" and "Verify New Medicine".
  - **Integrated Search**: A rounded input that syncs with the URL to filter the list by name, brand, or batch.
- **Rich Medication Cards**: Modernized cards featuring:
  - **Identity**: Color-coded icons distinguishing "Verified Authentic" (Primary) from "Self-Added" (Neutral).
  - **Supply Inventory**: A visual `Progress` bar reflecting `(Current Quantity / Total Quantity)`.
  - **Quick Action**: An "emerald" Record Dose button to immediately decrement supply without leaving the page.
  - **Metadata**: Expiry dates, **Medicine Codes** (Identity), and **Composition / Molecules** formatted for readability.

## Key Features & User Interactions

### 1. Dynamic Search & State
- **URL Synchronization**: The `?search=` parameter is updated in real-time (500ms debounce), allowing the AI to observe the user's active filter via `get_current_view_data`.
- **Responsive Transitions**: On mobile devices, the search bar repositions into a compact floating view to maximize list visibility.

### 2. Supply Tracking (New)
- **Inventory Progress**: Each card now displays "Supply Inventory" to prevent sudden stock-outs. If `currentQuantity` drops below 5, the indicator highlights in red.
- **Dose Recording**: Clicking "Take Dose" sends a request to the `/api/user/cabinet/:id/take-dose` endpoint, which decrements the quantity and triggers a visual refresh.

### 3. Detail & Artifact Management
- **Navigation**: Clicking any card routes the user to the `[id]` page where they can manage deeper settings (Treatment Plans, **Medical Documents**, and **Packaging Photos**).
- **Attachments (New)**: Users can store clinical prescriptions and photograph the original drug box (Packaging Photos) for verification and long-term security records.
- **Smart Date Selection**: When adding manual entries, the interface uses a floating [Calendar + Popover](file:///d:/Coding/ChainTrust/frontend/components/ui/calendar.tsx) for superior date management.

## AI Guidance & Context
- **Inventory Analysis**: The AI should monitor the `currentQuantity` field. If a user asks "What am I running low on?", the AI should identify medicines where the progress bar is nearing 0.
- **Dose Recording**: If a user says "I just took my medicine," the AI should offer to "Record the dose" using the `markDoseTaken` action.
- **Verification Priority**: Always distinguish between "Verified Authentic" products (monitored by global security agents) and "Self-Added" items (patient-managed labels).
