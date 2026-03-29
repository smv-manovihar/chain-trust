# Route: /manufacturer/products (Product Catalog)

The central repository for all product SKUs enrolled by the manufacturer on the ChainTrust blockchain.

## Layout Overview (Bento Grid)
- **Fluid Header**: Contains the "Enroll Product" button and "Manage Categories" action. Supports a sticky, responsive search bar that synchronizes with the URL.
- **Product Inventory Cards**: Rich cards that display:
  - **Identity**: Name and Serialized SKU.
  - **Market Position**: Current unit price (USDT) and assigned categories.
  - **Production Maturity**: Count of active batches associated with the SKU.
  - **Visuals**: High-resolution packaging previews managed via decentralized S3/MinIO storage.

## Key Management Features
### 1. Categories & Organization
- **Dynamic Grouping**: Manufacturers can create custom category tags (e.g., "Antibiotics," "Pediatrics") to organize their internal catalog.
- **Filter State**: URL parameters (`?categories=` and `?search=`) are maintained in real-time for shareable and AI-observable views.

### 2. Batch Linking
- **Direct Integration**: Each product card monitors its linked batches. If a product has 0 active batches, it is flagged for further production enrollment.

## AI Guidance & Context
- **Inventory Health**: If the user is viewing the catalog, the AI should observe which products have "0 Batches" and suggest: "Would you like to register a production run for [Product Name]?"
- **Price Optimization**: If the user asks about market positioning, the AI can call the `updateProduct` tool to adjust unit pricing (USDT) for the blockchain record.
- **Shareable Views**: The AI observes the current search and category filters to understand exactly what product subset the user is focusing on.
