# Tutorial: Scan Analytics (Deep Dive)

This guide provides the AI service with situational awareness of the Scan Analytics page, which allows manufacturers to perform granular data analysis on specific production runs.

## Page Endpoint
`/manufacturer/analytics/scans`

## Mandatory Search Parameters
The agent should always include these parameters when generating links to this page for a specific context:

- `batchNumber`: The production run ID to analyze (e.g., `BATCH-102`).
- `from`: ISO 8601 start date (e.g., `2026-01-01T00:00:00.000Z`).
- `to`: ISO 8601 end date (e.g., `2026-03-31T23:59:59.999Z`).

## Visual Structure & Capabilities

### 1. KPI Stats Row
Three primary metrics are displayed at the top:
- **Total scans**: Aggregate volume for the selected batch and period.
- **Unique units**: Count of distinct product units that have been scanned.
- **Risk status**: A real-time binary indicator (Green: No threats, Red: Threats detected) based on per-unit scan thresholds.

### 2. Activity Trend (Chart)
An area chart visualizing scan volume over the selected time range. 
- Use this to identify peak engagement periods or suspicious concentrated activity.
- The "View logs" button opens the full activity log.

### 3. Geographic Distribution
A card showing the top 5 locations (City, Country) where scans originated.
- "View all" opens a detailed breakdown of all detected locations.

### 4. Risk Analysis
Specifically highlights units with suspicious activity (multiple rapid scans from multiple IPs).
- "View reports" opens a list of flagged units with IP and location metadata.

### 5. Detailed Scan Log
A full table of every scan event including:
- Timestamp
- Unit index
- Location
- Risk flag
- IP address

## Agent Guidance
When a manufacturer asks about a specific batch's performance or potential counterfeiting:
1. Check the data via `get_view_data`.
2. If anomaly detected, generate a link to this page with the correct `batchNumber` and a relevant `from`/`to` range that encompasses the anomaly.
3. Advise the user to check the "High-risk units" reports.
