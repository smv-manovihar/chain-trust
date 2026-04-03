# Customer Dashboard — Operational Manual
**Route:** `/customer`

The Customer Dashboard is the central nexus for a patient's medication security and health history. It provides high-level situational awareness through live stats and recent activity, prioritizing verification and My Medicines accessibility.

---

## 🎨 Visual Details & Layout
- **Dynamic Greeting Segment**: A glassmorphic card welcoming the user with their name and a personalized health summary (e.g., "Welcome back, Sarah").
- **Core KPIs (Stats Grid)**:
  - **Total Medications**: Count of items in My Medicines.
  - **Verified Authentic**: Count of items verified via blockchain.
- **Recent Activity Ledger**: A scrollable list of the last 5 actions.

---

## 🔗 URL & Navigation (Link Generation)
The agent can generate links to this page or its sub-pages:

| Destination | Route | Description |
| :--- | :--- | :--- |
| **Dashboard** | `/customer` | The primary hub and health summary. |
| **Verify Now** | `/verify` | Redirects to the QR scanner directly. |
| **Add Manual** | `/customer/cabinet/add` | Opens the manual entry form. |

**AI Rule:** Use the dashboard as the starting point for navigation unless the user has a specific SKU or salt to verify.

---

## 🛠️ Tool Integration & AI Guidance

| User Intent | Tool Strategy | Notes |
| :--- | :--- | :--- |
| "What's going on with my health?" | `get_view_data` | Focus on the "Recent Activity" ledger. |
| "Show me my stats." | `get_user_profile` | Cross-reference with `get_view_data`. |

---

## 🚨 Error & Empty States
- **New User State**: If `total_items` is 0, the dashboard displays a welcoming "Get Started" state. AI should suggest verification.

---

## 🧠 Operational Best Practices
- **Navigation Context**: Always provide a link to the relevant page (e.g., "You can see your recent activity on the [Dashboard](/customer).")
- **Personalized Context**: Use the user's name from `get_user_profile` to make responses feel premium.
