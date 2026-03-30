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
}

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  const categories =
    product.categories || (product.category ? [product.category] : []);
  const displayCategories = categories.slice(0, 2);
  const extraCategoriesCount = categories.length - 2;

  return (
    <Link
      href={`/manufacturer/products/${encodeURIComponent(product.productId)}`}
      className="block group h-full"
    >
      <Card className="h-full flex flex-col bg-card border-border/40 shadow-sm transition-all duration-300 hover:shadow-md hover:border-border overflow-hidden rounded-xl">
        {/* Image Section */}
        <div className="relative aspect-[4/3] sm:aspect-square bg-muted/10 overflow-hidden border-b border-border/40">
          {product.images && product.images.length > 0 ? (
            <img
              src={resolveMediaUrl(product.images[0])}
              alt={product.name}
              className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.03]"
            />
          ) : (
            <div className="h-full w-full flex flex-col items-center justify-center text-muted-foreground/40 bg-muted/5">
              <Package className="h-10 w-10 mb-2 stroke-[1.5]" />
              <span className="text-[11px] font-medium tracking-wide uppercase">
                No Image
              </span>
            </div>
          )}

          {/* Elegant Categories Overlay */}
          {displayCategories.length > 0 && (
            <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
              {displayCategories.map((cat) => (
                <Badge
                  key={cat}
                  variant="secondary"
                  className="bg-background/95 backdrop-blur-md hover:bg-background/95 border-border/50 text-[10px] font-medium px-2.5 py-0.5 shadow-sm transition-colors group-hover:border-border"
                >
                  {cat}
                </Badge>
              ))}
              {extraCategoriesCount > 0 && (
                <TooltipProvider>
                  <Tooltip delayDuration={200}>
                    <TooltipTrigger asChild>
                      <Badge
                        variant="secondary"
                        className="bg-background/95 backdrop-blur-md hover:bg-background/95 border-border/50 text-[10px] font-medium px-2 py-0.5 shadow-sm cursor-help"
                      >
                        +{extraCategoriesCount}
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="p-2 text-xs">
                      <div className="space-y-1">
                        {categories.slice(2).map((cat) => (
                          <div key={cat} className="flex items-center gap-1.5">
                            <div className="h-1 w-1 rounded-full bg-primary/70" />
                            <span className="text-muted-foreground">{cat}</span>
                          </div>
                        ))}
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
          )}
        </div>

        {/* Content Section */}
        <div className="flex-1 flex flex-col p-5">
          {/* Brand - Styled as premium metadata */}
          <div className="mb-2">
            <span className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground/70">
              {product.brand || "Unknown Brand"}
            </span>
          </div>

          {/* Title */}
          <h4 className="text-sm sm:text-base font-semibold text-foreground leading-snug line-clamp-2 mb-4 group-hover:text-primary transition-colors duration-300">
            {product.name}
          </h4>

          {/* Footer / Specs */}
          <div className="mt-auto space-y-2.5 pt-4 border-t border-border/40">
            <div className="flex items-center justify-between group/id">
              <div className="flex items-center gap-2 text-muted-foreground/80">
                <Fingerprint className="h-3.5 w-3.5" />
                <span className="text-[11px] font-medium">Global ID</span>
              </div>
              <span className="text-[11px] font-mono text-muted-foreground group-hover/id:text-foreground transition-colors">
                {product.productId}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-muted-foreground/80">
                <Calendar className="h-3.5 w-3.5" />
                <span className="text-[11px] font-medium">Added</span>
              </div>
              <span className="text-[11px] font-medium text-muted-foreground">
                {product.createdAt
                  ? format(new Date(product.createdAt), "MMM d, yyyy")
                  : "—"}
              </span>
            </div>
          </div>
        </div>
      </Card>
    </Link>
  );
}
