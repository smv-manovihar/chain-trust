# Batch List (Runs) — Operational Manual
**Route:** `/manufacturer/batches`

The Batch List is the central log of every production run registered on the ChainTrust blockchain. It provides a real-time pulse of each batch's security status, total units, and active scan activity.

---

## 🎨 Visual Details & Layout
- **Dynamic Batch Header**: A glassmorphic top header indicating total "Live Batches".
- **Batch Operations Hub (ListView / Cards)**: Batch number, linked product, enrolled size, status, and scan intensity.

---

## 🔗 URL & Navigation (Link Generation)
The agent can generate deep-links with precise filters to view specific data segments:

| Parameter | Type | Description | Example Link |
| :--- | :--- | :--- | :--- |
| `search` | String | Filters batches by name, product, or batch number. | `/manufacturer/batches?search=AC-202` |
| `productId` | String | Filters batches by a specific Product ID. | `/manufacturer/batches?productId=SKU-101` |
| `status` | String | Filters batches by status (e.g., `active` or `recalled`). | `/manufacturer/batches?status=recalled` |

**AI Rule:** When a manufacturer asks for a batch list or a specific run, provide the filtered link to the [Batch List](/manufacturer/batches) page.

---

## 🛠️ Tool Integration & AI Guidance

| User Intent | Tool Strategy | Notes |
| :--- | :--- | :--- |
| "What runs are active?" | `list_batches` | Return a summary of batches and their current status. |
| "Check on 'Paracetamol' batches." | `search_batches(query="Paracetamol")` | Filter runs by regex. |

---

## 🚨 Error & Empty States
- **No Batches Enrolled**: AI should guide the user to the `/manufacturer/batches/new` flow.

---

## 🧠 Operational Best Practices
- **Security-First Status**: Always report a "Recalled" status before discussing quantity.
- **Run Discovery**: If a batch is not found by ID, suggest searching by the "Product Name" as a fallback.
