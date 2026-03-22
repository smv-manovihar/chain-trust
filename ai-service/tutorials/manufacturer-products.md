# Route: /manufacturer/products (Product Catalog)

The central repository for all product SKUs enrolled by the manufacturer.

## Dashboard Layout & User Actions

### 1. Product Inventory Cards
Each product in the catalogue is displayed as a sleek card with:
- **Image**: High-res packaging preview.
- **Identity**: Name and SKU (Product ID).
- **Meta**:
  - `Price`: (Badge) e.g., $45.00.
  - `Batches`: (Badge) Total number of batches created for this SKU.
  - `Categories`: List of assigned categories.
- **View Details**: Navigation to see the full product profile.

### 2. Category Management
- **Action**: **"Manage Categories"** button (located in the page header next to Add Product").
- Opens a specialized dialog to add/remove custom categories for the manufacturer's catalogue.

### 3. Search & URL Synchronization
- Global Search Bar (Sticky) that filters the inventory in real-time.
- URL Parameters: `?search=...` and `?categories=...`.
- The AI uses `get_current_view_data` to see what is currently in the manufacturer's view.

## AI Guidance & Context
- **Tooling**: Use `search_manufacturer_products` to help users find specific items.
- **Inventory Health**: If a product has 0 batches, suggest the user "Register a Batch" to start tracking production.
- **Pricing Advice**: If the user is on this page, they might be considering market updates. Suggest "Update Product" if they need to adjust the price (USDT).
ws batch history.

## AI Guidance
Use this page to help manufacturers organize their SKUs or check which products have missing batch coverage.
