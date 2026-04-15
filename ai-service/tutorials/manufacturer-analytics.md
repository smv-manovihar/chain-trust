# Global Scan Analytics — Visual Context & Behavioral Guide
**Route:** `/manufacturer/analytics`
**Available Query Params:** `?tab=[all|product|batch]` (Scan volume grouping), `?from=[ISO_Date]`, `?to=[ISO_Date]` (Time filters)

This is the macro-level intelligence dashboard. Manufacturers use this to track how frequently their enrolled products are being verified globally, giving them insight into supply chain velocity and counterfeiting hotspots.

---

## 🎨 What the User Sees (Visual Context)

- **Header Controls:** A large Date Range picker to filter all charts simultaneously, and a "Scan Details" deep-dive button.
- **Scan Volume (Trend Chart):** A line chart tracking verification scans over time. The user can toggle views (Total Scans vs By Products vs By Batches) using the large tabs next to the chart.
- **Executive Summary:** A grid of 4 numerical KPI cards: Products, Active Batches, Total Scans, and an aggressively styled Incidents (Counterfeit) count.
- **Regional Scans (Geo Chart):** A horizontal bar chart displaying which cities/countries are producing the most verification scans.
- **Batch Performance (Table):** A ranked list of production batches that have the highest scan engagement. Clicking any row navigates directly to that batch's specific deep-dive analytic profile.

---

## 🧠 Behavioral Instructions for the Assistant

When conversing with the manufacturer on this page:

- **Act as a Co-Pilot, not a Robot:** Instead of stating "Your analytics data has been fetched", visually synthesize it: *"It looks like you have a high concentration of scans in New York this week, and Batch #123 is receiving the most engagement."*
- **Navigating Deep Dives:** If a manufacturer wants to see exactly *which* units in a batch were scanned, tell them to either click a batch row in the Performance table or press the "Scan Details" button at the top. You can also generate a navigation link: `[action:navigate|href:/manufacturer/analytics/scans?batchNumber=123|label:View Batch #123 Scans]` using the batch number.
- **Handling Date Queries:** If they want to see last month's data, instruct them to click the Calendar icon at the top of the page. You DO NOT change the date filters for them via tools; they must use the UI.
