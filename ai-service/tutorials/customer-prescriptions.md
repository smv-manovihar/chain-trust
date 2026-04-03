# Prescriptions (Digitized Registry) — Operational Manual
**Route:** `/customer/prescriptions`

The Prescriptions page is the high-fidelity document archive for a user's medical orders. It utilizes advanced digitization to index and search physical paper prescriptions, linking them to digital medication records.

---

## 🎨 Visual Details & Layout
- **Search Nexus**: A prominently designed, rounded-full search bar for finding prescriptions by doctor name, medication, or date.
- **Document Hub (Cards / Registry)**:
  - **Identified Doctor Context**: Each record shows the "Doctor's Name", "Clinic/Hospital", and "Date of Issue".
  - **Digitized Status Badge**:
    - **Digitized (Blue Dot)**: Processing complete and searchable.
    - **Pending (Amber Dot)**: Extraction in progress.
- **Record Actions**: h-10 rounded-xl buttons for "View Scan", "Read Details", and "Link to My Medicines".

---

## 🔗 URL & Navigation (Link Generation)
The agent can generate links to specific documents or search results:

| Parameter | Type | Description | Example Link |
| :--- | :--- | :--- | :--- |
| `search` | String | Filters the registry by digitized text or metadata. | `/customer/prescriptions?search=Paracetamol` |
| `id` | String | Opens a specific prescription scan for viewing. | `/customer/prescriptions?id=PD-101` |

**AI Rule:** When a user asks for a "prescription" or asks about a "Doctor's order," generate the link with the `search` or `id` parameter.

---

## 🛠️ Tool Integration & AI Guidance

| User Intent | Tool Strategy | Notes |
| :--- | :--- | :--- |
| "What prescriptions do I have?" | `list_prescriptions` | Provide a summary of the digitized records. |
| "What did Dr. X order?" | `search_prescriptions(query="Dr. X")` | Filter by regex for doctor names. |
| "Read the text of my latest one." | `read_prescription` | Use Document ID for line-level digitized access. |

---

## 🚨 Error & Empty States
- **No Document Record Found**: Shows an "Empty Pharmacy" illustration. AI should suggest uploading a photo of their paper prescription.
- **Digitization Error**: Red alert on the document card. Suggest checking if the scan is clear.

---

## 🧠 Operational Best Practices
- **Registry Awareness**: Always mention that prescriptions are "digitized" and searchable.
- **Deep-Link Linkage**: Offer a link to the [Prescription Registry](/customer/prescriptions) for any document-related queries.
- **My Medicines Correlation**: If a prescription is found, ask if the user has added that medication to their [My Medicines](/customer/cabinet) list.
