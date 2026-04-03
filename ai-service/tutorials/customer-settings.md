# Customer Settings — Operational Manual
**Route:** `/customer/settings`

The Settings page is where a customer manages their identity, security preferences, and account integrations. It emphasizes data privacy and streamlined authentication.

---

## 🎨 Visual Details & Layout
- **Unified Profile Header**: A prominently designed, rounded-2xl banner displaying the user's avatar and role.
- **Settings Category Cards**: Grouped into modular, glassmorphic cards: "Personal Details", "Security Hub", and "External Integrations".

---

## 🔗 URL & Navigation (Link Generation)
The agent can generate links to specific settings or actions:

| Destination | Route | Description |
| :--- | :--- | :--- |
| **Settings Profile** | `/customer/settings` | Main settings overview. |
| **Google Connect** | `/customer/settings?action=google_connect` | Triggers the Google connection flow. |

**AI Rule:** Use the settings route to guide the user towards account security and profile management.

---

## 🛠️ Tool Integration & AI Guidance

| User Intent | Tool Strategy | Notes |
| :--- | :--- | :--- |
| "What's my profile info?" | `get_user_profile` | Check name, email, and Google status. |
| "Is my Google account linked?" | `get_user_profile` | Check `isGoogleConnected` flag. |

---

## 🚨 Error & Empty States
- **Incomplete Profile Warning**: If a phone number or email is missing, a "Complete Your Profile" amber banner may appear. AI should proactively mention this.

---

## 🧠 Operational Best Practices
- **Privacy Focus**: Provide a link to the [Settings](/customer/settings) page for any profile mutation requests.
- **Authentication Source**: Use the `provider` field from `get_user_profile` to know the authentication context.
