"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
} from "@/components/ui/command";
import { CategoryFilter } from "@/components/manufacturer/category-filter";
import {
  Search,
  Plus,
  Loader2,
  Package,
  LayoutGrid,
  RefreshCw,
  Check,
  ChevronsUpDown,
  Filter,
  Boxes,
} from "lucide-react";
import { ProductCard } from "@/components/manufacturer/product-card";
import type { Product } from "@/components/manufacturer/product-card";

import { listProducts } from "@/api/product.api";
import { toast } from "sonner";
import Link from "next/link";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { resolveMediaUrl } from "@/lib/media-url";
import { CategoryManagementDialog } from "@/components/manufacturer/category-dialog";
import { cn } from "@/lib/utils";
import { EmptyState } from "@/components/ui/empty-state";
import { useDebounce } from "@/hooks/use-debounce";

// Product interface is now imported from @/components/manufacturer/product-card

export default function ProductsPage() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState(searchParams.get("search") || "");
  const [categoriesCount, setCategoriesCount] = useState(0);
  const [selectedCategories, setSelectedCategories] = useState<string[]>(
    searchParams.get("categories")?.split(",").filter(Boolean) || []
  );
  const fetchAbortRef = useRef<AbortController | null>(null);

  const debouncedSearch = useDebounce(searchQuery, 500);
  const debouncedCategories = useDebounce(selectedCategories, 500);

  // Sync state to URL
  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
    if (debouncedSearch) {
      params.set("search", debouncedSearch);
    } else {
      params.delete("search");
    }

    if (debouncedCategories.length > 0) {
      params.set("categories", debouncedCategories.join(","));
    } else {
      params.delete("categories");
    }

    const queryString = params.toString();
    const currentQueryString = searchParams.toString();

    if (queryString !== currentQueryString) {
      const url = queryString ? `${pathname}?${queryString}` : pathname;
      // Use replace to avoid polluting history with every debounce
      router.replace(url, { scroll: false });
    }
  }, [debouncedSearch, debouncedCategories, pathname, router, searchParams]);

  const fetchProducts = useCallback(async () => {
    if (fetchAbortRef.current) fetchAbortRef.current.abort();
    const controller = new AbortController();
    fetchAbortRef.current = controller;

    try {
      setLoading(true);
      const res = await listProducts({
        search: debouncedSearch,
        categories: debouncedCategories,
      }, controller.signal);
      setProducts(res.products || []);
    } catch (err: any) {
      if (err.name === 'AbortError') return;
      console.error("Failed to load products:", err);
      toast.error("Catalogue sync failed.");
    } finally {
      if (fetchAbortRef.current === controller) {
        setLoading(false);
      }
    }
  }, [debouncedSearch, debouncedCategories]);

  // Function to update categoriesCount, typically called after category management
  const updateCategoriesCount = (count: number) => {
    setCategoriesCount(count);
  };

  useEffect(() => {
    fetchProducts();
    return () => fetchAbortRef.current?.abort();
  }, [fetchProducts]);

  // The toggleCategory function is no longer needed as setSelectedCategories is passed directly to CategoryFilter
  // const toggleCategory = (catName: string) => {
  //   setSelectedCategories((prev) =>
  //     prev.includes(catName)
  //       ? prev.filter((c) => c !== catName)
  //       : [...prev, catName],
  //   );
  // };

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-2 duration-700 pb-20">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-6 px-1">
        <div>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">
            Products
          </h1>
          <div className="flex items-center gap-3 mt-3">
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 border border-primary/20">
              <Package className="w-3 h-3 text-primary" />
              <span className="text-[10px] font-bold tracking-tight text-primary">
                {products.length} Assets
              </span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20">
              <LayoutGrid className="w-3 h-3 text-blue-600" />
              <span className="text-[10px] font-bold tracking-tight text-blue-600">
                {products.length > 0 ? [...new Set(products.map(p => p.category))].length : 0} Categories
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <Button
            variant="outline"
            size="icon"
            onClick={fetchProducts}
            className="rounded-full h-12 w-12 border-primary/20 hover:bg-primary/5 transition-all shadow-sm"
          >
            <RefreshCw
              className={cn("h-5 w-5 text-primary", loading && "animate-spin")}
            />
          </Button>
          <CategoryManagementDialog onCategoriesChange={fetchProducts} />
          <Button
            asChild
            className="flex-1 sm:flex-none h-12 px-6 rounded-full gap-2 shadow-xl shadow-primary/20 font-bold"
          >
            <Link href="/manufacturer/products/new">
              <Plus className="h-4 w-4" />
              Add Product
            </Link>
          </Button>
        </div>
      </div>

      <div className="flex gap-4 px-1 sticky top-4 z-30">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or ID..."
            className="pl-11 h-11 text-sm bg-background/80 backdrop-blur-3xl border-border/40 rounded-full focus-visible:ring-primary/20 shadow-sm"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <CategoryFilter
          selectedCategories={selectedCategories}
          onCategoryChange={setSelectedCategories}
          canManage={true}
          onCategoriesChange={fetchProducts}
          className="rounded-full h-11 px-6 border-border/40 bg-background/80 backdrop-blur-3xl shadow-sm"
        />
      </div>

      {/* Inventory Grid */}
      <div className="px-1 pt-4">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground font-medium gap-4">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <p className="tracking-tight text-xs font-bold">
              Syncing Catalogue...
            </p>
          </div>
        ) : products.length > 0 ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
            {products.map((p) => (
              <ProductCard key={p._id} product={p} />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={Boxes}
            title="No Products Found"
            description="Your inventory is currently empty. Start by initializing your first digital asset on the blockchain secure catalogue."
            action={{
              label: "Initialize New Asset",
              href: "/manufacturer/products/new",
            }}
          />
        )}
      </div>
    </div>
  );
}
