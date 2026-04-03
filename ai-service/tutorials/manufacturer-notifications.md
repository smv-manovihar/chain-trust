# Executive Notifications (Threat Center) — Operational Manual
**Route:** `/manufacturer/notifications`

The Executive Notifications page is the security-centric command center for all production and batch-level alerts. It serves as the primary channel for high-priority security risks, suspicious scan patterns, and regulatory change notices.

---

## 🎨 Visual Details & Layout
- **Dynamic Threat Header**: A glassmorphic top bar displaying the "Unread Security Alerts" count.
- **Unified Command Hub**:
  - **Identified Threat Hierarchy**: Individual glassmorphic cards for "Critical Risk", "Scan Intelligence", and "Product Update".
  - **Timestamped Logs**: Deep-level chronological sorting with human-readable times (e.g., "HH:MM").
  - **Type Icons**: High-visibility icons for each category (Red Shield for Risks, Blue Bell for Reminders).
- **Executive Actions**: h-10 rounded-xl buttons for "Mark as Read", "Acknowledge", and "View Batch Scans".

---

## 🔗 URL & Navigation (Link Generation)
The agent can generate links to specific notification types:

| Parameter | Type | Description | Example Link |
| :--- | :--- | :--- | :--- |
| `type` | String | Filters the notifications by category (e.g., `security`, `intelligence`). | `/manufacturer/notifications?type=security` |
| `id` | String | Opens a specific notification for a deep-dive view. | `/manufacturer/notifications?id=...` |

**AI Rule:** When a manufacturer asks "What's new?" or asks about security alerts, generate a filtered link to the [Notification Center](/manufacturer/notifications?type=security).

---

## 🛠️ Tool Integration & AI Guidance

| User Intent | Tool Strategy | Notes |
| :--- | :--- | :--- |
| "Show me my latest alerts." | `get_view_data` | Reference the notification list for any "CRITICAL" entries. |
| "Is Batch #202 safe?" | `get_view_data` | Cross-reference notifications for any suspicious scan alerts. |
| "Checking on a specific alert." | `get_view_data` | Read the detail of the mentioned alert ID. |

---

## 🚨 Error & Empty States
- **Clear Ledger State**: If no notifications exist, a "Production Secure" empty state with a green checkmark is shown. AI should emphasize that "No threats are active."
- **High-Risk Multi-Alert**: If unread alerts > 10, the UI intensity increases. AI should prioritize security summaries.

---

## 🧠 Operational Best Practices
- **Security-First Reporting**: Always report "Critical Risks" first before discussing general notifications.
- **Deep-Link Connectivity**: Provide a link to the [Alert Center](/manufacturer/notifications) for any security-related queries.
- **Verification Loop**: If a notification mentions a "Suspicious Scan," suggest the user use the [Analytics](/manufacturer/analytics) tool.
