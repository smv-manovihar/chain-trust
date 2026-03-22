# Route: /manufacturer/products/new (Product Enrollment Wizard)

A multi-step guide to onboarding new pharmaceutical products onto the ChainTrust registry.

## Enrollment Workflow & User Actions

### Pre-requisite: Wallet Connection
- Users must connect their **MetaMask** or **Etherum-compatible wallet** to start.
- **Action**: "Connect Wallet" button; checks for an active account from the manufacturer's address.

### Step 1: Core Details
- **Form Fields**:
  - `name`: "Product Name" (e.g., Amoxicillin 500mg). *Required*.
  - `productId`: "Product ID (SKU/UPC/HRI)" - a unique string. *Required*.
  - `categories`: Multi-select checkboxes (e.g., Antibiotics, Pain Relief). *At least one required*.
  - `brand`: "Brand / Manufacturer". *Required*.
- **Interaction**: "Next Step" button (Bottom right, Rounded-2xl).

### Step 2: Specifications
- **Form Fields**:
  - `price`: "Market Price (USDT/USD)" - numeric input. *Required*.
  - `description`: "Full Description" - a multi-line `textarea`. *Required*.
- **Interaction**: Previous Step (Bottom left) / Next Step (Bottom right).

### Step 3: Visual Identity
- **Action**: **Image Upload Gallery**.
- **Requirement**: At least one product image is highly recommended. Supports multiple photos (min 1).
- **Final Action**: **"Enroll Product Profile"**. This creates the template used for all future batches.

## AI Guidance & Context
- **Validation Refinement**: If a user is missing a field on Step 1, tell them exactly which one (e.g., "The Product ID is required to continue").
- **Product vs. Batch**: If a user is confused, explain: "A Product is the template (like 'Amoxicillin 500mg'), while a Batch is a specific production run (like 'Batch #A-01')."
- **Blockchain**: Note that while the Product profile is stored off-chain (IPFS/DB), it's the foundation for on-chain batch security.
- **Success**: Upon creation, encourage the user to "Create a Batch" for this product.
- If a user is stuck, identify which step they are on based on the UI context and guide them on what info is required (e.g., "It looks like you're on the Visual Identity step. You'll need to upload at least one clear image of the packaging").
