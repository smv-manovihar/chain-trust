# Product List (Catalog) — Operational Manual
**Route:** `/manufacturer/products`

The Product List is the definitive catalog of all SKUs enrolled in the ChainTrust security ecosystem. It provides a technical overview of each product's base metadata and its production run (batch) history.

---

## 🎨 Visual Details & Layout
- **Dynamic Catalog Header**: A glassmorphic header that stays stuck to the viewport top and provides a "High-Value" count of the total catalog size.
- **Product Hub (ListView / Cards)**: Prominent "Brand Name", high-resolution packaging photo, SKU metadata, and total batch count badge.

---

## 🔗 URL & Navigation (Link Generation)
The agent can generate deep-links with precise filters to view specific data segments:

| Parameter | Type | Description | Example Link |
| :--- | :--- | :--- | :--- |
| `search` | String | Filters the catalog by name, brand, or SKU. | `/manufacturer/products?search=Paracetamol` |
| `category` | String | Filters the catalog by a specific category. | `/manufacturer/products?category=Analgesic` |

**AI Rule:** When a manufacturer asks for a product list or a specific SKU, provide the filtered link to the [Catalog](/manufacturer/products) page.

---

## 🛠️ Tool Integration & AI Guidance

| User Intent | Tool Strategy | Notes |
| :--- | :--- | :--- |
| "What products do we have?" | `list_products` | Provide names and SKUs from the list. |
| "Show me details for SKU-101." | `get_product_info("SKU-101")` | Access technical metadata. |

---

## 🚨 Error & Empty States
- **No Catalog Enrolled**: AI should guide the user to the `/manufacturer/products/new` flow.

---

## 🧠 Operational Best Practices
- **Link Comparison**: Mention that products are best searched for using the `search` param in the link.
- **Detailed Metadata**: When a user asks for product info, mention the **Categories** and **Batch Count** for context.
