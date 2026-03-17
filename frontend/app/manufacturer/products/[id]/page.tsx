"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  X,
  Check,
  ImageIcon,
  ArrowLeft,
  Save,
  Trash2,
  Package,
  Calendar,
  Layers,
  Info,
  Plus,
} from "lucide-react";
import {
  getProduct,
  updateProduct,
  deleteProduct,
} from "@/api/product.api";
import { uploadImages } from "@/api/upload.api";
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

export default function ProductDetailsPage() {
  const router = useRouter();
  const { id } = useParams() as { id: string };
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Form state
  const [formName, setFormName] = useState("");
  const [formProductId, setFormProductId] = useState("");
  const [formCategory, setFormCategory] = useState("");
  const [formBrand, setFormBrand] = useState("");
  const [formPrice, setFormPrice] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formImages, setFormImages] = useState<string[]>([]);

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        setLoading(true);
        const res = await getProduct(id);
        const p = res.product;
        setProduct(p);
        setFormName(p.name);
        setFormProductId(p.productId);
        setFormCategory(p.category);
        setFormBrand(p.brand);
        setFormPrice(String(p.price || ""));
        setFormDescription(p.description || "");
        setFormImages(p.images || []);
      } catch (err: any) {
        toast.error("Failed to load product details.");
        router.push("/manufacturer/products");
      } finally {
        setLoading(false);
      }
    };
    fetchProduct();
  }, [id, router]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setUploading(true);
    try {
      const urls = await uploadImages(files);
      setFormImages((prev) => [...prev, ...urls]);
      toast.success(`${urls.length} image(s) uploaded.`);
    } catch (err: any) {
      toast.error(err.message || "Upload failed.");
    } finally {
      setUploading(false);
    }
  };

  const removeImage = (index: number) => {
    setFormImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (!formName || !formProductId || !formCategory || !formBrand) {
      toast.error("Please fill in all required fields.");
      return;
    }
    setSaving(true);
    try {
      const data = {
        name: formName,
        productId: formProductId,
        category: formCategory,
        brand: formBrand,
        price: parseFloat(formPrice) || 0,
        description: formDescription,
        images: formImages,
      };

      await updateProduct(id, data);
      toast.success("Product updated successfully.");
      // Refresh local product state
      setProduct({ ...product!, ...data });
    } catch (err: any) {
      toast.error(err.message || "Failed to update product.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this product from your catalogue? Existing batches will remain functional but won't point to this catalogue item.")) return;
    try {
      await deleteProduct(id);
      toast.success("Product removed from catalogue.");
      router.push("/manufacturer/products");
    } catch (err: any) {
      toast.error(err.message || "Failed to delete product.");
    }
  };

  if (loading) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-12 text-muted-foreground">
        <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
        <p className="text-lg animate-pulse font-medium">Fetching product particulars...</p>
      </div>
    );
  }

  if (!product) return null;

  return (
    <div className="flex-1 flex flex-col min-h-0 max-w-6xl mx-auto w-full h-full">
      {/* Header */}
      <div className="flex-none flex items-center justify-between mb-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild className="rounded-full">
            <Link href="/manufacturer/products">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold tracking-tight text-foreground">{product.name}</h1>
              <Badge variant="outline" className="font-mono text-sm uppercase px-3 py-0.5 bg-primary/5 border-primary/20 text-primary">
                {product.productId}
              </Badge>
            </div>
            <p className="text-muted-foreground mt-1 text-sm flex items-center gap-2">
              <Layers className="h-3.5 w-3.5" />
              {product.brand} · {product.category}
            </p>
          </div>
        </div>
        <Button 
          variant="destructive" 
          className="gap-2 border border-destructive/20"
          onClick={handleDelete}
        >
          <Trash2 className="h-4 w-4" />
          Delete Product
        </Button>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto pb-6 pr-2 scrollbar-thin scrollbar-thumb-muted-foreground/10">
        <div className="grid lg:grid-cols-3 gap-6 items-start">
        {/* Main Content: Info & Description */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="p-6 border-border/60 bg-card/50 shadow-sm space-y-8">
            <div className="flex items-start gap-4 border-b border-border/50 pb-4">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                <Info className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <h2 className="text-lg font-semibold text-foreground">Core Information</h2>
                <p className="text-sm text-muted-foreground">Update the fundamental details of this catalogue item.</p>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="f-name" className="text-sm font-medium">Product Name <span className="text-destructive">*</span></Label>
                <Input id="f-name" value={formName} onChange={(e) => setFormName(e.target.value)} className="h-10 bg-background/50 focus:ring-2 focus:ring-primary/20" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="f-pid" className="text-sm font-medium">Product ID (SKU/NDC) <span className="text-destructive">*</span></Label>
                <Input id="f-pid" value={formProductId} onChange={(e) => setFormProductId(e.target.value)} className="h-10 bg-background/50 focus:ring-2 focus:ring-primary/20" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="f-cat" className="text-sm font-medium">Category <span className="text-destructive">*</span></Label>
                <Input id="f-cat" value={formCategory} onChange={(e) => setFormCategory(e.target.value)} className="h-10 bg-background/50 focus:ring-2 focus:ring-primary/20" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="f-brand" className="text-sm font-medium">Brand <span className="text-destructive">*</span></Label>
                <Input id="f-brand" value={formBrand} onChange={(e) => setFormBrand(e.target.value)} className="h-10 bg-background/50 focus:ring-2 focus:ring-primary/20" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="f-price" className="text-sm font-medium">Retail Price (USD)</Label>
                <Input id="f-price" type="number" step="0.01" value={formPrice} onChange={(e) => setFormPrice(e.target.value)} className="h-10 bg-background/50 focus:ring-2 focus:ring-primary/20" />
              </div>
            </div>

            <div className="space-y-2 pt-2 border-t border-border/40">
              <Label htmlFor="f-desc" className="text-sm font-medium">Description</Label>
              <Textarea 
                id="f-desc" 
                value={formDescription} 
                onChange={(e) => setFormDescription(e.target.value)} 
                className="min-h-[150px] bg-background/50 focus:ring-2 focus:ring-primary/20 resize-none" 
              />
            </div>

            <div className="flex justify-end pt-4 border-t border-border/40">
              <Button size="lg" onClick={handleSave} disabled={saving} className="gap-2 min-w-[180px] shadow-lg shadow-primary/20 transition-all active:scale-95">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {saving ? "Saving Changes..." : "Save Changes"}
              </Button>
            </div>
          </Card>
        </div>

        {/* Sidebar: Images & Metadata */}
        <div className="space-y-6">
          <Card className="p-6 border-border/60 bg-card/50 shadow-sm space-y-6">
            <div className="flex items-center gap-3 border-b border-border/50 pb-4">
              <ImageIcon className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Imagery</h2>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {formImages.map((url, idx) => (
                <div key={idx} className="relative aspect-square rounded-lg border border-border shadow-inner overflow-hidden bg-muted group transition-all hover:scale-105">
                  <img src={resolveMediaUrl(url)} alt="Preview" className="w-full h-full object-cover" />
                  <button 
                    onClick={() => removeImage(idx)}
                    className="absolute top-1.5 right-1.5 h-6 w-6 bg-destructive text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
              
              <Label 
                htmlFor="image-upload" 
                className={cn(
                  "aspect-square rounded-lg border-2 border-dashed border-muted-foreground/30 hover:border-primary hover:bg-primary/5 cursor-pointer flex flex-col items-center justify-center transition-all bg-background/50",
                  uploading && "opacity-50 cursor-not-allowed pointer-events-none"
                )}
              >
                {uploading ? (
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                ) : (
                  <>
                    <Plus className="h-6 w-6 text-muted-foreground" />
                    <span className="text-[10px] mt-2 font-medium text-muted-foreground">Add Media</span>
                  </>
                )}
                <input 
                  id="image-upload" 
                  type="file" 
                  multiple 
                  accept="image/*" 
                  className="hidden" 
                  onChange={handleImageUpload} 
                  disabled={uploading}
                />
              </Label>
            </div>
            <p className="text-[10px] text-muted-foreground italic text-center">First image serves as the global SKU thumbnail.</p>
          </Card>

          <Card className="p-6 border-border/60 bg-muted/30 shadow-sm space-y-4">
            <div className="flex items-center gap-3 border-b border-border/50 pb-3">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">System Metadata</h2>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between items-center text-xs">
                <span className="text-muted-foreground">Internal ID</span>
                <span className="font-mono text-[10px] select-all">{product._id}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-muted-foreground">Added On</span>
                <span className="font-medium">{new Date(product.createdAt).toLocaleDateString()}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-muted-foreground">Catalogue Status</span>
                <Badge className="bg-green-500/10 text-green-600 border-green-500/20 text-[10px] py-0 px-2">Active</Badge>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  </div>
);
}
