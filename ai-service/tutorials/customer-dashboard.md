# Route: /customer (Customer Dashboard)

The Customer Dashboard provides a high-level overview of the user's medication safety and adherence.

## Layout Overview
- **Next Dose Reminder**: A prominent card showing the next scheduled medication time.
- **Safety Report**: Displays a "Trust Certified" badge and counts for "Items to Refill", "Critical Alerts", and "Recent Scans".
- **Quick Actions**:
  - **Check Medicine**: Redirects to `/verify`.
  - **Full Cabinet**: Redirects to `/customer/cabinet`.
- **Recent Activity**: A list of the most recent scans and their status (Authentic/Verified).

## AI Context
When on this page, the AI can see the user's overview stats. If the user asks "How am I doing?", the AI should refer to the Safety Report and Recent Activity.
