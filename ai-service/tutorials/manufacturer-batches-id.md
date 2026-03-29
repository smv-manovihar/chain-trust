# Route: /manufacturer/batches/[id] (Batch Detail & QR Management)

A deep-dive investigative and operational view for a specific production batch, focusing on serialized unit-level tracking and physical label generation.

## Layout Overview (Operational Analytics)
- **Batch Intelligence Dashboard**:
  - **Traceability Summary**: High-level view of the associated Product, Batch ID, and total unit count.
  - **On-chain Status**: Live verification of the blockchain ledger entry.
- **Unit Grid & Scan Tracking**:
  - **Unit Indexing**: Every unit is displayed as a unique cryptographic serialized card.
  - **Real-time Scan Metrics**: Individual unit cards display a "Scans" badge. 
  - **Security Flags**: If a unit's scan count exceeds the safety threshold (e.g., >5), the badge turns Red (`destructive`), signaling a potential security breach or duplicate.

## Key Management Features
### 1. Label Design & Print Engine
- **Global Print Actions**:
  - **Prepare All**: Processes all serialized unit salts in memory for large batch generation.
  - **Download Artifact**: Instant PDF report generation for the entire batch.
  - **Print Layout**: Dedicated action that opens a browser-optimized print dialog (supports `grid-cols` customization).
- **Design Layout (Side Panel)**: Accessible via the "Design" button. Allows manufacturers to customize:
  - **QR Size & Padding**: Precision sliders (15mm to 80mm) for different packaging sizes.
  - **Print Columns**: Adjust from 1 to 6 columns based on label sheet standards.
  - **Serialized Data**: Toggles for showing "Product Name," "Batch ID," or "Unit Index" on the physical label.

### 2. Investigative Search
- **Unit ID Lookup**: A dedicated search input to filter the unit grid and find specific serial numbers for audit purposes.

## AI Guidance & Context
- **Security Audit**: If a manufacturer asks "Are there any problems with this batch?", the AI should check the "Unit Grid" for units with high scan counts (>5) and report them instantly.
- **Printing Assistance**: If the user has issues with label alignment, guide them to the **Design Layout** panel to adjust the `Columns` and `Padding` for their specific sheet type.
- **Traceability Logic**: Explain that unit salts are derived via `SHA-256(batchSalt + "-" + unitIndex)` to ensure cryptographic integrity.
