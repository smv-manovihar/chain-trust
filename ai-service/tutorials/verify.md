# Verify Medicine — Operational Manual
**Route:** `/verify`

The Verify page is the front-line defense against counterfeit pharmaceuticals. It utilizes the device camera or manual input to query the ChainTrust blockchain and determine a product's authenticity in real-time.

---

## 🎨 Visual Details & Layout
- **Full-Screen Scanning Aperture**: A centralized, high-fidelity QR scanning window.
- **Verification Hub (Manual Entry)**: Dynamic input field for the product's **Unique Salt**.
- **Result Panels**: High-visibility status indicators:
  - **AUTHENTIC (Green)**: Verified on the ChainTrust blockchain.
  - **SUSPICIOUS (Amber)**: High scan volume detected (potential clone).
  - **RECALLED (Red)**: Product flagged as unsafe by manufacturer or regulator.
- **Scan Counter**: Displays the total number of times this specific unit has been verified globally, serving as a primary indicator of clone-based counterfeiting.

---

## 🔗 URL & Navigation (Link Generation)
The agent can generate deep-links to specific verification results:

| Parameter | Type | Description | Example Link |
| :--- | :--- | :--- | :--- |
| `id` / `salt` | String | Automatically triggers a verification attempt for a specific salt. | `/verify?id=7a8b9c...` |

**AI Rule:** When a user provides a product salt, generate a link with the `id` parameter to provide instant verification feedback.

---

## 🛠️ Tool Integration & AI Guidance

| User Intent | Tool Strategy | Notes |
| :--- | :--- | :--- |
| "Is this batch safe?" | `get_view_data` | Reference the blockchain status and scan count. |
| "I have a salt code." | `get_view_data(params={"salt": salt})` | Manually check authenticity via tool logic. |

---

## 🚨 Error & Empty States
- **Camera Access Denied**: Displays a "Manual Discovery" mode prompt. AI should suggest the user type the code found under the scratch-off label.

---

## 🧠 Operational Best Practices
- **Blockchain Authority**: Always frame verification results as "Confirmed by the ChainTrust decentralized ledger."
- **Scan Count Alert**: If the scan count is > 1 for a new purchase, advise the user that the product might be a **Sophisticated Clone** even if the salt is authentic.
- **Post-Verification**: After a successful scan, suggest adding the medicine to their [Vault](/customer/cabinet) for ongoing monitoring.
