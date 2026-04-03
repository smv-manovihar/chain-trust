# Manufacturer Dashboard — Operational Manual
**Route:** `/manufacturer`

The Manufacturer Dashboard is the command center for production-level authenticity monitoring. It provides a real-time pulse on global scan volume, active batches, and critical security alerts.

---

## 🎨 Visual Details & Layout
- **Global Intelligence Banner**: A prominent, glassmorphic header welcoming the executive and displaying the company's name.
- **KPI Metrics (High-Fidelity Cards)**: "Daily Scan Velocity", "Active Catalog", "Production History", and "Security Alerts".
- **Live Threat Activity Feed**: A chronological list of the most recent security incidents.

---

## 🔗 URL & Navigation (Link Generation)
The agent can generate links to specific areas or actions:

| Destination | Route | Description |
| :--- | :--- | :--- |
| **Manufacturer Home** | `/manufacturer` | Main dashboard and activity pulse. |
| **Active Catalog** | `/manufacturer/products` | View the full list of products. |
| **Add New Batch** | `/manufacturer/batches/new` | Directly opens the batch enrollment wizard. |
| **Catalog Analytics** | `/manufacturer/analytics` | Deep-dive into geographic and threat data. |

**AI Rule:** When a manufacturer asks for a status summary or wants to perform an action, provide the corresponding deep-link alongside the technical response.

---

## 🛠️ Tool Integration & AI Guidance

| User Intent | Tool Strategy | Notes |
| :--- | :--- | :--- |
| "How's production today?" | `get_view_data` | Reference "Daily Scan Velocity" and "Active Catalog" stats. |
| "Show me our alerts." | `get_view_data` | Read the "Live Threat Activity Feed" for recent incidents. |

---

## 🚨 Error & Empty States
- **New Manufacturer State**: If no products exist, the dashboard shows an "Onboarding Wizard" state. Suggest starting with the [Catalog](/manufacturer/products).

---

## 🧠 Operational Best Practices
- **Executive Navigation**: Always offer a link to the [Analytics](/manufacturer/analytics) page if the user is asking about volume or geography.
- **Security Recognition**: If a user is on the dashboard and asks a general question while alerts are unread, acknowledge those alerts first.
