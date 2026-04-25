"use client";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Package, Fingerprint, Calendar } from "lucide-react";
import Link from "next/link";
import { resolveMediaUrl } from "@/lib/media-url";
import { format } from "date-fns";

export interface Product {
  _id: string;
  name: string;
  productId: string;
  categories: string[];
  category?: string;
  brand: string;
  price: number;
  description?: string;
  images: string[];
  createdAt: string;
  status?: string;
}

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  const categories =
    product.categories || (product.category ? [product.category] : []);
  const displayCategories = categories.slice(0, 2);
  const extraCategoriesCount = categories.length - 2;
  const isPending = product.status === "pending";

  return (
    <Link
      href={
        isPending
          ? `/manufacturer/products/new?id=${product._id}`
          : `/manufacturer/products/${encodeURIComponent(product.productId)}`
      }
      className="block group h-full"
    >
      <Card className="h-full flex flex-col bg-card border-border/40 shadow-sm transition-all duration-500 hover:shadow-xl hover:shadow-primary/5 hover:border-primary/20 overflow-hidden rounded-2xl relative">
        {/* Draft Badge Overlay */}
        {isPending && (
          <div className="absolute top-3 right-3 z-20">
            <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-semibold flex items-center gap-1.5 animate-pulse">
              <div className="h-1.5 w-1.5 rounded-full bg-amber-500" />
              Draft
            </Badge>
          </div>
        )}

        {/* Image Section */}
        <div className="relative aspect-[4/3] sm:aspect-[3/2] bg-muted/20 overflow-hidden">
          {product.images && product.images.length > 0 ? (
            <img
              src={resolveMediaUrl(product.images[0])}
              alt={product.name}
              className="h-full w-full object-cover transition-transform duration-1000 ease-out group-hover:scale-110"
            />
          ) : (
            <div className="h-full w-full flex flex-col items-center justify-center text-muted-foreground/30 bg-muted/10 relative overflow-hidden">
              <div className="absolute inset-0 opacity-[0.03] bg-[radial-gradient(#000_1px,transparent_1px)] [background-size:16px_16px]" />
              <Package className="h-12 w-12 mb-2 stroke-[1]" />
              <span className="text-[11px] font-medium tracking-tight">
                No image available
              </span>
            </div>
          )}

          {/* Categories Overlay */}
          <div className="absolute bottom-3 left-3 right-3 flex flex-wrap gap-1.5 overflow-hidden max-h-[4rem]">
            {categories.map((cat) => (
              <Badge
                key={cat}
                variant="secondary"
                className="bg-background/80 backdrop-blur-lg border-border/20 text-[10px] font-medium px-2.5 py-0.5 shadow-sm"
              >
                {cat}
              </Badge>
            ))}
          </div>
        </div>

        {/* Content Section */}
        <div className="flex-1 flex flex-col p-5 space-y-4">
          <div>
            {/* Brand - Styled as premium metadata */}
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-semibold text-primary/70">
                {product.brand || "Generic"}
              </span>
              {product.price > 0 && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex items-center gap-1 cursor-help">
                        <span className="text-xs font-bold text-foreground">
                          {product.price?.toLocaleString() ?? "—"}
                        </span>
                        <span className="text-[10px] text-muted-foreground font-normal uppercase">USD</span>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent className="bg-background/95 backdrop-blur-md border border-primary/20 p-2 shadow-xl">
                      <p className="text-[10px] font-bold">Price in Tether (USD Linked Stablecoin)</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>

            {/* Title */}
            <h4 className="text-sm font-bold text-foreground leading-tight line-clamp-2 min-h-[2.5rem] group-hover:text-primary transition-colors duration-300">
              {product.name}
            </h4>
          </div>

          {/* Footer Metadata */}
          <div className="mt-auto space-y-2 pt-4 border-t border-border/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-muted-foreground/60">
                <Fingerprint className="h-3 w-3" />
                <span className="text-[10px] font-medium">Product ID</span>
              </div>
              <span className="text-[10px] font-mono font-medium text-muted-foreground group-hover:text-foreground transition-colors">
                {product.productId || "Pending ID"}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-muted-foreground/60">
                <Calendar className="h-3 w-3" />
                <span className="text-[10px] font-medium">Added on</span>
              </div>
              <span className="text-[10px] font-medium text-muted-foreground">
                {product.createdAt
                  ? format(new Date(product.createdAt), "MMM d, yyyy")
                  : "Draft"}
              </span>
            </div>
          </div>
        </div>

        {/* Hover Gradient Overlay */}
        <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-primary/0 via-primary/40 to-primary/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      </Card>
    </Link>
  );
}
