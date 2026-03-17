"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  QrCode,
  Shield,
  Clock,
  CheckCircle2,
  AlertCircle,
  Zap,
} from "lucide-react";
import Link from "next/link";

export default function CustomerHomePage() {
  const recentScans = [
    {
      id: 1,
      product: "Amoxicillin 500mg",
      manufacturer: "PharmaCorp Inc",
      status: "verified",
      date: "2 hours ago",
      batch: "BATCH-2024-0847",
    },
    {
      id: 2,
      product: "Ibuprofen 200mg",
      manufacturer: "MedSupply Global",
      status: "verified",
      date: "1 day ago",
      batch: "BATCH-2024-0821",
    },
    {
      id: 3,
      product: "Vitamin D3 Tablets",
      manufacturer: "HealthNet +",
      status: "verified",
      date: "3 days ago",
      batch: "BATCH-2024-0775",
    },
  ];

  return (
    <div className="min-h-screen bg-transparent">
      <main className="max-w-7xl mx-auto px-4 md:px-6 py-8">
        {/* Welcome Section */}
        <div className="mb-8 space-y-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">
              Verify Your Medicines
            </h1>
            <p className="text-muted-foreground">
              Scan any product to confirm authenticity and track its journey
            </p>
          </div>
        </div>

        {/* Main CTA Card */}
        <Card className="p-8 md:p-12 border border-primary/50 bg-gradient-to-br from-primary/10 to-transparent mb-8">
          <div className="space-y-6">
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-foreground">
                Quick Product Verification
              </h2>
              <p className="text-muted-foreground">
                Use your device camera or upload a QR code image to instantly
                verify pharmaceutical authenticity
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-4">
              <Button size="lg" asChild className="gap-2">
                <Link href="/verify-product">
                  <QrCode className="h-5 w-5" />
                  Scan QR Code
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="/verify-by-batch">Enter Batch Number</Link>
              </Button>
            </div>
          </div>
        </Card>

        <div className="grid md:grid-cols-3 gap-6 mb-8">
          {/* Stats */}
          {[
            { label: "Products Verified", value: "1,247", icon: CheckCircle2 },
            { label: "Counterfeits Detected", value: "3", icon: AlertCircle },
            { label: "Time Saved", value: "12+ hours", icon: Clock },
          ].map((stat, i) => {
            const Icon = stat.icon;
            return (
              <Card key={i} className="p-6 border border-border">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Icon className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">
                      {stat.label}
                    </p>
                    <p className="text-2xl font-bold text-foreground">
                      {stat.value}
                    </p>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>

        {/* Recent Scans */}
        <div className="space-y-4 mb-8">
          <h2 className="text-xl font-bold text-foreground">
            Recent Verifications
          </h2>
          <div className="space-y-3">
            {recentScans.map((scan) => (
              <Card
                key={scan.id}
                className="p-4 border border-border hover:border-primary/50 transition-colors cursor-pointer"
              >
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="font-semibold text-foreground">
                      {scan.product}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      By {scan.manufacturer}
                    </p>
                    <p className="text-xs font-mono text-muted-foreground mt-1">
                      {scan.batch}
                    </p>
                  </div>
                  <div className="text-right space-y-2">
                    <Badge className="bg-accent text-accent-foreground">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Verified
                    </Badge>
                    <p className="text-xs text-muted-foreground">{scan.date}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* Trust Section */}
        <Card className="p-8 border border-border bg-muted/30">
          <div className="space-y-6">
            <div className="space-y-2">
              <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                <Shield className="h-6 w-6 text-accent" />
                Why ChainTrust?
              </h2>
            </div>
            <div className="grid md:grid-cols-3 gap-6">
              {[
                {
                  title: "Blockchain Verified",
                  description:
                    "Every product is registered on immutable blockchain, preventing tampering",
                },
                {
                  title: "Direct from Manufacturer",
                  description:
                    "Ensure your medicine came from the factory with complete transparency",
                },
                {
                  title: "Instant Verification",
                  description:
                    "Get verification results in seconds with our advanced QR scanning technology",
                },
              ].map((item, i) => (
                <div key={i} className="space-y-2">
                  <h3 className="font-semibold text-foreground">
                    {item.title}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {item.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </main>
    </div>
  );
}
