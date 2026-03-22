# Route: /manufacturer/batches/new (Batch Creation Wizard)

A multi-step process for enrolling a specific production run of a registered product.

## Wizard Steps & User Actions

### Step 1: Select Product Template
- **Action**: User must select an existing product from their catalogue to serve as a template.
- **Controls**: Includes a **Search Bar** and **Category Filter** (checkboxes).
- **Selection**: Clicking a product card highlights it and enables the "Next" button.

### Step 2: Batch Details
- **Form Fields**:
  - `batchNumber`: "Batch Number" (e.g., B-2024-001). *Required, must be unique*.
  - `quantity`: "Total Quantity (Units)" - an integer field. *Required, min 1*.
  - `manufactureDate`: "Manufacture Date" - triggers a Calendar popover. *Required*.
  - `expiryDate`: "Expiry Date (Optional)" - triggers a Calendar popover.
- **Interaction**: The "Next" button remains disabled until all required fields are valid.

### Step 3: Review & Commit
- **Summary**: Displays all entered data for final verification.
- **Blockchain Alert**: A warning card explains that batch registration on the blockchain is permanent and requires a wallet signature.
- **Action**: **"Create & Register Batch"** button. Requires an active Wallet Connection.

## AI Guidance & Context
- **Pre-requisite**: Ensure the user has created a product before trying to create a batch.
- **Wallet Requirement**: If the user is stuck on Step 3, check if their wallet is connected. The agent should remind them that "This action will incur a small gas fee for on-chain integrity."
- **Data Precision**: When the user provides batch details, confirm them back: "I've noted Batch #X with {Y} units, manufactured on {Z}."

## AI Context
The AI should help users locate their product templates if they can't find them, or explain why wallet connection is required for batch creation (for decentralized proof of origin).
