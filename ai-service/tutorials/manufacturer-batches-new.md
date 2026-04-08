# Enroll New Batch — Operational Manual
**Route:** `/manufacturer/batches/new`

The New Batch page is a high-fidelity, multi-step enrollment wizard used to register a new production run on the ChainTrust blockchain. It handles deterministic unit serialization and ensures cryptographic integrity for each unit.

---

## 🎨 Visual Details & Layout
- **Stepper Navigation**: A clean, linear progress tracker:
  1. **Source Selection**: Search and select the parent **Product SKU**.
  2. **Production Metadata**: Define **Batch Number**, **Quantity**, and **Expiry Date**.
  3. **Blockchain Seal**: Final cryptographic phase where salts are derived and the blockchain transaction is signed.
- **Glassmorphic Inputs**: Large, thumb-friendly inputs with real-time validation for batch uniqueness.
- **Sealing Animation**: A high-fidelity "Secure Seal" animation sequence during the blockchain enrollment phase.

---

## 🔗 URL & Navigation (Link Generation)
The agent can generate links to pre-fill the wizard:

| Parameter | Type | Description |
| :--- | :--- | :--- |
| `productId` | String | Pre-selects the product to accelerate enrollment. |

**AI Rule:** When starting a new run for a known product, generate the [Pre-filled Wizard Link](/manufacturer/batches/new?productId=...).

---

## 🛠️ Tool Integration & AI Guidance

| User Intent | Tool Strategy | Notes |
| :--- | :--- | :--- |
| "Help me start a new batch." | `list_products` | First, help the user find the correct SKU to link the batch to. |
| "How do I secure this run?" | `get_page_guide` | Explain the **Blockchain Seal** step and the role of Web3 wallets. |

---

## 🚨 Error & Empty States
- **Wallet Disconnected**: Displays a "Security Link Missing" state. AI should urge the user to "Connect your manufacturer wallet to proceed with enrollment."
- **Duplicate Batch ID**: Red validation alert. AI should check `search_batches` to confirm if the ID is already in use.

---

## 🧠 Operational Best Practices
- **Deterministic Salts**: Remind the user that batch enrollment is immutable once sealed on the blockchain.
- **Direct Catalog Integration**: If a user is on the [Product Catalog](/manufacturer/products), suggest they can start a batch directly from any product card.
- **Post-Enrollment**: Once successful, guide the user to the [Batch Details](/manufacturer/batches/[id]) to download the QR code labels.
