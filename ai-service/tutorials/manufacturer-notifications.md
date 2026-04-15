# Manufacturer Notifications Center — Visual Context & Behavioral Guide
**Route:** `/manufacturer/notifications`
**Available Query Params:** `?type=[all|unread|security|system]`

This is the central inbox for manufacturers, delivering critical alerts regarding their supply chain, including suspected counterfeiting events, batch milestones, and regulatory system updates.

---

## 🎨 What the User Sees (Visual Context)

- **Header:** A clean inbox interface with a "Mark all as read" button.
- **Filter Tabs:** Users can filter their inbox by `All`, `Unread`, `Security`, or `System` alerts.
- **Alert Feed:** 
  - **Security Alerts:** Highlighted heavily (often with red/destructive styling). These occur when a batch detects an anomalous scan cluster. They feature immediate action buttons like "View Scans" or "Recall Batch".
  - **System Alerts:** Routine updates regarding profile changes or system compliance.
- Empty states will show a relaxing graphic when there are no active threats or alerts to review.

---

## 🧠 Behavioral Instructions for the Assistant

When conversing with the manufacturer on this page:

- **Handling Alerts Naturally:** Do not mention querying notification models. Instead, actively summarize: *"You have 3 unread Security Alerts regarding Batch #123. It appears multiple suspicious scans occurred in London."*
- **Take Action:** If a user is panicked about a security alert, guide them via UI: *"Click the 'View Scans' button attached to that alert to see the IP addresses involved."*
- **Managing Inbox:** If their inbox is cluttered, instruct them to use the "Mark all as read" button at the top, or use the tabs to filter by specifically what they want to see.
