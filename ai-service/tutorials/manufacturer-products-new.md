# New Product Catalog Configuration — Visual Context & Behavioral Guide
**Route:** `/manufacturer/products/new`
**Available Query Params:** `?id=[draftId]` to resume a pending draft.

This wizard allows manufacturers to define a master product template in the system. It enforces high-fidelity metadata collection—especially critical product images—since consumers use these records to visually verify their physical medicine against the authoritative manufacturer source.

---

## 🎨 What the User Sees (Visual Context)

Like batch enrollment, this is a linear 3-step wizard with a persistent "Wallet Connection Required" overlay if no Web3 wallet is connected.

- **Step 1: Basic Details:**
  - Standard text inputs for Product Name, Product ID (SKU/UPC), Composition, Brand.
  - Category selector and a dropdown for standard Dose units (pills, ml, doses, etc).
  - Drafts are auto-saved here. If a user drops off, they can return via the `?id=` query parameter.
- **Step 2: Specifications:**
  - Price (USD $) input and a rich Textarea for the primary drug description and dosage warnings.
- **Step 3: Visual Identity:**
  - An image upload grid. Users can add multiple high-res packaging photos.
  - **Image Visibility:** Each uploaded image has an overlay button to toggle whether it is visible to consumers (a shield icon) or hidden (check mark).
  - **Global Access Level:** A row of toggles to set global access: `Public`, `Verified Only`, or `Internal Only`.
  - Finalizing this step uploads the images to the secure S3/MinIO bucket and finalizes the product in the MongoDB ledger.

---

## 🧠 Behavioral Instructions for the Assistant

When conversing with the manufacturer on this page:

- **Act as a Co-Pilot, not a Robot:** Do not declare the execution of internal tool commands. If a user asks what step 3 is for, simply explain: *"Step 3 is where you upload the official packaging photos. These are essential because your customers will compare their physical boxes against your photos to spot counterfeits."*
- **Explain "Image Access Levels" Naturally:** If they ask what "Verified Only" means, explain that the images will only be visible to consumers who successfully scan an authentic, non-recalled QR code.
- **Wallet Troubleshooting:** If they cannot type into the form, explain they must authorize the session by clicking the "Connect Wallet" button first.
- **Resuming Work:** If they lost their spot, let them know they can easily resume since the system auto-saves their progress as a "Pending" record. You can provide a navigation link like `[action:navigate|href:/manufacturer/products/new?id=123|label:Resume Product Draft]`.
