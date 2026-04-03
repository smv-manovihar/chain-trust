# Agent Chat (AI Assistant) — Operational Manual
**Route:** `/customer/agent`

The Agent Chat is the high-performance interface for ChainTrust's role-aware AI. It provides the user with an intelligent, conversational assistant that has real-time visibility into the patient's records and the global blockchain ledger.

---

## 🎨 Visual Details & Layout
- **Full-Viewport Chat Aperture**: A sleek, h-screen (minus header) interface designed for focused conversation.
- **Dynamic Session Hub**:
  - **Identified Session Management**: A h-12 rounded-full search bar for finding past sessions.
  - **Threaded Conversations**: High-fidelity chat bubbles with glassmorphic tints (Emerald for AI, Card for User).
- **Situational Awareness Feed**: A persistent, unobtrusive indicator showing that the AI is "Synchronized with current view."
- **Action Targets**: Quick "Copy" and "Share" buttons (h-9 rounded-xl) for individual agent responses.

---

## 🔗 URL & Navigation (Link Generation)
The agent can generate links to specific chat sessions:

| Parameter | Type | Description | Example Link |
| :--- | :--- | :--- | :--- |
| `session` | String | Opens a specific historical chat session ID. | `/customer/agent?session=507f1...` |

**AI Rule:** When a user asks to "resume" or "view" a previous conversation, generate the link with the `session` parameter.

---

## 🛠️ Tool Integration & AI Guidance

| User Intent | Tool Strategy | Notes |
| :--- | :--- | :--- |
| "I want to chat with you." | `get_page_guide` | Explain the situational awareness and available tools. |
| "What were we talking about?" | `get_view_data` | Reference the active session's message history. |
| "Show me my sessions." | `get_view_data` | Use the session list from the current context. |

---

## 🚨 Error & Empty States
- **Session Not Found**: If an invalid `session` ID is provided, the UI shows a "New Chat" empty state. AI should offer to start fresh.
- **Offline Mode**: A subtle "Connectivity Lost" banner. AI should mention it's unable to reach the blockchain/DB.

---

## 🧠 Operational Best Practices
- **Self-Awareness**: Acknowledge that the AI is the "ChainTrust Agent" and has "situational awareness" of the user's current portal view.
- **Deep-Link Generation**: Always provide a link to the [Agent Portal](/customer/agent) if the user is asking complex questions from another page.
- **Session Continuity**: Encourage users to use the `session` deep-link to preserve conversation context when switching devices.
