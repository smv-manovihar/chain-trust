"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Plus, Edit2, Trash2, Eye } from "lucide-react";
import Link from "next/link";
import { useState, useEffect } from "react";
import { getAllProductsFromBlockchain } from "@/lib/blockchain-utils";

export default function ProductsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadProducts() {
      try {
        const data = await getAllProductsFromBlockchain();
        setProducts(data);
      } catch (error) {
        console.error("Error loading products:", error);
      } finally {
        setLoading(false);
      }
    }
    loadProducts();
  }, []);

  const filteredProducts = products.filter(
    (p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.sku.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <>
      {/* Header */}
      <div className="border-b border-border bg-card sticky top-0 z-10 -mx-4 md:-mx-8 px-4 md:px-8 py-4 mb-6 shadow-sm">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Products</h1>
              <p className="text-sm text-muted-foreground">
                Manage your pharmaceutical products and batches
              </p>
            </div>
            <Button asChild className="gap-2">
              <Link href="/manufacturer/add-product">
                <Plus className="h-4 w-4" />
                Add Product
              </Link>
            </Button>
          </div>
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by product name or SKU..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        {/* Summary */}
        <div className="grid md:grid-cols-4 gap-4">
          {[
            { label: "Active Products", value: "4", color: "text-primary" },
            { label: "Total Batches", value: "1,860", color: "text-accent" },
            {
              label: "Total Verifications",
              value: "29,627",
              color: "text-green-600",
            },
            { label: "This Month", value: "423", color: "text-blue-600" },
          ].map((stat, i) => (
            <Card key={i} className="p-4 border border-border">
              <p className="text-xs font-medium text-muted-foreground mb-2">
                {stat.label}
              </p>
              <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
            </Card>
          ))}
        </div>

        {/* Products Table */}
        <Card className="border border-border overflow-hidden">
          {loading ? (
            <div className="p-8 text-center">
              <p className="text-muted-foreground">
                Loading products from blockchain...
              </p>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-muted-foreground">
                No products found matching your search.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b border-border bg-muted/30">
                  <tr>
                    <th className="text-left py-3 px-6 font-semibold text-foreground">
                      Product Name
                    </th>
                    <th className="text-left py-3 px-6 font-semibold text-foreground">
                      SKU
                    </th>
                    <th className="text-left py-3 px-6 font-semibold text-foreground">
                      Registered Batches
                    </th>
                    <th className="text-left py-3 px-6 font-semibold text-foreground">
                      Verifications
                    </th>
                    <th className="text-left py-3 px-6 font-semibold text-foreground">
                      Status
                    </th>
                    <th className="text-left py-3 px-6 font-semibold text-foreground">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProducts.map((product, idx) => (
                    <tr
                      key={product.id}
                      className="border-b border-border hover:bg-muted/30 transition-colors"
                    >
                      <td className="py-4 px-6">
                        <div className="space-y-1">
                          <p className="font-semibold text-foreground">
                            {product.name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Registered {product.date}
                          </p>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <p className="font-mono text-sm text-muted-foreground">
                          {product.sku}
                        </p>
                      </td>
                      <td className="py-4 px-6">
                        <p className="text-foreground font-medium">
                          {product.registered}
                        </p>
                      </td>
                      <td className="py-4 px-6">
                        <p className="text-foreground font-medium">
                          {product.verifications}
                        </p>
                      </td>
                      <td className="py-4 px-6">
                        <Badge className="bg-accent text-accent-foreground">
                          Active
                        </Badge>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0"
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0 hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </>
  );
}
