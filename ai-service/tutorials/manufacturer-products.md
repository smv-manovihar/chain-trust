# Product Catalogue Management — Operational Manual
**Route:** `/manufacturer/products`
**Available Query Params:** `?search=[string]`, `?categories=[string]`, `?page=[int]`

The Products page is where Manufacturers manage their core global catalogue inventory. A "Product" in ChainTrust acts as the master template (e.g., "Aspirin 500mg, Box of 30") from which physical serialized "Batches" inherit their properties.

---

## 🎨 Visual Details & Layout

- **Header Window:** 
  - **Quick Stats:** Badges showing the total number of Assets (Products) and active Categories in the catalogue.
  - **Actions:** 
    - **Refresh (Loop icon):** Forces a hard sync of the catalogue.
    - **Manage Categories:** Opens a dialog to edit global product category strings.
    - **Add Product:** Primary button routing to `/manufacturer/products/new`.
- **Data Toolbar:**
  - **Search:** Allows text searches targeting the product name or unique ID.
  - **Category Filter:** A multi-select dropdown to filter the view by custom categories (e.g., "Analgesics", "Antibiotics").
  - **Grid/List Select:** Toggles the layout architecture.
- **Data Canvas:**
  - Displays products optimally via the `ProductCard` (Grid) or `ProductListView` (Table row). Note that on Mobile viewports, the grid Cards are forced globally to ensure tap-target safety.

---

## 🛠️ Behavioral Instructions for the Assistant

The Assistant has unrestricted capability to view and modify this catalogue.

| User Intent | Tool Strategy | Notes |
| :--- | :--- | :--- |
| "What products do we sell?" | `list_products` | Retrieve current assets. You can also accept a category argument to filter automatically via `list_products({"category": "Vaccines"})`. |
| "Add a new drug called Paracetamol" | `create_product` | If they don't provide details, ask for the SKU, Description, and Category gracefully before invoking the backend tool. |
| "Delete the old aspirin record" | `delete_product` | Ensure you fetch the product `_id` first. Inform the user that deleting a product does NOT delete its enrolled batches from the immutable blockchain. |

---

## 🧠 Operational Best Practices

- **Master vs Child Relationship:** Often users confuse "Products" with "Batches". If a user says "I need to generate QR codes for my new Aspirin", the AI must clarify that QR codes are generated at the *Batch* level, not the *Product* level. Ensure the Product exists first, then route them to Batch enrollment.
- **Image Handling:** The AI cannot generate high-res product photos via text. If the user asks the AI to add an image to a product, kindly instruct them to navigate to the product's detail page via the UI to upload their packaging imagery directly to the MinIO/S3 bucket.

