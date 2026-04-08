# Customer Dashboard — Operational Manual
**Route:** `/customer`

The Customer Dashboard is the primary nexus for a patient's medication security, adherence tracking, and health history. It provides high-level situational awareness through live stats, adherence carousels, and security feeds.

---

## 🎨 Visual Details & Layout
- **Hero Carousel (`UpcomingDoseCarousel`)**: A prominent top-level carousel showing the next scheduled doses with countdowns, meal contexts, and quick "Mark as Taken" actions.
- **Inventory Sidebar**: A persistent high-density list on the right (on desktop) or below (on mobile) showing medication stock levels, progress bars, and low-stock warnings (red highlight for < 20% supply).
- **Core Dashboard Stats**:
  - **Total Medications**: Count of unique library items.
  - **Verified Authentic**: Count of items verified via blockchain/batch records.
  - **Scans & Security**: Tracking activity for the user's specific units.
- **Safety Feed (`Safety Alerts`)**: A real-time stream of regulatory alerts, including **Batch Recalls** (urgent red) and **Expiry Warnings** (amber), linked directly to the affected treatment plans.

---

## 🔗 URL & Navigation (Link Generation)
The agent can generate links to this page or its sub-pages:

| Destination | Route | Description |
| :--- | :--- | :--- |
| **Dashboard** | `/customer` | The primary hub and health summary. |
| **My Medicines** | `/customer/cabinet` | Full library with advanced management. |
| **Verify Now** | `/verify` | QR scanner for new medications. |
| **Quick Add** | `/customer/cabinet/add` | Manual entry form for non-verified items. |

**AI Rule:** Use the dashboard as the starting point for situational health questions like "What should I take next?" or "Are my meds safe?".

---

## 🛠️ Tool Integration & AI Guidance

| User Intent | Tool Strategy | Notes |
| :--- | :--- | :--- |
| "What's my next dose?" | `get_view_data` | Reference the **UpcomingDoseCarousel** data. |
| "Is anything low on stock?" | `get_view_data` | Filter the **Inventory Sidebar** for items < 5 units. |
| "Are there any recalls?" | `get_view_data` | Check the **Safety Feed** for `batch_recall` types. |

---

## 🚨 Error & Empty States
- **Empty Hub**: If `total_items` is 0, the dashboard displays a welcoming "Get Started" state. The agent should proactively guide the user to the [Scanner](/verify).
- **Network Latency**: Dashboard uses Skeletons for `UpcomingDoseCarousel`. Agent should mention "fetching your live schedule" if asked during load.

---

## 🧠 Operational Best Practices
- **Adherence Focus**: When the user asks "What's going on?", highlight the next dose and any low stock alerts.
- **Security Check**: Periodically remind the user that their safety feed is "Connected to ChainTrust Secure Ledger" for peace of mind.
- **Flame Icons**: Adherence Streaks are highlighted in detail views; mention them here as "consistency achievements."
