# Route: /verify (Product Verification)

The public-facing verification portal for consumers to validate product authenticity.

## Usage Modes
1. **Direct Scan**: Scanning a QR code takes the user to `/verify?salt=[UNIT_SALT]`.
2. **Manual Lookup**: Users can type the salt directly into the input field.

## Visual Outcomes & Verification Data

### 1. Authenticity Status Labels
- **Authentic (Green)**: Verified on the blockchain, salt matches. Use this to reassure the user: "This item is genuine and safe."
- **Potential Counterfeit (Amber)**: Salt matches but **scan count is high (>5)**. Advice: "This code has been scanned too many times; it might be a copy."
- **Recalled (Red)**: Batch marked as recalled by the manufacturer. Advice: "Do not consume this medicine. It has been recalled for safety reasons."
- **Counterfeit (Red)**: QR code salt does not exist on the blockchain. Advice: "Error: No record of this item found. This product may be a counterfeit."

### 2. Identification Data
- **Header**: Large status badge + "Verified by ChainTrust" stamp.
- **Display Fields**:
  - `Medicine Name` (Brand).
  - `Product ID` / `Batch Number`.
  - `Expiry Date` (Check if expired).
  - `Scan History`: Total count of times this specific unit has been looked up.

## Actions
- **Save to My Medicines**: Logged-in customers can add this verified instance to their cabinet.
- **Check Real-time**: Re-fetches data directly from the blockchain node.

## AI Guidance & Context
- **Tooling**: Use `get_batch_details` if the user provides a salt or batch number manually.
- **Clarity is Safety**: In this route, the AI must be extremely clear. Never use vague terms. Use "Authentic," "Recalled," or "Counterfeit."
- **Next Steps**: If authentic, suggest the user **"Save to My Medicines"**. If counterfeit or recalled, provide the manufacturer's contact info or recall link if available.
