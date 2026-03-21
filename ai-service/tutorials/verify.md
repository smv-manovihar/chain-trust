# Product Verification Page
Route: `/verify`

## Layout Overview
- **Scanning Area**: A central area where the user can scan QR codes or enter a verification salt manually.
- **Verification Result**: Shows the status of the product (Authentic, Counterfeit, Recalled).
- **Product Metadata**: Displays detailed info about the product (Name, Manufacturer, Batch, Expiry).
- **Action Buttons**:
  - **Save to My Medicines**: Allows logged-in users to save the verified item to their history.
  - **Learn More**: Links to detailed product information.

## Interaction Guides
1. **Manual Entry**:
   - *Action*: Users can type the unit salt if the QR scanner fails.
2. **Save to My Medicines**:
   - *Action*: Saves the verified provenance details to the user's account.
   - *Position*: Below the verification result.
