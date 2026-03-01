"use client";

import { useEffect, useState } from "react";
import { Header } from "@/components/layout/header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Package, Hash, Building2, Clock, Trash2 } from "lucide-react";
import Link from "next/link";
import api from "@/api/client";

export default function CabinetPage() {
  const [savedProducts, setSavedProducts] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await api.get("/users/cabinet/list");
        if (res.data) {
          setSavedProducts(res.data);
          return;
        }
      } catch (err) {
        // Fallback
        const data = localStorage.getItem("cabinet");
        if (data) {
          setSavedProducts(JSON.parse(data));
        }
      }
    };
    fetchData();
  }, []);

  const removeProduct = async (productId: string) => {
    try {
      await api.post("/users/cabinet/remove", { productId });
      setSavedProducts((prev) => prev.filter((p) => p.productId !== productId));
    } catch (err) {
      // Fallback
      const newProducts = savedProducts.filter(
        (p) => p.productId !== productId,
      );
      setSavedProducts(newProducts);
      localStorage.setItem("cabinet", JSON.stringify(newProducts));
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="max-w-4xl mx-auto px-4 md:px-6 py-8 space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">
              Personal Cabinet
            </h1>
            <p className="text-muted-foreground">
              Your verified and saved medications
            </p>
          </div>
          <Button asChild variant="outline">
            <Link href="/verify-product">Verify New Product</Link>
          </Button>
        </div>

        {savedProducts.length === 0 ? (
          <Card className="p-12 text-center space-y-4 border-dashed border-2">
            <div className="flex justify-center">
              <Package className="h-12 w-12 text-muted-foreground opacity-50" />
            </div>
            <p className="text-muted-foreground">Your cabinet is empty.</p>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {savedProducts.map((product, idx) => (
              <Card
                key={idx}
                className="p-6 border border-border flex flex-col justify-between"
              >
                <div className="space-y-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-lg text-foreground">
                        {product.name}
                      </h3>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                        <Building2 className="h-3 w-3" />
                        {product.brand}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeProduct(product.productId)}
                      className="text-red-500 hover:text-red-600 hover:bg-red-500/10"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="bg-muted/30 p-3 rounded-md space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <Hash className="h-4 w-4 text-muted-foreground" />
                      <span className="font-mono text-xs">
                        {product.batchNumber}
                      </span>
                    </div>
                    {product.expiryDate && (
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span>
                          Exp:{" "}
                          {new Date(product.expiryDate).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
                <Button asChild variant="secondary" className="mt-4 w-full">
                  <Link href={`/verify-product?salt=${product.productId}`}>
                    View Details
                  </Link>
                </Button>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
