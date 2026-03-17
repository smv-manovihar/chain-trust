"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Search,
  Plus,
  Loader2,
  Package,
} from "lucide-react";
import {
  listProducts,
} from "@/api/product.api";
import { toast } from "sonner";
import Link from "next/link";
import { resolveMediaUrl } from "@/lib/media-url";

interface Product {
  _id: string;
  name: string;
  productId: string;
  category: string;
  brand: string;
  price: number;
  description?: string;
  images: string[];
  createdAt: string;
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const res = await listProducts();
      setProducts(res.products || []);
    } catch (err: any) {
      console.error("Failed to load products:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const filtered = products.filter(
    (p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.productId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex-1 flex flex-col min-h-0 gap-4">
      {/* Header */}
      <div className="flex-none flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Products</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Your product catalogue. Add products here, then create batches from them.
          </p>
        </div>
        <Button asChild className="gap-2">
          <Link href="/manufacturer/products/new">
            <Plus className="h-4 w-4" />
            Add Product
          </Link>
        </Button>
      </div>

      {/* Search */}
      <div className="flex-none relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by name, SKU, or category..."
          className="pl-9 h-10 text-sm"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Inline Form Removed - Relocated to /manufacturer/products/new and /[id] */}

      {/* Products Grid */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        {loading ? (
          <div className="flex flex-col items-center justify-center p-16 text-muted-foreground">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
            <p className="text-sm">Loading your catalogue...</p>
          </div>
        ) : filtered.length > 0 ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pb-4">
            {filtered.map((p) => (
              <Link key={p._id} href={`/manufacturer/products/${p._id}`}>
                <Card className="border border-border hover:border-primary/40 transition-all hover:shadow-lg group flex flex-col overflow-hidden h-full">
                  {/* Image area */}
                  <div className="h-32 bg-muted/30 flex items-center justify-center border-b border-border transition-colors group-hover:bg-muted/50">
                    {p.images && p.images.length > 0 ? (
                      <img src={resolveMediaUrl(p.images[0])} alt={p.name} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110" />
                    ) : (
                      <Package className="h-10 w-10 text-muted-foreground/40 transition-transform group-hover:scale-110" />
                    )}
                  </div>
                  {/* Content */}
                  <div className="p-4 flex-1 flex flex-col">
                    <div className="flex-1">
                      <p className="font-semibold text-foreground text-sm truncate group-hover:text-primary transition-colors">{p.name}</p>
                      <p className="text-xs text-muted-foreground font-mono mt-0.5">{p.productId}</p>
                      <div className="flex gap-2 mt-2">
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{p.category}</Badge>
                        <span className="text-xs text-muted-foreground">{p.brand}</span>
                      </div>
                    </div>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center p-16 text-muted-foreground border border-dashed rounded-xl border-border bg-muted/10">
            <Package className="h-10 w-10 mb-3 text-muted-foreground/50" />
            <p className="text-lg font-medium text-foreground">No products yet</p>
            <p className="mb-4 mt-1 text-center max-w-sm text-sm">
              Add products to your catalogue first, then create batches from them.
            </p>
            <Button asChild className="gap-2">
              <Link href="/manufacturer/products/new">
                <Plus className="h-4 w-4" />
                Add Your First Product
              </Link>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
