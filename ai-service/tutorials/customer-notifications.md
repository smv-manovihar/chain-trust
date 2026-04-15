# Notifications Hub — Operational Manual
**Route:** `/customer/notifications`
**Available Query Params:** `?type=[all|unread|security|system]`

The Notifications Hub is a centralized inbox tracking urgent platform alerts. It routes complex backend event systems (like expiring medicines or sudden global recalls) into a unified reading pane for the consumer.

---

## 🎨 Visual Details & Layout

- **Main Header Area:** Displays the "Notifications" title alongside a dynamic **"Mark all read"** action button (which only appears if the unread count > 0).
- **Segmented Tabs:**
  - **Unread (Default):** Displays only active, unacknowledged alerts. Includes a numerical badge mapping exactly to `unreadCount`.
  - **History (All):** Displays an archived scroll of all notifications, whether read or unread. Includes a "Load older history" pagination button at the bottom.
- **Notification Cards:** Each alert renders a distinct Card component featuring:
  - **Dynamic Iconography:**
    - 🔴 **Red Alert Triangle:** Used for `batch_recall` (Critical Safety Alerts).
    - 🟠 **Amber Alert Triangle:** Used for `medicine_expiry` warnings.
    - 🟢 **Green Pill:** Used for scheduled `dose_reminder` nudges.
    - 🔵 **Blue Shield:** Used for general `system` events.
  - **Time Stamp:** Formatted in exact time ("HH:mm") alongside a relative suffix (e.g. "2 hours ago").
  - **Unread Indicator:** A pulsing blue dot in the bottom right corner signals an unread state.
  - **Quick Action Hover:** Hovering over an unread card reveals a quick "Check" button to explicitly mark it visually as read.
  - **Deep Links (View details →):** Many cards include a primary hyperlink routing the user automatically to the impacted Medicine Cabinet item or Verification result.

---

## 🛠️ Behavioral Instructions for the Assistant

The Assistant can actively intervene and assist with notification states.

| User Intent | Tool Strategy | Notes |
| :--- | :--- | :--- |
| "What alerts do I have?" | `list_notifications` | Fetches the same stream visible in the UI. Be sure to prioritize unread recalls or warnings. |
| "Why did my phone beep?" | `list_notifications` | Sort by the most recent timestamp to infer the likely trigger. |

---

## 🧠 Operational Best Practices

- **Priority Filtering:** If the user asks the agent to review their notifications, the agent must check for **Recalls** first, **Expirations/Low Stock** second, and **Reminders** last. Never bury a recall beneath a standard pill reminder when summarizing.
- **Deep Routing:** If a user asks "What medicine expired?", check the notification, read the text, and inform the user of the exact medicine name. Suggest they navigate to their cabinet to delete or refill it.
- **Zero-State Handling:** If the user has no unread alerts, the UI displays an empty state ("You're up to date!"). The AI should mirror this calming assurance rather than outputting sterile technical zero results.

