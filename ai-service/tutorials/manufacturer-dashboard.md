# Manufacturer Enterprise Dashboard — Operational Manual
**Route:** `/manufacturer`
**Available Query Params:** None

The Manufacturer Dashboard serves as the central control plane (C2) for pharmaceutical manufacturers. It provides immediate topological awareness of product enrollment, active batches, consumer scan activity, and urgent security alerts.

---

## 🎨 Visual Details & Layout

- **Page Header:** Welcomes the manufacturer user by their first name.
- **Bento KPI Grid:** Four primary metric cards:
  - **Products Enrolled:** Total size of the company's product catalogue (blue).
  - **Active Batches:** Total number of registered production runs on the blockchain (primary color).
  - **Scans Today:** Real-time counter of consumer verification scans globally (green). Displays a percentage tendency compared to yesterday.
  - **Unread Alerts:** Count of urgent notifications (turns red/destructive if > 0).
- **Two-Column lower section:**
  - **Left Section (Quick Actions):** A grid of prominent navigation cards bridging the user to primary domain workflows:
    - Manage Products (`/manufacturer/products`)
    - Enroll Batch (`/manufacturer/batches/new`)
    - View Analytics (`/manufacturer/analytics`)
    - View Scan activity (`/manufacturer/analytics/scans`)
  - **Right Section (Recent Activity):** A scrollable feed of the latest system notifications (e.g., suspicious scan alerts, low stock warnings). If no activity is present, displays an "All systems green" empty state.

---

## 🛠️ Behavioral Instructions for the Assistant

The Assistant accesses deep summary data to emulate this dashboard when communicating with manufacturer roles.

| User Intent | Tool Strategy | Notes |
| :--- | :--- | :--- |
| "Show me my dashboard metrics" | `get_overview_stats` | Fetches the raw numbers powering the Bento KPI Grid. |
| "What happened today?" | `get_overview_stats` + `list_notifications` | Combine scan volume tendency with recent activity to provide a briefing. |
| "How do I enroll a new batch?" | Routing | Advise the user to click the "Enroll Batch" Quick Action or navigate to `/manufacturer/batches/new`. |

---

## 🧠 Operational Best Practices

- **Actionable Briefings:** If the user asks for a daily summary and `Unread Alerts` > 0, the AI must proactively highlight those alerts instead of just listing the total number of scans.
- **Role Awareness:** This interface is restricted exclusively to Manufacturer accounts. Do not mention "My Medicines" or consumer-oriented features while discussing this dashboard.
- **Analytics Context:** If the tendency for "Scans Today" drops significantly, the AI might suggest querying the analytics tools (`get_scan_analytics`) to investigate regional drop-offs.

