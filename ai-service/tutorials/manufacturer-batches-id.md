# Route: /manufacturer/batches/[id] (Batch Detail & QR Management)

Deep-dive view for a specific batch, focusing on unit-level tracking and label generation.

## Batch Controls & QR Management

### 1. High-Level Actions
- **Prepare All**: Located in the header. If the batch has more units than the current page, this generates all QR codes in memory. *Warning*: Large batches (>1000 units) may take time.
- **Download PDF**: Generates a high-quality PDF report with all QR labels.
- **Print Labels**: Opens the browser print dialog (Styled for label sheets).

### 2. Design Layout Panel (Settings)
Triggered by the **"Design"** (Settings2 icon) button.
- **Sliders**:
  - `QR Size`: 15mm to 80mm.
  - `Print Columns`: 1 to 6.
  - `Label Padding`: 0mm to 20mm.
- **Switches**:
  - `Show Product Name`: Toggle visibility on the label.
  - `Show Unit Index`: Toggle "Unit #X".
  - `Show Batch No.`: Toggle inclusion of the batch ID.
- **Save as Default**: Persists these settings to the product template for future batches.

### 3. Unit Grid & Scan Tracking
- **Search**: "Find Unit ID..." input to locate specific codes.
- **QR Cards**:
  - **Unit #X Badge**: Indicates the unit index.
  - **Scans Badge**: Shows current scan count (e.g., "3 Scans").
  - **Counterfeit Alert**: If a unit has **>5 scans**, the badge turns Red (`destructive`). Use this to explain potential security breaches to the manufacturer.

## AI Guidance & Context
- **Tooling**: Use `get_batch_details(batch_number)` to get accurate scan data and unit information.
- **Troubleshooting**: If a user says "the QR codes are too small," guide them to the **Design** button and suggest increasing the `QR Size` slider.
- **Security Advice**: If you notice units with high scan counts, proactively warn the user: "Units #34 and #89 have high scan counts. You may want to investigate potential counterfeit activity."
- **Recall Batch**: (If not already recalled) Mark the entire batch as unsafe and commit the status to the blockchain.

## AI Guidance
The AI can help with printing issues (suggesting Chrome/Edge for best results) or explain how unit salts work (derived from `SHA-256(batchSalt + "-" + unitIndex)`).
