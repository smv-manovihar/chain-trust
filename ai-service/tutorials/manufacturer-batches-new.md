# Route: /manufacturer/batches/new (Batch Enrollment Wizard)

The centralized workflow for enrolling a serialized production run (Batch) of a registered medicine on the ChainTrust blockchain.

## Layout Overview (Progressive Wizard)
- **Step 1: Product Template**: Choose an existing medicine from the corporate catalog. Use the `Search` and `Category` filters to locate the correct SKU.
- **Step 2: Batch Inventory Stats**: Enter precise production data:
  - **Batch Traceability**: Unique serialized Identification Number.
  - **Inventory Volume**: Total units to be manufactured/distributed.
  - **Temporal Data**: Manufacturing date and Expiry date (managed via a Calendar popover).
- **Step 3: Blockchain Commit**: Final summary card and cryptographic registration warning. This action requires a connected digital wallet (e.g., MetaMask) to sign the transaction.

## Key Management Features
### 1. Progressive Validation
- **Requirement Logic**: Each step is strictly validated. The "Next Step" action remains locked until all mandatory fields (Batch ID, Quantity, Mfg Date) are populated.
- **Unit Serials**: Explain that the system will automatically derive unique salts for the requested quantity upon successful registration.

### 2. Digital Ledger Entry
- **Immutable Proof**: Once "Create & Register" is selected, the batch is permanently anchored to the blockchain for decentralized consumer verification.

## AI Guidance & Context
- **Inventory Precision**: If a user is providing batch details in chat, the AI should double-confirm the values: "I've processed a production run of [Quantity] units for [Batch ID]."
- **Wallet Readiness**: If a user is stalled at Step 3, the AI should verify their wallet connection via `get_current_view_data` and provide guidance on MetaMask signing.
- **Error Handling**: If a Batch ID already exists, the AI should suggest using a unique serialization pattern (e.g., Year-Month-Index).
