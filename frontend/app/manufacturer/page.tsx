"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  BarChart3,
  Package,
  AlertTriangle,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  Plus,
  Download,
} from "lucide-react";
import Link from "next/link";

export default function ManufacturerDashboard() {
  return (
    <>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">
            Dashboard
          </h1>
          <p className="text-sm text-muted-foreground">
            Overview of your production and supply chain
          </p>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <Button variant="outline" className="flex-1 sm:flex-none gap-2">
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline">Export Report</span>
          </Button>
          <Button asChild className="flex-1 sm:flex-none">
            <Link href="/manufacturer/batches/new">
              <Plus className="mr-2 h-4 w-4" />
              Add Product
            </Link>
          </Button>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="p-6 border border-border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Total Products
              </p>
              <h3 className="text-2xl font-bold text-foreground">24</h3>
            </div>
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
              <Package className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm text-green-600">
            <TrendingUp className="mr-1 h-4 w-4" />
            <span>+12% from last month</span>
          </div>
        </Card>

        <Card className="p-6 border border-border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Active Batches
              </p>
              <h3 className="text-2xl font-bold text-foreground">142</h3>
            </div>
            <div className="h-10 w-10 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500">
              <BarChart3 className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm text-green-600">
            <ArrowUpRight className="mr-1 h-4 w-4" />
            <span>+5% new batches</span>
          </div>
        </Card>

        <Card className="p-6 border border-border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Low Stock Alerts
              </p>
              <h3 className="text-2xl font-bold text-foreground">3</h3>
            </div>
            <div className="h-10 w-10 rounded-full bg-yellow-500/10 flex items-center justify-center text-yellow-500">
              <AlertTriangle className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm text-red-600">
            <ArrowDownRight className="mr-1 h-4 w-4" />
            <span>Requires attention</span>
          </div>
        </Card>

        <Card className="p-6 border border-border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Verifications
              </p>
              <h3 className="text-2xl font-bold text-foreground">12.5k</h3>
            </div>
            <div className="h-10 w-10 rounded-full bg-green-500/10 flex items-center justify-center text-green-500">
              <TrendingUp className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm text-green-600">
            <ArrowUpRight className="mr-1 h-4 w-4" />
            <span>+18% engagement</span>
          </div>
        </Card>
      </div>

      {/* Recent Activity / Products Table */}
      <Card className="border border-border">
        <div className="p-6 border-b border-border">
          <h3 className="text-lg font-semibold text-foreground">
            Recent Batches
          </h3>
        </div>
        <div className="p-0">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left p-4 font-medium text-muted-foreground">
                  Batch ID
                </th>
                <th className="text-left p-4 font-medium text-muted-foreground">
                  Product
                </th>
                <th className="text-left p-4 font-medium text-muted-foreground">
                  Date
                </th>
                <th className="text-left p-4 font-medium text-muted-foreground">
                  Status
                </th>
                <th className="text-left p-4 font-medium text-muted-foreground">
                  Verifications
                </th>
              </tr>
            </thead>
            <tbody>
              {[
                {
                  id: "B-2024-001",
                  product: "Amoxicillin 500mg",
                  date: "2024-02-10",
                  status: "Active",
                  verifications: 234,
                },
                {
                  id: "B-2024-002",
                  product: "Ibuprofen 200mg",
                  date: "2024-02-09",
                  status: "Quality Check",
                  verifications: 0,
                },
                {
                  id: "B-2024-003",
                  product: "Vitamin D3",
                  date: "2024-02-08",
                  status: "Active",
                  verifications: 89,
                },
                {
                  id: "B-2024-004",
                  product: "Paracetamol 500mg",
                  date: "2024-02-08",
                  status: "Recall",
                  verifications: 1245,
                },
              ].map((batch, i) => (
                <tr
                  key={i}
                  className="border-t border-border hover:bg-muted/50"
                >
                  <td className="p-4 font-mono text-sm">{batch.id}</td>
                  <td className="p-4">{batch.product}</td>
                  <td className="p-4 text-muted-foreground">{batch.date}</td>
                  <td className="p-4">
                    <span
                      className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        batch.status === "Active"
                          ? "bg-green-500/10 text-green-500"
                          : batch.status === "Quality Check"
                            ? "bg-blue-500/10 text-blue-500"
                            : "bg-red-500/10 text-red-500"
                      }`}
                    >
                      {batch.status}
                    </span>
                  </td>
                  <td className="p-4">{batch.verifications}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}
