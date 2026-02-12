"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TrendingUp, BarChart3, PieChart, Activity } from "lucide-react";

export default function AnalyticsPage() {
  return (
    <>
      {/* Header */}
      <div className="border-b border-border bg-card sticky top-0 z-10 -mx-4 md:-mx-8 px-4 md:px-8 py-4 mb-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Analytics</h1>
            <p className="text-sm text-muted-foreground">
              Monitor production metrics and supply chain performance
            </p>
          </div>
          <Button variant="outline">Export Report</Button>
        </div>
      </div>

      <div className="space-y-6">
        {/* Key Metrics */}
        <div className="grid md:grid-cols-4 gap-4">
          {[
            {
              label: "Total Products Registered",
              value: "12,847",
              change: "+5.2%",
              icon: BarChart3,
            },
            {
              label: "Active Supply Chain Nodes",
              value: "3,420",
              change: "+12.1%",
              icon: Activity,
            },
            {
              label: "Verification Rate",
              value: "99.8%",
              change: "+0.3%",
              icon: TrendingUp,
            },
            {
              label: "Average Dispatch Time",
              value: "2.3 hours",
              change: "-0.5h",
              icon: PieChart,
            },
          ].map((metric, i) => {
            const Icon = metric.icon;
            return (
              <Card key={i} className="p-4 border border-border">
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground">
                      {metric.label}
                    </p>
                    <p className="text-2xl font-bold text-foreground">
                      {metric.value}
                    </p>
                    <p className="text-xs text-accent">{metric.change}</p>
                  </div>
                  <Icon className="h-5 w-5 text-primary opacity-60" />
                </div>
              </Card>
            );
          })}
        </div>

        {/* Charts Section */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Product Distribution Chart */}
          <Card className="p-6 border border-border">
            <h2 className="text-lg font-semibold text-foreground mb-4">
              Product Distribution by Category
            </h2>
            <div className="space-y-4">
              {[
                { category: "Antibiotic Tablets", count: 4200, percent: 32 },
                { category: "Pain Relievers", count: 3100, percent: 24 },
                { category: "Antiviral Capsules", count: 2800, percent: 22 },
                { category: "Vitamin Supplements", count: 2747, percent: 22 },
              ].map((item, i) => (
                <div key={i} className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-foreground font-medium">
                      {item.category}
                    </span>
                    <span className="text-muted-foreground">{item.count}</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary"
                      style={{ width: `${item.percent}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Verification Trends */}
          <Card className="p-6 border border-border">
            <h2 className="text-lg font-semibold text-foreground mb-4">
              Verification Activity (Last 30 Days)
            </h2>
            <div className="space-y-4">
              <div className="flex items-end gap-1 h-32">
                {[
                  65, 78, 82, 91, 88, 95, 92, 78, 85, 90, 88, 92, 95, 98, 96,
                ].map((height, i) => (
                  <div
                    key={i}
                    className="flex-1 bg-accent rounded-t opacity-70 hover:opacity-100 transition-opacity"
                    style={{ height: `${(height / 98) * 128}px` }}
                  />
                ))}
              </div>
              <p className="text-xs text-muted-foreground text-center">
                Daily verification scans (past 15 days)
              </p>
            </div>
          </Card>
        </div>

        {/* Supply Chain Status */}
        <Card className="p-6 border border-border">
          <h2 className="text-lg font-semibold text-foreground mb-4">
            Supply Chain Node Performance
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4 font-medium text-foreground">
                    Node Location
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-foreground">
                    Status
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-foreground">
                    Throughput
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-foreground">
                    Avg Verification Time
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-foreground">
                    Uptime
                  </th>
                </tr>
              </thead>
              <tbody>
                {[
                  {
                    location: "North America Hub",
                    status: "Active",
                    throughput: "2.4K/day",
                    time: "1.2s",
                    uptime: "99.9%",
                  },
                  {
                    location: "Europe Distribution",
                    status: "Active",
                    throughput: "1.8K/day",
                    time: "1.5s",
                    uptime: "99.8%",
                  },
                  {
                    location: "Asia Pacific Center",
                    status: "Active",
                    throughput: "2.1K/day",
                    time: "1.3s",
                    uptime: "99.7%",
                  },
                  {
                    location: "Latin America Node",
                    status: "Active",
                    throughput: "980/day",
                    time: "1.8s",
                    uptime: "99.5%",
                  },
                ].map((node, i) => (
                  <tr
                    key={i}
                    className="border-b border-border hover:bg-muted/30 transition-colors"
                  >
                    <td className="py-3 px-4 text-foreground">
                      {node.location}
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-accent" />
                        <span className="text-foreground">{node.status}</span>
                      </span>
                    </td>
                    <td className="py-3 px-4 text-muted-foreground">
                      {node.throughput}
                    </td>
                    <td className="py-3 px-4 text-muted-foreground">
                      {node.time}
                    </td>
                    <td className="py-3 px-4 text-muted-foreground font-mono">
                      {node.uptime}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </>
  );
}
