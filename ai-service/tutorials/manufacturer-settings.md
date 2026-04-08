# Manufacturer Settings — Operational Manual
**Route:** `/manufacturer/settings`

The Settings page is the corporate command hub for managing company identity, executive security preferences, and account integrations. It emphasizes data privacy and institutional verification.

---

## 🎨 Visual Details & Layout
- **Tabbed Corporate Matrix**:
  - **Company**: Corporate identity fields (Company Name, Domain, Address).
  - **Security**: Executive authentication controls and password management.
  - **Notifications**: Granular toggles for **Production Alerts**, **Security Risks**, and **Registry Updates**.
  - **Advanced**: Danger zone actions (Account deletion) and corporate data exports.
- **Glassmorphic Bento Cards**: High-fidelity modular layouts grouping related corporate settings.

---

## 🔗 URL & Navigation (Link Generation)
The agent can generate links to specific corporate settings:

| Destination | Route | Description |
| :--- | :--- | :--- |
| **Corporate Profile** | `/manufacturer/settings` | Main company overview. |
| **Notification Center** | `/manufacturer/settings?tab=notifications` | Opens the notification matrix for production alerts. |
| **Security Hub** | `/manufacturer/settings?tab=security` | Opens executive authentication and security controls. |

---

## 🛠️ Tool Integration & AI Guidance

| User Intent | Tool Strategy | Notes |
| :--- | :--- | :--- |
| "What's our company profile?" | `get_user_profile` | Retrieves company name, verified domain, and executive contact. |
| "Is our account admin-approved?" | `get_user_profile` | Check the `isApprovedByAdmin` flag for manufacturer status. |

---

## 🚨 Error & Empty States
- **Approval Pending**: If the account is not yet approved, a "Verification Pending" banner appears. AI should explain that "Your manufacturer credentials are being reviewed by the ChainTrust safety board."

---

## 🧠 Operational Best Practices
- **Corporate Privacy**: Always link to the [Settings](/manufacturer/settings) page rather than asking for corporate details in chat.
- **Admin Liaison**: If a user asks about approval status, guide them to the **Company** tab to verify their submitted documents.
- **Security Guidance**: If an executive is using a shared email, suggest connecting via **Google Auth** for improved security logs.
