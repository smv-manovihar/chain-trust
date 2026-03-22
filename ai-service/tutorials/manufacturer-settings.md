# Manufacturer Settings Tutorial

The Manufacturer Settings page (`/manufacturer/settings`) allows corporate users to manage their company identity, security protocols, and blockchain connectivity. It is streamlined for corporate administration.

## Page Structure

The page is divided into five main sections via a `Tabs` component:
- **General**: Company profile and corporate identity.
- **Security**: Authentication and security keys.
- **Notifications**: Corporate alert preferences.
- **Web3**: Blockchain wallet management.
- **Advanced**: Critical account and company actions (Danger Zone).

---

## 1. General (Company Profile)
- **Purpose**: Allows manufacturers to update their corporate name, phone number, and official website.
- **Fields**:
    - Corporate Name (defaults to the registered company name)
    - Primary Email (Read-only)
    - Contact Phone
    - Official Website
- **Save Action**: Updates the user's profile and company details via the `updateProfile` API call.

## 2. Security
- **Google Connection**: Manages the link between the corporate identity and a Google account.
- **Password Settings**: Handles password updates for the manufacturer's account.
- **Two-Factor Authentication**: A placeholder for upcoming hardware key and MFA features.

## 3. Notifications (Corporate Alerts)
- **Email Summaries**: Daily breakdown of production batches and scan activity.
- **Inventory Warnings**: Instant alerts when unit counts drop below a threshold (e.g., 10%).
- **Security Alerts**: Notifications for unusual scan velocities or geographic jumps (anti-counterfeiting).

## 4. Web3 (Wallet Settings)
- **Purpose**: Manages the cryptographic identity of the manufacturer on the blockchain.
- **Component**: `WalletSettings`.
- **Functionality**: Allows the manufacturer to connect a digital wallet (e.g., MetaMask) to sign batch enrollment transactions.

## 5. Advanced (Danger Zone)
- **Sign out of all devices**: Log out of all active corporate sessions.
- **Delete Manufacturer Account**: 
    - Triggers a `DELETE /api/auth/me` request.
    - **CRITICAL Cascading Delete (If Admin)**: If the user is a company admin, deleting their account WIPS the entire company! This includes:
        - The `Company` record itself.
        - ALL associated `User` records (employees).
        - ALL `Product` and `Batch` data created by any user in the company.
        - ALL `CabinetItems` and `RefreshTokens` for all users in the company.
    - **UI**: Requires double confirmation via an `AlertDialog` with a clear warning about data loss.

---

## Implementation Details
- **Route**: `frontend/app/manufacturer/settings/page.tsx`
- **Components Used**:
    - `DangerZoneSettings`: Handles cascading company/account deletion.
    - `WalletSettings`: Handles blockchain connectivity.
    - `GoogleConnection`, `PasswordSettings`.
- **API Calls**:
    - `updateProfile(data)`: Saves company information.
    - `deleteAccount()`: Triggered via the Danger Zone.
