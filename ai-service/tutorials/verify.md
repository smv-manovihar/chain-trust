# Verify Medicine — Operational Manual
**Route:** `/verify`

The Verify page is the primary point of entry for checking product authenticity on the ChainTrust network. It allows unauthenticated and authenticated users to validate medicines against the blockchain.

---

## 🎨 Visual Details & Layout

- **Scanner Interface:**
  - **Camera Mode:** Uses the device's camera for live scanning (default on mobile).
  - **Upload Mode:** Allows the user to select an image from their device to parse the QR code (default on desktop).
- **Interactive Result Card:** A 3D interactive, tilting card (on desktop) that visually communicates the result state. It includes:
  - **Authentic (Green):** Verified against the blockchain.
  - **Suspicious (Amber):** High scan volume detected (potential clone).
  - **Invalid / Security Alert (Red):** Tampered code or product not found on blockchain.
  - **Recalled (Red):** The batch has been flagged as unsafe (DO NOT USE).
- **Product Details:** Shows the Product Name, Brand (if authenticated), Composition, Batch Number (masked for unauthenticated users), Expiry Date.
- **Media Gallery:** An embedded, horizontally-scrolling gallery of the product's packaging images right inside the Interactive Result Card.
- **Verification Statistics Cards:** 
  - **Scans:** Shows the exact number of times this specific unit serial has been scanned.
  - **Expiration:** Confirms the expiration date.
  - **Unit Serial:** Shows the unit number (e.g. #42).
  - **Provenance:** Confirms "Blockchain" as the root of authority.
- **Action Buttons:**
  - **Scan new:** Resets the interface to scan another QR code.
  - **Save to My Medicines:** (Only visible to non-manufacturers). Adds the product to the digital cabinet. Unauthenticated users see an Account Required login prompt when clicked. Authenticated customers open the Save Medicine Dialog.

---

## 🔗 URL & Navigation (Link Generation)

The agent can generate deep-links to specific verification results:

| Parameter | Type | Description | Example Link |
| :--- | :--- | :--- | :--- |
| `id` / `salt` / `s` | String | Automatically triggers a verification attempt for a specific unit salt. | `/verify?id=7a8b9c...` |
| `mode` | String | Forces a specific scanner mode: `camera` or `upload`. | `/verify?mode=upload` |

**AI Rule:** When a user provides a product salt, generate a link with the `id` parameter to provide instant verification feedback.

---

## 🛠️ Behavioral Instructions for the Assistant

| User Intent | Tool Strategy | Notes |
| :--- | :--- | :--- |
| "Is this batch safe?" | `get_view_data` | Reference the blockchain status and scan count from the view data. |
| "I have a salt code." | `get_view_data(params={"salt": salt})` | Manually check authenticity via tool logic. |

---

## 🚨 Error & Empty States

- **Tampered QR Code / Invalid:** Cryptographic integrity check fails locally before calling the blockchain. Displays a red "Security Warning".
- **Product Not Found:** The product isn't registered on the blockchain network.
- **Login Prompt:** Presenting "Account required" alert when an anonymous user attempts to "Save to My Medicines".

---

## 🧠 Operational Best Practices

- **Blockchain Authority:** Frame verification results as "Confirmed by the ChainTrust decentralized ledger."
- **Scan Count Alert:** If the scan count is > 1 for a new purchase, advise the user that the product might be a **Sophisticated Clone** even if the salt is authentic.
- **Post-Verification Call to Action:** After a successful scan, suggest adding the medicine to their "My Medicines" cabinet for ongoing tracking and recall notifications.

