# Verify Medicine — Operational Manual
**Route:** `/verify`

The Verify page is the front-line defense against counterfeit pharmaceuticals. It utilizes the device camera or manual input to query the ChainTrust blockchain and determine a product's authenticity in real-time.

---

## 🎨 Visual Details & Layout
- **Full-Screen Scanning Aperture**: A centralized, high-fidelity QR scanning window.
- **Verification Hub (Manual Entry)**: Dynamic input field for the product's "Unique Identifier" (salt).
- **Result Panels**: High-visibility green for "AUTHENTIC", amber for "SUSPICIOUS", and red for "RECALLED".

---

## 🔗 URL & Navigation (Link Generation)
The agent can generate deep-links to specific verification results or instructions:

| Parameter | Type | Description | Example Link |
| :--- | :--- | :--- | :--- |
| `id` / `salt` | String | Automatically triggers a verification attempt for a specific salt. | `/verify?id=7a8b9c...` |
| `mode` | String | Sets the initial UI mode (e.g., `scan` or `manual`). | `/verify?mode=manual` |

**AI Rule:** When a user provides a product salt or batch unit code, generate a link with the `id` parameter to provide instant verification feedback.

---

## 🛠️ Tool Integration & AI Guidance

| User Intent | Tool Strategy | Notes |
| :--- | :--- | :--- |
| "I want to verify this salt: X." | `get_view_data(params={"salt": salt})` | Fetch status. If no salt, guide them to scan/enter. |
| "Is this batch safe?" | `get_view_data` | Look for "AUTHENTIC", "SUSPICIOUS", or "RECALLED" flags. |

---

## 🚨 Error & Empty States
- **Camera Access Denied**: Displays a "Camera Required" empty state. AI should offer manual entry guidance.

---

## 🧠 Operational Best Practices
- **Blockchain Authority**: Phrase verification as "Authenticity confirmed on the ChainTrust global ledger."
- **Direct Linkage**: After verification, suggest the user check their **My Medicines** list for 24/7 background security monitoring.
