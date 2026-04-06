"use client";

import { useState, useEffect, useRef, useMemo } from "react";
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
  ImageIcon,
  Save,
  Trash2,
  Package,
  Layers,
  Info,
  Plus,
  ScanLine,
  ShieldAlert,
  ShieldCheck,
  Settings2,
  DollarSign,
  Fingerprint,
  CheckCircle2,
  FileText,
  Boxes,
  ArrowRight,
  Maximize2,
  Globe,
  EyeOff,
  ChevronDown,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { CategoryFilter } from "@/components/manufacturer/category-filter";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { getProduct, updateProduct, deleteProduct } from "@/api/product.api";
import { uploadImages } from "@/api/upload.api";
import { toast } from "sonner";
import { PageHeader } from "@/components/ui/page-header";
import { resolveMediaUrl } from "@/lib/media-url";
import Link from "next/link";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DocumentViewerDialog } from "@/components/common/document-viewer";

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
  unit: string;
  images: string[];
  imageAccessLevel: "public" | "verified_only" | "internal_only";
  customerVisibleImages: number[];
  qrSettings: {
    qrSize: number;
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
  const [formUnit, setFormUnit] = useState("pills");
  const [formImages, setFormImages] = useState<string[]>([]);
  const [formAccessLevel, setFormAccessLevel] = useState<
    "public" | "verified_only" | "internal_only"
  >("public");
  const [formVisibleImages, setFormVisibleImages] = useState<number[]>([]);
  const [formQrSettings, setFormQrSettings] = useState({
    qrSize: 40,
    showProductName: true,
    showUnitIndex: true,
    showBatchNumber: true,
    labelPadding: 10,
  });
  const [activeTab, setActiveTab] = useState("info");
  const [viewerDoc, setViewerDoc] = useState<{
    url: string;
    label: string;
    type?: "image" | "pdf";
  } | null>(null);

  // Compute isDirty state
  const isDirty = useMemo(() => {
    if (!product) return false;

    // Compare form values with initial product data
    const initialCategories =
      product.categories || (product.category ? [product.category] : []);
    const categoriesChanged =
      JSON.stringify([...formCategories].sort()) !==
      JSON.stringify([...initialCategories].sort());
    const qrChanged =
      JSON.stringify(formQrSettings) !==
      JSON.stringify(
        product.qrSettings || {
          qrSize: 40,
          showProductName: true,
          showUnitIndex: true,
          showBatchNumber: true,
          labelPadding: 10,
        },
      );

    return (
      formName !== product.name ||
      formProductId !== product.productId ||
      categoriesChanged ||
      formBrand !== product.brand ||
      Math.abs((parseFloat(formPrice) || 0) - (product.price || 0)) > 0.001 ||
      formComposition !== (product.composition || "") ||
      formDescription !== (product.description || "") ||
      formUnit !== (product.unit || "pills") ||
      JSON.stringify(formImages) !== JSON.stringify(product.images || []) ||
      formAccessLevel !== (product.imageAccessLevel || "public") ||
      JSON.stringify(formVisibleImages) !==
        JSON.stringify(product.customerVisibleImages || []) ||
      qrChanged
    );
  }, [
    product,
    formName,
    formProductId,
    formCategories,
    formBrand,
    formPrice,
    formComposition,
    formDescription,
    formUnit,
    formImages,
    formAccessLevel,
    formVisibleImages,
    formQrSettings,
  ]);

  // Prevent closing tab with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = ""; // Standard way to trigger the "Are you sure?" browser dialog
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isDirty]);

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
        setFormUnit(p.unit || "pills");
        setFormImages(p.images || []);
        setFormAccessLevel(p.imageAccessLevel || "public");
        setFormVisibleImages(p.customerVisibleImages || []);
        if (p.qrSettings) setFormQrSettings(p.qrSettings);
      } catch (err: any) {
        if (err.name === "AbortError") return;
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

      await updateProduct(productId, { images: newImages });
      toast.success(`${urls.length} images uploaded`);
    } catch (err: any) {
      toast.error(err.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const removeImage = async (index: number) => {
    const newImages = formImages.filter((_, i) => i !== index);
    const newVisibleImages = formVisibleImages
      .filter((i) => i !== index)
      .map((i) => (i > index ? i - 1 : i));

    setFormImages(newImages);
    setFormVisibleImages(newVisibleImages);

    try {
      await updateProduct(productId, {
        images: newImages,
        customerVisibleImages: newVisibleImages,
      });
      toast.info("Image mapping updated");
    } catch (err: any) {
      toast.error("Failed to sync images");
    }
  };

  const handleSave = async () => {
    if (
      !formName ||
      !formProductId ||
      formCategories.length === 0 ||
      !formBrand
    ) {
      toast.error("Please fill in all required fields");
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
        unit: formUnit,
        images: formImages,
        imageAccessLevel: formAccessLevel,
        customerVisibleImages: formVisibleImages,
        qrSettings: formQrSettings,
      };

      await updateProduct(productId, data);
      toast.success("Product updated successfully");
      setProduct({ ...product!, ...data });
    } catch (err: any) {
      toast.error(err.message || "Failed to update product");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      await deleteProduct(productId);
      toast.success("Product removed from catalogue");
      router.push("/manufacturer/products");
    } catch (err: any) {
      toast.error(err.message || "Failed to delete product");
    }
  };

  if (loading) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-20 text-muted-foreground font-medium">
        <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
        <p className="animate-pulse">Loading catalogue data...</p>
      </div>
    );
  }

  if (!product) return null;

  return (
    <>
      <DocumentViewerDialog
        open={!!viewerDoc}
        onOpenChange={(open) => !open && setViewerDoc(null)}
        document={viewerDoc}
      />
      <div className="flex flex-col h-full min-h-0 max-w-7xl mx-auto w-full gap-6">
        <PageHeader
          title={product.name}
          description={`Product profile • ${product.brand}`}
          stats={
            <Badge
              variant="outline"
              className="font-bold text-[9px] px-2 py-0 bg-primary/5 border-primary/20 text-primary shrink-0 rounded-full"
            >
              {product.productId}
            </Badge>
          }
          backHref="/manufacturer/products"
          actions={
            <div className="grid grid-cols-2 sm:flex items-center gap-3 w-full sm:w-auto">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="destructive"
                    size="lg"
                    className="flex-1 sm:flex-none gap-2 rounded-full h-11 sm:h-12"
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                    <span className="hidden sm:inline">Delete product</span>
                    <span className="sm:hidden text-xs">Delete</span>
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="rounded-[2.5rem] border-primary/20 p-8 max-w-[95vw] sm:max-w-lg">
                  <AlertDialogHeader>
                    <AlertDialogTitle className="text-2xl font-black">
                      Delete product?
                    </AlertDialogTitle>
                    <AlertDialogDescription className="text-sm font-medium pt-2">
                      This action cannot be undone. This product will be
                      permanently removed from your catalogue and any future batch
                      associations.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter className="gap-4 mt-8">
                    <AlertDialogCancel className="rounded-full border-none bg-muted h-12 font-bold px-8">
                      Cancel
                    </AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDelete}
                      className="rounded-full bg-destructive text-destructive-foreground shadow-xl shadow-destructive/20 hover:bg-destructive/90 h-12 px-8 font-bold text-sm transition-all active:scale-[0.98]"
                    >
                      Confirm deletion
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
              {isDirty && (
                <Button
                  onClick={handleSave}
                  disabled={saving}
                  size="lg"
                  className="flex-1 sm:flex-none gap-2 shadow-xl rounded-full h-11 sm:h-12 font-bold px-6 sm:px-10 order-1 sm:order-2 transition-all active:scale-[0.98] bg-primary shadow-primary/20 animate-in fade-in slide-in-from-right-4 duration-300"
                >
                  {saving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" aria-hidden="true" />
                  )}
                  <span>Save changes</span>
                </Button>
              )}
            </div>
          }
        />

        {/* KPI Stat Cards */}
        <div className="flex-none grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 px-1">
          {[
            {
              label: "MANUFACTURER",
              value: product.brand,
              icon: Boxes,
              color: "blue-500",
            },
            {
              label: "CATEGORY",
              value:
                product.categories?.[0] || product.category || "Medication",
              icon: Layers,
              color: "orange-500",
            },
            {
              label: "RETAIL PRICE",
              value: `$${product.price || "0.00"}`,
              icon: DollarSign,
              color: "primary",
            },
          ].map((stat, i) => (
            <Card
              key={i}
              className="bg-muted/10 border-border/40 border-2 rounded-[1.5rem] sm:rounded-[2rem] p-5 sm:p-6 flex items-center justify-between group hover:bg-primary/[0.02] transition-all duration-300"
            >
              <div className="space-y-1 sm:space-y-2 min-w-0">
                <p className="text-[8px] sm:text-[10px] font-black text-muted-foreground opacity-60 truncate leading-none mb-1">
                  {stat.label}
                </p>
                <h4 className="text-lg sm:text-2xl font-black font-mono tracking-tighter truncate">
                  {stat.value}
                </h4>
              </div>
              <div
                className={cn(
                  "h-12 w-12 sm:h-16 sm:w-16 rounded-2xl sm:rounded-3xl flex items-center justify-center shrink-0 shadow-inner group-hover:scale-110 transition-transform duration-500",
                  `bg-${stat.color}/10 text-${stat.color} border border-${stat.color}/20`,
                )}
              >
                <stat.icon className="h-6 w-6 sm:h-8 sm:w-8" />
              </div>
            </Card>
          ))}
        </div>

        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="flex-1 flex flex-col min-h-0 w-full px-1"
        >
          <TabsList className="grid w-full sm:w-[350px] grid-cols-2 flex-none rounded-2xl bg-muted/30 p-1 h-12 border border-border/40">
            <TabsTrigger
              value="info"
              className="rounded-xl gap-2 h-10 data-[state=active]:shadow-xl data-[state=active]:bg-background font-bold transition-all text-xs sm:text-sm"
            >
              <FileText className="h-4 w-4 text-primary" aria-hidden="true" />
              <span>General Info</span>
            </TabsTrigger>
            <TabsTrigger
              value="images"
              className="rounded-xl gap-2 h-10 data-[state=active]:shadow-xl data-[state=active]:bg-background font-bold transition-all text-xs sm:text-sm"
            >
              <ImageIcon className="h-4 w-4 text-primary" aria-hidden="true" />
              <span>Media Assets</span>
            </TabsTrigger>
          </TabsList>

          <div className="flex-1 min-h-0 relative">
            <ScrollArea className="h-full pr-0 sm:pr-4 pb-8">
              {/* Info Tab */}
              <TabsContent
                value="info"
                className="space-y-6 focus-visible:outline-none m-0 mt-6"
              >
                <div className="grid lg:grid-cols-3 gap-6 sm:gap-8">
                  <div className="lg:col-span-2 space-y-6 sm:space-y-8">
                    <Card className="p-5 sm:p-8 rounded-[2rem] border-2 border-border/40 bg-card/40 space-y-8 sm:space-y-12 shadow-sm">
                      <div className="flex items-start gap-4 sm:gap-6 border-b border-border/40 pb-6 sm:pb-8">
                        <div className="h-14 w-14 sm:h-20 sm:w-20 rounded-2xl sm:rounded-3xl bg-primary/10 flex items-center justify-center text-primary shadow-inner border border-primary/20 shrink-0">
                          <Info className="h-7 w-7 sm:h-10 sm:w-10" aria-hidden="true" />
                        </div>
                        <div>
                          <h3 className="text-xl sm:text-2xl font-black tracking-tight mb-1 sm:mb-2 text-foreground">
                            Catalogue Details
                          </h3>
                          <p className="text-[11px] sm:text-sm text-muted-foreground font-medium max-w-lg leading-relaxed opacity-70">
                            Update the primary identifiers and commercial
                            classification of this medicine profile.
                          </p>
                        </div>
                      </div>

                      <div className="grid sm:grid-cols-2 gap-x-8 gap-y-7">
                        <div className="space-y-2.5">
                          <Label className="text-xs font-semibold text-muted-foreground ml-1">
                            Product name
                          </Label>
                          <Input
                            value={formName}
                            onChange={(e) => setFormName(e.target.value)}
                            className="h-13 bg-background/50 rounded-full border-border/60 focus-visible:ring-primary/20 font-bold px-5 text-base"
                          />
                        </div>
                        <div className="space-y-2.5">
                          <Label className="text-xs font-semibold text-muted-foreground ml-1">
                            SKU / identifier
                          </Label>
                          <Input
                            value={formProductId}
                            onChange={(e) => setFormProductId(e.target.value)}
                            className="h-13 bg-background/50 font-mono rounded-full border-border/60 focus-visible:ring-primary/20 px-5"
                          />
                        </div>
                        <div className="space-y-2.5">
                          <Label className="text-xs font-semibold text-muted-foreground ml-1">
                            Category group
                          </Label>
                          <div className="h-13 bg-background/50 rounded-full border-border/60 overflow-hidden">
                            <CategoryFilter
                              selectedCategories={formCategories}
                              onCategoryChange={setFormCategories}
                              canManage={true}
                              className="w-full h-full border-none bg-transparent"
                            />
                          </div>
                        </div>
                        <div className="space-y-2.5">
                          <Label className="text-xs font-semibold text-muted-foreground ml-1">
                            Legal brand
                          </Label>
                          <Input
                            value={formBrand}
                            onChange={(e) => setFormBrand(e.target.value)}
                            className="h-13 bg-background/50 rounded-full border-border/60 px-5 font-medium"
                          />
                        </div>
                        <div className="space-y-2.5">
                          <Label className="text-xs font-semibold text-muted-foreground ml-1">
                            Standard unit (Dose type)
                          </Label>
                          <Select
                            value={formUnit}
                            onValueChange={setFormUnit}
                          >
                            <SelectTrigger className="h-13 bg-background/50 rounded-full border-border/60 focus:ring-primary/20 px-5 font-bold text-base">
                              <SelectValue placeholder="Select unit" />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl border-border/40 shadow-xl">
                              <SelectItem value="tablets">Tablets</SelectItem>
                              <SelectItem value="capsules">Capsules</SelectItem>
                              <SelectItem value="pills">Pills</SelectItem>
                              <SelectItem value="mg">mg</SelectItem>
                              <SelectItem value="ml">ml</SelectItem>
                              <SelectItem value="doses">Doses</SelectItem>
                              <SelectItem value="units">Units</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2.5">
                          <div className="flex items-center gap-2 mb-1 ml-1">
                            <Label className="text-xs font-semibold text-muted-foreground">
                              Active compounds
                            </Label>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-4 w-4 rounded-full"
                                  >
                                    <Info className="h-3 w-3 text-primary/60" aria-hidden="true" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent className="max-w-[200px] p-2 text-[10px]">
                                  Specify the main chemicals or ingredients.
                                  Used for safety cross-verification.
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                          <Textarea
                            value={formComposition}
                            onChange={(e) => setFormComposition(e.target.value)}
                            className="min-h-[80px] bg-background/50 rounded-[1.5rem] border-border/60 px-5 py-3 font-medium resize-none shadow-inner"
                            placeholder="e.g. Paracetamol 500mg, Caffeine 65mg..."
                          />
                        </div>
                        <div className="space-y-2.5">
                          <Label className="text-xs font-semibold text-muted-foreground ml-1">
                            Market price (USD)
                          </Label>
                          <div className="relative">
                            <Input
                              type="number"
                              value={formPrice}
                              onChange={(e) => setFormPrice(e.target.value)}
                              className="h-13 pl-12 pr-5 bg-background/50 rounded-full border-border/60 font-mono text-lg font-bold"
                            />
                            <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-primary/40 pointer-events-none z-10" aria-hidden="true" />
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2 pt-4 border-t border-border/40">
                        <Label className="text-xs font-semibold text-muted-foreground ml-1">
                          Therapeutic instruction & description
                        </Label>
                        <Textarea
                          value={formDescription}
                          onChange={(e) => setFormDescription(e.target.value)}
                          className="min-h-[120px] bg-background/50 border-border/60 rounded-[1.5rem] resize-none p-4 text-sm leading-relaxed font-medium shadow-inner"
                          placeholder="Detail the use cases, storage rules, and warnings..."
                        />
                      </div>
                    </Card>
                  </div>

                  <div className="space-y-6">
                    <Card className="p-5 sm:p-8 rounded-[2rem] border-2 border-primary/20 bg-gradient-to-br from-primary/[0.03] to-transparent space-y-8 shadow-xl shadow-primary/5">
                      <div className="space-y-4">
                        <h4 className="font-black text-xs sm:text-sm mb-4 flex items-center gap-2 text-primary">
                          <Settings2 className="h-4 w-4" aria-hidden="true" /> QR Code Settings
                        </h4>
                        <p className="text-[11px] sm:text-xs text-muted-foreground font-medium leading-relaxed opacity-80">
                          These parameters control the generation of holographic
                          security labels for this SKU.
                        </p>
                      </div>

                      <div className="space-y-8">
                        <div className="space-y-4">
                          <div className="flex justify-between items-center">
                            <Label className="text-xs font-semibold text-muted-foreground">
                              Standard QR size
                            </Label>
                            <span className="text-[10px] font-bold font-mono bg-primary/10 text-primary px-3 py-1 rounded-full">
                              {formQrSettings.qrSize}mm
                            </span>
                          </div>
                          <Slider
                            value={[formQrSettings.qrSize]}
                            onValueChange={([val]) =>
                              setFormQrSettings((prev) => ({
                                ...prev,
                                qrSize: val,
                              }))
                            }
                            min={15}
                            max={80}
                            step={1}
                            className="py-2"
                          />
                        </div>

                        <div className="space-y-2">
                          {[
                            {
                              id: "p-name",
                              label: "Include commercial name",
                              state: "showProductName",
                            },
                            {
                              id: "b-num",
                              label: "Include batch metadata",
                              state: "showBatchNumber",
                            },
                            {
                              id: "u-id",
                              label: "Include unit index",
                              state: "showUnitIndex",
                            },
                          ].map((item) => (
                            <div
                              key={item.id}
                              className="flex items-center justify-between p-3.5 rounded-xl transition-all border border-transparent hover:border-border/40 active:bg-muted/30"
                            >
                              <Label
                                htmlFor={item.id}
                                className="text-xs font-semibold cursor-pointer text-muted-foreground/80"
                              >
                                {item.label}
                              </Label>
                              <Switch
                                id={item.id}
                                checked={(formQrSettings as any)[item.state]}
                                onCheckedChange={(val) =>
                                  setFormQrSettings((prev) => ({
                                    ...prev,
                                    [item.state]: val,
                                  }))
                                }
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    </Card>
                  </div>
                </div>
              </TabsContent>

              <TabsContent
                value="images"
                className="space-y-6 focus-visible:outline-none m-0 mt-6"
              >
                <Card className="p-5 sm:p-8 rounded-[2rem] border-2 border-border/40 bg-card/40 shadow-sm">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 border-b border-border/40 pb-8 sm:pb-10 mb-8 sm:mb-10">
                    <div className="flex items-center gap-4 sm:gap-6">
                      <div className="h-14 w-14 sm:h-20 sm:w-20 rounded-2xl sm:rounded-3xl bg-blue-500/10 flex items-center justify-center text-blue-500 shadow-inner border border-blue-500/20 shrink-0">
                        <ImageIcon className="h-7 w-7 sm:h-10 sm:w-10" aria-hidden="true" />
                      </div>
                      <div>
                        <h3 className="text-xl sm:text-2xl font-black tracking-tight mb-1 sm:mb-2">
                          Media library
                        </h3>
                        <p className="text-[11px] sm:text-sm text-muted-foreground font-medium max-w-lg leading-relaxed opacity-70">
                          High-resolution diagnostic imagery stored on
                          decentralized S3 nodes.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                    {formImages.map((url, idx) => (
                      <Card
                        key={idx}
                        className="relative aspect-[4/5] rounded-[1.5rem] sm:rounded-3xl border-2 border-border/40 overflow-hidden group shadow-md transition-all hover:shadow-lg"
                      >
                        <img
                          src={resolveMediaUrl(url)}
                          alt="Reference"
                          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                        />
                        <div className="absolute top-3 right-3 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity duration-300 z-10">
                          <Button
                            variant="secondary"
                            size="icon"
                            onClick={() =>
                              setViewerDoc({
                                url: resolveMediaUrl(url),
                                label: `Image ${idx + 1}`,
                                type: "image",
                              })
                            }
                            className="h-8 w-8 sm:h-10 sm:w-10 rounded-full shadow-xl hover:scale-110 transition-transform active:scale-90 bg-background/80 backdrop-blur-md hover:bg-background"
                          >
                            <Maximize2 className="h-4 w-4 sm:h-5 sm:w-5" aria-hidden="true" />
                          </Button>
                        </div>

                        <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/80 via-black/40 to-transparent opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity duration-300 flex justify-end gap-2 z-10 pt-10">
                          <Button
                            variant={
                              formVisibleImages.includes(idx)
                                ? "default"
                                : "secondary"
                            }
                            size="icon"
                            onClick={async () => {
                              const isVisible = formVisibleImages.includes(idx);
                              const newVisibleImages = isVisible
                                ? formVisibleImages.filter((i) => i !== idx)
                                : [...formVisibleImages, idx];
                              setFormVisibleImages(newVisibleImages);
                              try {
                                await updateProduct(productId, {
                                  customerVisibleImages: newVisibleImages,
                                });
                                toast.success("Refined visibility");
                              } catch (err) {
                                toast.error("Sync error");
                              }
                            }}
                            className={cn(
                              "h-8 w-8 sm:h-10 sm:w-10 rounded-xl shadow-xl hover:scale-110 transition-transform active:scale-90",
                              !formVisibleImages.includes(idx) &&
                                "bg-background/80 backdrop-blur-md hover:bg-background",
                            )}
                          >
                            <CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5" aria-hidden="true" />
                          </Button>
                          <Button
                            variant="destructive"
                            size="icon"
                            onClick={() => removeImage(idx)}
                            className="h-8 w-8 sm:h-10 sm:w-10 rounded-xl shadow-xl hover:scale-110 transition-transform active:scale-90"
                          >
                            <Trash2 className="h-4 w-4 sm:h-5 sm:w-5" aria-hidden="true" />
                          </Button>
                        </div>
                        {formVisibleImages.includes(idx) && (
                          <div className="absolute top-3 left-3 bg-emerald-500 text-white px-3 py-1 rounded-full text-[9px] font-bold shadow-lg border border-white/20">
                            Public
                          </div>
                        )}
                        <div className="absolute bottom-3 left-3 bg-black/40 backdrop-blur-md text-white/90 px-2 py-0.5 rounded-lg text-[9px] font-mono border border-white/10 z-0">
                          #{idx + 1}
                        </div>
                      </Card>
                    ))}

                    <Label
                      htmlFor="image-upload-full"
                      className={cn(
                        "aspect-[4/5] rounded-[1.5rem] sm:rounded-3xl border-2 border-dashed border-primary/20 hover:border-primary/50 hover:bg-primary/5 cursor-pointer flex flex-col items-center justify-center transition-all bg-muted/5 group shadow-inner",
                        uploading && "opacity-50 cursor-not-allowed",
                      )}
                    >
                      {uploading ? (
                        <div className="flex flex-col items-center gap-3">
                          <Loader2 className="h-8 w-8 animate-spin text-primary" aria-hidden="true" />
                          <span className="text-[10px] font-bold text-primary animate-pulse">
                            Syncing...
                          </span>
                        </div>
                      ) : (
                        <>
                          <div className="h-12 w-12 rounded-2xl bg-background shadow-lg flex items-center justify-center group-hover:scale-110 transition-transform border border-border/40">
                            <Plus className="h-6 w-6 text-primary" aria-hidden="true" />
                          </div>
                          <span className="text-[10px] mt-4 font-bold text-muted-foreground opacity-60">
                            Upload Image
                          </span>
                        </>
                      )}
                      <input
                        id="image-upload-full"
                        type="file"
                        multiple
                        accept="image/*"
                        className="hidden"
                        onChange={handleImageUpload}
                        disabled={uploading}
                      />
                    </Label>
                  </div>
                </Card>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8 mt-6 sm:mt-8">
                  <div className="lg:col-span-2 invisible" />
                  <div className="space-y-6">
                    <Card className="p-5 sm:p-8 rounded-[2rem] border-2 border-border/40 bg-card/40 space-y-8 shadow-sm">
                      <div className="flex items-start gap-4 sm:gap-6 border-b border-border/40 pb-6 sm:pb-8">
                        <div className="h-12 w-12 sm:h-14 sm:w-14 rounded-2xl sm:rounded-3xl bg-emerald-500/10 flex items-center justify-center text-emerald-600 shadow-inner border border-emerald-500/20 shrink-0">
                          <CheckCircle2 className="h-6 w-6 sm:h-8 sm:w-8" aria-hidden="true" />
                        </div>
                        <div>
                          <h4 className="text-sm sm:text-base font-black text-foreground mb-1 leading-none">
                            Access Policies
                          </h4>
                          <p className="text-[10px] text-muted-foreground font-bold opacity-60">
                            Set global visibility for this product
                          </p>
                        </div>
                      </div>

                      <div className="grid gap-4">
                        {[
                          {
                            level: "public",
                            label: "Public display",
                            desc: "Visible to all consumers and visitors.",
                            icon: Globe,
                            color: "emerald",
                          },
                          {
                            level: "verified_only",
                            label: "Verified only",
                            desc: "Visible only after a successful scan.",
                            icon: ShieldCheck,
                            color: "amber",
                          },
                          {
                            level: "internal_only",
                            label: "Internal use",
                            desc: "Restricted to manufacturer portal.",
                            icon: EyeOff,
                            color: "slate",
                          },
                        ].map((policy) => {
                          const Icon = policy.icon;
                          const isActive = formAccessLevel === policy.level;
                          return (
                            <Button
                              key={policy.level}
                              type="button"
                              variant="ghost"
                              disabled={saving}
                              onClick={async () => {
                                setFormAccessLevel(policy.level as any);
                                try {
                                  await updateProduct(productId, {
                                    imageAccessLevel: policy.level as any,
                                  });
                                  toast.success(
                                    `Access level: ${policy.label}`,
                                  );
                                } catch (err) {
                                  toast.error("Failed to sync policy");
                                }
                              }}
                              className={cn(
                                "flex items-start gap-4 p-4 h-auto rounded-2xl border-2 text-left transition-all group relative overflow-hidden active:scale-[0.98]",
                                isActive
                                  ? `bg-${policy.color}-500/[0.03] border-${policy.color}-500/40 shadow-sm shadow-${policy.color}-500/10`
                                  : "bg-muted/10 border-border/30 text-muted-foreground hover:bg-muted/20 hover:border-border/60",
                              )}
                            >
                              <div
                                className={cn(
                                  "h-10 w-10 rounded-xl flex items-center justify-center shrink-0 border transition-all duration-500 group-hover:scale-110",
                                  isActive
                                    ? `bg-${policy.color}-500/10 border-${policy.color}-500/30 text-${policy.color}-600`
                                    : "bg-background/80 border-border/40 text-muted-foreground/60",
                                )}
                              >
                                <Icon className="h-5 w-5" aria-hidden="true" />
                              </div>
                              <div className="flex-1 min-w-0 pr-6">
                                <p
                                  className={cn(
                                    "text-xs font-black tracking-tight",
                                    isActive
                                      ? `text-${policy.color}-700`
                                      : "text-foreground/80",
                                  )}
                                >
                                  {policy.label}
                                </p>
                                <p className="text-[10px] opacity-60 mt-1 font-bold leading-relaxed line-clamp-2">
                                  {policy.desc}
                                </p>
                              </div>
                              {isActive && (
                                <div className="absolute top-4 right-4">
                                  <CheckCircle2
                                    className={cn(
                                      "h-4 w-4",
                                      `text-${policy.color}-500`,
                                    )}
                                    aria-hidden="true"
                                  />
                                </div>
                              )}
                            </Button>
                          );
                        })}
                      </div>
                    </Card>
                  </div>
                </div>
              </TabsContent>
            </ScrollArea>
          </div>
        </Tabs>
      </div>
    </>
  );
}
