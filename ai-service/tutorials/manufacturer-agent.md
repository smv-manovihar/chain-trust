# Agent Command Center (AI Executive) — Operational Manual
**Route:** `/manufacturer/agent`

The Agent Command Center is the high-performance AI interface for manufacturers. It provides the executive with an intelligent, conversational assistant that has real-time visibility into the company's full production catalog and live scan analytics.

---

## 🎨 Visual Details & Layout
- **Full-Viewport Command Hub**: A sleek, h-screen (minus header) interface designed for focused strategic conversation.
- **Dynamic Session Management**:
  - **Identified Session Hub**: A h-12 rounded-full search bar for finding past sessions.
  - **Threaded Conversations**: High-fidelity chat bubbles with glassmorphic tints (Blue for AI, Card for Executive).
- **Situational Awareness Feed**: A persistent, unobtrusive indicator showing that the AI is "Synchronized with current production view."
- **Action Targets**: Quick "Copy Analysis" and "Share Report" buttons (h-9 rounded-xl) for individual agent responses.

---

## 🔗 URL & Navigation (Link Generation)
The agent can generate links to specific chat sessions:

| Parameter | Type | Description | Example Link |
| :--- | :--- | :--- | :--- |
| `session` | String | Opens a specific historical chat session ID. | `/manufacturer/agent?session=507f1...` |

**AI Rule:** When an executive asks to "resume" or "view" a previous conversation, generate the link with the `session` parameter.

---

## 🛠️ Tool Integration & AI Guidance

| User Intent | Tool Strategy | Notes |
| :--- | :--- | :--- |
| "I want to chat with you." | `get_page_guide` | Explain the situational awareness and available tools. |
| "Show me my sessions." | `get_view_data` | Use the session list from the current context. |
| "Run a product scan analysis." | `get_scan_geography` | Contrast with the active session's message history. |

---

## 🚨 Error & Empty States
- **Session Not Found**: If an invalid `session` ID is provided, the UI shows a "New Strategy" empty state. AI should offer to start fresh.

---

## 🧠 Operational Best Practices
- **Executive Self-Awareness**: Acknowledge that the AI is the "ChainTrust Executive Agent" and has "situational awareness" of the user's current manufacturer portal view.
- **Analytical Depth**: Use analytical tools (`get_scan_geography`, `get_threat_intelligence`) to provide deep strategic insights during conversation.
- **Deep-Link Generation**: Always provide a link to the [Agent Portal](/manufacturer/agent) if the user is asking complex questions from another page.
