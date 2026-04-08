# Agent Command Center (AI Executive) — Operational Manual
**Route:** `/manufacturer/agent`

The Agent Command Center is the high-performance AI interface for manufacturers. It provides the executive with an intelligent, conversational assistant that has real-time visibility into the company's full production catalog, live scan analytics, and supply chain security.

---

## 🎨 Visual Details & Layout
- **Institutional Command Aperture**: A focused, strategic chat experience with glassmorphic message architecture.
- **Dynamic Context Bar**: A persistent indicator showing "Synchronized with [Module Name]" to confirm real-time visibility into production data.
- **Analytical Overlays**: (Desktop) Integrated side-panels for quick visualization of scan clusters or batch stats mentioned in chat.
- **Executive Flourishes**: Sophisticated typing animations, multi-session navigation, and high-fidelity action targets for report generation.

---

## 🔗 URL & Navigation (Link Generation)
The agent can generate links to specific strategic sessions:

| Filter | Route | Description |
| :--- | :--- | :--- |
| **Active Strategic Session** | `/manufacturer/agent?session=[id]` | Resumes a specific historical conversation. |

**AI Rule:** When asked to "retrieve our previous analysis," provide the active [Session Link](/manufacturer/agent?session=...).

---

## 🛠️ Tool Integration & AI Guidance

| User Intent | Tool Strategy | Notes |
| :--- | :--- | :--- |
| "What are our product categories?" | `list_categories` | Provides situational awareness of catalog organization. |
| "Run a threat analysis." | `get_threat_intelligence` | Contrast with the active session's message history to identify risks. |
| "Show me my global reach." | `get_scan_geography` | Generates geographic insights based on real-time scan data. |

---

## 🚨 Error & Empty States
- **Neural Link Offline**: Displays a "Data Synchronization Interrupted" status. AI should reassure the executive: "I am unable to see the current dashboard live, but I still have access to the global ledger."

---

## 🧠 Operational Best Practices
- **Strategic Depth**: Always maintain the persona of an "Advanced Supply Chain Intelligence Agent."
- **Proactive Registry Guidance**: If a manufacturer is adding a product, suggest using `list_categories` to ensure correct classification.
- **Deep-Link Connectivity**: Provide a link to the [Agent Command Hub](/manufacturer/agent) for any complex analytical queries.
