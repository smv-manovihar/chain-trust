# Manufacturer Analytics — Operational Manual
**Route:** `/manufacturer/analytics`

The Analytics page is the high-fidelity center for geographic and security monitoring. It provides interactive visualizations of scan volume, market distribution, and potential threat clusters.

---

## 🎨 Visual Details & Layout
- **Dynamic Metrics (Stats Bar)**: Glassmorphic KPI cards for: "Scan Pulse", "Market Reach", and "Risk Vector".
- **Geographic Coverage (Chart Segment)**: A responsive, animated Bar Chart showing the top 10 countries by scan volume and tooltips with product-level depth.
- **Security Incident Timeline**: A dynamic area for "Top Threats".

---

## 🔗 URL & Navigation (Link Generation)
The agent can generate deep-links with precise filters to view specific data segments:

| Parameter | Type | Description | Example Link |
| :--- | :--- | :--- | :--- |
| `productId` | String | Filters all charts and threats for a specific SKU. | `/manufacturer/analytics?productId=SKU-101` |
| `batchNumber`| String | Filters all data for a specific production run. | `/manufacturer/analytics?batchNumber=AC-202` |
| `from` | Date | Start date for analysis (YYYY-MM-DD). | `/manufacturer/analytics?from=2026-03-01` |
| `to` | Date | End date for analysis (YYYY-MM-DD). | `/manufacturer/analytics?to=2026-03-31` |

**AI Rule:** When a manufacturer asks for a geographic summary or threat analysis for a specific product/batch, provide the filtered link to the [Analytics](/manufacturer/analytics) page.

---

## 🛠️ Tool Integration & AI Guidance

| User Intent | Tool Strategy | Notes |
| :--- | :--- | :--- |
| "Where are our products being scanned?" | `get_scan_geography` | Identify top countries and cities. |
| "Show me any threats." | `get_threat_intelligence` | Reference the total visitor and scan count per unit. |

---

## 🚨 Error & Empty States
- **Insufficient Data Warning**: Suggest expanding the dates if `get_scan_geography` returns no results.

---

## 🧠 Operational Best Practices
- **Data Filtering Linkage**: Always offer a filtered link when answering product-specific volume questions.
- **Threat Prioritization**: Mention the **Analytics** deep-link when high-severity threats are detected.
