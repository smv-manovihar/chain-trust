# Route: /customer (Customer Dashboard)

The Customer Dashboard is the central command center for patient medication safety, adherence tracking, and account management.

## Layout Overview (Bento Grid)
- **Safety Profile Hero (Primary)**: A high-visibility 2-column card that summarizes the user's current security status. Displays "Review Required" if there are active recalls or "You are all caught up!" for verified supplies.
- **My Medicines Sidebar (Adherence)**: A vertically oriented list of the user's top medications (up to 5), showing quantitative inventory progress bars and a "Taken" quick-action button to record doses immediately.
- **Quick Actions (4-Card Grid)**:
  - **My Medicines**: Redirects to the full cabinet inventory view (`/customer/cabinet`).
  - **Verify Medicine**: Primary entry point for new blockchain security scans (`/verify`).
  - **Security Vault**: Access to digitized medical documents and prescriptions.
  - **Treatment Plans**: Management of dose reminders and automated scheduling.
- **Safety Alerts Feed**: A real-time notification stream for batch recalls, medicine expiries, and system notifications with color-coded severity levels.

## AI Context
The AI has access to the user's real-time adherence stats and security alerts. 
- **Query Prompt**: If the user asks "Show me my dashboard," or "Tell me about my medicines," focus on the Safety Profile status and any items in the "My Medicines" sidebar that have low inventory (red progress bars).
- **Proactive Agent**: If the user has unread "Review Required" items in the Safety Profile, the AI should prioritize alerting the user of those specific batch-ids.
