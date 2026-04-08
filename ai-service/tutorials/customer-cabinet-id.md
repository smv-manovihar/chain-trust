# Medicine Detail (Cabinet Item) — Operational Manual
**Route:** `/customer/cabinet/[id]`

The Medicine Detail page is the comprehensive command center for a specific medication. It manages dosages, tracking logs, inventory replenishment, and security synchronization with the ChainTrust blockchain.

---

## 🎨 Visual Details & Layout
- **Vital Header**: Displays the product name and current **Adherence Streak** (Flame icon with pulse).
- **Glassmorphic Quick Stats**: Cards for "Active Dosage", "Last Taken", and "Remaining Units".
- **Interaction Hub**: Large, sticky "Take Dose" (Zap icon) and "Undo Dose" (RotateCcw icon) buttons.
- **Dynamic Charting**: Historical dosage pulse chart showing adherence consistency.
- **Inventory Bar**: Real-time progress bar showing stock levels (Red below 5 units).

---

## 🔗 URL & Navigation (Link Generation)
The agent should generate deep-links for specific actions on this page:

| Parameter | Type | Description |
| :--- | :--- | :--- |
| `edit` | Boolean | Triggers the edit modal for name or schedule. |
| `logs` | Boolean | Opens the historical dossier of all past dosages. |

**AI Rule:** When a user asks about a specific medicine's history, provide the direct [History Link](/customer/cabinet/[id]?logs=true).

---

## 🛠️ Tool Integration & AI Guidance

| User Intent | Tool Strategy | Notes |
| :--- | :--- | :--- |
| "What's my streak for X?" | `get_cabinet_item` | Checks the `currentStreak` and `longestStreak`. |
| "How much medication is left?" | `get_cabinet_item` | Reference `currentQuantity` vs. `totalQuantity`. |
| "Record a dose." | `mark_dose_taken` | Advise the user that this will increment their streak. |

---

## 🚨 Error & Empty States
- **Low Stock Warning**: When inventory is < 5, a high-visibility amber prompt appears. AI should suggest checking for open prescriptions or refills.
- **Missed Dose Alert**: If a scheduled dose is missed, the header status shifts to "Inactive". AI should offer "Reset Reminders" guidance.

---

## 🧠 Operational Best Practices
- **Streak Motivation**: Proactively congratulate users on high streaks (> 7 days).
- **Inventory Proactivity**: If inventory is low, check `list_prescriptions` for the user and suggest a refill link.
- **Safety Sync**: If the medicine is blockchain-verified, reassure the user that "This product is being monitored for safety updates 24/7."
