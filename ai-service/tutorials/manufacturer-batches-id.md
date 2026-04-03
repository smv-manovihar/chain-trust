# Batch Detail (QR Management) — Operational Manual
**Route:** `/manufacturer/batches/[id]`

The Batch Detail page is the technical deep-dive for a specific production run. It provides access to unit-level scan data, blockchain verification status, and the specialized "QR Grid" for printing labels.

---

## 🎨 Visual Details & Layout
- **Batch Identity Banner**: A high-fidelity card showing the batch number, product name, and creation date.
- **Scan Distribution Chart**: Interactive chart showing total scans across the batch's unit indexes.
- **QR Generation Grid**: A high-performance grid of QR codes for each unit in the batch.
  - **Identified Print Mode**: A "Print QR Sheet" button that triggers a specialized @media print CSS view for physical label production.
- **Unit Registry**: A searchable table of all serialized units, their individual salts, and current scan counts.

---

## 🔗 URL & Navigation (Link Generation)
The agent can generate links to specific batches if the internal MongoDB `_id` is known from `list_batches`:

| Destination | Route | Description |
| :--- | :--- | :--- |
| **Batch Details** | `/manufacturer/batches/[id]` | Full technical view of a specific run ID. |

**AI Rule:** When a manufacturer asks for unit-level data or QR printing for a specific batch, provide the direct link to its [Detail Page](/manufacturer/batches/[id]).

---

## 🛠️ Tool Integration & AI Guidance

| User Intent | Tool Strategy | Notes |
| :--- | :--- | :--- |
| "Show me details for this run." | `get_batch_details(batch_number)` | Use the batch number to get the full profile. |
| "I need to print the labels." | `get_page_guide` | Explain the "Print QR Sheet" feature on the detail page. |

---

## 🚨 Error & Empty States
- **Batch Not Found**: If an invalid ID is provided, the UI shows a "404" state. AI should suggest checking the [Batch List](/manufacturer/batches).

---

## 🧠 Operational Best Practices
- **Print Guidance**: Mention that the QR Grid is designed for professional label printers and the UI removes chrome during `print` actions.
- **Unit Scan Analysis**: If a batch has high total scans, guide the user to the "Unit Registry" on this page to identify which specific units are compromised.
