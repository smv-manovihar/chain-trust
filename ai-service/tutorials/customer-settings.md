# Route: /customer/settings (Account Preferences)

The Customer Settings page is the primary point for managing the user's personal identity, security posture, and global notification preferences.

## Layout Overview (Mobile-Optimized)
- **Fluid Tab Navigation**: Uses the `useScroll` hook to ensure the navigation bar stays responsive. 
- **Tab Structure**:
  - **General**: Personal identity (Name, Address, Phone). Note: Email is read-only.
  - **Security**: Manage authentication layers, password updates, and Google OAuth linking status.
  - **Notifications**: Granular toggles for "Supply Safety Alerts," "Health Adherence Insights," and platform updates.
  - **Account Control (Danger Zone)**: High-security actions including global logout and irreversible account deletion.

## Key Management Features
### 1. Profile Synchronization
- **Identity Fields**: Supports name, physical address for local pharmacy tracking, and phone number for SMS alerts.
- **Save Action**: Updates the profile via `updateProfile` with instantaneous "Toast" feedback.

### 2. Google OAuth Integration
- **Direct Connection**: Displays a "Connect to Google" or "Unlink" button based on the `isGoogleConnected` server-side flag. This ensures account recovery parity.

### 3. Safety Alerts Configuration
- **Supply Recalls (Critical)**: When enabled, the background security agents will prioritize push notifications for any match in the user's Cabinet.

## AI Guidance & Context
- **Privacy First**: The AI should never reveal raw password data. If a user asks to change their password, the AI should guide them to the **Security** tab.
- **Account Deletion**: If a user asks to "Delete my account," the AI MUST warn them that this action is irreversible and triggers a cascading delete of their entire "My Medicines" history. Provide a direct link to the **Account Control** tab.
- **Profile Updates**: If a user provides a new phone number or address in chat, the AI can offer to call the `updateProfile` tool to sync it automatically.
