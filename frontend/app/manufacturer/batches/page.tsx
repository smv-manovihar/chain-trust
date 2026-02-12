"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Download, MoreVertical } from "lucide-react";
import { useState } from "react";

export default function BatchesPage() {
  const [searchQuery, setSearchQuery] = useState("");

  const batches = [
    {
      id: "BATCH-2024-0847-A",
      product: "Amoxicillin 500mg",
      quantity: "500,000 units",
      manufactured: "2024-08-15",
      expires: "2026-08-15",
      status: "verified",
      verifications: "847",
      qrCodes: "500,000",
    },
    {
      id: "BATCH-2024-0821-B",
      product: "Ibuprofen 200mg",
      quantity: "750,000 units",
      manufactured: "2024-08-21",
      expires: "2025-08-21",
      status: "verified",
      verifications: "623",
      qrCodes: "750,000",
    },
    {
      id: "BATCH-2024-0801-C",
      product: "Vitamin D3 Tablets",
      quantity: "1,000,000 units",
      manufactured: "2024-08-01",
      expires: "2026-08-01",
      status: "verified",
      verifications: "234",
      qrCodes: "1,000,000",
    },
    {
      id: "BATCH-2024-0915-D",
      product: "Aspirin 325mg",
      quantity: "600,000 units",
      manufactured: "2024-09-15",
      expires: "2027-09-15",
      status: "pending",
      verifications: "0",
      qrCodes: "600,000",
    },
  ];

  const filteredBatches = batches.filter(
    (b) =>
      b.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.product.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <>
      {/* Header */}
      <div className="border-b border-border bg-card sticky top-0 z-10 -mx-4 md:-mx-8 px-4 md:px-8 py-4 mb-6 shadow-sm">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground">
                Batch Management
              </h1>
              <p className="text-sm text-muted-foreground">
                Monitor and manage all product batches on blockchain
              </p>
            </div>
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by batch ID or product..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button variant="outline" className="gap-2 bg-transparent">
                <Download className="h-4 w-4" />
                Export
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        {/* Stats */}
        <div className="grid md:grid-cols-4 gap-4">
          {[
            { label: "Total Batches", value: "1,860", color: "text-primary" },
            { label: "Verified", value: "1,847", color: "text-accent" },
            { label: "Pending", value: "13", color: "text-amber-600" },
            {
              label: "QR Codes Generated",
              value: "3.2M",
              color: "text-blue-600",
            },
          ].map((stat, i) => (
            <Card key={i} className="p-4 border border-border">
              <p className="text-xs font-medium text-muted-foreground mb-2">
                {stat.label}
              </p>
              <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
            </Card>
          ))}
        </div>

        {/* Batches Table */}
        <Card className="border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-muted/30">
                <tr>
                  <th className="text-left py-3 px-6 font-semibold text-foreground">
                    Batch ID
                  </th>
                  <th className="text-left py-3 px-6 font-semibold text-foreground">
                    Product
                  </th>
                  <th className="text-left py-3 px-6 font-semibold text-foreground">
                    Quantity
                  </th>
                  <th className="text-left py-3 px-6 font-semibold text-foreground">
                    Manufactured
                  </th>
                  <th className="text-left py-3 px-6 font-semibold text-foreground">
                    Expires
                  </th>
                  <th className="text-left py-3 px-6 font-semibold text-foreground">
                    Status
                  </th>
                  <th className="text-left py-3 px-6 font-semibold text-foreground">
                    Verifications
                  </th>
                  <th className="text-left py-3 px-6 font-semibold text-foreground"></th>
                </tr>
              </thead>
              <tbody>
                {filteredBatches.map((batch) => (
                  <tr
                    key={batch.id}
                    className="border-b border-border hover:bg-muted/30 transition-colors"
                  >
                    <td className="py-4 px-6">
                      <p className="font-mono text-xs font-semibold text-foreground">
                        {batch.id}
                      </p>
                    </td>
                    <td className="py-4 px-6">
                      <p className="text-foreground font-medium">
                        {batch.product}
                      </p>
                    </td>
                    <td className="py-4 px-6">
                      <p className="text-muted-foreground">{batch.quantity}</p>
                    </td>
                    <td className="py-4 px-6">
                      <p className="text-muted-foreground text-xs">
                        {batch.manufactured}
                      </p>
                    </td>
                    <td className="py-4 px-6">
                      <p className="text-muted-foreground text-xs">
                        {batch.expires}
                      </p>
                    </td>
                    <td className="py-4 px-6">
                      <Badge
                        className={
                          batch.status === "verified"
                            ? "bg-accent text-accent-foreground"
                            : "bg-amber-600 text-white"
                        }
                      >
                        {batch.status}
                      </Badge>
                    </td>
                    <td className="py-4 px-6">
                      <p className="text-foreground font-semibold">
                        {batch.verifications}
                      </p>
                    </td>
                    <td className="py-4 px-6">
                      <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {filteredBatches.length === 0 && (
          <Card className="p-8 text-center border border-border">
            <p className="text-muted-foreground">
              No batches found matching your search.
            </p>
          </Card>
        )}
      </div>
    </>
  );
}
