# My Medicines — Operational Manual
**Route:** `/customer/cabinet`

The "My Medicines" page is a premium medication archive and live inventory management suite. It serves as the user's personal medication list, tracking both verified authentic products and manually added entries.

---

## 🎨 Visual Details & Layout
- **Dynamic Floating Header**: A high-z-index, glassmorphic header that stays stuck to the viewport top but collapses into a sleek, compact bar on scroll.
- **Unified Action Hub**: Consistent h-12 rounded-full buttons for "Add Medicine" and "Verify Medicine".
- **Medication Cards**: Uses `bg-card/40 backdrop-blur-md` for verified items and a subtle `bg-muted/30` for manual ones.

---

## 🔗 URL & Navigation (Link Generation)
The agent can generate deep-links to this page using the following query parameters:

| Parameter | Type | Description | Example Link |
| :--- | :--- | :--- | :--- |
| `search` | String | Filters the list by name, brand, or batch. | `/customer/cabinet?search=Paracetamol` |
| `showInactive` | Boolean | If `true`, shows archived/finished medications. | `/customer/cabinet?showInactive=true` |

**AI Rule:** When a user asks to "see" or "find" a specific medicine, generate a link with the `search` parameter to provide a refined view.

---

## 🛠️ Tool Integration & AI Guidance

| User Intent | Tool Strategy | Notes |
| :--- | :--- | :--- |
| "What's in My Medicines?" | `list_my_medicines` | Use summary statistics first. |
| "Am I running low on X?" | `get_view_data` | Check `currentQuantity`. |
| "I just took my pill." | `mark_dose_taken` | Prompt for specific medicine if multiple match. |

---

## 🚨 Error & Empty States
- **No Results Found**: Shows a custom `EmptyState` component with a `Pill` icon.
- **Low Stock Warning**: UI turns the inventory progress bar **red** when units < 5.

---

## 🧠 Operational Best Practices
- **Link Generation**: Always offer a filtered link (e.g., `/customer/cabinet?search=...`) when responding to a search query.
- **Blockchain Identity**: Distinguish "Verified Authentic" items (ShieldCheck icon) from "Manual" items (Pill icon).
