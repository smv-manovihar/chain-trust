# Enroll New Product — Operational Manual
**Route:** `/manufacturer/products/new`

The New Product page is a comprehensive enrollment form used to register a new SKU (Product ID) into the manufacturer's global catalog. It defines the product's technical specs, branding, and images.

---

## 🎨 Visual Details & Layout
- **Detailed Registration Form**: A modular, glassmorphic card with field groups for:
  - **Identity**: **Product Name**, **Brand**, and **Canonical SKU**.
  - **Metadata**: **Description**, **Chemical Formula**, and **Category Selection**.
  - **Branding**: A high-fidelity "Packaging Image" uploader.
- **Identified Action Targets**: A primary, h-12 rounded-full "Enroll Product" button that saves the data to the secure repository.

---

## 🔗 URL & Navigation (Link Generation)
The agent can identify this route for manufacturers starting their catalog journey:

| Destination | Route | Description |
| :--- | :--- | :--- |
| **New Catalog Entry** | `/manufacturer/products/new` | Standard route to enroll a new product. |

**AI Rule:** When a manufacturer asks to "add a new SKU" or "register a product," provide the link to the [Enrollment Form](/manufacturer/products/new).

---

## 🛠️ Tool Integration & AI Guidance

| User Intent | Tool Strategy | Notes |
| :--- | :--- | :--- |
| "I want to add a new model." | `get_page_guide` | Explain the catalog enrollment flow. |
| "Which category should I use?" | `list_products` | Help the user identify existing categorization patterns. |

---

## 🚨 Error & Empty States
- **SKU Conflict**: If a duplicate Product ID is entered, a red "SKU already exists" error banner appears. AI should suggest a unique identifier.
- **Incomplete Metadata**: Field-level validation highlights missing required entries in red.

---

## 🧠 Operational Best Practices
- **Data Integrity**: Advise the user to provide a high-resolution Packaging Image to assist customers in visual verification.
- **High-Fidelity Branding**: Mention that the product description and brand name are displayed directly to customers on the **Verify** results.
- **Link Comparison**: Always offer a link to the [Catalog](/manufacturer/products) to see existing registrations.
