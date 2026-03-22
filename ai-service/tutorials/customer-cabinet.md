# Route: /customer/cabinet (My Medicines)

The "My Medicines" page is the user's personal archive of all medications they have verified or added manually.

## Layout Overview
- **Header**: Title "My Medicines" and a welcome message.
- **Search Bar**: A rounded search input to filter medications by name or brand. **State is synced with the URL.**
- **Stats Cards**:
  1. **Total Items**: All medications.
  2. **Self-Added**: Manually entered items.
  3. **Verified Items**: Highlighting "Trusted" products.
- **Medication List**: Cards showing medicine details, batch info, and expiry.
- **Safety Watch Sidebar**: Contextual security advice based on cabinet contents.

## Key Features & User Interactions

### 1. Add Manual Medicine Dialog
Triggered by the **"+ Add Manually"** button (Ghost variant, rounded-full).
- **Form Fields**:
  - `name`: "Medicine Name" (e.g., Amoxicillin). *Required*.
  - `brand`: "Brand / Manufacturer" (e.g., GSK). *Required*.
  - `batchNumber`: "Batch Number (Optional)" - used for basic tracking.
  - `expiryDate`: "Expiry Date (Optional)" - opens a Calendar popover.
- **Validation**: Uses Zod schema; fields are marked with red stars if missing on submit.
- **Success**: Displays a "Medicine Added" sonner toast.

### 2. Search & URL Synchronization
- **Search Input**: Located at the top, icon: `Search`, placeholder: "Search your medicines...".
- **Real-time Sync**: As the user types, the URL updates with `?search=...` after a 500ms debounce. This allows the agent to see exactly what the user is looking for via `get_current_view_data`.

### 3. Safety Watch Sidebar
Located on the right (or bottom on mobile).
- **Authenticated Batch**: Shows a green `ShieldCheck` if verified products are present. Mentions tracking against global recall databases.
- **Verify Products**: Shows an amber `AlertTriangle` if only manual items exist, warning that they cannot be checked for authenticity.
- **Alert Subscription**: Confirms push notifications are active for batch changes.

## AI Guidance & Context
- **Tooling**: Use `get_current_view_data` to see the current filtered list. Use `addToCabinet` if the user asks you to record a medicine they have.
- **Tone**: Reassuring and safety-focused. If a user is searching for something that isn't there, suggest they "Verify New Medicine" to add it securely.
- **Safety**: Always highlight the difference between "Verified Authentic" (Green badge) and "Self-Added" (Outline badge).
