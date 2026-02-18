"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Loader2,
  Search,
  MapPin,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

// Define types
interface TimelineEvent {
  status: string;
  date: string;
  location: string;
  description?: string;
  txHash?: string;
}

interface ProductData {
  name: string;
  brand: string;
  productId: string;
  batchNumber: string;
}

export default function TrackProductPage() {
  const [productId, setProductId] = useState("");
  const [loading, setLoading] = useState(false);
  const [product, setProduct] = useState<ProductData | null>(null);
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [error, setError] = useState("");

  // Status Update Form State
  const [status, setStatus] = useState("");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [updating, setUpdating] = useState(false);
  const [updateSuccess, setUpdateSuccess] = useState(false);

  const handleSearch = async () => {
    if (!productId) return;
    setLoading(true);
    setError("");
    setProduct(null);
    setUpdateSuccess(false);

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/track/${productId}`,
      );
      if (!response.ok) throw new Error("Product not found");

      const data = await response.json();
      setProduct(data.product);
      setTimeline(data.timeline);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!product || !status || !location) return;

    setUpdating(true);
    setError("");
    setUpdateSuccess(false);

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/track/${product.productId}/status`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            // 'Authorization': `Bearer ${token}` // TODO: Add auth
          },
          body: JSON.stringify({
            status,
            location,
            description,
            updatedBy: "Manufacturer Admin", // TODO: Get from auth
          }),
        },
      );

      if (!response.ok) throw new Error("Failed to update status");

      const data = await response.json();
      setTimeline(data.timeline);
      setUpdateSuccess(true);

      // Reset form
      setDescription("");
      // Keep status/location for convenience? Or reset?
    } catch (err: any) {
      setError(err.message);
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">
          Track & Update Product
        </h1>
        <p className="text-muted-foreground">
          Manage supply chain status for your products
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Search Section */}
        <div className="space-y-6">
          <Card className="p-6 border border-border">
            <h2 className="text-lg font-semibold mb-4">Find Product</h2>
            <div className="flex gap-2">
              <Input
                placeholder="Enter Product ID (e.g., PROD-001)"
                value={productId}
                onChange={(e) => setProductId(e.target.value)}
              />
              <Button onClick={handleSearch} disabled={loading}>
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Search className="h-4 w-4" />
                )}
              </Button>
            </div>
            {error && (
              <div className="mt-4 p-3 bg-destructive/10 text-destructive rounded-md flex items-center gap-2 text-sm">
                <AlertCircle className="h-4 w-4" />
                {error}
              </div>
            )}
          </Card>

          {product && (
            <Card className="p-6 border border-border">
              <h2 className="text-lg font-semibold mb-4">Product Details</h2>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between py-1 border-b border-border/50">
                  <span className="text-muted-foreground">Name</span>
                  <span className="font-medium">{product.name}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-border/50">
                  <span className="text-muted-foreground">Brand</span>
                  <span className="font-medium">{product.brand}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-border/50">
                  <span className="text-muted-foreground">Batch</span>
                  <span className="font-mono">{product.batchNumber}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-border/50">
                  <span className="text-muted-foreground">ID</span>
                  <span className="font-mono">{product.productId}</span>
                </div>
              </div>
            </Card>
          )}

          {/* Timeline Display */}
          {product && (
            <Card className="p-6 border border-border">
              <h2 className="text-lg font-semibold mb-4">Current Timeline</h2>
              <div className="space-y-4">
                {timeline.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No events recorded.
                  </p>
                ) : (
                  timeline
                    .slice()
                    .reverse()
                    .map(
                      (
                        event,
                        i, // Show newest first
                      ) => (
                        <div key={i} className="flex gap-3 text-sm">
                          <div className="flex flex-col items-center">
                            <div className="w-2 h-2 rounded-full bg-primary mt-1.5" />
                            {i < timeline.length - 1 && (
                              <div className="w-0.5 h-full bg-border mt-1" />
                            )}
                          </div>
                          <div className="pb-4">
                            <p className="font-semibold">{event.status}</p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(event.date).toLocaleString()}
                            </p>
                            <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                              <MapPin className="h-3 w-3" /> {event.location}
                            </div>
                          </div>
                        </div>
                      ),
                    )
                )}
              </div>
            </Card>
          )}
        </div>

        {/* Update Form Section */}
        {product && (
          <div className="space-y-6">
            <Card className="p-6 border border-border">
              <h2 className="text-lg font-semibold mb-4">Update Status</h2>
              <form onSubmit={handleUpdateStatus} className="space-y-4">
                <div className="space-y-2">
                  <Label>New Status</Label>
                  <Select onValueChange={setStatus} required>
                    <SelectTrigger>
                      <SelectValue placeholder="Select status event" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Manufactured">Manufactured</SelectItem>
                      <SelectItem value="Quality Checked">
                        Quality Checked
                      </SelectItem>
                      <SelectItem value="Shipped">Shipped</SelectItem>
                      <SelectItem value="In Transit">In Transit</SelectItem>
                      <SelectItem value="Received">Received</SelectItem>
                      <SelectItem value="Delivered">Delivered</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Location</Label>
                  <Input
                    placeholder="e.g. Warehouse A, New York"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label>Description (Optional)</Label>
                  <Textarea
                    placeholder="Additional details..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>

                <Button type="submit" className="w-full" disabled={updating}>
                  {updating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />{" "}
                      Updating...
                    </>
                  ) : (
                    "Add Tracking Event"
                  )}
                </Button>

                {updateSuccess && (
                  <div className="p-3 bg-green-500/10 text-green-600 rounded-md flex items-center gap-2 text-sm justify-center">
                    <CheckCircle2 className="h-4 w-4" />
                    Status updated successfully!
                  </div>
                )}
              </form>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
