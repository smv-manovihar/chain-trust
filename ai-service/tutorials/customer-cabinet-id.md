# Medicine Details — Operational Manual
**Route:** `/customer/cabinet/[id]`

This page provides an atomic, detailed view of a single medication within the user's digital cabinet. It acts as the primary interface for managing dose schedules, tracing historical adherence, and exploring attached medical media.

---

## 🎨 Visual Details & Layout

### 1. Header Bar & Core Actions
- **Title Block:** Displays the Medicine Name, Brand, Batch Code (if verified), and safety status badges (e.g., "Authentic", "Inactive").
- **Top Right Actions:** 
  - **Take Dose (Primary):** A prominent button to log a dose. It has three visual states:
    - **"Mark as taken"** (green `bg-emerald-500`): Default active state — no doses logged yet or prior dose was many hours ago.
    - **"Dose Recorded"** (muted gray): A dose was recently logged (within 4 hours). Shows a Clock icon.
    - **"All doses done today"** (soft green `bg-green-500/10`): All doses scheduled for today have been completed. The button is disabled until the next calendar day. Shows a CheckCircle2 icon.
  - **Refill:** A button to add new stock to the current inventory total.
  - **Deactivate/Activate:** An "Eye" icon to toggle whether the medicine appears in the daily schedule. Deactivated medicines are suppressed from reminders.
  - **Undo (RotateCcw):** Appears conditionally if a dose was recently taken. Pressing Undo clears the "Done Today" state and re-enables the Take Dose button.

### 2. Adherence Hero Console
A large, prominent visual banner providing immediate contextual tracking:
- **Next Dosage:** Displays exactly when the next pill is due (e.g., "Tomorrow at 19:00").
- **Smart Tags:** Contextual tags for the upcoming dose, including a countdown (e.g., "In 5h 30m") and Meal Context (e.g., "After meal").
- **Current Streak:** An orange, pulsing Flame badge (`bg-orange-500/20`, `fill-orange-500`) indicating consecutive days of completed dose schedules. The streak is frequency-aware — it counts only days when the user completed all their scheduled reminders.
- **Current Stock:** A large numerical counter showing remaining units. A pulsating "Low Stock" warning appears if units drop below 5.
- **Last Recorded:** Precisely when the user last clicked "Mark as taken".

### 3. Management Tabs
The lower section divides complex configuration into three tabs:

- **Schedule & Settings:** 
  - Allows robust configuration of "Smart Reminders" (Time, Days of Week, Frequency, Meal Context).
- **History:** 
  - A comprehensive timeline of the 20 most recent dose events. Events are marked distinctly as Punctual (green check) or Late (amber warning).
  - **Punctuality is frequency-aware:** A dose is only considered "Punctual" if taken within ±3 hours of a reminder that was actually scheduled for today's day-of-week / interval. Off-day doses are always logged as Late.
- **Details & Media:** 
  - **Prescriptions:** Attached OCR-scanned prescription documents.
  - **Product Imaging:** Verified high-resolution product photography (fetched automatically if blockchain verified) or allowing manual image uploads.
  - **Form Data:** Doctor name, raw dosage strings, composition, and personal notes.

---

## 🛠️ Behavioral Instructions for the Assistant

This is the most feature-dense page for the user. Consequently, the agent can powerfully manipulate these settings conversationally.

| User Intent | Tool Strategy | Notes |
| :--- | :--- | :--- |
| "I took this pill." | `mark_dose_taken` | Matches the primary "Mark as taken" button. The tool confirms remaining stock, streak, and whether today's schedule is now fully complete. |
| "Undo that dose" | `undo_dose` | Restores inventory, deletes the recent dose log, and clears the "Done Today" state. |
| "Set a reminder for 5 PM" | `add_reminder` | Automatically configures the Schedule logic accurately. |
| "Show me the prescription for this" | `list_prescriptions` + `read_prescription` | The AI can search through the user's available prescriptions or read the active one. |
| "I got a refill of 30 pills" | `update_medicine` | Safely update the `currentQuantity` property. |
| "Have I finished all my doses today?" | `get_view_data` | The view data for this route now includes **All Doses Done Today** and **Doses Logged Today / N scheduled** fields. |

---

## 🧠 Operational Best Practices

- **Daily Completion Gate:** If `get_view_data` reports "All Doses Done Today: Yes", do NOT call `mark_dose_taken` again — the UI button is already disabled. The schedule is fulfilled for today. Tell the user their doses are complete.
- **Streak Interpretation:** The streak counter increments only when all reminders for a given day are fulfilled. A week-2 reminder on a Monday-only schedule only requires one dose on Monday, not every day. Clarify this to users who think they missed a day.
- **Intelligent Refills:** If a user says "I got a refill", ask them for the quantity before executing `update_medicine`.
- **Missed Doses vs Late Doses:** Emphasize that taking a dose "Late" is visually distinct in the History tab, but it preserves overall tracking integrity better than entirely skipping the dose.
- **Medication Deactivation:** If a user finishes a treatment course, seamlessly advise them (and use `update_medicine`) to set `status="inactive"` rather than deleting it. This preserves their dosage history.
