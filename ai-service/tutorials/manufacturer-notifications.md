# Executive Notifications (Threat Center) — Operational Manual
**Route:** `/manufacturer/notifications`

The Executive Notifications page is the security-centric command center for all production and batch-level alerts. It serves as the primary channel for high-priority security risks, suspicious scan patterns, and market intelligence updates.

---

## 🎨 Visual Details & Layout
- **Dynamic Action Bar**: Top-level controls to "Mark all as Read" and filter by threat intensity.
- **Unified Command Hub**:
  - **Identified Threat Hierarchy**: Individual glassmorphic cards for "Critical Risk", "Scan Intelligence", and "Product Update".
  - **Timestamped Logs**: Deep-level chronological sorting with human-readable times.
  - **Type Icons**: High-visibility icons for each category (Red Shield for Security Risks, Blue Document for Registry Updates).
- **Executive Actions**: Quick-action buttons to "View Batch Scans" or "Enact Recall" directly from the notification card.

---

## 🔗 URL & Navigation (Link Generation)
The agent can generate links to specific notification types:

| Filter | Route | Description |
| :--- | :--- | :--- |
| **Security Risks** | `/manufacturer/notifications?type=security` | Focused view on counterfeit signals and supply chain risks. |
| **Registry Updates** | `/manufacturer/notifications?type=registry` | Alerts regarding product enrollment and batch approvals. |

**AI Rule:** When a manufacturer asks "Are there any threats?", prioritize checking the **Security Risks** feed.

---

## 🛠️ Tool Integration & AI Guidance

| User Intent | Tool Strategy | Notes |
| :--- | :--- | :--- |
| "What's the latest security news?" | `list_notifications` | Retrieves a summarized list of recent executive alerts. |
| "Is my production line safe?" | `get_view_data` | Use route filter `type=security` to scan for active threats. |

---

## 🚨 Error & Empty States
- **Production Secure State**: Displays a "Secure & Verified" illustration when all alerts are acknowledged. AI should reassure: "All production runs are currently scanning within normal parameters."

---

## 🧠 Operational Best Practices
- **Security-First Reporting**: Always report "Security Risks" immediately, over-riding any other operational topic.
- **Interactive Deep-Link**: If an alert mentions a suspicious batch, provide a link to the [Batch Detail Page](/manufacturer/batches/[id]).
- **Proactive Analytics**: If a notification mentions a geographic scan cluster, suggest checking the [Geographic Heatmap](/manufacturer/analytics).
