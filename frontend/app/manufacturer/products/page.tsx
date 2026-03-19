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
  LayoutGrid,
  RefreshCw
} from "lucide-react";
import {
  listProducts,
} from "@/api/product.api";
import { toast } from "sonner";
import Link from "next/link";
import { resolveMediaUrl } from "@/lib/media-url";
import { CategoryManagementDialog } from "@/components/manufacturer/category-dialog";
import { cn } from "@/lib/utils";
import { fetchCategories, Category } from "@/api/category.api";

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
  const [categoriesData, setCategoriesData] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [pRes, cRes] = await Promise.all([
        listProducts(),
        fetchCategories()
      ]);
      setProducts(pRes.products || []);
      setCategoriesData(cRes.categories || []);
    } catch (err: any) {
      console.error("Failed to load catalogue:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filtered = products.filter(
    (p) => {
      const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.productId.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.category.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = !selectedCategory || p.category === selectedCategory;
      return matchesSearch && matchesCategory;
    }
  );

  return (
    <div className="flex-1 flex flex-col min-h-0 gap-4">
      {/* Header */}
      <div className="flex-none flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">Products</h1>
          <p className="text-muted-foreground mt-1 text-xs sm:text-sm">
            Your product catalogue. Add products here, then create batches from them.
          </p>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="flex-1 sm:flex-none flex items-center gap-2">
            <Button 
              variant="outline" 
              size="icon" 
              onClick={fetchData} 
              className="rounded-xl h-10 w-10 border-border/50 hover:bg-muted/10 transition-all shadow-sm"
              title="Refresh Catalogue"
            >
              <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
            </Button>
            <CategoryManagementDialog onCategoriesChange={fetchData} />
          </div>
          <Button asChild className="flex-1 sm:flex-none gap-2 shadow-sm">
            <Link href="/manufacturer/products/new">
              <Plus className="h-4 w-4" />
              Add Product
            </Link>
          </Button>
        </div>
      </div>

      {/* Catalogue Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 flex-none">
        <Card className="p-4 bg-primary/5 border-none shadow-sm flex items-center gap-4 rounded-3xl">
          <div className="h-10 w-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
             <Package className="h-5 w-5" />
          </div>
          <div>
             <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest mb-0.5 leading-none">Products</p>
             <h4 className="text-xl font-black">{products.length}</h4>
          </div>
        </Card>
        <Card className="p-4 bg-muted/30 border-none shadow-sm flex items-center gap-4 rounded-3xl">
          <div className="h-10 w-10 rounded-2xl bg-orange-500/10 flex items-center justify-center text-orange-600">
             <LayoutGrid className="h-5 w-5" />
          </div>
          <div>
             <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest mb-0.5 leading-none">Categories</p>
             <h4 className="text-xl font-black">{categoriesData.length}</h4>
          </div>
        </Card>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col md:flex-row gap-4 flex-none sticky top-0 z-10 bg-background/80 backdrop-blur-md py-4">
         <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search catalogue..."
              className="pl-10 h-12 text-sm bg-muted/20 border-border/50 rounded-2xl"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
         </div>
         <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar md:max-w-[60%]">
            <Button 
              variant={selectedCategory === null ? "default" : "outline"} 
              size="sm" 
              className="rounded-full px-5 h-12 text-[10px] font-black uppercase tracking-widest"
              onClick={() => setSelectedCategory(null)}
            >
              All Products
            </Button>
            {categoriesData.map(cat => (
              <Button 
                key={cat._id}
                variant={selectedCategory === cat.name ? "default" : "outline"} 
                size="sm" 
                className={cn(
                  "rounded-full px-5 h-12 text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all",
                  selectedCategory === cat.name ? "bg-primary shadow-lg shadow-primary/20" : "bg-card/40 border-border/40 hover:bg-card/60"
                )}
                onClick={() => setSelectedCategory(cat.name)}
              >
                {cat.name}
              </Button>
            ))}
         </div>
      </div>

      {/* Products Grid */}
      <div className="flex-1 min-h-0 overflow-y-auto pr-1">
        {loading ? (
          <div className="flex flex-col items-center justify-center p-16 text-muted-foreground">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
            <p className="text-sm">Loading your catalogue...</p>
          </div>
        ) : filtered.length > 0 ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pb-6 pt-2">
            {filtered.map((p) => (
              <div key={p._id}>
                <Link href={`/manufacturer/products/${p._id}`}>
                  <Card className="group relative border border-border/50 hover:border-primary/40 transition-all hover:shadow-2xl hover:shadow-primary/5 bg-card/40 backdrop-blur-sm rounded-[2rem] flex flex-col overflow-hidden h-full">
                    {/* Image area */}
                    <div className="h-40 bg-muted/20 flex items-center justify-center border-b border-border/50 transition-colors group-hover:bg-muted/40 relative overflow-hidden">
                      {p.images && p.images.length > 0 ? (
                        <img src={resolveMediaUrl(p.images[0])} alt={p.name} className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110" />
                      ) : (
                        <Package className="h-12 w-12 text-muted-foreground/30 transition-transform duration-500 group-hover:scale-110" />
                      )}
                      <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                         <Badge className="bg-background/90 backdrop-blur-xl text-foreground border-none px-3 py-1 text-[10px] font-black tracking-widest">DETAILS</Badge>
                      </div>
                    </div>
                    {/* Content */}
                    <div className="p-5 flex-1 flex flex-col">
                      <div className="flex-1">
                        <p className="font-black text-foreground text-sm tracking-tight uppercase group-hover:text-primary transition-colors">{p.name}</p>
                        <p className="text-[10px] text-muted-foreground font-mono mt-0.5 tracking-tighter opacity-70 italic">{p.productId}</p>
                        <div className="flex items-center gap-3 mt-4">
                          <Badge variant="secondary" className="text-[9px] font-black tracking-widest px-2 py-0.5 uppercase bg-primary/5 text-primary border-primary/10">{p.category}</Badge>
                          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{p.brand}</span>
                        </div>
                      </div>
                    </div>
                  </Card>
                </Link>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center p-16 text-muted-foreground border border-dashed rounded-[3rem] border-primary/20 bg-primary/5">
            <Package className="h-12 w-12 mb-4 text-primary/30" />
            <p className="text-xl font-black text-foreground uppercase tracking-tighter">No products yet</p>
            <p className="mb-6 mt-2 text-center max-w-sm text-sm font-medium">
              Start by adding your first product to the blockchain catalogue.
            </p>
            <Button asChild className="gap-2 rounded-2xl h-12 px-6 shadow-xl shadow-primary/20">
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
