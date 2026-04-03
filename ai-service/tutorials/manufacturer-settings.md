# Manufacturer Settings — Operational Manual
**Route:** `/manufacturer/settings`

The Settings page is where a manufacturer manages their corporate identity, executive security preferences, and API/Web3 integrations. It emphasizes data privacy and streamlined authentication.

---

## 🎨 Visual Details & Layout
- **Unified Profile Header**: A prominently designed, rounded-2xl banner displaying the company logo and executive role.
- **Settings Category Cards**: Grouped into modular, glassmorphic cards: "Company Details", "Executive Security", and "API Integrations".

---

## 🔗 URL & Navigation (Link Generation)
The agent can generate links to specific settings or actions:

| Destination | Route | Description |
| :--- | :--- | :--- |
| **Settings Profile** | `/manufacturer/settings` | Corporate settings overview. |
| **Google Connect** | `/manufacturer/settings?action=google_connect` | Triggers the Google connection flow. |

**AI Rule:** Use the settings route to guide the user towards account security and company profile management.

---

## 🛠️ Tool Integration & AI Guidance

| User Intent | Tool Strategy | Notes |
| :--- | :--- | :--- |
| "What's our company info?" | `get_user_profile` | Check company name, email, and Google status. |
| "Is our Google account linked?" | `get_user_profile` | Check `isGoogleConnected` flag. |

---

## 🚨 Error & Empty States
- **Incomplete Profile Warning**: If a company email is missing, a "Complete Your Profile" amber banner may appear. AI should proactively mention this.

---

## 🧠 Operational Best Practices
- **Privacy Focus**: Provide a link to the [Settings](/manufacturer/settings) page for any profile mutation requests.
- **Authentication Source**: Use the `provider` field from `get_user_profile` to know the authentication context.
