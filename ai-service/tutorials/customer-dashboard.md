# Customer Dashboard — Operational Manual
**Route:** `/customer`

The Customer Dashboard is the primary landing page upon login. It provides a real-time overview of the user's medication regimen, immediate required actions, current inventory supply levels, and important safety notifications.

---

## 🎨 Visual Details & Layout

The dashboard is structured into three main visual rows/areas:

### 1. Header Area
- **Welcome Message:** "Welcome back, [First Name]"
- **Primary Action Button:** "Scan & Verify New Medicine" block at the top right, linking directly to the scanner (`/verify`).

### 2. Live Action Row (Top)
- **Upcoming Dose Carousel (Left/Main):** A large, swipeable interactive element displaying pending scheduled doses.
  - **Dose Cards:** Each card displays the time ("h:mm a"), whether the dose is "Upcoming" (blue) or a "Missed Dose" (red), the medicine name, brand, and required dosage.
  - **Action Button:** "Mark as Taken" instantly records the dose. A secondary Chevron button routes to the medicine's detail page.
  - **Empty State:** If there are no pending doses, it displays an "All caught up" message with a shield icon.
- **Inventory Snapshot (Right Sidebar):** Displays the user's "My Medicines" cabinet, prioritizing items with the **lowest supply remaining**.
  - **Quick Actions:** Next to each medicine is a "Take" button. If the medicine was taken within the last 5 minutes, it changes to "Taken" with a small "Undo" (RotateCcw) icon next to it in case of accidental clicks. 
  - **Supply Bar:** A visual progress bar detailing "Supply Remaining". It turns red if it falls below 20%.

### 3. Navigation & Intelligence Row (Bottom)
- **Quick Actions Grid:** 
  - **My Medicines:** Links to inventory & dose management.
  - **Verify Medicine:** Links to the QR blockchain scanner.
  - **Security Vault:** Links to access reports & prescriptions.
  - **Treatment Plans:** Links to user settings and reminder setups.
- **Safety Alerts Feed:** A scrolling list of real-time account notifications. Displays batch recalls (red), medicine expiry warnings (amber), and dose reminders (blue) with direct links to "View details".

---

## 🛠️ Behavioral Instructions for the Assistant

When the user is viewing the dashboard, the agent should dynamically respond to their intent by utilizing the appropriate tool. 

| User Intent | Tool Strategy | Notes |
| :--- | :--- | :--- |
| "What do I need to take?" | `list_upcoming_doses` | Fetches the same underlying data driving the Dose Carousel. Provide the name and scheduled time. |
| "Did I take my medicine?" | `list_upcoming_doses` (check state) | Verify scheduled vs missed. |
| "I'm running low on..." | `list_my_medicines` | Cross-reference the dashboard's "Inventory" list by retrieving the user's full inventory to read the `currentQuantity`. |
| "What notifications did I miss?" | `list_notifications` | Check the safety alerts feed. |

---

## 🧠 Operational Best Practices

- **Action Before Informing:** If a user asks the AI "I just took my pills", use `mark_dose_taken` rather than just saying "Good job!". The AI should actively manage the user's dashboard state.
- **Time Sensitivity:** If a user misses a dose, do not scold them. Instead, inform them that the system recorded the omission and they can use the "Mark as Taken" button late, or you can record it for them.
- **Supply Awareness:** Whenever listing medicines, proactively warn the user if their inventory is below 20% (as shown visually on the dashboard).

