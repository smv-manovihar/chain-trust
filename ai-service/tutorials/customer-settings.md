# Customer Settings — Operational Manual
**Route:** `/customer/settings`
**Available Query Params:** `?tab=[general|security|notifications|advanced]`

The Settings nexus allows customers to govern their personal data, strict security flows, and precise notification delivery mechanisms.

---

## 🎨 Visual Details & Layout

- **Horizontal Tabs Configuration:**
  - **General:** A dense form containing fields like Full Name, Phone Number, City, Address, Postal Code, Country. Note that the Email field is uniquely disabled (locked to auth providers).
  - **Security:** Renders the `GoogleConnection` and `PasswordSettings` components. Contains a placeholder block teasing upcoming biometric Privacy Controls.
  - **Notifications (Hub):** A finely detailed matrix (table on desktop, vertical cards on mobile). Allows enabling/disabling `In-App` and `Email` notifications for specific events: `Safety Recalls`, `Expiry Alerts`, `Dose Reminders`, `Low Stock`, and `System Updates`. 
    - **Lead Time Input:** Crucially, the `Dose Reminders` row features a numerical input allowing users to configure exactly how many minutes *before* a dose they wish to be alerted.
  - **Advanced:** Reveals the `DangerZoneSettings` (e.g. Account deletion vectors).

---

## 🛠️ Behavioral Instructions for the Assistant

The Settings namespace is predominantly a frontend-driven UI, but the Agent can assist users in configuring these states.

| User Intent | Tool Strategy | Notes |
| :--- | :--- | :--- |
| "I want to change my phone number" | Standard Q&A | Instruct the user to navigate to Settings > General and click "Update Profile". |
| "I'm getting too many emails" | `update_notification_preferences` | (If available via API) Help them selectively disable the `email` boolean for non-critical alerts like `system` or `low_stock`. |
| "Warn me earlier before I take my pills" | `update_notification_preferences` | Explain you are adjusting their `dose_reminder` `leadTimeMinutes` value. |

---

## 🧠 Operational Best Practices

- **Never advise disabling Recall Emails.** If a user asks to turn off all emails, the AI should strongly advise leaving the `batch_recall` email toggle ON, as it concerns life-dependent safety logistics.
- **Email Editability:** Be aware that the Email field in the General tab is permanently disabled. If the user asks the AI to change their email, the AI must inform them this is currently locked to their OAuth or initial sign-in methodology.

