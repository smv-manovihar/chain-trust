# My Medicines (Customer Cabinet)
Route: `/customer/cabinet`

## Layout Overview
- **Header**: Contains the page title "My Medicines", a welcome message with the user's name, and two primary action buttons.
- **Stats Cards**: Four cards showing:
  1. **Total Items**: Total number of medications in the cabinet.
  2. **Self-Added**: Count of medications added manually by the user.
  3. **Verified Items**: Count of items verified via blockchain.
  4. **Status**: Sync status.
- **Main Area**: A list of medication cards.
- **Sidebar (Safety Watch)**: Cards showing security status, verified batch info, and alert subscriptions.

## Interaction Guides (Buttons)
1. **Add Medicine (Plus Icon)**:
   - *Label*: "Verify New Medicine" (on laptop) or "Verify" (on mobile).
   - *Action*: Navigates to `/verify` to scan a new product.
   - *Position*: Top right header.
2. **Add Manual (Pill Icon)**:
   - *Label*: "Add Manual" (via `AddManualMedicineDialog`).
   - *Action*: Opens a dialog to enter medicine details manually (Name, Brand, etc.).
   - *Position*: Top right header, next to Verify.
3. **Check Real-time (ExternalLink Icon)**:
   - *Label*: "Check Real-time".
   - *Action*: Navigates to `/verify?salt=...` for blockchain-verified items to see current status.
   - *Position*: On individual medication cards (verified items only).
4. **Delete (Trash Icon)**:
   - *Label*: "Delete".
   - *Action*: Removes the medicine from the user's cabinet.
   - *Position*: On individual medication cards.

## Page Logic
- Verified items show a green "Verified Authentic" badge and a shield icon.
- Self-added items show a gray "Self-Added" badge and a pill icon.
- If the list is empty, an empty state is shown with a "?" icon.
