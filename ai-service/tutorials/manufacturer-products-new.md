# Route: /manufacturer/products/new (Product Enrollment Wizard)

The centralized workflow for onboarding new pharmaceutical medicine registrations (Product SKUs) onto the ChainTrust corporate registry.

## Layout Overview (Progressive Wizard)
- **Step 1: Core Identity**: Enter the primary product metadata:
  - **Medicine Name**: e.g., Amoxicillin 500mg.
  - **Product ID (SKU/UPC)**: Unique serialized string used for batch linking.
  - **Brand / Manufacturer**: The corporate entity responsible for the product.
  - **Category Tokens**: Multi-select tags (e.g., Antibiotics, Pediatrics) to organize the internal catalog.
- **Step 2: Market Specifications**:
  - **Pricing (USDT)**: Real-time unit pricing for blockchain record-keeping.
  - **Therapeutic Description**: Full details regarding use-cases, contraindications, and general information.
- **Step 3: Visual Identity (IPFS/MinIO)**: 
  - **Image Gallery**: Upload high-resolution packaging previews. Supports multi-photo uploads via decentralized storage nodes.

## Key Management Features
### 1. Progressive State Validation
- **Requirement Logic**: Each step highlights missing mandatory fields (Name, SKU, Category). The "Next Step" action is only enabled once the core identity is complete.
- **Wallet Parity**: While product templates are stored in the decentralized metadata layer, they serve as the "Root Template" for all subsequent blockchain-verified batches.

### 2. Catalogue Optimization
- **Template Reusability**: Enrolling a product once allows for unlimited production batch runs without re-entering medicine metadata.

## AI Guidance & Context
- **Product Architecture**: If a user is confused, explain: "A Product is your static template (SKU), while a Batch is a specific production run of that product."
- **Data Accuracy**: If a user provides product details in chat, the AI should confirm the `productId` (SKU) before calling the `createProduct` tool.
- **Market Positioning**: Suggest optimal category tags (e.g., "Prescription Only") based on the product description provided by the manufacturer.
- **Visuals**: If the user is on Step 3, the AI should remind them that "High-quality packaging images are essential for consumer trust during the verification process."
