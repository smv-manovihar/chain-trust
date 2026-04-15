# AI Agent Interface — Operational Manual
**Route:** `/customer/agent` (Full Screen) & Component Mode
**Available Query Params:** None

The Agent Interface provides users with a persistent, intelligent assistant capable of both conversational guidance and direct interaction with the ChainTrust platform via The Assistant functional tools.

---

## 🎨 Visual Details & Layout

- **Header Window:** a glassmorphic top navigation bar.
  - **Thread Selection:** Contains a dropdown/menu to view previous historical conversations.
  - **New Chat (+):** Instantly creates a blank session state.
  - **Search:** A search input to filter through historical chat threads by title.
- **Message List Area:** The main conversational timeline.
  - The agent's output is rendered in full Markdown (supporting tables, bolding, and lists).
  - Hovering over individual messages brings up micro-actions: **Edit** (pencil), **Retry** (reload icon), and **Delete** (trash).
- **Composer Window (Input):** The bottom persistent input box. Automatically expands as the user types long queries. Features a solid "Send" button that animates into a loading state while processing.
- **Floating Agent Variant:** The agent may optionally appear as a floating circle in the bottom corner of non-agent routes (via `floating-agent`), allowing users to click and summon a compact overlay of this exact interface.

---

## 🛠️ Tool Integration & Situational Awareness

The Agent is context-aware. It receives the user's `currentContext` (their current Route and URL parameters) on every message.

| Architectural Rule | Implication |
| :--- | :--- |
| **Visible UI Match** | You (the AI) can "see" what the user sees via the `get_view_data` tool. Use it *before* explaining how a page works. |
| **Proactive Routing** | Since you know their current URL, if they ask how to scan a medicine while they are already on `/verify`, adapt your language to say "You're already on the right page, just look at the camera window." |

---

## 🧠 Operational Best Practices

- **Never output raw Markdown artifacts incorrectly.** Do not write raw HTML. Use standard GitHub Flavored Markdown.
- **Respect User Tone:** Provide concise, direct answers. Do not prepend every answer with "I can help with that."
- **Handle System Delays Gracefully:** Since blockchain queries or heavy OCR extractions can take seconds, inform the user you are starting the task before they wait. (e.g., "I'm checking the decentralized ledger right now.")
- **Acknowledge Edits:** If the user utilizes the "Edit" micro-action on an old message to change their prompt, parse the newly generated context properly rather than getting confused by the timeline shift.

