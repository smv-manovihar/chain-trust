# Batch Detail (QR Management) — Operational Manual
**Route:** `/manufacturer/batches/[batchNumber]`

The Batch Detail page is the technical deep-dive for a specific production run. It provides access to unit-level scan data, blockchain verification status, and the specialized "QR Label Designer" for production printers.

---

## 🎨 Visual Details & Layout
- **Batch Identity Banner**: High-fidelity information including Batch Number, Linked Product, and Blockchain Status (on-chain/pending).
- **Scan Analytics Dashboard**:
  - **Scan Velocity**: Interactive line chart showing scans over time.
  - **Unit Distribution**: Visual map identifying which specific units in the batch are being scanned.
- **Blockchain Actions Hub**: Primary toggle for **Recall Batch** and **Restore Batch**. These are high-stakes, direct-to-blockchain actions (require wallet interaction).
- **QR Label Sheet (Print View)**:
  - **Designer Controls**: Sidebar to adjust label size, padding, and text visibility.
  - **Grid Sheets**: Special `@media print` layout that strips the UI for perfect physical printing.
- **Unit Registry Table**: Lists every unit by and index, showing specific Salts and individual scan counters.

---

## 🔗 URL & Navigation (Link Generation)
The agent should generate links using the human-readable `batchNumber`:

| Destination | Route | Description |
| :--- | :--- | :--- |
| **Batch Overview** | `/manufacturer/batches/[batchNumber]` | Full technical view and QR management. |

**AI Rule:** Always use the `batchNumber` (e.g., `B001`) in the URL, not a database ID. If you only have the ID, resolve it via `get_view_data` first.

---

## 🛠️ Tool Integration & AI Guidance

| User Intent | Tool Strategy | Notes |
| :--- | :--- | :--- |
| "Is this batch compromised?" | `get_view_data` | Check the **Scan Analytics** for units with scan counts > 5. |
| "I need to recall a batch." | `get_page_guide` | Explain that the **Recall** button is on the detail page and requires blockchain signature. |
| "Download my QR codes." | `get_page_guide` | Explain the "Print Sheet" functionality. |

---

## 🚨 Error & Empty States
- **Batch Not Found**: UI shows a 404 state. Guide the user back to the [Batch Registry](/manufacturer/batches).
- **Blockchain Syncing**: If a batch was just created, tell the user to wait for the "On-Chain" status before printing.

---

## 🧠 Operational Best Practices
- **Security Guidance**: If multiple units show > 5 scans, advise the user to [Recall](/manufacturer/batches/[batchNumber]) the batch immediately.
- **Printing Hygiene**: Remind manufacturers to use "System Print Dialog" and "No Margins" for the best QR alignment.
