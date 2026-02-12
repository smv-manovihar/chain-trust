"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Package,
  MapPin,
  Clock,
  CheckCircle2,
  AlertCircle,
  Search,
} from "lucide-react";
import { useState } from "react";

export default function SupplyChainPage() {
  const [searchQuery, setSearchQuery] = useState("");

  const shipments = [
    {
      id: "SHIP-2024-001",
      product: "Amoxicillin 500mg",
      quantity: "50,000 units",
      from: "Manufacturing Plant A",
      to: "Distribution Center NYC",
      status: "in-transit",
      progress: 65,
      eta: "2 hours",
      blockchain: "Verified ✓",
    },
    {
      id: "SHIP-2024-002",
      product: "Ibuprofen 200mg",
      quantity: "75,000 units",
      from: "Manufacturing Plant B",
      to: "Wholesale Partner West",
      status: "delivered",
      progress: 100,
      eta: "Completed",
      blockchain: "Verified ✓",
    },
    {
      id: "SHIP-2024-003",
      product: "Vitamin D3 Tablets",
      quantity: "30,000 units",
      from: "Manufacturing Plant A",
      to: "Pharmacy Chain East",
      status: "pending",
      progress: 10,
      eta: "24 hours",
      blockchain: "Pending",
    },
    {
      id: "SHIP-2024-004",
      product: "Aspirin 325mg",
      quantity: "100,000 units",
      from: "Manufacturing Plant C",
      to: "Distribution Center LA",
      status: "in-transit",
      progress: 45,
      eta: "4 hours",
      blockchain: "Verified ✓",
    },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case "delivered":
        return "bg-accent text-accent-foreground";
      case "in-transit":
        return "bg-primary text-primary-foreground";
      case "pending":
        return "bg-muted text-muted-foreground";
      default:
        return "bg-secondary text-secondary-foreground";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "delivered":
        return <CheckCircle2 className="h-4 w-4" />;
      case "in-transit":
        return <Package className="h-4 w-4" />;
      case "pending":
        return <AlertCircle className="h-4 w-4" />;
      default:
        return null;
    }
  };

  const filteredShipments = shipments.filter(
    (s) =>
      s.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.product.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <>
      {/* Header */}
      <div className="border-b border-border bg-card sticky top-0 z-10 -mx-4 md:-mx-8 px-4 md:px-8 py-4 mb-6 shadow-sm">
        <div className="space-y-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              Supply Chain Tracking
            </h1>
            <p className="text-sm text-muted-foreground">
              Monitor real-time shipment status across your supply network
            </p>
          </div>
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by shipment ID or product..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button variant="outline">Add Shipment</Button>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        {/* Summary Cards */}
        <div className="grid md:grid-cols-4 gap-4">
          {[
            { label: "Active Shipments", value: "8", color: "text-primary" },
            { label: "In Transit", value: "5", color: "text-accent" },
            { label: "Delivered Today", value: "12", color: "text-green-600" },
            {
              label: "Blockchain Verified",
              value: "98.5%",
              color: "text-blue-600",
            },
          ].map((card, i) => (
            <Card key={i} className="p-4 border border-border">
              <p className="text-xs font-medium text-muted-foreground mb-2">
                {card.label}
              </p>
              <p className={`text-2xl font-bold ${card.color}`}>{card.value}</p>
            </Card>
          ))}
        </div>

        {/* Shipments List */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-foreground">
            Active Shipments
          </h2>
          {filteredShipments.length === 0 ? (
            <Card className="p-8 border border-border text-center">
              <p className="text-muted-foreground">
                No shipments found matching your search.
              </p>
            </Card>
          ) : (
            filteredShipments.map((shipment) => (
              <Card
                key={shipment.id}
                className="p-6 border border-border hover:border-primary/50 transition-colors"
              >
                <div className="space-y-4">
                  {/* Header Row */}
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <p className="text-sm font-mono text-muted-foreground">
                        {shipment.id}
                      </p>
                      <h3 className="text-lg font-semibold text-foreground">
                        {shipment.product}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {shipment.quantity}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right space-y-2">
                        <Badge className={getStatusColor(shipment.status)}>
                          <span className="inline-flex items-center gap-1">
                            {getStatusIcon(shipment.status)}
                            {shipment.status.replace("-", " ").toUpperCase()}
                          </span>
                        </Badge>
                        <p className="text-xs text-muted-foreground font-mono">
                          {shipment.blockchain}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Route */}
                  <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <MapPin className="h-4 w-4" />
                      <span>{shipment.from}</span>
                    </div>
                    <div className="text-muted-foreground">→</div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <MapPin className="h-4 w-4" />
                      <span>{shipment.to}</span>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Progress</span>
                      <span className="font-mono text-foreground">
                        {shipment.progress}%
                      </span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary transition-all duration-300"
                        style={{ width: `${shipment.progress}%` }}
                      />
                    </div>
                  </div>

                  {/* ETA */}
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">ETA:</span>
                    <span className="font-semibold text-foreground">
                      {shipment.eta}
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 pt-2">
                    <Button size="sm" variant="outline">
                      View Details
                    </Button>
                    <Button size="sm" variant="outline">
                      Blockchain Proof
                    </Button>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      </div>
    </>
  );
}
