# Route: /verify (Product Verification)

The public-facing verification gateway for Decentralized Product Authentication. It operates as the "root source of truth" by querying the blockchain directly before enriching data with metadata.

## Layout Overview (Trust Architecture)
- **Authenticity Shield (Hero)**: A prominent, color-coded status area that fills the upper viewport. 
  - **Authentic (Emerald)**: Verified on the blockchain; salt is valid.
  - **Suspicious (Amber)**: Valid salt but high scan count (>5).
  - **Counterfeit/Recalled (Red)**: Invalid salt or manufacturer-initiated recall.
- **Product Passport (Bento)**:
  - **Identity**: High-resolution packaging images and Batch Number details.
  - **Provenance**: Manufacturing date and localized expiry information.
  - **Scan Intel**: Real-time counter of how many times this specific unit has been scanned globally.
- **Blockchain Ledger**: A live view of the cryptographic transaction hash and decentralized record.

## Usage Modes
1. **QR-Direct**: Scanning a serialized QR code routes to `/verify?salt=[UNIT_SALT]`.
2. **Manual Audit**: Users can type a unit salt or batch ID directly into the secure portal.

## Actions & Transitions
- **Vault Integration**: Logged-in users can select "Save to My Medicines" to transfer the verified record into their persistent Cabinet inventory.
- **Real-time Recalibration**: A "Check Real-time" action that forces a fresh query to the blockchain nodes, bypassing local caches.

## AI Guidance & Context
- **Determinism**: In this route, the AI must be absolute. Use terms like "Authentic," "Recalled," or "Risk Detected."
- **Inventory Advice**: If the scan count is high (Suspicious), the AI should proactively advise the user: "This item's security code has been accessed multiple times. It may be a duplicate."
- **Next Steps**: If authentic, suggest the user **"Save to My Medicines"** for 24/7 background security monitoring.
