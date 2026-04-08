# Customer Settings — Operational Manual
**Route:** `/customer/settings`

The Settings page is the central hub for account identity, security configurations, and notification preferences. It is organized into a modular tabbed interface for precise management.

---

## 🎨 Visual Details & Layout
- **Tabbed Navigation**:
  - **General**: Personal profile details (Name, Phone, Address).
  - **Security**: Authentication source (Email vs. Google) and password rotations.
  - **Notifications**: Granular toggle matrix for **Safety Recalls**, **Expiry Alerts**, and **Dose Reminders**.
  - **Advanced**: Account closure and data export options.
- **Glassmorphic Cards**: Each section is wrapped in high-fidelity cards with subtle borders and clear section headers.

---

## 🔗 URL & Navigation (Link Generation)
The agent can generate links to specific tabs:

| Destination | Route | Description |
| :--- | :--- | :--- |
| **Profile Settings** | `/customer/settings` | Main profile overview. |
| **Notification Prefs** | `/customer/settings?tab=notifications` | Opens the notification matrix directly. |
| **Account Security** | `/customer/settings?tab=security` | Opens authentication and security controls. |

---

## 🛠️ Tool Integration & AI Guidance

| User Intent | Tool Strategy | Notes |
| :--- | :--- | :--- |
| "Check my contact info." | `get_user_profile` | Retrieves current name, email, and location. |
| "Am I authenticated with Google?" | `get_user_profile` | Check the `auth_label` and `isGoogleConnected` flag. |

---

## 🚨 Error & Empty States
- **Incomplete Profile**: If critical fields are missing, an amber warning appears. AI should recommend completing the profile for "Enhanced Account Security".
- **External Auth Constraints**: If using Google Auth, password change options are disabled. AI should explain this context clearly.

---

## 🧠 Operational Best Practices
- **Privacy-First**: Never state the user's password or sensitive security keys.
- **Direct Guidance**: If a user is missing alerts, guide them specifically to the **Notifications** tab using [this link](/customer/settings?tab=notifications).
- **Proactive Security**: If a user hasn't connected Google, suggest it for "One-tap secure access."
