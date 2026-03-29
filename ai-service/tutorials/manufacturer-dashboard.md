# Route: /manufacturer (Manufacturer Dashboard)

The Manufacturer Dashboard is the automated command center for real-time production tracking, security monitoring, and geographic chain-of-custody analytics.

## Layout Overview (Bento Grid)
- **KPI StatCards (4-Card Grid)**:
  - **Products Enrolled**: Size of the medicine catalogue registered on the blockchain.
  - **Active Batches**: Count of production runs currently in distribution.
  - **Scans Today**: Real-time ticker of global verification attempts with a 24-hour percentage tendency indicator.
  - **Unread Alerts**: Count of security items requiring immediate investigation.
- **Quick Actions (4-Card Grid)**:
  - **Manage Products**: View and edit your entire product catalog (`/manufacturer/products`).
  - **Enroll Batch**: The primary entry point for registering new production runs on the blockchain (`/manufacturer/batches/new`).
  - **View Analytics**: Deep dive into global scan locations and consumer trends (`/manufacturer/analytics`).
  - **Security Reports**: Investigative analytics for suspicious activity and security flags.
- **Recent Activity Feed**: A list of the latest system events, scan attempts, and automated security monitoring logs.

## AI Context
This page is the primary source for the "Manufacturer Persona" AI when summarizing operational health.
- **Operational Query**: Phrases like "How is my production today?" or "Show me my stats" should trigger an analysis of the KPI StatCards and the tendency in "Scans Today".
- **Security Check**: If "Unread Alerts" > 0, the AI should prioritize informing the manufacturer of the most recent item in the "Recent Activity" feed.
