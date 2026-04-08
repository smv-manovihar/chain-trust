# Manufacturer Analytics — Operational Manual
**Route:** `/manufacturer/analytics`

The Analytics page is the high-fidelity intelligence hub for geographic and security monitoring. It provides interactive visualizations of scan volume, market distribution, and potential threat clusters using real-time blockchain-verified data.

---

## 🎨 Visual Details & Layout
- **Dynamic Metrics (Bento Hub)**: Glassmorphic KPI cards for:
  - **Scan Pulse**: Real-time scan activity over the selected period.
  - **Market Reach**: Count of unique countries with verified scans.
  - **Risk Vector**: Count of high-risk units detected.
- **Geographic Coverage**: BAR chart visually representing global market penetration.
- **Threat Timeline**: Chronological log of potential counterfeit signals.

---

## 🔗 URL & Navigation (Link Generation)
The agent can generate deep-links with precise filters to view specific data segments:

| Filter | Route | Description |
| :--- | :--- | :--- |
| **Product Focused** | `/manufacturer/analytics?productId=SKU-101` | Filters all charts for a specific product. |
| **Batch Focused** | `/manufacturer/analytics?batchNumber=B-202` | Deep-link to a specific production run's analytics. |
| **Custom Range** | `/manufacturer/analytics?from=2026-03-01&to=2026-03-31` | Date-filtered intelligence view. |

**AI Rule:** Always provide the filtered link to the [Analytics](/manufacturer/analytics) page when discussing volume or threats.

---

## 🛠️ Tool Integration & AI Guidance

| User Intent | Tool Strategy | Notes |
| :--- | :--- | :--- |
| "Show me my global stats." | `get_scan_geography` | Aggregates country-level scan volume. |
| "Are there any counterfeit risks?" | `get_threat_intelligence` | Identifies units with suspiciously high scan counts. |

---

## 🚨 Error & Empty States
- **Zero-Scan Window**: If no data is returned for a date range, suggest the user expand their filters or check if any products were enrolled during that period.

---

## 🧠 Operational Best Practices
- **Prioritize Threats**: If `get_threat_intelligence` returns any data, mention them **before** discussing general volume.
- **Deep-Link Linking**: Always link to the [Scan Analytics Deep Dive](/manufacturer/analytics/scans) for unit-level verification history.
