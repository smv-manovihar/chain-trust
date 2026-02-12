"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Download, Copy, Check } from "lucide-react";

export default function QRManagerPage() {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const qrCodes = [
    {
      id: "BATCH-001",
      product: "Aspirin 500mg",
      batch: "B20240101",
      status: "Generated",
      qrCode: "█████████████████\n█ QR CODE IMAGE ███\n█████████████████",
    },
    {
      id: "BATCH-002",
      product: "Ibuprofen 200mg",
      batch: "B20240102",
      status: "Generated",
      qrCode: "█████████████████\n█ QR CODE IMAGE ███\n█████████████████",
    },
    {
      id: "BATCH-003",
      product: "Vitamin C 1000mg",
      batch: "B20240103",
      status: "Pending",
      qrCode: "",
    },
    {
      id: "BATCH-004",
      product: "Paracetamol 650mg",
      batch: "B20240104",
      status: "Generated",
      qrCode: "█████████████████\n█ QR CODE IMAGE ███\n█████████████████",
    },
    {
      id: "BATCH-005",
      product: "Omeprazole 20mg",
      batch: "B20240105",
      status: "Generated",
      qrCode: "█████████████████\n█ QR CODE IMAGE ███\n█████████████████",
    },
  ];

  const handleCopy = (id: string) => {
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <>
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-foreground">
            QR Code Manager
          </h1>
          <p className="text-muted-foreground">
            Generate and manage QR codes for your products
          </p>
        </div>

        {/* Controls */}
        <Card className="p-6 border border-border">
          <div className="grid md:grid-cols-2 gap-4 mb-4">
            <div className="space-y-2">
              <Label htmlFor="search">Search Products</Label>
              <Input
                id="search"
                placeholder="Search by batch or product name..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Filter by Status</Label>
              <Select defaultValue="all">
                <SelectTrigger id="status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="generated">Generated</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button className="w-full md:w-auto gap-2">
            <Download className="h-4 w-4" />
            Download All as ZIP
          </Button>
        </Card>

        {/* QR Codes Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {qrCodes.map((item) => (
            <Card
              key={item.id}
              className="p-6 border border-border flex flex-col space-y-4"
            >
              {/* QR Code Display */}
              <div className="flex items-center justify-center bg-white rounded-lg p-4 h-48 relative">
                {item.status === "Generated" ? (
                  <div className="w-32 h-32 rounded border-2 border-primary flex items-center justify-center bg-white">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-primary mb-1">
                        ●●●
                      </div>
                      <div className="text-xs text-muted-foreground">
                        QR Code
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center space-y-2">
                    <div className="text-sm text-muted-foreground">
                      QR Code Pending
                    </div>
                    <Button size="sm">Generate Now</Button>
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="space-y-2">
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">
                    Product
                  </p>
                  <p className="font-medium text-foreground text-sm">
                    {item.product}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">
                    Batch Number
                  </p>
                  <p className="font-mono text-sm text-muted-foreground">
                    {item.batch}
                  </p>
                </div>
                <div className="flex items-center justify-between">
                  <Badge
                    className={
                      item.status === "Generated"
                        ? "bg-accent/10 text-accent border-accent"
                        : "bg-primary/10 text-primary border-primary"
                    }
                    variant="outline"
                  >
                    {item.status}
                  </Badge>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-4 border-t border-border">
                {item.status === "Generated" && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 gap-2 bg-transparent"
                      onClick={() => handleCopy(item.id)}
                    >
                      {copiedId === item.id ? (
                        <>
                          <Check className="h-4 w-4" />
                          Copied
                        </>
                      ) : (
                        <>
                          <Copy className="h-4 w-4" />
                          Copy
                        </>
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 gap-2 bg-transparent"
                    >
                      <Download className="h-4 w-4" />
                      Download
                    </Button>
                  </>
                )}
              </div>
            </Card>
          ))}
        </div>
      </div>
    </>
  );
}
