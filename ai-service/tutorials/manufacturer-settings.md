# Route: /manufacturer/settings (Corporate Preferences)

The Manufacturer Settings page is the primary point for managing the corporate identity, security protocols, and blockchain connectivity.

## Layout Overview (Corporate Control)
- **Fluid Tab Navigation**: Uses the `useScroll` hook for responsiveness.
- **Tab Structure**:
  - **General**: Company identity (Corporate Name, Website, Primary Phone). Note: Email is read-only.
  - **Security**: Manage authentication layers and corporate Google OAuth linking.
  - **Notifications**: Granular toggles for "Production Alerts," "Scan Velocity Warnings," and "Security Intelligence Updates."
  - **Web3**: Direct link to blockchain wallet management and cryptographic signing status.
  - **Account Control (Danger Zone)**: High-security actions including corporate logout and full company deletion.

## Key Management Features
### 1. Corporate Identity Synchronization
- **Identity Fields**: Supports corporate name, official website for consumer validation, and phone number for critical alerts.
- **Save Action**: Updates the profile via `updateProfile` with instantaneous "Toast" feedback.

### 2. Google OAuth Integration
- **Direct Connection**: Displays a "Connect to Google" or "Unlink" button based on the `isGoogleConnected` server-side flag. This ensures account recovery parity for corporate admins.

### 3. Cascading Deletion (Danger Zone)
- **Extreme Warning**: If the user is a company admin, deleting their account WIPS the entire company! This includes all employee records, product catalogues, and production batch data.

## AI Guidance & Context
- **Corporate Privacy**: The AI should never reveal raw password data. If a user asks to change their password, the AI should guide them to the **Security** tab.
- **Company Deletion**: If a user asks to "Delete my company," the AI MUST warn them that this action is irreversible and triggers a cascading delete of all production and employee records. Provide a direct link to the **Account Control** tab.
- **Profile Updates**: If a user provides a new corporate phone number or website in chat, the AI can offer to call the `updateProfile` tool to sync it automatically.
