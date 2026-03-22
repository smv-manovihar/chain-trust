# Route: /manufacturer/batches (Batch Management)

A comprehensive list of all production batches registered under the manufacturer's account.

## Dashboard Layout & User Actions

### 1. Batches Table (Desktop)
- **Table Columns**:
  - `Batch No.`: Unique batch identifier.
  - `Product`: Name and SKU.
  - `Quantity`: Number of units (e.g., 500).
  - `Dates`: Manufactured and Expiry dates.
  - `Status`: (Badge) Active (Primary) or Recalled (Destructive).
  - `On-chain`: (Badge) Yes (Emerald) or No (Outline).
- **Row Actions**: Click the `...` menu to see:
  - **View Details**: Redirects to batch detail page.
  - **Download PDF**: Instant generation of QR report.
  - **Recall Batch**: Destructive action (requires confirmation).

### 2. Mobile View
- Batches are displayed as **Cards** instead of table rows.
- Each card shows the Batch No, Product Name, and Status.
- Includes a **Swipe to Manage** vibe with a quick action button.

### 3. Search & Filters
- **Search Bar**: Sticky at the top, placeholder: "Search batches...".
- **Category Filter**: A dropdown menu (e.g., Antibiotics, Vitamins).
- **URL Sync**: Both search and categories are synced to the URL (`?search=...`, `?categories=...`). Use `get_current_view_data` to see this.

## AI Guidance & Context
- **Tooling**: Use `search_manufacturer_batches` or `get_current_view_data` to locate a specific batch.
- **Troubleshooting**: If a user asks "where is my newly created batch?", check the "On-chain" status. If it's not registered, suggest they "Recall and Re-create" if metadata was wrong.
- **Recall Guidance**: Only manufacturers can recall their own batches. This is an ethical and safety responsibility.

## AI Context
When helping a manufacturer on this page, always check the `query_params` in `Tools` to understand if they are looking at a filtered set of batches.
