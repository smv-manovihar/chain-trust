# My Medicines — Operational Manual
**Route:** `/customer/cabinet`

The "My Medicines" page is a premium medication archive and live inventory management suite. It serves as the user's personal medication library, tracking both verified authentic products and manually added entries with real-time adherence oversight.

---

## 🎨 Visual Details & Layout
- **Dynamic Data Toolbar**: A floating toolbar containing a search input, a view toggle (Grid vs. List), and a "Show Inactive" toggle.
- **View Modes**:
  - **Grid View (Default)**: Premium 3D-effect cards with glass backgrounds, progress bars, and floating **Flame Streaks** badges.
  - **List View**: A high-density data table for professional management, featuring a dedicated "STREAK" column.
- **Adherence Streaks**: Medicines with consistent "Punctual" doses show an animated orange badge with a **Flame icon** (e.g., "5 Day Streak").
- **Quick Action Bar**: Every medicine has direct **Take Dose** and **Undo** buttons, allowing users to record adherence without leaving the list.

---

## 🔗 URL & Navigation (Link Generation)
The agent can generate deep-links to this page using the following query parameters:

| Parameter | Type | Description | Example Link |
| :--- | :--- | :--- | :--- |
| `search` | String | Filters the list by name, brand, or batch. | `/customer/cabinet?search=Paracetamol` |
| `status` | String | Filters by `active` (default) or `all`. | `/customer/cabinet?status=all` |

**AI Rule:** When a user asks to "see my history" or "find a past med", generate a link with `status=all`. For specific meds, use the `search` parameter.

---

## 🛠️ Tool Integration & AI Guidance

| User Intent | Tool Strategy | Notes |
| :--- | :--- | :--- |
| "What's my longest streak?" | `get_view_data` | Reference the **Dashboard Max Streak** or scan the cabinet list. |
| "Show me my inventory." | `get_view_data` | Use the cabinet summary to highlight low quantities. |
| "I missed my last dose." | `mark_dose_taken` | Record it now, but remind them it may break their **Flame Streak**. |

---

## 🚨 Error & Empty States
- **Empty State**: Shows a custom `EmptyState` component with a `Pill` icon and a prompt to either [Add Manual](/customer/cabinet/add) or [Verify](/verify).
- **Recently Taken**: The "Take Dose" button disables for 5 minutes after a record to prevent accidental double-dosing.

---

## 🧠 Operational Best Practices
- **View Mode Context**: "I've filtered your list for 'Paracetamol'. You can toggle between Grid and Table views using the icons in the toolbar."
- **Streak Celebration**: Always call out high streaks (e.g., "Wow, your 12-day streak on Vitamin D is impressive! Keep it up 🔥").
- **Visual Cues**: Verified items use the `ShieldCheck` icon; manual entries use the `Pill` icon.
