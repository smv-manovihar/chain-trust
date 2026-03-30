# Route: /manufacturer/analytics (Analytics Dashboard)

The Analytics Dashboard is a high-density, data-focused command center designed for real-time monitoring of cryptographic verification trends and geographic product distribution.

## Layout Overview (2:1 Bento Grid)
 
- **Sticky Command Bar**: The analytics header containing date filters is sticky, ensuring accessibility as the user scrolls.
- **Scrollable Canvas**: Unlike the dashboard, the analytics page uses an expanded vertical layout to allow for higher Chart density without visual compression.
 
### Main Panel (Left 2/3)
- **Verification Velocity (Area Chart)**:
  - Visualizes consumer engagement over the selected time range (7d, 30d, 90d).
  - Used to identify peak scanning periods and overall adoption trends.
- **Regional Scan Density (Bar Chart)**:
  - Displays top geographic locations where products are being verified.
  - Helps identify market penetration and potential regional anomalies.
- **Scan Deep Dive (Navigation)**:
  - A prominent action banner that transitions to the [Detailed Scan Analysis](/manufacturer/analytics/scans) for unit-level investigation.

### Sidebar (Right 1/3)
- **Performance Summary (Executive KPIs)**:
  - **Products**: Total medicine catalogue size.
  - **Batches**: Number of production runs in distribution.
  - **Total Scans**: Cumulative lifetime verification count.
  - **Incidents**: Count of detected security anomalies or threat flags.
- **Batch Performance (Ranking)**:
  - A compact table listing the top-performing batches by scan volume.

## AI Context
This page provides the "Manufacturer Persona" AI with structured data to answer technical operational questions.
- **Trend Analysis**: When asked about growth or engagement, the AI should reference the "Verification Velocity" data.
- **Geographic Insights**: For questions like "Where are my products being scanned?", the AI should focus on the "Regional Scan Density" components.
- **Operational Health**: The "Performance Summary" sidebar is the root source for general health checks.
