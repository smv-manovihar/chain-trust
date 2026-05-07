# My Medicines (Cabinet) — Operational Manual
**Route:** `/customer/cabinet`
**Available Query Params:** `?search=[string]`, `?status=[all|active|recalled|consumed]`

The "My Medicines" digital cabinet is the central hub for inventory tracking and dose management. It displays all tracked medications, whether manually added by the user or securely added via blockchain QR scanning.

---

## 🎨 Visual Details & Layout

- **Header Controls:** 
  - **"Add Medicine" button:** A prominent primary button linking to `/customer/cabinet/add` for manual prescription/medication entry.
  - **"Verify Medicine" button:** Links to the blockchain scanner (`/verify`).
- **Data Toolbar (Filtering & Views):**
  - **Search Input:** A unified search bar to instantly filter medications.
  - **Show Inactive Toggle:** A switch to reveal hidden or inactive medications.
  - **Grid / List Mode:** A toggle to switch between comfortable Grid Cards and dense Table-based List Views.
- **Medication Cards (Grid Mode):** Each medicine is displayed in a glassmorphic card interface featuring:
  - **Adherence Streak (Flame Badge):** An orange badge (`bg-orange-500/20`, `fill-orange-500`) appearing in the top-right corner of the card, indicating consecutive days of on-schedule dose adherence. The flame icon is always visible; 10% opacity was a bug that has been fixed.
  - **Visual Identifier:** Displays the product's thumbnail image if available, or defaults to a Pill icon (for manual entries) or a Shield icon (for blockchain verified entries).
  - **Inventory Tracking:** Displays `Current Quantity / Total Quantity` with a visual progress bar. The remaining quantity text turns **Red** if the supply drops below critically low levels (under 5 units).
  - **Metadata Tags:** Bottom tags showing the Expiry Date (Month/Year) and the Batch Code (if verified).
- **Quick Card Actions:**
  - **Take Dose:** Instantly logs adherence. The button has three visual states:
    - **"Take Dose"** (primary teal/blue): The dose has not been taken yet.
    - **"Recently Taken"** (muted gray): A dose was logged within the last 5 minutes — prevents accidental double-logging within a short window.
    - **"Done Today"** (green): All scheduled doses for today have been completed. The button is disabled and cannot be pressed again until the next day.
  - **Undo (RotateCcw Icon):** Appears next to recently taken doses allowing immediate reversal of accidents. Pressing Undo re-enables Take Dose.
  - **Remove (Trash Icon):** Erases the medicine from the user's tracking history.

---

## 🔗 Deep Linking & Discovery

The agent can generate links to specific functionalities within this namespace:

| Action | Example Link |
| :--- | :--- |
| Scan new medication | `/verify` |
| Add un-serialized medicine | `/customer/cabinet/add` |
| View detailed medicine page | `/customer/cabinet/[id]` |

---

## 🛠️ Behavioral Instructions for the Assistant

When the user asks questions concerning their tracked inventory, the agent has deep visibility into this interface state via tools.

| User Intent | Tool Strategy | Notes |
| :--- | :--- | :--- |
| "Show my medicines" | `list_my_medicines` | Returns the paginated inventory identical to the view. The table includes a **Done Today** column (Yes or -) showing daily completion per item. |
| "I am looking for aspirin." | `search_my_medicines` | Performs a text search. Matches the frontend search toolbar behavior. |
| "I threw away my meds." | `remove_medicine` | Removes it via API identically to clicking the Trash icon. |
| "I took my blue pill." | `mark_dose_taken` | Matches the "Take Dose" action. The tool returns remaining stock, streak, and whether all today's doses are now complete. |
| "Have I taken all my doses today?" | `list_my_medicines` | Check the `Done Today` column — "Yes" means all scheduled doses for that item are logged. |

---

## 🧠 Operational Best Practices

- **Daily Completion Awareness:** The agent must understand the `isDoseDoneToday` flag. If a medicine shows **Done Today**, the user should NOT be prompted to take another dose — all scheduled intakes for that day are already recorded.
- **Streak Accuracy:** The streak counter is frequency-aware. A weekly medicine only needs one dose on its scheduled day; `isDoseDoneToday` reflects this correctly. Do not confuse "taking a dose" with "completing the day's schedule".
- **Provenance Context:** AI must be mindful of whether an item was `isUserAdded` (Manual Entry) or scanned from the blockchain. The AI can remind users that manually entered items do not receive automated blockchain safety recalls.
- **Inventory Monitoring:** If `currentQuantity` drops dangerously low while the user is discussing a medicine, the agent must proactively warn the user that their digital cabinet warns it is almost empty.
- **Editing Capabilities:** If a user wishes to modify their drug schedule or update quantities, the AI must do so directly via tools (`update_medicine` or `add_reminder`) rather than directing the user to click buttons.
