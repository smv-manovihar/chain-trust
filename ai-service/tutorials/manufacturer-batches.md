# Batches Management (Manufacturer)
Route: `/manufacturer/batches`

## Layout Overview
- **Header**: Title "Batches", active batch count badge, "Refresh" button, and "Create Batch" button.
- **Search & Filter**: A search bar for batches/products and a category filter dropdown.
- **Data Table (Desktop)**: Columns for Batch Number, Product, Quantity, Status (Active/Recalled), and Total Scans.
- **Card View (Mobile)**: List of cards showing the same info in a compact format.

## Interaction Guides (Buttons)
1. **Create Batch (Plus Icon)**:
   - *Label*: "Create Batch".
   - *Action*: Navigates to `/manufacturer/batches/new`.
   - *Position*: Top right header.
2. **Refresh (Refresh Icon)**:
   - *Action*: Reloads the batch list.
   - *Position*: Next to Create Batch.
3. **View QR Sheets (QrCode Icon)**:
   - *Action*: Navigates to `/manufacturer/batches/[id]` to print/view unit QR codes.
   - *Position*: Dropdown menu on each row/card.
4. **Copy Tx Hash (ExternalLink Icon)**:
   - *Action*: Copies the blockchain transaction hash to clipboard.
   - *Position*: Dropdown menu on each row/card.
5. **Recall Batch (AlertTriangle Icon)**:
   - *Action*: Triggers a blockchain recall and updates local status to "Recalled". **Irreversible.**
   - *Position*: Dropdown menu (only for Active batches).

## Page Logic
- Recalled batches show a red "Recalled" badge and cannot be recalled again.
- Active batches show an emerald "Active" badge.
- Search is debounced to 500ms.
