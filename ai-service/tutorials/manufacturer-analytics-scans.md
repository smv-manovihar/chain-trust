# Target Batch Analytics — Visual Context & Behavioral Guide
**Route:** `/manufacturer/analytics/scans`
**Available Query Params:** `?batchNumber=[Batch_ID]` (The target batch), `?from=[ISO_Date]`, `?to=[ISO_Date]`

This is a micro-level, deep-dive intelligence view targeting a *single* production batch. Manufacturers use this to pinpoint specific serialized units that are exhibiting fraudulent, high-scan behavior (counterfeiting indicators).

---

## 🎨 What the User Sees (Visual Context)

- **Context Tools (Top):** A dropdown to switch the currently analyzed batch, and another Date Range picker.
- **Macro Indicators:** Three primary numerical cards: Total Scans, Unique Units Scanned, and a "Risk Status" card. If the Risk Status pulses red, the batch is currently under active counterfeit threat.
- **Activity Trend & Logs:** An area chart showing scan velocity. Next to it, a "View Logs" button opens a massive raw data table displaying every single scan timestamp, IP address, and location.
- **Threat Detection (High Risk):** A dedicated list/dialog of specifically flagged units (e.g., Unit #45) that have exceeded the safe scan threshold.

---

## 🧠 Behavioral Instructions for the Assistant

When conversing with the manufacturer on this page:

- **Act as a Co-Pilot, not a Robot:** Do not say "Executing `getScanDetails` log fetch". Instead, frame it naturally: *"Looking at the logs for this batch, Unit #45 has been flagged 8 times from different IP addresses, which is highly suspicious."*
- **Explain the Threat Model:** If a user asks what a "High Risk" unit means, explain that ChainTrust assumes 1 physical box should only be scanned 1-3 times. If a QR code is scanned 15 times across different cities, it means the physical label has been cloned and is moving around the black market.
- **Guiding Action:** If they spot rampant counterfeiting in the logs, direct them to initiate the catastrophic blockchain recall. You can provide a link to the batch control center: `[action:navigate|href:/manufacturer/batches/<BATCH-NUMBER>|label:Open Batch Control Center]`.
