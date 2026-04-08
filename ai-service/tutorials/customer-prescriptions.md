# Prescriptions (Digitized Vault) — Operational Manual
**Route:** `/customer/prescriptions`

The Prescriptions page is the secure, high-fidelity archive for a user's medical documents. It uses AI-driven text extraction to digitize paper prescriptions, making them searchable and linkable to the digital medicine cabinet.

---

## 🎨 Visual Details & Layout
- **Data Toolbar**: Features a search input and a view toggle (Grid vs. List).
- **View Modes**:
  - **Vault Grid (Default)**: Visual-first cards showing the document preview, doctor name, and digitization status.
  - **Technical List**: A dense table view showing **Doctor / Provider**, **Issued Date**, and **Linked Medicines** count.
- **Digitization Status**:
  - **Completed (Blue)**: Processing finished; content is searchable and readable via tools.
  - **Processing (Amber)**: AI extraction in progress.
  - **Failed (Red)**: Document unreadable or extraction error.
- **Linked Medications**: A specific badge on each card/row showing the count of cabinet items associated with this prescription.

---

## 🔗 URL & Navigation (Link Generation)
The agent can generate links to search results or filtered states:

| Filter | Route | Description |
| :--- | :--- | :--- |
| **Search Content** | `/customer/prescriptions?search=Dr.Smith` | Filter by doctor, medication name, or clinic. |

**AI Rule:** When a user asks "Show me my prescriptions for Paracetamol," use the `search` parameter in the link.

---

## 🛠️ Tool Integration & AI Guidance

| User Intent | Tool Strategy | Notes |
| :--- | :--- | :--- |
| "What medications are on this?" | `read_prescription` | Use Document ID to read the digitized text line-by-line. |
| "Did I upload Dr. X's note?" | `search_prescriptions` | Search across the content of all uploaded documents. |
| "List my files." | `list_prescriptions` | Returns the registry items and their status. |

---

## 🚨 Error & Empty States
- **Empty Vault**: UI shows "No prescriptions found". Guide the user to upload their first file using the **Upload New Document** button.
- **Failed Extraction**: Advise the user to re-upload with a clearer, higher-resolution photo.

---

## 🧠 Operational Best Practices
- **Content Discovery**: If a user asks a medical question about an order, always `search_prescriptions` first before checking the cabinet.
- **Vault Linkage**: Remind the user they can **Link to My Medicines** directly from the prescription record to keep their inventory accurate.
