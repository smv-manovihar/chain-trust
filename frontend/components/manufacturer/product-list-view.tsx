"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Package, 
  ExternalLink, 
  MoreHorizontal, 
  Eye, 
  Edit3,
  Trash2
} from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Product } from "./product-card";
import { resolveMediaUrl } from "@/lib/media-url";
import { useRouter } from "next/navigation";

interface ProductListViewProps {
  products: Product[];
  onDelete?: (productId: string) => void;
}

export function ProductListView({ products, onDelete }: ProductListViewProps) {
  const router = useRouter();

  if (products.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 bg-muted/5 rounded-2xl border border-dashed border-border/60">
        <Package className="h-12 w-12 text-muted-foreground/30 mb-4 stroke-[1]" />
        <p className="text-muted-foreground font-medium">No products found</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border/40 bg-card overflow-hidden">
      <Table>
        <TableHeader className="bg-muted/30">
          <TableRow>
            <TableHead className="w-[300px]">Product</TableHead>
            <TableHead>Category</TableHead>
            <TableHead>Brand</TableHead>
            <TableHead>Price</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Added</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {products.map((product) => {
            const isPending = product.status === "pending";
            
            return (
              <TableRow 
                key={product._id} 
                className="group hover:bg-muted/30 transition-colors cursor-pointer focus-visible:bg-muted/30 outline-none"
                tabIndex={0}
                onClick={() => {
                  router.push(isPending ? `/manufacturer/products/new?id=${product._id}` : `/manufacturer/products/${product.productId}`);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    router.push(isPending ? `/manufacturer/products/new?id=${product._id}` : `/manufacturer/products/${product.productId}`);
                  }
                }}
              >
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-muted/20 overflow-hidden flex-shrink-0 border border-border/20">
                      {product.images?.[0] ? (
                        <img 
                          src={resolveMediaUrl(product.images[0])} 
                          alt="" 
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center text-muted-foreground/30">
                          <Package className="h-5 w-5" />
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="font-bold text-sm truncate group-hover:text-primary transition-colors">
                        {product.name}
                      </span>
                      <span className="text-[10px] font-mono text-muted-foreground truncate">
                        {product.productId || "Draft"}
                      </span>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1.5 flex-wrap max-w-[180px]">
                    {product.categories?.slice(0, 1).map((cat) => (
                      <Badge key={cat} variant="outline" className="text-[10px] font-medium py-0 h-5 bg-muted/20 border-border/50">
                        {cat}
                      </Badge>
                    ))}
                    {(product.categories?.length || 0) > 1 && (
                      <TooltipProvider>
                        <Tooltip delayDuration={100}>
                          <TooltipTrigger asChild>
                            <Badge variant="outline" className="text-[10px] font-bold py-0 h-5 bg-primary/5 text-primary border-primary/20 cursor-help">
                              +{(product.categories?.length || 0) - 1}
                            </Badge>
                          </TooltipTrigger>
                          <TooltipContent className="bg-popover/95 backdrop-blur-md border border-border/50 p-2 shadow-xl rounded-xl">
                            <div className="flex flex-col gap-1">
                              <p className="text-[10px] font-bold text-muted-foreground mb-1">Additional Categories</p>
                              <div className="flex flex-wrap gap-1 max-w-[200px]">
                                {product.categories?.slice(1).map((cat) => (
                                  <Badge key={cat} variant="secondary" className="text-[10px] font-medium py-0 h-5">
                                    {cat}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                    {(product.categories?.length || 0) === 0 && (
                      <span className="text-[10px] text-muted-foreground italic">—</span>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-sm font-medium text-muted-foreground">
                  {product.brand}
                </TableCell>
                <TableCell className="text-sm font-bold">
                  {product.price > 0 ? (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="flex items-center gap-1 cursor-help">
                            {product.price?.toLocaleString() ?? "—"}
                            <span className="text-[10px] font-normal text-muted-foreground uppercase">USD</span>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent className="bg-background/95 backdrop-blur-md border border-primary/20 p-2 shadow-xl">
                          <p className="text-[10px] font-bold">Price in Tether (USD Linked Stablecoin)</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  ) : "—"}
                </TableCell>
                <TableCell>
                  {isPending ? (
                    <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20 hover:bg-amber-500/20 text-[10px] font-bold h-6">
                      Draft
                    </Badge>
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {product.createdAt ? format(new Date(product.createdAt), "MMM d, yyyy") : "Draft"}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Button variant="ghost" size="icon" asChild className="h-8 w-8 rounded-full" onClick={(e) => e.stopPropagation()}>
                      <Link href={isPending ? `/manufacturer/products/new?id=${product._id}` : `/manufacturer/products/${product.productId}`}>
                        {isPending ? <Edit3 className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Link>
                    </Button>
                    
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={(e) => e.stopPropagation()}>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-40 rounded-xl">
                        <DropdownMenuItem asChild>
                          <Link href={`/manufacturer/products/${product.productId}`} className="flex items-center gap-2 cursor-pointer">
                            <ExternalLink className="h-4 w-4" />
                            View Details
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          className="flex items-center gap-2 text-destructive focus:text-destructive cursor-pointer"
                          onClick={() => onDelete?.(product.productId)}
                        >
                          <Trash2 className="h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
