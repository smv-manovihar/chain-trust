# Enroll New Product — Operational Manual
**Route:** `/manufacturer/products/new`

The New Product page is a comprehensive enrollment form used to register a new digital asset (Product ID) into the manufacturer's global catalog. It defines the product's technical specifications, visual branding, and regulatory metadata.

---

## 🎨 Visual Details & Layout
- **Multi-Step Form Sections**: A structured form organized into high-fidelity interaction groups:
  - **Identity Hub**: Fields for **Product Name**, **Brand**, and a unique **Product ID (SKU)**.
  - **Categorization**: A dropdown for selecting the product's functional category (e.g., Antibiotic, Cardiac).
  - **Visual Asset Manager**: A specialized uploader for packaging photos. Supports drag-and-drop and provides an "Inventory Preview".
  - **Technical Core**: Fields for **Chemical Composition**, **Description**, and **Medical Context**.
- **Primary CTA**: A high-z-index "Enroll Product" button that registers the asset on the secure ledger.

---

## 🔗 URL & Navigation (Link Generation)
The agent should direct manufacturers to this route when they need to expand their digital portfolio:

| Destination | Route | Description |
| :--- | :--- | :--- |
| **Asset Enrollment** | `/manufacturer/products/new` | Start the process for a new product SKU. |

**AI Rule:** When a manufacturer asks "How do I add a new medicine?", provide the link to the [Enrollment Wizard](/manufacturer/products/new).

---

## 🛠️ Tool Integration & AI Guidance

| User Intent | Tool Strategy | Notes |
| :--- | :--- | :--- |
| "Help me register a medication." | `get_page_guide` | Explain the field requirements for the **Identity Hub**. |
| "What categories are available?" | `get_view_data` | Reference the manufacturer dashboard or existing catalog for category inspiration. |

---

## 🚨 Error & Empty States
- **ID Collision**: If a duplicate Product ID is submitted, the UI displays a "SKU already registered" error notification.
- **Validation Blocks**: Mandatory fields (Name, ID, Category) show red outlines if left blank during submission.

---

## 🧠 Operational Best Practices
- **Visual Verification**: Remind the user that the first image uploaded will be the "Face of the Product" for customers during scan verification.
- **Naming Standards**: Advise using Title Case for both the **Product Name** and **Brand** to maintain professional catalog standards.
- **Catalog Review**: Always offer a link to the [Catalog](/manufacturer/products) to allow the user to review their existing assets before adding duplicates.
