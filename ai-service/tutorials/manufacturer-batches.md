# Route: /manufacturer/batches (Batch Management)

A comprehensive, real-time registry of all serialized production runs (Batches) enrolled by the manufacturer on the ChainTrust network.

## Layout Overview (Intelligent Adaptive)
- **Desktop (Grid/Table)**: A high-density data matrix featuring:
  - **Batch Traceability**: Unique serialized `Batch ID` and `Product Name` (SKU).
  - **Supply Metrics**: Total `Units Enrolled` (Quantity) and Manufacturing/Expiry dates.
  - **Security Status**: Color-coded badges for "Active" (Emerald), "Recalled" (Red), or "On-chain Verified".
- **Mobile (Rich Cards)**: Adaptive card layout that transforms table rows into swipeable management blocks for field use.
- **Dynamic Filtering**: A sticky, responsive header that supports real-time search and category filtering via URL synchronization (`?search=` and `?category=`).

## Key Management Features
### 1. Row/Card Actions
- **View Details**: Deep-dive into specific unit salts and scan analytics (`/manufacturer/batches/:id`).
- **Download Artifact**: Instant PDF generation of the serialized QR report for physical labeling.
- **Security Override (Recall)**: A high-level safety action to mark a batch as compromised or recalled across all consumer devices globally.

### 2. Search Intelligence
- **URL Parity**: As the user types, the browser URL updates proportionally. This allows the AI agent to see the manufacturer's active filter state via `get_current_view_data`.

## AI Guidance & Context
- **Inventory Audit**: If a user asks "Show me all active batches for [Product]," the AI should first look at the `query_params` to see if a filter is already applied.
- **Security Escalation**: If a manufacturer expresses concern about a specific batch, guide them to the **Recall Batch** action. Remind them that this is an irreversible security flag for consumer safety.
- **Tooling**: Use `search_manufacturer_batches` to handle complex multi-criteria lookups.
