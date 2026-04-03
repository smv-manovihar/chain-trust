# Notifications (Alert Center) — Operational Manual
**Route:** `/customer/notifications`

The Notifications page is the security-centric ledger for all account and product-level alerts. It serves as the primary channel for high-priority security risks, recall notices, and dose reminders.

---

## 🎨 Visual Details & Layout
- **Dynamic Alert Header**: A glassmorphic top bar displaying the "Unread Security Alerts" count.
- **Unified Notification Hub**:
  - **Identified Alert Hierarchy**: Individual glassmorphic cards for "Critical Security", "Health Reminder", and "Account Update".
  - **Timestamped Logs**: Deep-level chronological sorting with human-readable times (e.g., "HH:MM").
  - **Type Icons**: High-visibility icons for each category (Red Shield for Risks, Blue Bell for Reminders).
- **Notification Actions**: h-10 rounded-xl buttons for "Mark as Read", "Acknowledge", and "View Product Details".

---

## 🔗 URL & Navigation (Link Generation)
The agent can generate links to specific notification types:

| Parameter | Type | Description | Example Link |
| :--- | :--- | :--- | :--- |
| `type` | String | Filters the notifications by category (e.g., `security`, `reminder`). | `/customer/notifications?type=security` |
| `id` | String | Opens a specific notification for a deep-dive view. | `/customer/notifications?id=...` |

**AI Rule:** When a user asks "What's new?" or asks about security alerts, generate a filtered link to the [Notification Center](/customer/notifications?type=security).

---

## 🛠️ Tool Integration & AI Guidance

| User Intent | Tool Strategy | Notes |
| :--- | :--- | :--- |
| "Show me my latest alerts." | `get_view_data` | Reference the notification list for any "CRITICAL" entries. |
| "Is my medicine safe?" | `get_view_data` | Cross-reference notifications for any recall alerts. |
| "Checking on a specific alert." | `get_view_data` | Read the detail of the mentioned alert ID. |

---

## 🚨 Error & Empty States
- **Clear Ledger State**: If no notifications exist, a "Secure & Clear" empty state with a green checkmark is shown. AI should emphasize that "No threats are active."
- **High-Risk Multi-Alert**: If unread alerts > 10, the UI intensity increases. AI should prioritize security summaries.

---

## 🧠 Operational Best Practices
- **Security-First Reporting**: Always report "Critical Risks" first before discussing general notifications.
- **Deep-Link Connectivity**: Provide a link to the [Alert Center](/customer/notifications) for any security-related queries.
- **Verification Loop**: If a notification mentions a "Suspicious Scan," suggest the user use the [Verify Now](/verify) tool.
