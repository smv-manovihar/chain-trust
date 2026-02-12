'use client'

import { useState } from 'react'
import { Header } from '@/components/header'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  CheckCircle2,
  AlertCircle,
  Package,
  Building2,
  Calendar,
  MapPin,
  Hash,
  ShieldCheck,
  TrendingUp,
  Clock,
  QrCode,
} from 'lucide-react'

export default function VerifyProductPage() {
  const [scanned, setScanned] = useState(false)
  const [qrInput, setQrInput] = useState('')

  // Mock product data
  const productData = {
    name: 'Amoxicillin 500mg',
    manufacturer: 'PharmaCorp Inc',
    batch: 'BATCH-2024-0847-A',
    expiryDate: '2026-08-15',
    manufacturedDate: '2024-08-15',
    quantity: '60 tablets',
    batchSize: '500,000 units',
    status: 'verified',
    blockchainId: 'PHARM-2024-0847-A-001',
    timeline: [
      { status: 'Manufactured', date: '2024-08-15', location: 'PharmaCorp Manufacturing Plant, USA' },
      { status: 'Quality Checked', date: '2024-08-16', location: 'PharmaCorp QA Lab' },
      { status: 'Packaged', date: '2024-08-17', location: 'PharmaCorp Distribution Center' },
      { status: 'Shipped', date: '2024-08-20', location: 'In Transit to Distribution' },
      { status: 'Received', date: '2024-09-01', location: 'Pharmacy Chain - Downtown Store' },
    ],
  }

  const handleScan = () => {
    if (qrInput) {
      setScanned(true)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="max-w-4xl mx-auto px-4 md:px-6 py-8">
        {!scanned ? (
          // Scanning Interface
          <div className="space-y-8">
            <div className="space-y-2">
              <h1 className="text-3xl font-bold text-foreground">Verify Product</h1>
              <p className="text-muted-foreground">Scan the QR code on your medicine package</p>
            </div>

            {/* Camera/Upload Area */}
            <Card className="p-12 border-2 border-dashed border-border text-center space-y-6">
              <div className="flex justify-center">
                <div className="h-24 w-24 rounded-lg bg-primary/10 flex items-center justify-center">
                  <QrCode className="h-12 w-12 text-primary" />
                </div>
              </div>
              <div className="space-y-4">
                <div className="space-y-2">
                  <h2 className="text-xl font-semibold text-foreground">Scan QR Code</h2>
                  <p className="text-muted-foreground">
                    Allow camera access and point at the QR code on your medicine package
                  </p>
                </div>
                <Button size="lg">Open Camera</Button>
                <p className="text-sm text-muted-foreground">Or</p>
                <Button size="lg" variant="outline">
                  Upload Image
                </Button>
              </div>
            </Card>

            {/* Manual Entry */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-foreground">Manual Verification</h3>
              <Card className="p-6 border border-border space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Batch Number or QR Code</label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Enter BATCH-XXXX-XXXX or scan code..."
                      value={qrInput}
                      onChange={(e) => setQrInput(e.target.value)}
                    />
                    <Button onClick={handleScan}>Verify</Button>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        ) : (
          // Results Screen
          <div className="space-y-8">
            <div className="space-y-2">
              <h1 className="text-3xl font-bold text-foreground">Product Verified</h1>
              <p className="text-muted-foreground">This product has been confirmed as authentic</p>
            </div>

            {/* Status Card */}
            <Card className="p-8 border border-border bg-gradient-to-br from-accent/10 to-transparent">
              <div className="flex items-center gap-4">
                <div className="h-16 w-16 rounded-full bg-accent flex items-center justify-center flex-shrink-0">
                  <CheckCircle2 className="h-8 w-8 text-accent-foreground" />
                </div>
                <div>
                  <p className="text-sm font-medium text-accent">BLOCKCHAIN VERIFIED</p>
                  <p className="text-2xl font-bold text-foreground">This product is authentic</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Verified on blockchain: {productData.blockchainId}
                  </p>
                </div>
              </div>
            </Card>

            {/* Product Details */}
            <Card className="p-6 border border-border space-y-6">
              <h2 className="text-xl font-semibold text-foreground">Product Information</h2>

              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground">Product Name</p>
                    <p className="text-lg font-semibold text-foreground">{productData.name}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground">Manufacturer</p>
                    <div className="flex items-center gap-2 text-foreground">
                      <Building2 className="h-4 w-4" />
                      <p className="font-semibold">{productData.manufacturer}</p>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground">Batch Number</p>
                    <div className="flex items-center gap-2 text-foreground">
                      <Hash className="h-4 w-4" />
                      <p className="font-mono text-sm font-semibold">{productData.batch}</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground">Quantity</p>
                    <div className="flex items-center gap-2 text-foreground">
                      <Package className="h-4 w-4" />
                      <p className="font-semibold">{productData.quantity}</p>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground">Manufactured</p>
                    <div className="flex items-center gap-2 text-foreground">
                      <Calendar className="h-4 w-4" />
                      <p className="font-semibold">{productData.manufacturedDate}</p>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground">Expires</p>
                    <div className="flex items-center gap-2 text-foreground">
                      <Clock className="h-4 w-4" />
                      <p className="font-semibold">{productData.expiryDate}</p>
                    </div>
                  </div>
                </div>
              </div>
            </Card>

            {/* Supply Chain Timeline */}
            <Card className="p-6 border border-border space-y-6">
              <h2 className="text-xl font-semibold text-foreground">Supply Chain Journey</h2>

              <div className="space-y-4">
                {productData.timeline.map((step, index) => (
                  <div key={index} className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className="h-10 w-10 rounded-full bg-accent flex items-center justify-center text-accent-foreground font-semibold flex-shrink-0">
                        {index + 1}
                      </div>
                      {index < productData.timeline.length - 1 && (
                        <div className="h-12 w-1 bg-accent/20 mt-2" />
                      )}
                    </div>
                    <div className="pt-1 pb-4">
                      <p className="font-semibold text-foreground">{step.status}</p>
                      <p className="text-sm text-muted-foreground">{step.date}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-2">
                        <MapPin className="h-3 w-3" />
                        <span>{step.location}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* Safety Notice */}
            <Card className="p-6 border border-border bg-muted/30 space-y-4">
              <div className="flex items-start gap-3">
                <ShieldCheck className="h-6 w-6 text-accent flex-shrink-0 mt-0.5" />
                <div className="space-y-2">
                  <h3 className="font-semibold text-foreground">Safe to Use</h3>
                  <p className="text-sm text-muted-foreground">
                    This product has passed all authenticity checks and is safe for consumption. All supply chain records have been verified on the blockchain.
                  </p>
                </div>
              </div>
            </Card>

            {/* Actions */}
            <div className="flex gap-4">
              <Button size="lg" asChild>
                <a href="/customer-home">Verify Another Product</a>
              </Button>
              <Button size="lg" variant="outline">
                Download Certificate
              </Button>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
