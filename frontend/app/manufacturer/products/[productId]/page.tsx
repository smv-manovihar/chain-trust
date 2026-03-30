"use client";

import { useState, useEffect, useRef } from "react";
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
  Settings2,
  ScanLine,
  ShieldAlert,
  History,
  TrendingUp,
  FileText,
  CheckCircle2,
  DollarSign,
  Fingerprint,
} from "lucide-react";
import { CategoryFilter } from "@/components/manufacturer/category-filter";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
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
  categories: string[];
  category?: string;
  brand: string;
  price: number;
  composition: string;
  description?: string;
  images: string[];
  imageAccessLevel: 'public' | 'verified_only' | 'internal_only';
  customerVisibleImages: number[];
  qrSettings: {
    qrSize: number;
    columns: number;
    showProductName: boolean;
    showUnitIndex: boolean;
    showBatchNumber: boolean;
    labelPadding: number;
  };
  createdAt: string;
}

export default function ProductDetailsPage() {
  const router = useRouter();
  const { productId } = useParams() as { productId: string };
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fetchAbortRef = useRef<AbortController | null>(null);

  // Form state
  const [formName, setFormName] = useState("");
  const [formProductId, setFormProductId] = useState("");
  const [formCategories, setFormCategories] = useState<string[]>([]);
  const [formBrand, setFormBrand] = useState("");
  const [formPrice, setFormPrice] = useState("");
  const [formComposition, setFormComposition] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formImages, setFormImages] = useState<string[]>([]);
  const [formAccessLevel, setFormAccessLevel] = useState<'public' | 'verified_only' | 'internal_only'>("public");
  const [formVisibleImages, setFormVisibleImages] = useState<number[]>([]);
  const [formQrSettings, setFormQrSettings] = useState({
    qrSize: 40,
    columns: 4,
    showProductName: true,
    showUnitIndex: true,
    showBatchNumber: true,
    labelPadding: 10,
  });

  useEffect(() => {
    const fetchProduct = async () => {
      if (fetchAbortRef.current) fetchAbortRef.current.abort();
      const controller = new AbortController();
      fetchAbortRef.current = controller;

      try {
        setLoading(true);
        const res = await getProduct(productId, controller.signal);
        const p = res.product;
        setProduct(p);
        setFormName(p.name);
        setFormProductId(p.productId);
        setFormCategories(p.categories || (p.category ? [p.category] : []));
        setFormBrand(p.brand);
        setFormPrice(String(p.price || ""));
        setFormComposition(p.composition || "");
        setFormDescription(p.description || "");
        setFormImages(p.images || []);
        setFormAccessLevel(p.imageAccessLevel || "public");
        setFormVisibleImages(p.customerVisibleImages || []);
        if (p.qrSettings) setFormQrSettings(p.qrSettings);
      } catch (err: any) {
        if (err.name === 'AbortError') return;
        toast.error("Failed to load product details.");
        router.push("/manufacturer/products");
      } finally {
        if (fetchAbortRef.current === controller) {
          setLoading(false);
        }
      }
    };
    fetchProduct();
    return () => fetchAbortRef.current?.abort();
  }, [productId, router]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setUploading(true);
    try {
      const urls = await uploadImages(files);
      const newImages = [...formImages, ...urls];
      setFormImages(newImages);
      
      // Auto-save: Synchronize with backend immediately
      await updateProduct(productId, { images: newImages });
      toast.success(`${urls.length} image(s) uploaded and synchronized.`);
    } catch (err: any) {
      toast.error(err.message || "Upload failed.");
    } finally {
      setUploading(false);
    }
  };

  const removeImage = async (index: number) => {
    const newImages = formImages.filter((_, i) => i !== index);
    const newVisibleImages = formVisibleImages
      .filter(i => i !== index)
      .map(i => i > index ? i - 1 : i);
      
    // Update local state
    setFormImages(newImages);
    setFormVisibleImages(newVisibleImages);

    try {
      await updateProduct(productId, { 
        images: newImages, 
        customerVisibleImages: newVisibleImages 
      });
      toast.info("Image mapping updated on server.");
    } catch (err: any) {
      toast.error("Failed to synchronize removal with server.");
    }
  };

  const handleSave = async () => {
    if (!formName || !formProductId || formCategories.length === 0 || !formBrand) {
      toast.error("Please fill in all required fields.");
      return;
    }
    setSaving(true);
    try {
      const data = {
        name: formName,
        productId: formProductId,
        categories: formCategories,
        brand: formBrand,
        price: parseFloat(formPrice) || 0,
        composition: formComposition,
        description: formDescription,
        images: formImages,
        imageAccessLevel: formAccessLevel,
        customerVisibleImages: formVisibleImages,
        qrSettings: formQrSettings,
      };

      await updateProduct(productId, data);
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
      await deleteProduct(productId);
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
      <div className="flex-none flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
        <div className="flex items-center gap-3 sm:gap-4">
          <Button variant="ghost" size="icon" asChild className="rounded-full shrink-0">
            <Link href="/manufacturer/products">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <h1 className="text-xl sm:text-3xl font-black tracking-tight text-foreground truncate">{product.name}</h1>
              <Badge variant="outline" className="font-mono text-[10px] sm:text-xs px-2 py-0.5 bg-primary/5 border-primary/20 text-primary shrink-0">
                {product.productId}
              </Badge>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto pl-12 sm:pl-0">
          <Button 
            variant="destructive" 
            className="flex-1 sm:flex-none gap-2 border border-destructive/20 h-9 sm:h-10"
            onClick={handleDelete}
          >
            <Trash2 className="h-4 w-4" />
            <span className="hidden sm:inline">Delete Product</span>
            <span className="sm:hidden text-xs">Delete</span>
          </Button>
        </div>
      </div>

      {/* Sub-Header Stats Bar */}
      <div className="flex-none grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-card/40 border border-border/50 rounded-2xl p-4 flex items-center gap-4 shadow-sm backdrop-blur-sm">
          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
            <Package className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Manufacturer</p>
            <p className="text-sm font-bold truncate">{product.brand}</p>
          </div>
        </div>
        <div className="bg-card/40 border border-border/50 rounded-2xl p-4 flex items-center gap-4 shadow-sm backdrop-blur-sm">
          <div className="h-10 w-10 rounded-xl bg-orange-500/10 flex items-center justify-center text-orange-600 shrink-0">
            <Layers className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Category</p>
            <p className="text-sm font-bold truncate">{product.categories?.[0] || product.category || 'Standard'}</p>
          </div>
        </div>
        <div className="bg-card/40 border border-border/50 rounded-2xl p-4 flex items-center gap-4 shadow-sm backdrop-blur-sm">
          <div className="h-10 w-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-600 shrink-0">
            <Fingerprint className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Composition</p>
            <p className="text-sm font-bold truncate">{product.composition || 'Not Specified'}</p>
          </div>
        </div>
        <div className="bg-card/40 border border-border/50 rounded-2xl p-4 flex items-center gap-4 shadow-sm backdrop-blur-sm">
          <div className="h-10 w-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-600 shrink-0">
            <DollarSign className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Retail Price</p>
            <p className="text-sm font-bold truncate">${product.price || '0.00'}</p>
          </div>
        </div>
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
                <h2 className="text-lg font-black text-foreground">Core Information</h2>
                <p className="text-sm text-muted-foreground">Update the fundamental details of this catalogue item.</p>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="f-name" className="text-sm font-bold">Product Name <span className="text-destructive">*</span></Label>
                <Input id="f-name" value={formName} onChange={(e) => setFormName(e.target.value)} className="h-10 bg-background/50 focus:ring-2 focus:ring-primary/20" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="f-pid" className="text-sm font-bold">Product ID (SKU/NDC) <span className="text-destructive">*</span></Label>
                <Input id="f-pid" value={formProductId} onChange={(e) => setFormProductId(e.target.value)} className="h-10 bg-background/50 focus:ring-2 focus:ring-primary/20" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="f-cat" className="text-sm font-bold text-muted-foreground">Categories</Label>
                <CategoryFilter
                  selectedCategories={formCategories}
                  onCategoryChange={setFormCategories}
                  canManage={true}
                  placeholder="Select product classification..."
                  className="w-full justify-between h-10 px-3 bg-background/50 border-border/50 rounded-xl"
                  align="start"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="f-brand" className="text-sm font-bold">Brand Name</Label>
                <Input id="f-brand" placeholder="e.g. Pfizer, Merck" value={formBrand} onChange={(e) => setFormBrand(e.target.value)} className="h-10 bg-background/50 focus:ring-2 focus:ring-primary/20" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="f-comp" className="text-sm font-bold text-primary">Active Ingredient / Composition</Label>
                <Input id="f-comp" placeholder="e.g. Ibuprofen 200mg" value={formComposition} onChange={(e) => setFormComposition(e.target.value)} className="h-10 border-primary/20 bg-primary/5 focus:ring-2 focus:ring-primary/20 font-medium" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="f-price" className="text-sm font-bold">Retail Price (USD Equivalent)</Label>
                <Input id="f-price" type="number" step="0.01" value={formPrice} onChange={(e) => setFormPrice(e.target.value)} className="h-10 bg-background/50 focus:ring-2 focus:ring-primary/20" />
              </div>
            </div>

            <div className="space-y-2 pt-2 border-t border-border/40">
              <Label htmlFor="f-desc" className="text-sm font-bold">Description</Label>
              <Textarea 
                id="f-desc" 
                value={formDescription} 
                onChange={(e) => setFormDescription(e.target.value)} 
                className="min-h-[150px] bg-background/50 focus:ring-2 focus:ring-primary/20 resize-none" 
              />
            </div>

            <div className="flex justify-end pt-4 border-t border-border/40">
              <Button size="lg" onClick={handleSave} disabled={saving} className="gap-2 min-w-[180px] rounded-2xl font-black shadow-lg shadow-primary/20 transition-all active:scale-95">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {saving ? "Synchronizing Particulars..." : "Update Product Detail"}
              </Button>
            </div>
          </Card>

          <Card className="p-6 border-border/60 bg-card/50 shadow-sm space-y-6">
            <div className="flex items-start gap-4 border-b border-border/50 pb-4">
              <div className="h-10 w-10 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-600">
                <ScanLine className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <h2 className="text-lg font-black text-foreground">QR Template Defaults</h2>
                <p className="text-sm text-muted-foreground">Configuration for future batches of this SKU.</p>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-8">
              <div className="space-y-6">
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <Label className="text-sm font-bold">QR Size (mm)</Label>
                    <span className="text-xs font-mono bg-muted px-2 py-0.5 rounded">{formQrSettings.qrSize}mm</span>
                  </div>
                  <Slider 
                    value={[formQrSettings.qrSize]} 
                    onValueChange={([val]) => setFormQrSettings(prev => ({ ...prev, qrSize: val }))}
                    min={20} max={100} step={5}
                  />
                </div>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <Label className="text-sm font-bold">Grid Columns</Label>
                    <span className="text-xs font-mono bg-muted px-2 py-0.5 rounded">{formQrSettings.columns} cols</span>
                  </div>
                  <Slider 
                    value={[formQrSettings.columns]} 
                    onValueChange={([val]) => setFormQrSettings(prev => ({ ...prev, columns: val }))}
                    min={1} max={10} step={1}
                  />
                </div>
              </div>

              <div className="space-y-4">
                {[
                  { id: 'f-sqpn', label: 'Show Product Name', state: 'showProductName' },
                  { id: 'f-sqbn', label: 'Show Batch Number', state: 'showBatchNumber' },
                  { id: 'f-squi', label: 'Show Unit Index', state: 'showUnitIndex' },
                ].map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-3 rounded-xl bg-muted/30 border border-border/50">
                    <Label htmlFor={item.id} className="text-xs font-bold cursor-pointer">{item.label}</Label>
                    <Switch 
                      id={item.id} 
                      checked={(formQrSettings as any)[item.state]} 
                      onCheckedChange={(val) => setFormQrSettings(prev => ({ ...prev, [item.state]: val }))} 
                    />
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </div>

        {/* Sidebar: Images & Metadata */}
        <div className="space-y-6">
          <Card className="p-6 border-border/60 bg-card/50 shadow-sm space-y-6">
            <div className="flex items-center gap-3 border-b border-border/50 pb-4">
              <ImageIcon className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-black tracking-tight text-muted-foreground uppercase">Imagery & Governance</h2>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {formImages.map((url, idx) => (
                <div key={idx} className="relative aspect-square rounded-lg border border-border shadow-inner overflow-hidden bg-muted group transition-all">
                  <img src={resolveMediaUrl(url)} alt="Preview" className="w-full h-full object-cover" />
                  <div className="absolute inset-x-0 bottom-0 p-1.5 flex justify-between items-center bg-black/60 translate-y-full group-hover:translate-y-0 transition-transform">
                    <button 
                      onClick={async () => {
                        const isVisible = formVisibleImages.includes(idx);
                        const newVisibleImages = isVisible 
                          ? formVisibleImages.filter(i => i !== idx)
                          : [...formVisibleImages, idx];
                        
                        setFormVisibleImages(newVisibleImages);
                        
                        try {
                          await updateProduct(productId, { customerVisibleImages: newVisibleImages });
                        } catch (err) {
                          toast.error("Failed to sync visibility with server.");
                        }
                      }}
                      className={cn(
                        "h-6 w-6 rounded-md flex items-center justify-center transition-all",
                        formVisibleImages.includes(idx) ? "bg-emerald-500 text-white" : "bg-white/20 text-white/70 hover:bg-white/40"
                      )}
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                    </button>
                    <button 
                      onClick={() => removeImage(idx)}
                      className="h-6 w-6 bg-destructive/80 text-white rounded-md flex items-center justify-center hover:bg-destructive"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  {formVisibleImages.includes(idx) && (
                    <div className="absolute top-1.5 left-1.5 h-4 w-4 bg-emerald-500 rounded-full flex items-center justify-center text-white scale-75 shadow-lg">
                      <Check className="h-2.5 w-2.5" />
                    </div>
                  )}
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

            <div className="space-y-4 pt-4 border-t border-border/40">
              <Label className="text-xs font-black tracking-tight text-muted-foreground uppercase">Access Control</Label>
              <div className="grid grid-cols-1 gap-2">
                {(['public', 'verified_only', 'internal_only'] as const).map((level) => (
                  <button
                    key={level}
                    type="button"
                    onClick={() => setFormAccessLevel(level)}
                    className={cn(
                      "flex items-center justify-between p-3 rounded-xl border text-left transition-all",
                      formAccessLevel === level 
                        ? "bg-primary/10 border-primary text-primary" 
                        : "bg-muted/10 border-border/50 text-muted-foreground hover:bg-muted/30"
                    )}
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-bold capitalize">{level.replace('_', ' ')}</p>
                      <p className="text-[10px] opacity-70">
                        {level === 'public' ? 'Visible to all visitors' : level === 'verified_only' ? 'Only after verification' : 'Internal management only'}
                      </p>
                    </div>
                    {formAccessLevel === level && <CheckCircle2 className="h-4 w-4 shrink-0" />}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-4 rounded-xl bg-orange-500/5 border border-orange-500/10 flex gap-3">
              <ShieldAlert className="h-4 w-4 text-orange-600 shrink-0 mt-0.5" />
              <p className="text-[10px] text-orange-700 leading-relaxed">
                Images marked with green badges will be visible to consumers on the public verification page.
              </p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  </div>
);
}
