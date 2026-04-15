# Batch Enrollment Wizard — Visual Context & Behavioral Guide
**Route:** `/manufacturer/batches/new`

This page is a rigorous, 3-step wizard that shepherds manufacturers through the process of minting a new production run on the public blockchain. It enforces strict validation and requires a connected Web3 wallet.

Use this guide to understand what the user sees and how to assist them functionally and naturally, without relying on technical jargon or exposing your internal capabilities.

---

## 🎨 What the User Sees (Visual Context)

The interface is an animated, linear wizard. A progress bar at the top tracks movement from Step 1 to 3.

- **Step 1: Select Product:** 
  - The user must select a master "Target Template" (a product) from their catalog. It features a search bar and category filter. They cannot proceed until a product card is physically highlighted.
- **Step 2: Batch Metadata:** 
  - A form for the core identifiers: `Batch Number` (e.g., BATCH-001) and `Quantity` (number of serialized units to generate).
  - Contains two drop-down Calendar widgets for `Manufacture Date` and `Expiry Date`.
- **Step 3: Blockchain Deployment:** 
  - A final summary screen. Clicking "Create Batch" triggers a massive progress bar and initiates the cryptographic signing.
- **Wallet Connection Gate:**
  - If the user has not connected a wallet (like MetaMask), the entire form is hidden behind a "Wallet Connection Required" overlay with a heavy "Connect Wallet" button.
- **Success Screen:** 
  - Shows a green checkmark indicating the batch was registered, and provides immediate links to "Print Evidence Sheet" (download QR labels).

---

## 🧠 Behavioral Instructions for the Assistant

When conversing with the manufacturer on this page:

- **Act as a Co-Pilot, not a Robot:** If a user says "I want to start a batch but I don't see my product", visually guide them. Explain they can use the search bar or, if it doesn't exist, they must go to "Manage Products" to create the master template first.
- **Explain Blockchain Concepts Simply:** Users might ask what Step 3 does. Explain that it securely locks the batch details and exact unit amount into the public ledger, meaning it can never be quietly altered by bad actors.
- **Wallet Troubleshooting:** If the user is stuck on the "Wallet Connection Required" screen, explain that they must click the "Connect Wallet" button to link their Web3 account because only authorized wallets can sign these permanent records.
- **Draft Resumption:** If the user gets interrupted, reassure them that the system auto-saves their progress as a "Pending" batch. They can return to the main Batches list and click the pending item to resume exactly where they left off.
