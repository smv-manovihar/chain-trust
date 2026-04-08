# Manufacturer Dashboard — Operational Manual
**Route:** `/manufacturer`

The Manufacturer Dashboard is the command center for production-level authenticity monitoring and batch lifecycle management. It provides a real-time pulse on global scan volume, active registries, and critical security alerts.

---

## 🎨 Visual Details & Layout
- **Bento Grid KPIs**: Four high-contrast state cards providing immediate situational awareness:
  - **Enrolled Products**: Total unique product types (SKUs) in the system.
  - **Registered Batches**: Active production runs currently verifiable.
  - **Verified Scans Today**: Real-time scan volume from consumers.
  - **Unread Security Alerts**: Count of unresolved incidents requiring attention.
- **Quick Action Bar**: High-density action buttons for "Add Batch", "New Product", "Analytics", and "Export Reports".
- **Security Alert Ledger**: A scrollable live feed of authentication incidents and system updates.

---

## 🔗 URL & Navigation (Link Generation)
The agent can generate links to specific areas or actions:

| Destination | Route | Description |
| :--- | :--- | :--- |
| **Manufacturer Home** | `/manufacturer` | Main dashboard and activity pulse. |
| **Product List** | `/manufacturer/products` | Manage product definitions and images. |
| **Batch Management** | `/manufacturer/batches` | Monitor production runs and QR labels. |
| **Scan Analytics** | `/manufacturer/analytics/scans` | Deep-dive into scan patterns and geography. |

**AI Rule:** When a manufacturer asks "How are we doing?" or "Is there anything urgent?", always link to the [Dashboard](/manufacturer) while highlighting the specific KPI.

---

## 🛠️ Tool Integration & AI Guidance

| User Intent | Tool Strategy | Notes |
| :--- | :--- | :--- |
| "What's our scan volume?" | `get_view_data` | Reference **Verified Scans Today** from the dashboard summary. |
| "Show me security alerts." | `get_view_data` | Check the **Alert Ledger** for recent activity. |
| "Do we have any new batches?" | `get_view_data` | Reference **Registered Batches** count. |

---

## 🚨 Error & Empty States
- **Empty Catalog**: If product/batch counts are 0, the dashboard displays an "Initial Setup" state. Guide the user to "Enroll your first product" via the [New Product](/manufacturer/products/new) link.

---

## 🧠 Operational Best Practices
- **Urgency First**: If `unread_security_alerts` > 0, prioritize mentioning these before general stats.
- **Role Awareness**: Ensure the agent speaks in professional, logistics-oriented terms (e.g., "Batch Registry", "Scan Integrity").
- **Direct Navigation**: If a user asks code-specific labels, direct them to the [Batch List](/manufacturer/batches).
