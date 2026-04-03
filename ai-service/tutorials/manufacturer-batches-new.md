# Enroll New Batch — Operational Manual
**Route:** `/manufacturer/batches/new`

The New Batch page is a multi-step enrollment wizard used to register a new production run on the ChainTrust blockchain. It handles cryptographic salt derivation and unit serialization.

---

## 🎨 Visual Details & Layout
- **Multi-Step Wizard**: A high-fidelity, linear progress tracker spanning:
  1. **Select Product**: A searchable dropdown for choosing the parent SKU.
  2. **Run Details**: Inputs for **Batch Number**, **Quantity (units)**, and **Creation Date**.
  3. **Blockchain Seal**: Final confirmation and salt derivation phase.
- **Identified Security Actions**: A primary "Seal & Enroll" button (h-12 rounded-full) that triggers the Web3 wallet and blockchain transaction.

---

## 🔗 URL & Navigation (Link Generation)
The agent can generate links to the enrollment wizard with pre-filled fields if possible:

| Parameter | Type | Description | Example Link |
| :--- | :--- | :--- | :--- |
| **productId** | String | Auto-selects the product for the new batch. | `/manufacturer/batches/new?productId=SKU-101` |

**AI Rule:** When a manufacturer asks to "start a new run" for a specific product, provide the pre-filled link to the [Enrollment Wizard](/manufacturer/batches/new).

---

## 🛠️ Tool Integration & AI Guidance

| User Intent | Tool Strategy | Notes |
| :--- | :--- | :--- |
| "I want to start a new batch." | `get_page_guide` | Explain the 3-step wizard and guide to the [Wizard](/manufacturer/batches/new). |
| "Which product should I use?" | `list_products` | Help the user identify the correct SKU first. |

---

## 🚨 Error & Empty States
- **Blockchain Denial**: If a transaction fails, a red "Transaction Rejected" alert appears. AI should suggest checking the Web3 wallet balance.
- **Missing Product**: If no products exist, the wizard is disabled. Group them to the [Catalog](/manufacturer/products/new) first.

---

## 🧠 Operational Best Practices
- **Wizard Sequence**: Mention that the batch is not secured until the final "Blockchain Seal" step is completed.
- **Batch Uniqueness**: Advise the user to use unique Batch Numbers for each production run to ensure tracking integrity.
- **SKU Pre-Selection**: Always offer a pre-filled link if the Product ID is already known.
