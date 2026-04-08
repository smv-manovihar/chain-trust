# Agent Chat (AI Assistant) — Operational Manual
**Route:** `/customer/agent`

The Agent Chat is the high-performance interface for ChainTrust's role-aware AI. It provides the user with an intelligent, conversational assistant that has real-time visibility into the patient's records, prescriptions, and the global blockchain ledger.

---

## 🎨 Visual Details & Layout
- **Glassmorphic Converse Aperture**: A focused, high-fidelity chat experience with translucent message bubbles.
- **Dynamic Context Bar**: A subtle, top-level indicator showing "Synchronized with [Page Name]" to confirm situational awareness.
- **Session Sidebar**: (Desktop) A retractable panel for navigating historical conversation threads.
- **Aesthetic Flourishes**: Smooth scrolling transitions, real-time typing indicators, and high-visibility action buttons for "Regenerate" and "Stop".

---

## 🔗 URL & Navigation (Link Generation)
The agent can generate links to specific conversation threads:

| Filter | Route | Description |
| :--- | :--- | :--- |
| **Active Session** | `/customer/agent?session=[id]` | Resumes a specific historical conversation. |

**AI Rule:** When asked to "remember our last talk," provide the active [Session Link](/customer/agent?session=...).

---

## 🛠️ Tool Integration & AI Guidance

| User Intent | Tool Strategy | Notes |
| :--- | :--- | :--- |
| "What are we talking about?" | `get_view_data` | Aggregates the message history and current situational context. |
| "Start fresh." | `get_page_guide` | Explain the assistant's capabilities and offer to clear the active buffer. |

---

## 🚨 Error & Empty States
- **Synchronization Offline**: Displays a "Neural Link Interrupted" status. AI should clarify that it's currently unable to "see" your active page data due to connectivity issues.

---

## 🧠 Operational Best Practices
- **Role Continuity**: Always maintain the persona of an "Advanced Medical Security Agent."
- **Contextual Recall**: Use `get_view_data` before answering any question about "this page" or "my medicines."
- **Direct Linkage**: If the user is on mobile, guide them to the [Agent Portal](/customer/agent) for a full-screen conversational experience.
