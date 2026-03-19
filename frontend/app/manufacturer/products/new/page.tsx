"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, X, Check, ImageIcon, ArrowLeft, ChevronsUpDown } from "lucide-react";
import { createProduct } from "@/api/product.api";
import { uploadImages } from "@/api/upload.api";
import { toast } from "sonner";
import Link from "next/link";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { fetchCategories, Category } from "@/api/category.api";

export default function NewProductPage() {
  const router = useRouter();
  const [formName, setFormName] = useState("");
  const [formProductId, setFormProductId] = useState("");
  const [formCategory, setFormCategory] = useState("");
  const [formBrand, setFormBrand] = useState("");
  const [formPrice, setFormPrice] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formImages, setFormImages] = useState<File[]>([]);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  
  // Categories State
  const [categories, setCategories] = useState<Category[]>([]);
  const [openCategory, setOpenCategory] = useState(false);

  useEffect(() => {
    fetchCategories()
      .then((data) => setCategories(data.categories))
      .catch((err) => console.error("Could not fetch categories:", err));
  }, []);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setFormImages((prev) => [...prev, ...files]);
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
      let imageUrls: string[] = [];
      if (formImages.length > 0) {
        setUploading(true);
        try {
          imageUrls = await uploadImages(formImages);
        } catch (uploadErr: any) {
          toast.error(uploadErr.message || "Image upload failed. Cannot create product.");
          setUploading(false);
          setSaving(false);
          return;
        }
        setUploading(false);
      }

      const data = {
        name: formName,
        productId: formProductId,
        category: formCategory,
        brand: formBrand,
        price: parseFloat(formPrice) || 0,
        description: formDescription,
        images: imageUrls,
      };

      await createProduct(data);
      toast.success("Product added to your catalogue.");
      router.push("/manufacturer/products");
    } catch (err: any) {
      toast.error(err.message || "Failed to save product.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 max-w-4xl mx-auto w-full">
      <div className="flex items-center gap-4 flex-none mb-4">
        <Button variant="ghost" size="icon" asChild className="rounded-full">
          <Link href="/manufacturer/products">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Add New Product
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Enroll a new product SKU into your manufacturer catalogue.
          </p>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-muted-foreground/10 pb-6">
        <Card className="p-6 border border-border bg-card/50 backdrop-blur-sm shadow-xl space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="grid sm:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="f-name" className="text-sm font-medium">
                Product Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="f-name"
                placeholder="e.g. Amoxicillin 500mg"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                className="h-10 transition-all focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="f-pid" className="text-sm font-medium">
                Product ID (SKU/NDC) <span className="text-destructive">*</span>
              </Label>
              <Input
                id="f-pid"
                placeholder="e.g. NDC-12345-678"
                value={formProductId}
                onChange={(e) => setFormProductId(e.target.value)}
                className="h-10 transition-all focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <div className="space-y-2 flex flex-col">
              <Label className="text-sm font-medium mb-2">
                Category <span className="text-destructive">*</span>
              </Label>
              <Popover open={openCategory} onOpenChange={setOpenCategory}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={openCategory}
                    className="w-full justify-between h-10 font-normal"
                  >
                    {formCategory
                      ? formCategory
                      : "Select category..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[400px] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Search categories..." />
                    <CommandList>
                      <CommandEmpty>
                        No category found.{" "}
                        <span className="text-muted-foreground italic">
                          Manage categories from the main Products page.
                        </span>
                      </CommandEmpty>
                      <CommandGroup>
                        {categories.map((cat) => (
                          <CommandItem
                            key={cat._id}
                            value={cat.name}
                            onSelect={(currentValue) => {
                              // Shadcn command converts to lowercase values usually, 
                              // find Original Case from object.
                              const originalCat = categories.find(c => c.name.toLowerCase() === currentValue.toLowerCase());
                              setFormCategory(originalCat?.name || currentValue);
                              setOpenCategory(false);
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                formCategory === cat.name ? "opacity-100" : "opacity-0"
                              )}
                            />
                            {cat.name}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              <Label htmlFor="f-brand" className="text-sm font-medium">
                Brand <span className="text-destructive">*</span>
              </Label>
              <Input
                id="f-brand"
                placeholder="e.g. PharmaCorp"
                value={formBrand}
                onChange={(e) => setFormBrand(e.target.value)}
                className="h-10 transition-all focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="f-price" className="text-sm font-medium">
                Retail Price (USD)
              </Label>
              <Input
                id="f-price"
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={formPrice}
                onChange={(e) => setFormPrice(e.target.value)}
                className="h-10 transition-all focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="f-desc" className="text-sm font-medium flex items-center justify-between">
              Product Description
              <span className="text-xs text-muted-foreground font-normal bg-muted/50 px-2 py-0.5 rounded">Visible to consumers</span>
            </Label>
            <Textarea
              id="f-desc"
              placeholder="Describe product details, instructions, or ingredients. Make this user-friendly as it is shown to consumers scanning the product."
              value={formDescription}
              onChange={(e) => setFormDescription(e.target.value)}
              className="min-h-[120px] transition-all focus:ring-2 focus:ring-primary/20"
            />
          </div>

          <div className="space-y-4">
            <Label className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
              Product Imagery
            </Label>

            <div className="flex flex-wrap gap-4">
              {formImages.map((file, idx) => {
                const previewUrl = URL.createObjectURL(file);
                return (
                <div
                  key={idx}
                  className="relative w-28 h-28 rounded-xl border border-border shadow-inner overflow-hidden bg-muted group transition-all hover:scale-105"
                >
                  <img
                    src={previewUrl}
                    alt="Preview"
                    className="w-full h-full object-cover"
                    onLoad={() => URL.revokeObjectURL(previewUrl)} // Clean up memory
                  />
                  <button
                    onClick={() => removeImage(idx)}
                    className="absolute top-2 right-2 h-6 w-6 bg-destructive text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
                );
              })}

              <Label
                htmlFor="image-upload"
                className={cn(
                  "w-28 h-28 rounded-xl border-2 border-dashed border-muted-foreground/30 hover:border-primary hover:bg-primary/5 cursor-pointer flex flex-col items-center justify-center transition-all shadow-sm",
                  uploading &&
                    "opacity-50 cursor-not-allowed pointer-events-none",
                )}
              >
                {uploading ? (
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                ) : (
                  <>
                    <ImageIcon className="h-6 w-6 text-muted-foreground group-hover:text-primary transition-colors" />
                    <span className="text-xs mt-2 font-medium text-muted-foreground">
                      Add Image
                    </span>
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
            <p className="text-[10px] text-muted-foreground">
              First image will be the primary product thumbnail.
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-border/50">
            <Button variant="outline" size="lg" asChild>
              <Link href="/manufacturer/products">Cancel</Link>
            </Button>
            <Button
              size="lg"
              onClick={handleSave}
              disabled={saving}
              className="gap-2 min-w-[160px] shadow-lg shadow-primary/20"
            >
              {saving ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Check className="h-5 w-5" />
              )}
              {saving ? "Creating..." : "Create Product"}
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
