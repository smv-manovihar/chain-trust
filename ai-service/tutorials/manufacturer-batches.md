# Batch List (Production Runs) — Operational Manual
**Route:** `/manufacturer/batches`

The Batch List is the central registry of every production run registered on the ChainTrust blockchain. It provides a real-time pulse on batch-level security (Recall Status), unit allocation, and collective scan velocity.

---

## 🎨 Visual Details & Layout
- **Dynamic Batch Header**: A glassmorphic top header showing total "Active Registries" and global scan volume.
- **Batch Table (Data-Rich)**: A professional grid providing:
  - **Batch Number**: The unique production ID.
  - **Linked Product**: Product Name and Brand.
  - **Units**: Total units vs. verified scan counts.
  - **Blockchain Status**: Real-time "On-Chain" vs. "Pending" status.
  - **Security State**: Highly visible "Active" or "Recalled" badges.
- **Quick Row Actions**: Direct buttons for "QR Sheet", "Analytics", and "Recall/Restore".

---

## 🔗 URL & Navigation (Link Generation)
The agent can generate deep-links with precise filters:

| Parameter | Type | Description | Example Link |
| :--- | :--- | :--- | :--- |
| `search` | String | Filters batches by number or product name. | `/manufacturer/batches?search=B-702` |
| `productId` | String | Filters batches for a specific Product ID. | `/manufacturer/batches?productId=SKU-101` |
| `status` | String | Filter by `active`, `recalled`, or `all`. | `/manufacturer/batches?status=recalled` |

**AI Rule:** When a user asks "Which batches are high risk?", link to the [Batch List](/manufacturer/batches?status=all) and suggest looking at those with scan counts > unit counts.

---

## 🛠️ Tool Integration & AI Guidance

| User Intent | Tool Strategy | Notes |
| :--- | :--- | :--- |
| "List my recent runs." | `get_view_data` | Use the batch list summary. |
| "Show batches for [Product]." | `get_view_data` | Use the `productId` filter if known from `search_products`. |
| "How many units were in B-101?" | `get_view_data` | Reference the total unit count for the batch. |

---

## 🚨 Error & Empty States
- **No Registries**: Shows an `EmptyState` component. Guide the user to "Create New Batch" via the [Enrollment Wizard](/manufacturer/batches/new).

---

## 🧠 Operational Best Practices
- **Recall Immutability**: Remind the user that "Recall" is a permanent blockchain record; it remains "Recalled" in consumer history even if restored.
- **Unit Integrity**: If `scanCount` > `totalUnits`, inform the user that multiple units in this batch are likely compromised.
