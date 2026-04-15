# Medicine Details — Operational Manual
**Route:** `/customer/cabinet/[id]`

This page provides an atomic, detailed view of a single medication within the user's digital cabinet. It acts as the primary interface for managing dose schedules, tracing historical adherence, and exploring attached medical media.

---

## 🎨 Visual Details & Layout

### 1. Header Bar & Core Actions
- **Title Block:** Displays the Medicine Name, Brand, Batch Code (if verified), and safety status badges (e.g., "Authentic", "Inactive").
- **Top Right Actions:** 
  - **Take Dose (Primary):** A prominent green button to log a dose. If recently pressed, it turns gray and reads "Dose Recorded".
  - **Refill:** A button to add new stock to the current inventory total.
  - **Deactivate/Activate:** An "Eye" icon to toggle whether the medicine appears in the daily schedule. Deactivated medicines are suppressed from reminders.
  - **Undo (RotateCcw):** Appears conditionally if a dose was recently taken.

### 2. Adherence Hero Console
A large, prominent visual banner providing immediate contextual tracking:
- **Next Dosage:** Displays exactly when the next pill is due (e.g., "Tomorrow at 19:00").
- **Smart Tags:** Contextual tags for the upcoming dose, including a countdown (e.g., "In 5h 30m") and Meal Context (e.g., "After meal").
- **Current Streak:** An orange, pulsing Flame badge indicating consecutive days without a missed dose.
- **Current Stock:** A large numerical counter showing remaining units. A pulsating "Low Stock" warning appears if units drop below 5.
- **Last Recorded:** Precisely when the user last clicked "Take Dose".

### 3. Management Tabs
The lower section divides complex configuration into three tabs:

- **Schedule & Settings:** 
  - Allows robust configuration of "Smart Reminders" (Time, Days of Week, Frequency, Meal Context).
- **History:** 
  - A comprehensive timeline of the 20 most recent dose events. Events are marked distinctly as Punctual (green check) or Late (amber warning).
- **Details & Media:** 
  - **Prescriptions:** Attached OCR-scanned prescription documents.
  - **Product Imaging:** Verified high-resolution product photography (fetched automatically if blockchain verified) or allowing manual image uploads.
  - **Form Data:** Doctor name, raw dosage strings, composition, and personal notes.

---

## 🛠️ Behavioral Instructions for the Assistant

This is the most feature-dense page for the user. Consequently, the agent can powerfully manipulate these settings conversationally.

| User Intent | Tool Strategy | Notes |
| :--- | :--- | :--- |
| "I took this pill." | `mark_dose_taken` | Matches the primary green button action. |
| "Undo that dose" | `undo_dose` | Restores inventory and deletes the recent dose log. |
| "Set a reminder for 5 PM" | `add_reminder` | Automatically configures the Schedule logic accurately. |
| "Show me the prescription for this" | `list_prescriptions` + `read_prescription` | The AI can search through the user's available prescriptions or read the active one. |
| "I got a refill of 30 pills" | `update_medicine` | Safely update the `currentQuantity` property. |

---

## 🧠 Operational Best Practices

- **Intelligent Refills:** If a user says "I got a refill", ask them for the quantity before executing `update_medicine`.
- **Missed Doses vs Late Doses:** Emphasize that taking a dose "Late" is visually distinct in the History tab, but it preserves overall tracking integrity better than entirely skipping the dose.
- **Medication Deactivation:** If a user finishes a treatment course, seamlessly advise them (and use `update_medicine`) to set `status="inactive"` rather than deleting it. This preserves their dosage history.

