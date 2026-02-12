'use client'

import { useState } from 'react'
import { Header } from '@/components/header'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { CheckCircle2, AlertCircle, Package, Calendar } from 'lucide-react'
import Link from 'next/link'

export default function VerifyByBatchPage() {
  const [batchNumber, setBatchNumber] = useState('')
  const [searched, setSearched] = useState(false)
  const [found, setFound] = useState(false)

  const handleSearch = () => {
    if (batchNumber) {
      setSearched(true)
      // Simulate finding the batch
      setFound(batchNumber.startsWith('BATCH'))
    }
  }

  // Mock batch data
  const batchData = {
    batch: 'BATCH-2024-0847-A',
    product: 'Amoxicillin 500mg',
    manufacturer: 'PharmaCorp Inc',
    quantity: '500,000 units',
    manufactured: '2024-08-15',
    expires: '2026-08-15',
    status: 'verified',
    verifications: 847,
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="max-w-2xl mx-auto px-4 md:px-6 py-8">
        <div className="space-y-8">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold text-foreground">Verify by Batch Number</h1>
            <p className="text-muted-foreground">Enter the batch number from your medicine package to verify authenticity</p>
          </div>

          {!searched ? (
            // Search Form
            <Card className="p-8 border border-border space-y-6">
              <div className="space-y-2">
                <label htmlFor="batch" className="text-sm font-medium text-foreground">
                  Batch Number
                </label>
                <Input
                  id="batch"
                  placeholder="e.g., BATCH-2024-0847-A"
                  value={batchNumber}
                  onChange={(e) => setBatchNumber(e.target.value.toUpperCase())}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  className="text-lg"
                />
                <p className="text-xs text-muted-foreground">You can find this on the back of your medicine box</p>
              </div>

              <Button size="lg" className="w-full" onClick={handleSearch} disabled={!batchNumber}>
                Search Batch
              </Button>

              {/* Help Section */}
              <div className="border-t border-border pt-6 space-y-3">
                <h3 className="font-semibold text-foreground">Where to find your batch number?</h3>
                <ul className="space-y-2 text-sm text-muted-foreground list-disc list-inside">
                  <li>On the back or side of the medicine box</li>
                  <li>Often printed near the expiration date</li>
                  <li>Typically starts with "BATCH-" prefix</li>
                  <li>Format: BATCH-YYYY-XXXX-X</li>
                </ul>
              </div>
            </Card>
          ) : found ? (
            // Results
            <div className="space-y-6">
              {/* Status Card */}
              <Card className="p-8 border border-border bg-gradient-to-br from-accent/10 to-transparent space-y-4">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="h-6 w-6 text-accent flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-foreground">Batch Verified</p>
                    <p className="text-sm text-muted-foreground">This batch has been registered on blockchain</p>
                  </div>
                </div>
              </Card>

              {/* Batch Details */}
              <Card className="p-6 border border-border space-y-6">
                <h2 className="text-lg font-semibold text-foreground">Batch Information</h2>

                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-muted-foreground">Product Name</p>
                      <p className="text-lg font-semibold text-foreground">{batchData.product}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-muted-foreground">Manufacturer</p>
                      <p className="text-foreground font-semibold">{batchData.manufacturer}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-muted-foreground">Quantity</p>
                      <p className="text-foreground font-semibold">{batchData.quantity}</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-muted-foreground">Manufactured</p>
                      <div className="flex items-center gap-2 text-foreground">
                        <Calendar className="h-4 w-4" />
                        <p className="font-semibold">{batchData.manufactured}</p>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-muted-foreground">Expires</p>
                      <div className="flex items-center gap-2 text-foreground">
                        <Calendar className="h-4 w-4" />
                        <p className="font-semibold">{batchData.expires}</p>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-muted-foreground">Total Verifications</p>
                      <p className="text-lg font-bold text-accent">{batchData.verifications.toLocaleString()}</p>
                    </div>
                  </div>
                </div>
              </Card>

              {/* Summary */}
              <Card className="p-6 border border-border bg-muted/30 space-y-4">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="h-6 w-6 text-accent flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-foreground mb-2">All Products Safe</h3>
                    <p className="text-sm text-muted-foreground">
                      This batch has been verified on the blockchain and all {batchData.quantity} units are registered as authentic.
                    </p>
                  </div>
                </div>
              </Card>

              <div className="flex gap-4">
                <Button
                  size="lg"
                  variant="outline"
                  onClick={() => {
                    setSearched(false)
                    setBatchNumber('')
                  }}
                >
                  Search Another Batch
                </Button>
                <Button size="lg" asChild>
                  <Link href="/customer-home">Back to Home</Link>
                </Button>
              </div>
            </div>
          ) : (
            // Not Found
            <Card className="p-8 border border-border space-y-6">
              <div className="flex items-center gap-3">
                <AlertCircle className="h-6 w-6 text-destructive flex-shrink-0" />
                <div>
                  <p className="font-semibold text-foreground">Batch Not Found</p>
                  <p className="text-sm text-muted-foreground">This batch number is not registered in our system</p>
                </div>
              </div>

              <div className="space-y-4 border-t border-border pt-6">
                <p className="text-sm text-muted-foreground">Please:</p>
                <ul className="space-y-2 text-sm text-muted-foreground list-disc list-inside">
                  <li>Double-check the batch number spelling</li>
                  <li>Ensure the format is correct (BATCH-YYYY-XXXX-X)</li>
                  <li>Contact the manufacturer if the batch is legitimate</li>
                </ul>
              </div>

              <Button
                size="lg"
                variant="outline"
                onClick={() => {
                  setSearched(false)
                  setBatchNumber('')
                }}
                className="w-full"
              >
                Try Again
              </Button>
            </Card>
          )}
        </div>
      </main>
    </div>
  )
}
