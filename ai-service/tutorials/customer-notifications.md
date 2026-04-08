# Notifications (Alert Center) — Operational Manual
**Route:** `/customer/notifications`

The Notifications page is the security-centric ledger for all account and product-level alerts. It serves as the primary channel for high-priority security risks (Recalls), inventory warnings (Low Stock), and adherence schedule updates.

---

## 🎨 Visual Details & Layout
- **Dynamic Action Bar**: Top-level controls to "Mark all as Read" and filter by priority.
- **Unified Notification Hub**:
  - **Alert Hierarchy**: Color-coded cards indicating priority:
    - **High Priority (Red)**: Safety recalls and security breach alerts.
    - **Medium Priority (Amber)**: Low stock warnings and subscription updates.
    - **Low Priority (Blue)**: General advice and adherence milestones.
  - **Timestamped Feed**: Chronological list with human-readable timestamps and source attribution.
- **Micro-Actions**: Individual cards support quick actions like "View Product", "Order Refill", or "Delete Alert".

---

## 🔗 URL & Navigation (Link Generation)
The agent can generate links to filtered views:

| Filter | Route | Description |
| :--- | :--- | :--- |
| **Safety Alerts** | `/customer/notifications?type=security` | Focused view on high-priority security risks. |
| **Medication Updates** | `/customer/notifications?type=medication` | Focused on stock and expiry alerts. |

**AI Rule:** When a user asks "Is my medicine safe?", prioritize checking for any **High Priority** alerts before responding.

---

## 🛠️ Tool Integration & AI Guidance

| User Intent | Tool Strategy | Notes |
| :--- | :--- | :--- |
| "What alerts do I have?" | `list_notifications` | Retrieves a summarized list of recent events. |
| "Show me my security risks." | `get_view_data` | Use the route filter `type=security` to isolate risks. |

---

## 🚨 Error & Empty States
- **Clear Ledger State**: Displays a "Perfect Verification" state when no alerts are unread. AI should reassure the user: "Your medication safety ledger is clear."
- **Overload State**: If unread counts are high, suggest using "Mark all as Read" to clear the noise.

---

## 🧠 Operational Best Practices
- **Security-First Reporting**: Always report "Safety Recalls" immediately, over-riding any other topic.
- **Direct Connectivity**: If a notification mentions a specific product, provide a link to that product's [Detail Page](/customer/cabinet/[id]).
- **Proactive Refills**: If the user has a "Low Stock" notification, suggest using the **Refill Dialog** on the product page.
