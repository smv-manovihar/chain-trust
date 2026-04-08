# Product List (Catalog) — Operational Manual
**Route:** `/manufacturer/products`

The Product List is the definitive catalog of all digital assets (SKUs) enrolled in the ChainTrust secure ledger. It provides a technical overview of product specifications, image assets, and their associated production history.

---

## 🎨 Visual Details & Layout
- **Dynamic Data Toolbar**: Contains a search input, a high-performance **Category Filter**, and a view toggle (Grid vs. List).
- **View Modes**:
  - **Grid View (Default)**: Visual-first cards with high-resolution imagery, category badges, and quick links to batch management.
  - **List View**: A streamlined data table optimized for large catalogs, showing SKU, Category, and Batch Count in a single row.
- **Product Hub**: Interactive cards featuring "Brand Name", Product ID (SKU), and a summary of active batches.

---

## 🔗 URL & Navigation (Link Generation)
The agent can generate deep-links with precise filters:

| Parameter | Type | Description | Example Link |
| :--- | :--- | :--- | :--- |
| `search` | String | Filters the catalog by name, brand, or Product ID. | `/manufacturer/products?search=Amoxicillin` |
| `categories` | String | Filters by comma-separated category names. | `/manufacturer/products?categories=Antibiotic,Liquid` |

**AI Rule:** When a user asks "What antibiotics do we have?", generate a filtered link: `/manufacturer/products?categories=Antibiotic`.

---

## 🛠️ Tool Integration & AI Guidance

| User Intent | Tool Strategy | Notes |
| :--- | :--- | :--- |
| "Show me our catalogue." | `get_view_data` | Use the manufacturer dashboard summary for counts. |
| "Do we have [Product]?" | `get_view_data` | Reference specific product details if they appear in the dashboard "Recent Activity". |

---

## 🚨 Error & Empty States
- **Empty Catalog**: UI shows an `EmptyState` component. Proactively guide the user to the [Add Product](/manufacturer/products/new) wizard.

---

## 🧠 Operational Best Practices
- **Category Clarity**: Mention that categories are manufacturer-defined and can be managed via the "Manage Categories" dialog on this page.
- **Product ID vs. Batch**: Remind the user that **Product ID** is the master identifier, while **Batch Numbers** represent individual production runs.
