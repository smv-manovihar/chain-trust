# Customer Settings Tutorial

The Customer Settings page (`/customer/settings`) allows users to manage their personal profile, security preferences, and notification settings. It is designed to be mobile-first and follows a clean, tabbed layout.

## Page Structure

The page is divided into four main sections via a `Tabs` component:
- **General**: Personal profile information.
- **Security**: Authentication and account security.
- **Notifications**: Alert preferences.
- **Advanced**: Critical account actions (Danger Zone).

---

## 1. General (Personal Profile)
- **Purpose**: Allows users to update their name, email (read-only), phone number, and physical address.
- **Form**: Uses `react-hook-form` with `zod` validation and `shadcn/ui` form components.
- **Fields**:
    - Full Name
    - Email Address (Disabled/Read-only)
    - Phone Number
    - City
    - Street Address
    - Postal Code
    - Country
- **Save Action**: Updates the user profile via the `updateProfile` API call.

## 2. Security
- **Google Connection**: Shows the `GoogleConnection` component, allowing users to link/unlink their Google account.
- **Password Settings**: Shows the `PasswordSettings` component for changing the account password. Requires the current password for verification.
- **Privacy Controls**: A placeholder section for future features like biometric login.

## 3. Notifications (Alert Preferences)
- **Safety Recalls**: Toggle switch for critical alerts regarding recalled medicines.
- **Health Insights**: Toggle switch for monthly tracking reports.
- **Product Updates**: Toggle switch for platform news and features.

## 4. Advanced (Danger Zone)
- **Sign out of all devices**: Invalidates all active refresh tokens for the user.
- **Delete Personal Account**: 
    - Triggers a `DELETE /api/auth/me` request.
    - **Cascading Delete**: Removes the user record, all saved "My Medicines" (`CabinetItem`), and all associated `RefreshToken` records.
    - **UI**: Requires double confirmation via an `AlertDialog`.

---

## Implementation Details
- **Route**: `frontend/app/customer/settings/page.tsx`
- **Components Used**:
    - `DangerZoneSettings`: Handles account deletion and global logout.
    - `PasswordSettings`: Handles password changes.
    - `GoogleConnection`: Handles OAuth linking.
- **API Calls**:
    - `updateProfile(data)`: Saves general profile changes.
    - `deleteAccount()`: Triggered via the Danger Zone.
