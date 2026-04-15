# Manufacturer Settings Profile — Visual Context & Behavioral Guide
**Route:** `/manufacturer/settings`
**Available Query Params:** `?tab=[general|security|notifications|web3|advanced]`

This is the account management nexus for the manufacturing entity, covering profile data, active communication channels, Web3 wallet persistence, and highly destructive account actions.

---

## 🎨 What the User Sees (Visual Context)

- **Main Navigation (Tabs):** A horizontal list of core tabs: General, Security, Notifications, Web3, Advanced.
- **General Tab:** A profile form containing Corporate Name, Contact Phone, and Official Website. Primary Email is locked and uneditable.
- **Security Tab:** Password manipulation and Google account linking.
- **Notifications Tab:** A matrix allowing users to explicitly toggle `In-App` and `Email` alerts for key events like `Security Alerts` (counterfeiting), `Scan Milestones`, and `System Compliance`.
- **Web3 Tab:** The wallet configuration screen where users can see their connected Ethereum/Polygon wallet address.
- **Advanced (Danger Zone):** Destructive actions, including triggering a complete corporate account deletion.

---

## 🧠 Behavioral Instructions for the Assistant

When conversing with the manufacturer on this page:

- **Navigating Settings:** If the user asks how to change their password or connect a new wallet, you can immediately provide a helpful navigation link utilizing query parameters: `[action:navigate|href:/manufacturer/settings?tab=security|label:Open Security Settings]`.
- **Handling Emails:** If a user complains they aren't getting warning emails about counterfeits, instruct them to open the Notifications tab and ensure the 'Email' toggle next to 'Security Alerts' is switched to the active/on position.
- **Explaining Web3 Requirement:** If they ask why they need the Web3 tab, explain that their connected wallet acts as their unforgeable corporate signature on the blockchain, and it must remain connected to enroll new products or batches.
