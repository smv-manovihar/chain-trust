# Batches Fleet Management — Operational Manual
**Route:** `/manufacturer/batches`
**Available Query Params:** `?search=[string]`, `?status=[all|pending|active|recalled]`, `?page=[int]`

The Batches interface serves as the macro-level fleet management screen for the manufacturer's active production runs. It surfaces immutable data pulled dynamically from the blockchain enriched with off-chain scan aggregations.

---

## 🎨 Visual Details & Layout

- **Header Layer:** 
  - Contains a `Total Batches` counter badge.
  - **Export CSV:** A desktop-only button that dumps the currently filtered view into an offline spreadsheet containing deep metrics (Tx Hash, Scans, Dates).
  - **Create Batch:** A prominent primary button linking to the multi-step enrollment wizard at `/manufacturer/batches/new`.
- **Filtering Tools:** 
  - **Search Bar:** Specifically indexes both the alpha-numeric Batch Number AND the human-readable Product Name.
- **Data Presentation:** 
  - The list renders as a Data Table on desktop and a Card Grid on mobile.
  - **Key Metrics Displayed:** Batch Number, Product, Quantity (Total Units), Status Badge (Active vs Recalled), and Total Scans.
  - **Click Routing Rules:** Clicking a row is context-aware. If the batch `status === 'pending'` (meaning the wizard was aborted mid-enrollment), it routes back to `/manufacturer/batches/new?id=X`. If fully enrolled, it routes to the macro detailed view at `/manufacturer/batches/[batchNumber]`.
- **Pagination:** Unlike the consumer inbox, this enterprise grid relies on explicit numerical pagination (Next/Previous bounds) rather than infinite scrolling.

---

## 🛠️ Behavioral Instructions for the Assistant

The Assistant accesses this ledger via specific query tools to analyze supply chain integrity.

| User Intent | Tool Strategy | Notes |
| :--- | :--- | :--- |
| "Export my batches" | Direct UI Guidance | Instruct the user to click the "Export CSV" button in the top right. AI cannot dispatch file downloads. |
| "How many scans does Batch #123 have?" | `get_batch_details` | The UI aggregates scans across the fleet, but precise metrics require specific queries per batch. |
| "Find pending batches" | `list_batches` | Query where `status === 'pending'` so the manufacturer can resume enrollment. |

---

## 🧠 Operational Best Practices

- **Fraud Surveillance:** The "Total Scans" column is a crucial security metric. If a batch of 1,000 units suddenly has 50,000 total scans, the AI should proactively identify this discrepancy as a high probability of counterfeiting or QR cloning.
- **Resuming Workflows:** If a user complains "I started a batch but lost it", explain the "pending" state routing logic. They simply find it in the list and click it to resume where they left off.

