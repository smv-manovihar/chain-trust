# My Prescriptions — Operational Manual
**Route:** `/customer/prescriptions`
**Available Query Params:** `?status=[all|active|completed]`

This page functions as a secure digital vault for all of the user's digitized medical documents and prescriptions. Documents uploaded here are parsed via OCR on the backend, allowing their textual contents to be searchable and AI-readable.

---

## 🎨 Visual Details & Layout

- **Header Controls:** 
  - **Upload New Document:** A primary button (hidden on mobile, replaced by a bottom sticky CTA) triggering the `PrescriptionUploadDialog`.
- **Data Toolbar:** 
  - **Search:** Allows searching the list specifically by the Prescription Label or the Doctor/Provider name.
  - **Grid/List View Toggle:** Standard view control.
- **Data Presentation:** 
  - Documents are shown either in intuitive Grid Cards, or a detailed Table List (on Desktop).
  - Listed metadata includes: **Prescription Label**, **Doctor / Provider**, **Issued Date**, and **Medicines** count (linking to the `LinkedMedications` dialog).
- **Infinite Scrolling:** The interface utilizes an infinite scroll (loading an additional 12 cards dynamically) rather than explicit pagination buttons.
- **Interactive Actions:**
  - **View (Eye Icon):** Triggers the `DocumentViewerDialog`, presenting a full-screen, zoomable preview of the raw image or PDF.
  - **Delete (Trash Icon):** Prompts a confirmation dialog to permanently delete the document.

---

## 🛠️ Behavioral Instructions for the Assistant

The AI acts as a sophisticated query engine for these documents. Since OCR runs strictly in the backend during upload, the agent can actively search document *contents* even though the frontend search only hits labels and doctors.

| User Intent | Tool Strategy | Notes |
| :--- | :--- | :--- |
| "What prescriptions do I have?" | `list_prescriptions` | Provides a brief overview map without fetching heavy document text. |
| "Read the one from Dr. Smith" | `read_prescription` | Uses the registry index from the `list_prescriptions` response to fetch the specific line-by-line OCR text. |
| "Which prescription mentions ibuprofen?" | `search_prescriptions` | Executes a regex text-search directly across the raw OCR database. |

---

## 🧠 Operational Best Practices

- **Two-Step Reading Strategy:** Do NOT attempt to use `read_prescription` without first calling `list_prescriptions` to obtain the correct integer `registry_index`.
- **Privacy Assurance:** If users upload sensitive documents, the agent should reassure them that these are stored securely in Private MinIO/S3 buckets and are inaccessible publicly.
- **Search Superiority:** The agent's `search_prescriptions` tool is more powerful than the UI's data toolbar. If a user says "I can't find the prescription for my back pain", the agent should actively use the search tool to scan the actual OCR `content` layer.

